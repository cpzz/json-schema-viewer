import { create } from 'zustand';
import { SchemaNode } from '@/types/schema';
import { EditorState } from '@/types/editor';
import { getAllNodeIds } from '@/utils/treeUtils';

interface EditorStore extends EditorState {
  selectNode: (nodeId: string | null) => void;
  toggleExpand: (nodeId: string) => void;
  expandAll: (root: SchemaNode) => void;
  collapseAll: () => void;
  copyNode: (node: SchemaNode) => void;
  pasteNode: (parentId: string) => void;
  markDirty: () => void;
  markClean: () => void;
  setFilePath: (filePath: string | null) => void;
  reset: () => void;
}

const initialState: EditorState = {
  selectedNodeId: null,
  expandedNodes: new Set<string>(),
  clipboard: null,
  isDirty: false,
  filePath: null,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  toggleExpand: (nodeId) => {
    const { expandedNodes } = get();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    set({ expandedNodes: newExpanded });
  },

  expandAll: (root: SchemaNode) => {
    const ids = getAllNodeIds(root);
    set({ expandedNodes: new Set(ids) });
  },

  collapseAll: () => {
    set({ expandedNodes: new Set() });
  },

  copyNode: (node) => {
    set({ clipboard: JSON.parse(JSON.stringify(node)) });
  },

  pasteNode: (parentId) => {
    const { clipboard } = get();
    if (!clipboard) return;
    console.log('Paste node to', parentId, clipboard);
  },

  markDirty: () => set({ isDirty: true }),

  markClean: () => set({ isDirty: false }),

  setFilePath: (filePath) => set({ filePath }),

  reset: () => set(initialState),
}));
