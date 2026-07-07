import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    save: (filePath: string, content: string) =>
      ipcRenderer.invoke('file:save', { filePath, content }),
    saveAs: (content: string) => ipcRenderer.invoke('file:saveAs', content),
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
});
