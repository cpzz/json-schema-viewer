import { useCallback } from 'react';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { useFileExplorerStore } from '@/stores/fileExplorerStore';
import { useI18n } from '@/stores/languageStore';
import {
  pickFiles,
  pickDirectory,
  readFileContent,
  getFileHandle,
} from '@/services/fileSystemService';
import { setActiveWebFileHandle } from '@/services/importExportService';
import { parseJsonSchema } from '@/utils/schemaParser';
import { FileTreeItem } from '@/types/fileTree';

/** 统一的 schema 文件操作：新建 / 打开文件 / 打开目录 / 从文件树打开 */
export function useSchemaFile() {
  const { setRootSchema } = useSchemaStore();
  const { isDirty, markClean, markDirty, setFilePath } = useEditorStore();
  const { addRoots, addUnsavedFile, setSelectedPath } = useFileExplorerStore();
  const { t } = useI18n();

  const confirmDiscard = useCallback(
    () => !isDirty || confirm(t('unsavedChanges')),
    [isDirty, t]
  );

  // 实际加载（不含未保存确认）
  const loadItem = useCallback(
    async (item: FileTreeItem) => {
      const content = await readFileContent(item);
      const json = JSON.parse(content);
      const schema = parseJsonSchema(json);
      setRootSchema(schema);
      setFilePath(item.path);
      setActiveWebFileHandle(getFileHandle(item));
      setSelectedPath(item.path);
      markClean();
    },
    [setRootSchema, setFilePath, setSelectedPath, markClean]
  );

  // 从文件树点击文件时调用
  const openFile = useCallback(
    async (item: FileTreeItem) => {
      if (item.isUnsaved) {
        setSelectedPath(item.path);
        return;
      }
      if (!confirmDiscard()) return;
      try {
        await loadItem(item);
      } catch (error) {
        alert(t('fileLoadFailed') + ' ' + (error as Error).message);
      }
    },
    [confirmDiscard, loadItem, setSelectedPath, t]
  );

  // 工具栏“打开文件”：选择文件 -> 加入文件树 -> 打开第一个
  const openFileDialog = useCallback(async () => {
    if (!confirmDiscard()) return;
    try {
      const items = await pickFiles();
      if (items.length === 0) return;
      addRoots(items);
      await loadItem(items[0]);
    } catch (error) {
      alert(t('fileOpenFailed') + ' ' + (error as Error).message);
    }
  }, [confirmDiscard, addRoots, loadItem, t]);

  // 工具栏“打开目录”：选择文件夹 -> 加入文件树
  const openDirectory = useCallback(async () => {
    try {
      const dir = await pickDirectory();
      if (dir) addRoots([dir]);
    } catch (error) {
      alert(t('fileOpenFailed') + ' ' + (error as Error).message);
    }
  }, [addRoots, t]);

  // 工具栏“新建文件”：创建空 schema + 在文件树显示未保存项
  const newFile = useCallback(() => {
    if (!confirmDiscard()) return;
    const emptySchema = useSchemaStore.getState().createNode('object');
    setRootSchema(emptySchema);
    setFilePath(null);
    setActiveWebFileHandle(null);
    const item = addUnsavedFile(t('untitledFile'));
    setSelectedPath(item.path);
    markDirty();
  }, [confirmDiscard, setRootSchema, setFilePath, addUnsavedFile, setSelectedPath, markDirty, t]);

  return { openFile, openFileDialog, openDirectory, newFile };
}
