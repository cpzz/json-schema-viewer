import { useEffect, useCallback } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { TreeEditor } from '@/components/TreeEditor';
import { PropertyPanel } from '@/components/PropertyPanel';
import { PreviewPanel } from '@/components/PreviewPanel';
import { RefManager } from '@/components/RefManager';
import { ResizableDivider } from '@/components/ResizableDivider';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { useTheme } from '@/stores/themeStore';
import { useI18n } from '@/stores/languageStore';
import { useLayoutStore } from '@/stores/layoutStore';

function App() {
  const { rootSchema, setRootSchema, createNode } = useSchemaStore();
  const { markDirty } = useEditorStore();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { treeEditorWidth, propertyPanelWidth, setTreeEditorWidth, setPropertyPanelWidth } =
    useLayoutStore();

  useEffect(() => {
    // Ensure theme is applied on mount
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleAddRootNode = () => {
    const node = createNode('object', 'root');
    setRootSchema(node);
    useEditorStore.getState().toggleExpand(node.id);
    markDirty();
  };

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
        {/* Tree Editor */}
        <div style={{ width: `${treeEditorWidth}px` }} className="border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
          <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('treeEditor')}</span>
          </div>
          <TreeEditor schema={rootSchema} onAddRootNode={handleAddRootNode} />
        </div>

        <ResizableDivider onResize={handleResizeLeft} />

        {/* Property Panel */}
        <div style={{ width: `${propertyPanelWidth}px` }} className="border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
          <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('propertyPanel')}</span>
          </div>
          <PropertyPanel />
        </div>

        <ResizableDivider onResize={handleResizeRight} />

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
          <div className="h-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('previewTitle')}</span>
          </div>
          <PreviewPanel schema={rootSchema} />
        </div>
      </div>

      <RefManager />
    </div>
  );
}

export default App;
