import {
  FilePlus,
  FolderOpen,
  Save,
  SaveAs,
  RefreshCw,
  Upload,
  Undo,
  Redo,
  CheckCircle,
  Braces,
} from 'lucide-react';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { importSchema, saveSchema, refreshSchema } from '@/services/importExportService';
import { validateSchema } from '@/services/validationService';

export function Toolbar() {
  const { rootSchema, setRootSchema } = useSchemaStore();
  const { isDirty, filePath, markClean, setFilePath } = useEditorStore();
  const { toggleRefManager } = useUIStore();

  const handleNew = () => {
    if (isDirty && !confirm('有未保存的更改，确定要新建吗？')) {
      return;
    }
    setRootSchema(null);
    setFilePath(null);
    markClean();
  };

  const handleOpen = async () => {
    try {
      const result = await importSchema('');
      if (result) {
        setRootSchema(result.schema);
        setFilePath(result.filePath);
        markClean();
      }
    } catch (error) {
      alert('打开文件失败：' + (error as Error).message);
    }
  };

  const handleSave = async () => {
    if (!rootSchema) return;
    const newFilePath = await saveSchema(filePath, rootSchema);
    if (newFilePath) {
      setFilePath(newFilePath);
      markClean();
    }
  };

  const handleRefresh = async () => {
    if (!filePath || !isDirty) return;
    if (!confirm('确定要从文件重新加载吗？当前未保存的更改将丢失。')) {
      return;
    }
    try {
      const schema = await refreshSchema(filePath);
      if (schema) {
        setRootSchema(schema);
        markClean();
      }
    } catch (error) {
      alert('刷新失败：' + (error as Error).message);
    }
  };

  const handleValidate = () => {
    const result = validateSchema(rootSchema);
    if (result.valid) {
      alert('Schema 校验通过！');
    } else {
      const errors = result.errors.map((e) => `${e.path}: ${e.message}`).join('\n');
      alert('校验失败：\n' + errors);
    }
  };

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2">
      <button
        onClick={handleNew}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="新建"
      >
        <FilePlus size={18} />
      </button>
      <button
        onClick={handleOpen}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="打开"
      >
        <FolderOpen size={18} />
      </button>
      <button
        onClick={handleSave}
        disabled={!rootSchema || !isDirty}
        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
        title="保存"
      >
        <Save size={18} />
      </button>
      <button
        onClick={handleRefresh}
        disabled={!filePath || !isDirty}
        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
        title="刷新"
      >
        <RefreshCw size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      <button
        onClick={handleValidate}
        disabled={!rootSchema}
        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
        title="校验"
      >
        <CheckCircle size={18} />
      </button>
      <button
        onClick={toggleRefManager}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="引用管理"
      >
        <Braces size={18} />
      </button>

      <div className="flex-1" />

      <div className="text-sm text-gray-500">
        {isDirty ? '● 未保存' : '✓ 已保存'}
      </div>
    </div>
  );
}
