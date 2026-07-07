import { create } from 'zustand';

interface LayoutState {
  // Panel widths (in pixels)
  treeEditorWidth: number;
  propertyPanelWidth: number;
  fileExplorerWidth: number;

  // Visibility
  showFileExplorer: boolean;

  // Actions
  setTreeEditorWidth: (width: number) => void;
  setPropertyPanelWidth: (width: number) => void;
  setFileExplorerWidth: (width: number) => void;
  toggleFileExplorer: () => void;
}

const STORAGE_KEY = 'layout-state';

const getInitialState = () => {
  const defaults = {
    treeEditorWidth: 250,
    propertyPanelWidth: 300,
    fileExplorerWidth: 240,
    showFileExplorer: true,
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load layout state:', error);
  }

  return defaults;
};

export const useLayoutStore = create<LayoutState>((set) => {
  const initialState = getInitialState();

  const persist = (state: LayoutState, patch: Partial<LayoutState>) => {
    const next = { ...state, ...patch };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        treeEditorWidth: next.treeEditorWidth,
        propertyPanelWidth: next.propertyPanelWidth,
        fileExplorerWidth: next.fileExplorerWidth,
        showFileExplorer: next.showFileExplorer,
      })
    );
    return patch;
  };

  return {
    ...initialState,

    setTreeEditorWidth: (width: number) =>
      set((state) => persist(state, { treeEditorWidth: width })),

    setPropertyPanelWidth: (width: number) =>
      set((state) => persist(state, { propertyPanelWidth: width })),

    setFileExplorerWidth: (width: number) =>
      set((state) => persist(state, { fileExplorerWidth: width })),

    toggleFileExplorer: () =>
      set((state) => persist(state, { showFileExplorer: !state.showFileExplorer })),
  };
});
