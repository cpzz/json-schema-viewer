import { Toolbar } from '@/components/Toolbar';
import { TreeEditor } from '@/components/TreeEditor';
import { PropertyPanel } from '@/components/PropertyPanel';
import { PreviewPanel } from '@/components/PreviewPanel';
import { RefManager } from '@/components/RefManager';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';

function App() {
  const { rootSchema, setRootSchema, createNode } = useSchemaStore();
  const { markDirty } = useEditorStore();

  const handleAddRootNode = () => {
    const node = createNode('object', 'root');
    setRootSchema(node);
    useEditorStore.getState().toggleExpand(node.id);
    markDirty();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
          <div className="h-10 border-b border-gray-200 flex items-center px-4">
            <span className="text-sm font-medium text-gray-900">
              树形编辑器
            </span>
          </div>
          <TreeEditor schema={rootSchema} onAddRootNode={handleAddRootNode} />
        </div>

        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="h-10 border-b border-gray-200 flex items-center px-4 bg-white">
            <span className="text-sm font-medium text-gray-900">
              属性面板
            </span>
          </div>
          <PropertyPanel />
        </div>

        <div className="w-1/3 flex flex-col">
          <PreviewPanel schema={rootSchema} />
        </div>
      </div>

      <RefManager />
    </div>
  );
}

export default App;
