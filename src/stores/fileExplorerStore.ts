import { create } from 'zustand';
import { FileTreeItem } from '@/types/fileTree';
import { loadPersistedRoots, persistRoots } from '@/services/fileSystemService';

let unsavedCounter = 0;

interface FileExplorerStore {
  roots: FileTreeItem[];
  selectedPath: string | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  addRoots: (items: FileTreeItem[]) => void;
  removeRoot: (id: string) => void;
  addUnsavedFile: (name: string) => FileTreeItem;
  promoteUnsavedToFile: (item: { path: string; name: string; handle?: FileSystemHandle }) => void;
  setSelectedPath: (path: string | null) => void;
}

export const useFileExplorerStore = create<FileExplorerStore>((set, get) => ({
  roots: [],
  selectedPath: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const roots = await loadPersistedRoots();
    set({ roots, hydrated: true });
  },

  addRoots: (items) => {
    if (items.length === 0) return;
    const existing = new Set(get().roots.map((r) => r.path));
    const toAdd = items.filter((item) => !existing.has(item.path));
    if (toAdd.length === 0) return;
    const roots = [...get().roots, ...toAdd];
    set({ roots });
    void persistRoots(roots);
  },

  removeRoot: (id) => {
    const roots = get().roots.filter((r) => r.id !== id);
    set({ roots });
    void persistRoots(roots);
  },

  addUnsavedFile: (name) => {
    unsavedCounter += 1;
    const item: FileTreeItem = {
      id: `unsaved_${Date.now()}_${unsavedCounter}`,
      name,
      type: 'file',
      path: `unsaved:${unsavedCounter}`,
      isRoot: true,
      isUnsaved: true,
    };
    // 只保留一个未保存占位项，避免堆积
    const roots = [...get().roots.filter((r) => !r.isUnsaved), item];
    set({ roots });
    void persistRoots(roots);
    return item;
  },

  promoteUnsavedToFile: ({ path, name, handle }) => {
    const roots = get().roots;
    const idx = roots.findIndex((r) => r.isUnsaved);
    if (idx === -1) {
      // 没有未保存项则作为新根加入
      if (roots.some((r) => r.path === path)) return;
      const next = [
        ...roots,
        { id: `ft_${Date.now()}`, name, type: 'file' as const, path, isRoot: true, handle },
      ];
      set({ roots: next });
      void persistRoots(next);
      return;
    }
    const next = [...roots];
    next[idx] = { ...next[idx], name, path, handle, isUnsaved: false };
    set({ roots: next });
    void persistRoots(next);
  },

  setSelectedPath: (path) => set({ selectedPath: path }),
}));
