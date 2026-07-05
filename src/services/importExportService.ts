import { SchemaNode, ExportOptions } from '@/types/schema';
import { parseJsonSchema } from '@/utils/schemaParser';
import {
  generateJsonSchema,
  formatJsonSchema,
  compressJsonSchema,
} from '@/utils/schemaGenerator';

export async function importSchema(
  filePath: string
): Promise<{ schema: SchemaNode; filePath: string } | null> {
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
  }
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
  return null;
}
