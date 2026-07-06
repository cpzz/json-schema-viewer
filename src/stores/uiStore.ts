import { create } from 'zustand';
import { ContextMenuState } from '@/types/editor';

interface UIStore {
  contextMenu: ContextMenuState;
  showRefManager: boolean;

  showContextMenu: (x: number, y: number, nodeId: string | null) => void;
  hideContextMenu: () => void;
  toggleRefManager: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
  },
  showRefManager: false,

  showContextMenu: (x, y, nodeId) => {
    set({
      contextMenu: {
        visible: true,
        x,
        y,
        nodeId,
      },
    });
  },

  hideContextMenu: () => {
    set({
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        nodeId: null,
      },
    });
  },

  toggleRefManager: () => {
    set((state) => ({ showRefManager: !state.showRefManager }));
  },
}));
