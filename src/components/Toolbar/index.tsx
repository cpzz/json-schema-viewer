import {
  FilePlus,
  FileInput,
  FolderOpen,
  Save,
  RefreshCw,
  CheckCircle,
  Braces,
  Globe,
  Moon,
  Sun,
  PanelLeft,
} from 'lucide-react';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useFileExplorerStore } from '@/stores/fileExplorerStore';
import { useSchemaFile } from '@/hooks/useSchemaFile';
import { useI18n } from '@/stores/languageStore';
import { useTheme } from '@/stores/themeStore';
import { saveSchema, refreshSchema, getActiveWebFileHandle } from '@/services/importExportService';
import { validateSchema } from '@/services/validationService';

export function Toolbar() {
  const { rootSchema, setRootSchema } = useSchemaStore();
  const { isDirty, filePath, markClean, setFilePath } = useEditorStore();
  const { toggleRefManager } = useUIStore();
  const { showFileExplorer, toggleFileExplorer } = useLayoutStore();
  const { promoteUnsavedToFile } = useFileExplorerStore();
  const { newFile, openFileDialog, openDirectory } = useSchemaFile();
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const handleSave = async () => {
    if (!rootSchema) return;
    const wasNew = !filePath;
    const newFilePath = await saveSchema(filePath, rootSchema);
    if (newFilePath) {
      setFilePath(newFilePath);
      markClean();
      if (wasNew) {
        const name =
          newFilePath.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || newFilePath;
        promoteUnsavedToFile({ path: newFilePath, name, handle: getActiveWebFileHandle() });
      }
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
        onClick={toggleFileExplorer}
        className={`p-2 rounded transition-colors ${
          showFileExplorer
            ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={t('toggleFileExplorer')}
      >
        <PanelLeft size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2" />

      <button
        onClick={newFile}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title={t('newFile')}
      >
        <FilePlus size={18} />
      </button>
      <button
        onClick={openFileDialog}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title={t('openFile')}
      >
        <FileInput size={18} />
      </button>
      <button
        onClick={openDirectory}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title={t('openDirectory')}
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
    </div>
  );
}
