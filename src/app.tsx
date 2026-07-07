import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { TreeEditor } from '@/components/TreeEditor';
import { PropertyPanel } from '@/components/PropertyPanel';
import { CodePanel } from '@/components/CodePanel';
import { RefManager } from '@/components/RefManager';
import { FileExplorer } from '@/components/FileExplorer';
import { ResizableDivider } from '@/components/ResizableDivider';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { useTheme } from '@/stores/themeStore';
import { useI18n } from '@/stores/languageStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useFileExplorerStore } from '@/stores/fileExplorerStore';
import { useSchemaFile } from '@/hooks/useSchemaFile';
import { generateJsonSchemaWithLineMap } from '@/utils/schemaGenerator';
import { Copy, Check } from 'lucide-react';

function App() {
  const { rootSchema } = useSchemaStore();
  const { isDirty } = useEditorStore();
  const { theme } = useTheme();
  const { t } = useI18n();
  const {
    treeEditorWidth,
    propertyPanelWidth,
    fileExplorerWidth,
    showFileExplorer,
    setTreeEditorWidth,
    setPropertyPanelWidth,
    setFileExplorerWidth,
  } = useLayoutStore();
  const { hydrate } = useFileExplorerStore();
  const { openFile } = useSchemaFile();
  const [copied, setCopied] = useState(false);
  const lineMapRef = useRef<Map<string, number>>(new Map());

  const jsonContent = useMemo(() => {
    if (!rootSchema) return '';
    const { json, lineMap } = generateJsonSchemaWithLineMap(rootSchema, 2);
    lineMapRef.current = lineMap;
    return json;
  }, [rootSchema]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const handleResizeExplorer = useCallback(
    (deltaX: number) => {
      const newWidth = Math.max(150, fileExplorerWidth + deltaX);
      setFileExplorerWidth(newWidth);
    },
    [fileExplorerWidth, setFileExplorerWidth]
  );

  const handleResizeLeft = useCallback(
    (deltaX: number) => {
      const newWidth = Math.max(150, treeEditorWidth + deltaX);
      setTreeEditorWidth(newWidth);
    },
    [treeEditorWidth, setTreeEditorWidth]
  );

  const handleResizeRight = useCallback(
    (deltaX: number) => {
      const newWidth = Math.max(150, propertyPanelWidth + deltaX);
      setPropertyPanelWidth(newWidth);
    },
    [propertyPanelWidth, setPropertyPanelWidth]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        {showFileExplorer && (
          <>
            <div
              style={{ width: `${fileExplorerWidth}px` }}
              className="shrink-0 select-none border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900"
            >
              <FileExplorer onOpenFile={openFile} />
            </div>
            <ResizableDivider onResize={handleResizeExplorer} />
          </>
        )}

        {/* Tree Editor */}
        <div style={{ width: `${treeEditorWidth}px` }} className="shrink-0 select-none border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
          <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('treeEditor')}</span>
          </div>
          <TreeEditor schema={rootSchema} />
        </div>

        <ResizableDivider onResize={handleResizeLeft} />

        {/* Property Panel */}
        <div style={{ width: `${propertyPanelWidth}px` }} className="shrink-0 select-none border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
          <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('propertyPanel')}</span>
          </div>
          <PropertyPanel />
        </div>

        <ResizableDivider onResize={handleResizeRight} />

        {/* Code Panel */}
        <div className="flex-1 min-w-0 flex flex-col bg-gray-50 dark:bg-gray-950">
          <div className="h-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('codeTitle')}</span>
            <div className="flex-1" />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isDirty ? t('unsaved') : t('saved')}
            </div>
            <button
              onClick={handleCopyCode}
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
          <CodePanel schema={rootSchema} jsonContent={jsonContent} lineMapRef={lineMapRef} />
        </div>
      </div>

      <RefManager />
    </div>
  );
}

export default App;
