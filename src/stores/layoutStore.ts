import { create } from 'zustand';

interface LayoutState {
  // Panel widths (in pixels)
  treeEditorWidth: number;
  propertyPanelWidth: number;
  
  // Actions
  setTreeEditorWidth: (width: number) => void;
  setPropertyPanelWidth: (width: number) => void;
}

const STORAGE_KEY = 'layout-state';

const getInitialState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load layout state:', error);
  }
  
  return {
    treeEditorWidth: 250,
    propertyPanelWidth: 300,
  };
};

export const useLayoutStore = create<LayoutState>((set) => {
  const initialState = getInitialState();

  return {
    ...initialState,
    
    setTreeEditorWidth: (width: number) =>
      set((state) => {
        const newState = { treeEditorWidth: width };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, ...newState }));
        return newState;
      }),
    
    setPropertyPanelWidth: (width: number) =>
      set((state) => {
        const newState = { propertyPanelWidth: width };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, ...newState }));
        return newState;
      }),
  };
});
