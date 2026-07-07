import { FileTreeItem } from '@/types/fileTree';

/** 判断当前是否运行在 Electron 环境 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

type WindowWithFS = Window & {
  showDirectoryPicker?: (options?: unknown) => Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>;
};

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `ft_${Date.now()}_${idCounter}`;
}

/** 兜底模式（无 File System Access API）下缓存已选文件的内容 */
const webContentCache = new Map<string, string>();

function sortItems(items: FileTreeItem[]): FileTreeItem[] {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** 选择一个文件夹作为顶层根节点 */
export async function pickDirectory(): Promise<FileTreeItem | null> {
  if (isElectron()) {
    const dirPath = await window.electronAPI!.file.openDirectory();
    if (!dirPath) return null;
    const name = dirPath.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || dirPath;
    return { id: nextId(), name, type: 'directory', path: dirPath, isRoot: true };
  }

  const win = window as WindowWithFS;
  if (win.showDirectoryPicker) {
    try {
      const handle = await win.showDirectoryPicker();
      return { id: nextId(), name: handle.name, type: 'directory', path: handle.name, isRoot: true, handle };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      throw error;
    }
  }

  return null;
}

/** 选择一个或多个 JSON 文件作为顶层文件项 */
export async function pickFiles(): Promise<FileTreeItem[]> {
  if (isElectron()) {
    const result = await window.electronAPI!.file.open();
    if (!result) return [];
    const name = result.path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || result.path;
    return [{ id: nextId(), name, type: 'file', path: result.path, isRoot: true }];
  }

  const win = window as WindowWithFS;
  if (win.showOpenFilePicker) {
    try {
      const handles = await win.showOpenFilePicker({
        multiple: true,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      return handles.map((handle) => ({
        id: nextId(),
        name: handle.name,
        type: 'file' as const,
        path: handle.name,
        isRoot: true,
        handle,
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return [];
      throw error;
    }
  }

  // 兜底：input 选择
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      resolve(
        files.map((file) => ({
          id: nextId(),
          name: file.name,
          type: 'file' as const,
          path: `web-${Date.now()}/${file.name}`,
          isRoot: true,
          handle: undefined,
          // 兜底模式下把 File 暂存到 handle 位无法持久化，交由内容缓存处理
        }))
      );
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

/** 读取目录下的子项（懒加载） */
export async function readDirectory(item: FileTreeItem): Promise<FileTreeItem[]> {
  if (isElectron()) {
    const entries = await window.electronAPI!.file.readDirectory(item.path);
    return entries.map((entry) => ({
      id: nextId(),
      name: entry.name,
      type: entry.type,
      path: entry.path,
    }));
  }

  if (item.handle && item.handle.kind === 'directory') {
    const dirHandle = item.handle as FileSystemDirectoryHandle;
    const permission = await ensurePermission(dirHandle, 'read');
    if (!permission) return [];

    const result: FileTreeItem[] = [];
    // @ts-expect-error entries() 在部分 TS lib 中尚未定义
    for await (const [name, childHandle] of dirHandle.entries()) {
      if (childHandle.kind === 'directory') {
        result.push({
          id: nextId(),
          name,
          type: 'directory',
          path: `${item.path}/${name}`,
          handle: childHandle,
        });
      } else if (/\.json$/i.test(name)) {
        result.push({
          id: nextId(),
          name,
          type: 'file',
          path: `${item.path}/${name}`,
          handle: childHandle,
        });
      }
    }
    return sortItems(result);
  }

  return [];
}

/** 读取文件内容 */
export async function readFileContent(item: FileTreeItem): Promise<string> {
  if (isElectron()) {
    const content = await window.electronAPI!.file.read(item.path);
    if (content == null) throw new Error('无法读取文件');
    return content;
  }

  if (item.handle && item.handle.kind === 'file') {
    const fileHandle = item.handle as FileSystemFileHandle;
    const permission = await ensurePermission(fileHandle, 'read');
    if (!permission) throw new Error('无读取权限');
    const file = await fileHandle.getFile();
    return file.text();
  }

  if (webContentCache.has(item.path)) {
    return webContentCache.get(item.path)!;
  }

  throw new Error('浏览器模式下无法读取该文件');
}

/** 返回可用于保存/刷新的 Web 文件句柄（Electron 下为 null） */
export function getFileHandle(item: FileTreeItem): FileSystemFileHandle | null {
  if (!isElectron() && item.handle && item.handle.kind === 'file') {
    return item.handle as FileSystemFileHandle;
  }
  return null;
}

async function ensurePermission(
  handle: FileSystemHandle,
  mode: 'read' | 'readwrite'
): Promise<boolean> {
  const anyHandle = handle as FileSystemHandle & {
    queryPermission?: (opts: { mode: string }) => Promise<PermissionState>;
    requestPermission?: (opts: { mode: string }) => Promise<PermissionState>;
  };
  if (!anyHandle.queryPermission) return true;
  if ((await anyHandle.queryPermission({ mode })) === 'granted') return true;
  if (anyHandle.requestPermission && (await anyHandle.requestPermission({ mode })) === 'granted') {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 持久化：Electron 用 localStorage（路径稳定）；Web 用 IndexedDB（存句柄）
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'file-explorer-roots';
const IDB_NAME = 'json-schema-viewer';
const IDB_STORE = 'file-handles';
const IDB_KEY = 'roots';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(IDB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(value: unknown): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet<T>(): Promise<T | null> {
  const db = await openIdb();
  const value = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const request = tx.objectStore(IDB_STORE).get(IDB_KEY);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

/** 持久化保存顶层根节点列表 */
export async function persistRoots(roots: FileTreeItem[]): Promise<void> {
  try {
    if (isElectron()) {
      const plain = roots
        .filter((r) => !r.isUnsaved)
        .map((r) => ({ name: r.name, path: r.path, type: r.type }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
    } else {
      const withHandles = roots.filter((r) => !!r.handle && !r.isUnsaved);
      await idbSet(
        withHandles.map((r) => ({ name: r.name, type: r.type, handle: r.handle }))
      );
    }
  } catch (error) {
    console.error('Failed to persist file explorer roots:', error);
  }
}

/** 恢复上次保存的顶层根节点列表 */
export async function loadPersistedRoots(): Promise<FileTreeItem[]> {
  try {
    if (isElectron()) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const plain = JSON.parse(raw) as Array<{ name: string; path: string; type: FileTreeItem['type'] }>;
      return plain.map((r) => ({ id: nextId(), name: r.name, path: r.path, type: r.type, isRoot: true }));
    }
    const stored = await idbGet<Array<{ name: string; type: FileTreeItem['type']; handle: FileSystemHandle }>>();
    if (!stored) return [];
    return stored.map((r) => ({
      id: nextId(),
      name: r.name,
      type: r.type,
      path: r.name,
      isRoot: true,
      handle: r.handle,
    }));
  } catch (error) {
    console.error('Failed to load persisted file explorer roots:', error);
    return [];
  }
}
