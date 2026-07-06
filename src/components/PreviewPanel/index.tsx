import { useMemo, useState, useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { SchemaNode } from '@/types/schema';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { generateJsonSchema, generateJsonSchemaWithLineMap } from '@/utils/schemaGenerator';
import { Copy, Check, AlignLeft } from 'lucide-react';
import { useI18n } from '@/stores/languageStore';
import { useTheme } from '@/stores/themeStore';

interface PreviewPanelProps {
  schema: SchemaNode | null;
}

export function PreviewPanel({ schema }: PreviewPanelProps) {
  const { previewFormat, setPreviewFormat } = useUIStore();
  const { selectedNodeId } = useEditorStore();
  const { t } = useI18n();
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const lineMapRef = useRef<Map<string, number>>(new Map());

  const toggleFormat = () => {
    setPreviewFormat(previewFormat === 'formatted' ? 'compressed' : 'formatted');
  };

  const jsonContent = useMemo(() => {
    if (!schema) return '';
    
    if (previewFormat === 'formatted') {
      // 使用新的函数生成 JSON 并获取行号映射
      const { json, lineMap } = generateJsonSchemaWithLineMap(schema, 2);
      lineMapRef.current = lineMap;
      return json;
    } else {
      // 压缩模式下清空 lineMap
      lineMapRef.current.clear();
      const jsonSchema = generateJsonSchema(schema);
      return JSON.stringify(jsonSchema);
    }
  }, [schema, previewFormat]);

  // 当选中节点变化时，在 JSON 中高亮显示对应行
  useEffect(() => {
    if (!editorRef.current || !selectedNodeId || !schema || previewFormat !== 'formatted') {
      // 清除之前的高亮
      if (editorRef.current && decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      }
      return;
    }

    const lineNumber = lineMapRef.current.get(selectedNodeId);
    if (lineNumber && editorRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      
      if (monaco) {
        // 清除之前的装饰
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        
        // 添加新的背景色装饰
        decorationsRef.current = editor.deltaDecorations([], [
          {
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: 'highlight-line-background',
              glyphMarginClassName: 'glyphMarginClass',
            },
          },
        ]);
      }
      
      // 滚动到该行
      editor.revealLineInCenter(lineNumber);
    }
  }, [selectedNodeId, jsonContent, schema, previewFormat]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';

  return (
    <>
      <div className="h-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2">
        <div className="flex-1" />
        <button
          onClick={toggleFormat}
          className={`p-1 rounded transition-colors ${
            previewFormat === 'formatted'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title={previewFormat === 'formatted' ? t('formatted') : t('compressed')}
        >
          <AlignLeft size={16} />
        </button>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title={t('copyClipboard')}
        >
          {copied ? (
            <Check size={16} className="text-green-600 dark:text-green-400" />
          ) : (
            <Copy size={16} className="text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {schema ? (
          <Editor
            height="100%"
            language="json"
            value={jsonContent}
            theme={editorTheme}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              monacoRef.current = monaco;
            }}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: 'on',
              folding: true,
              foldingStrategy: 'auto',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily: "'Fira Code', 'Consolas', monospace",
              formatOnPaste: false,
              formatOnType: false,
              autoClosingBrackets: 'never',
              autoClosingQuotes: 'never',
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
            {t('noContent')}
          </div>
        )}
      </div>
    </>
  );
}
