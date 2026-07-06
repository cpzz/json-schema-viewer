import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useSchemaStore } from '@/stores/schemaStore';
import { useUIStore } from '@/stores/uiStore';
import { useI18n } from '@/stores/languageStore';

export function RefManager() {
  const { definitions, addDefinition, removeDefinition, createNode } =
    useSchemaStore();
  const { showRefManager, toggleRefManager } = useUIStore();
  const { t } = useI18n();
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
    if (confirm(t('deleteConfirm'))) {
      removeDefinition(name);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center px-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('refManagerTitle')}</h2>
          <div className="flex-1" />
          <button
            onClick={toggleRefManager}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X size={20} className="text-gray-900 dark:text-gray-100" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {Object.keys(definitions).length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-12">
              {t('noDefinitions')}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(definitions).map(([name, schema]) => (
                <div
                  key={name}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center gap-4 bg-white dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('type')}: {schema.type}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDefinition(name)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded"
                    title={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {showAddDialog ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newDefName}
                onChange={(e) => setNewDefName(e.target.value)}
                placeholder={t('definitionName')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddDefinition}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {t('confirm')}
              </button>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewDefName('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {t('cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddDialog(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {t('addDef')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
