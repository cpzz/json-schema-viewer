import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FileJson,
  Folder,
  FolderOpen,
  X,
  Loader2,
} from 'lucide-react';
import { FileTreeItem } from '@/types/fileTree';
import { useFileExplorerStore } from '@/stores/fileExplorerStore';
import { readDirectory } from '@/services/fileSystemService';
import { useI18n } from '@/stores/languageStore';

interface FileExplorerProps {
  onOpenFile: (item: FileTreeItem) => void;
}

export function FileExplorer({ onOpenFile }: FileExplorerProps) {
  const { roots, removeRoot } = useFileExplorerStore();
  const { t } = useI18n();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-auto py-1">
        {roots.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
            {t('emptyExplorer')}
          </div>
        ) : (
          roots.map((item) => (
            <FileTreeNode
              key={item.id}
              item={item}
              level={0}
              onOpenFile={onOpenFile}
              onRemoveRoot={removeRoot}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface FileTreeNodeProps {
  item: FileTreeItem;
  level: number;
  onOpenFile: (item: FileTreeItem) => void;
  onRemoveRoot: (id: string) => void;
}

function FileTreeNode({ item, level, onOpenFile, onRemoveRoot }: FileTreeNodeProps) {
  const { t } = useI18n();
  const { selectedPath } = useFileExplorerStore();
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileTreeItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const isDirectory = item.type === 'directory';
  const isSelected = !isDirectory && selectedPath === item.path;

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await readDirectory(item);
      setChildren(entries);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [item]);

  const handleClick = useCallback(async () => {
    if (isDirectory) {
      const next = !expanded;
      setExpanded(next);
      if (next && children === null) {
        await loadChildren();
      }
    } else {
      onOpenFile(item);
    }
  }, [isDirectory, expanded, children, loadChildren, onOpenFile, item]);

  return (
    <div>
      <div
        onClick={handleClick}
        className={`group flex items-center gap-1 h-7 pr-2 cursor-pointer text-sm transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        title={item.path}
      >
        {isDirectory ? (
          expanded ? (
            <ChevronDown size={14} className="shrink-0 text-gray-400" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-gray-400" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {isDirectory ? (
          expanded ? (
            <FolderOpen size={15} className="shrink-0 text-amber-500" />
          ) : (
            <Folder size={15} className="shrink-0 text-amber-500" />
          )
        ) : (
          <FileJson size={15} className="shrink-0 text-blue-500" />
        )}

        <span className="truncate flex-1">{item.name}</span>

        {item.isUnsaved && (
          <span className="mr-1 text-amber-500" title={t('unsaved')}>
            ●
          </span>
        )}

        {item.isRoot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveRoot(item.id);
            }}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            title={t('removeFromList')}
          >
            <X size={13} className="text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>

      {isDirectory && expanded && (
        <div>
          {loading ? (
            <div
              className="flex items-center gap-1 h-7 text-xs text-gray-400 dark:text-gray-500"
              style={{ paddingLeft: `${(level + 1) * 14 + 8}px` }}
            >
              <Loader2 size={13} className="animate-spin" />
              {t('loading')}
            </div>
          ) : children && children.length > 0 ? (
            children.map((child) => (
              <FileTreeNode
                key={child.id}
                item={child}
                level={level + 1}
                onOpenFile={onOpenFile}
                onRemoveRoot={onRemoveRoot}
              />
            ))
          ) : (
            <div
              className="h-7 flex items-center text-xs text-gray-400 dark:text-gray-500"
              style={{ paddingLeft: `${(level + 1) * 14 + 8}px` }}
            >
              {t('emptyDir')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
