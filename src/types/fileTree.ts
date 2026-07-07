export type FileTreeItemType = 'file' | 'directory';

export interface FileTreeItem {
  /** 稳定的唯一标识（用于 React key 与选中状态） */
  id: string;
  /** 显示名称 */
  name: string;
  type: FileTreeItemType;
  /** Electron: 绝对路径；Web: 名称/合成路径（真正读取靠 handle） */
  path: string;
  /** 是否为用户直接添加的顶层项（文件夹或文件） */
  isRoot?: boolean;
  /** 是否为未保存的新建文件（无路径/句柄，不持久化） */
  isUnsaved?: boolean;
  /** Web (File System Access API) 的句柄，Electron 下为空 */
  handle?: FileSystemHandle;
}
