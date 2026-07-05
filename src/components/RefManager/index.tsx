import { useState } from 'react';
import { X, Plus, Edit, Trash2 } from 'lucide-react';
import { useSchemaStore } from '@/stores/schemaStore';
import { useUIStore } from '@/stores/uiStore';
import { SchemaNode } from '@/types/schema';

export function RefManager() {
  const { definitions, addDefinition, removeDefinition, createNode } =
    useSchemaStore();
  const { showRefManager, toggleRefManager } = useUIStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDefName, setNewDefName] = useState('');

  if (!showRefManager) return null;

  const handleAddDefinition = () => {
    if (!newDefName.trim()) return;
    const node = createNode('object', newDefName);
    addDefinition(newDefName, node);
    setNewDefName('');
    setShowAddDialog(false);
  };

  const handleRemoveDefinition = (name: string) => {
    if (confirm(`确定要删除定义 "${name}" 吗？`)) {
      removeDefinition(name);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="h-14 border-b border-gray-200 flex items-center px-6">
          <h2 className="text-lg font-semibold text-gray-900">引用管理</h2>
          <div className="flex-1" />
          <button
            onClick={toggleRefManager}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {Object.keys(definitions).length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              暂无定义，点击下方按钮添加
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(definitions).map(([name, schema]) => (
                <div
                  key={name}
                  className="border border-gray-200 rounded-lg p-4 flex items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{name}</div>
                    <div className="text-sm text-gray-500">
                      类型: {schema.type}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDefinition(name)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4">
          {showAddDialog ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newDefName}
                onChange={(e) => setNewDefName(e.target.value)}
                placeholder="定义名称"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddDefinition}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewDefName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddDialog(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              添加定义
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
