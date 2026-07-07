import { SchemaNode, ExportOptions } from '@/types/schema';
import { parseJsonSchema } from '@/utils/schemaParser';
import {
  generateJsonSchema,
  formatJsonSchema,
  compressJsonSchema,
} from '@/utils/schemaGenerator';

type BrowserWindowWithFS = Window & {
  showOpenFilePicker?: (options?: unknown) => Promise<any[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<any>;
};

let webFileHandle: any = null;

/** 设置当前活动的 Web 文件句柄（从文件树打开文件时调用，保证保存/刷新可用） */
export function setActiveWebFileHandle(handle: any): void {
  webFileHandle = handle;
}

/** 读取当前活动的 Web 文件句柄（保存后用于将未保存项提升为真实文件） */
export function getActiveWebFileHandle(): any {
  return webFileHandle;
}

function getBrowserWindowWithFS(): BrowserWindowWithFS {
  return window as BrowserWindowWithFS;
}

function getSuggestedFileName(filePath: string | null): string {
  if (!filePath) return 'schema.json';
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.split('/').pop() || 'schema.json';
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function readFileFromInput(): Promise<{ name: string; content: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const content = await file.text();
      resolve({ name: file.name, content });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function downloadContent(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function writeToWebHandle(fileHandle: any, content: string): Promise<void> {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function importSchema(): Promise<{ schema: SchemaNode; filePath: string } | null> {
  if (window.electronAPI) {
    const result = await window.electronAPI.file.open();
    if (result) {
      try {
        const json = JSON.parse(result.content);
        const schema = parseJsonSchema(json);
        return { schema, filePath: result.path };
      } catch (error) {
        console.error('Failed to parse JSON Schema:', error);
        throw new Error('无法解析 JSON Schema 文件');
      }
    }
  }

  const browserWindow = getBrowserWindowWithFS();

  if (browserWindow.showOpenFilePicker) {
    try {
      const [fileHandle] = await browserWindow.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'JSON Schema',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });

      if (!fileHandle) {
        return null;
      }

      const file = await fileHandle.getFile();
      const content = await file.text();

      try {
        const json = JSON.parse(content);
        const schema = parseJsonSchema(json);
        webFileHandle = fileHandle;
        return { schema, filePath: file.name };
      } catch (error) {
        console.error('Failed to parse JSON Schema:', error);
        throw new Error('无法解析 JSON Schema 文件');
      }
    } catch (error) {
      if (isAbortError(error)) {
        return null;
      }
      throw error;
    }
  }

  const inputResult = await readFileFromInput();
  if (!inputResult) {
    return null;
  }

  try {
    const json = JSON.parse(inputResult.content);
    const schema = parseJsonSchema(json);
    webFileHandle = null;
    return { schema, filePath: inputResult.name };
  } catch (error) {
    console.error('Failed to parse JSON Schema:', error);
    throw new Error('无法解析 JSON Schema 文件');
  }

  return null;
}

export async function exportSchema(
  schema: SchemaNode,
  options: ExportOptions = { format: true, indentSize: 2 }
): Promise<void> {
  const jsonSchema = generateJsonSchema(schema);
  const content = options.format
    ? formatJsonSchema(jsonSchema, options.indentSize)
    : compressJsonSchema(jsonSchema);

  if (window.electronAPI) {
    await window.electronAPI.file.saveAs(content);
    return;
  }

  const browserWindow = getBrowserWindowWithFS();
  if (browserWindow.showSaveFilePicker) {
    try {
      const fileHandle = await browserWindow.showSaveFilePicker({
        suggestedName: 'schema.json',
        types: [
          {
            description: 'JSON Schema',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });

      if (fileHandle) {
        await writeToWebHandle(fileHandle, content);
        webFileHandle = fileHandle;
        return;
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
  }

  downloadContent(content, 'schema.json');
}

export async function saveSchema(
  filePath: string | null,
  schema: SchemaNode,
  options: ExportOptions = { format: true, indentSize: 2 }
): Promise<string | null> {
  const jsonSchema = generateJsonSchema(schema);
  const content = options.format
    ? formatJsonSchema(jsonSchema, options.indentSize)
    : compressJsonSchema(jsonSchema);

  if (window.electronAPI) {
    if (filePath) {
      await window.electronAPI.file.save(filePath, content);
      return filePath;
    } else {
      const result = await window.electronAPI.file.saveAs(content);
      return result?.path || null;
    }
  }

  const browserWindow = getBrowserWindowWithFS();

  if (filePath && webFileHandle) {
    await writeToWebHandle(webFileHandle, content);
    return filePath;
  }

  if (browserWindow.showSaveFilePicker) {
    try {
      const fileHandle = await browserWindow.showSaveFilePicker({
        suggestedName: getSuggestedFileName(filePath),
        types: [
          {
            description: 'JSON Schema',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });

      if (fileHandle) {
        await writeToWebHandle(fileHandle, content);
        webFileHandle = fileHandle;
        return fileHandle.name || getSuggestedFileName(filePath);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return filePath;
      }
      throw error;
    }
  }

  const fileName = getSuggestedFileName(filePath);
  downloadContent(content, fileName);
  webFileHandle = null;
  return fileName;

  return null;
}

export async function refreshSchema(
  filePath: string
): Promise<SchemaNode | null> {
  if (window.electronAPI) {
    const result = await window.electronAPI.file.read(filePath);
    if (result) {
      try {
        const json = JSON.parse(result);
        return parseJsonSchema(json);
      } catch (error) {
        console.error('Failed to parse JSON Schema:', error);
        throw new Error('无法解析 JSON Schema 文件');
      }
    }
  }

  if (webFileHandle) {
    const file = await webFileHandle.getFile();
    const content = await file.text();
    try {
      const json = JSON.parse(content);
      return parseJsonSchema(json);
    } catch (error) {
      console.error('Failed to parse JSON Schema:', error);
      throw new Error('无法解析 JSON Schema 文件');
    }
  }

  throw new Error('Web 环境无法直接刷新本地文件，请重新打开文件');

  return null;
}
