export interface ElectronAPI {
  file: {
    open: () => Promise<{ path: string; content: string } | null>;
    save: (filePath: string, content: string) => Promise<boolean>;
    saveAs: (content: string) => Promise<{ path: string } | null>;
    read: (filePath: string) => Promise<string | null>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
