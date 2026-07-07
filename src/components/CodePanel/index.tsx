import { useRef, useEffect, RefObject } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { SchemaNode } from '@/types/schema';
import { useEditorStore } from '@/stores/editorStore';
import { useI18n } from '@/stores/languageStore';
import { useTheme } from '@/stores/themeStore';

interface CodePanelProps {
  schema: SchemaNode | null;
  jsonContent: string;
  lineMapRef: RefObject<Map<string, number>>;
}

export function CodePanel({ schema, jsonContent, lineMapRef }: CodePanelProps) {
  const { selectedNodeId } = useEditorStore();
  const { t } = useI18n();
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  // 当选中节点变化时，在 JSON 中高亮显示对应行
  useEffect(() => {
    if (!editorRef.current || !selectedNodeId || !schema) {
      // 清除之前的高亮
      if (editorRef.current && decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      }
      return;
    }

    const lineNumber = lineMapRef.current?.get(selectedNodeId);
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
  }, [selectedNodeId, jsonContent, schema]);

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';

  return (
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
            automaticLayout: true,
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
  );
}
