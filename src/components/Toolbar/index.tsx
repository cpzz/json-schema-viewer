import {
  FilePlus,
  FolderOpen,
  Save,
  RefreshCw,
  CheckCircle,
  Braces,
  Globe,
  Moon,
  Sun,
} from 'lucide-react';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { useI18n } from '@/stores/languageStore';
import { useTheme } from '@/stores/themeStore';
import { importSchema, saveSchema, refreshSchema } from '@/services/importExportService';
import { validateSchema } from '@/services/validationService';

export function Toolbar() {
  const { rootSchema, setRootSchema } = useSchemaStore();
  const { isDirty, filePath, markClean, setFilePath } = useEditorStore();
  const { toggleRefManager } = useUIStore();
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const handleNew = () => {
    if (isDirty && !confirm(t('unsavedChanges'))) {
      return;
    }
    const emptySchema = useSchemaStore.getState().createNode('object');
    setRootSchema(emptySchema);
    setFilePath(null);
    markClean();
  };

  const handleOpen = async () => {
    try {
      const result = await importSchema();
      if (result) {
        setRootSchema(result.schema);
        setFilePath(result.filePath);
        markClean();
      }
    } catch (error) {
      alert(t('fileOpenFailed') + ' ' + (error as Error).message);
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
    if (!confirm(t('confirmRefresh'))) {
      return;
    }
    try {
      const schema = await refreshSchema(filePath);
      if (schema) {
        setRootSchema(schema);
        markClean();
      }
    } catch (error) {
      alert(t('refreshFailed') + ' ' + (error as Error).message);
    }
  };

  const handleValidate = () => {
    const result = validateSchema(rootSchema);
    if (result.valid) {
      alert(t('schemaValidationPassed'));
    } else {
      const errors = result.errors.map((e) => `${e.path}: ${e.message}`).join('\n');
      alert(t('schemaValidationFailed') + '\n' + errors);
    }
  };

  return (
    <div className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2">
      <button
        onClick={handleNew}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title={t('new')}
      >
        <FilePlus size={18} />
      </button>
      <button
        onClick={handleOpen}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title={t('open')}
      >
        <FolderOpen size={18} />
      </button>
      <button
        onClick={handleSave}
        disabled={!rootSchema || !isDirty}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
        title={t('save')}
      >
        <Save size={18} />
      </button>
      <button
        onClick={handleRefresh}
        disabled={!filePath || !isDirty}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
        title={t('refresh')}
      >
        <RefreshCw size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2" />

      <button
        onClick={handleValidate}
        disabled={!rootSchema}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
        title={t('validate')}
      >
        <CheckCircle size={18} />
      </button>
      <button
        onClick={toggleRefManager}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title={t('refManager')}
      >
        <Braces size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2" />

      <div className="flex-1" />

      {/* Language toggle */}
      <button
        onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title={language === 'zh' ? 'English' : '中文'}
      >
        <Globe size={18} />
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        {isDirty ? t('unsaved') : t('saved')}
      </div>
    </div>
  );
}
