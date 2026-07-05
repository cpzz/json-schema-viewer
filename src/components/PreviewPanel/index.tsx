import { useMemo, useState } from 'react';
import { SchemaNode } from '@/types/schema';
import { useUIStore } from '@/stores/uiStore';
import { generateJsonSchema } from '@/utils/schemaGenerator';
import { Copy, Check } from 'lucide-react';

interface PreviewPanelProps {
  schema: SchemaNode | null;
}

export function PreviewPanel({ schema }: PreviewPanelProps) {
  const { previewFormat, setPreviewFormat } = useUIStore();
  const [copied, setCopied] = useState(false);

  const jsonContent = useMemo(() => {
    if (!schema) return '';
    const jsonSchema = generateJsonSchema(schema);
    return previewFormat === 'formatted'
      ? JSON.stringify(jsonSchema, null, 2)
      : JSON.stringify(jsonSchema);
  }, [schema, previewFormat]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-2">
        <span className="text-sm font-medium text-gray-900">JSON 预览</span>
        <div className="flex-1" />
        <button
          onClick={() => setPreviewFormat('formatted')}
          className={`px-2 py-1 text-xs rounded ${
            previewFormat === 'formatted'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          格式化
        </button>
        <button
          onClick={() => setPreviewFormat('compressed')}
          className={`px-2 py-1 text-xs rounded ${
            previewFormat === 'compressed'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          压缩
        </button>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-100 rounded"
          title="复制到剪贴板"
        >
          {copied ? (
            <Check size={16} className="text-green-600" />
          ) : (
            <Copy size={16} className="text-gray-600" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {schema ? (
          <pre className="p-4 text-sm font-mono text-gray-800 whitespace-pre-wrap break-words">
            {jsonContent}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            暂无内容
          </div>
        )}
      </div>
    </div>
  );
}
