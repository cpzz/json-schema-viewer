import { SchemaNode } from './schema';

export interface EditorState {
  selectedNodeId: string | null;
  expandedNodes: Set<string>;
  clipboard: SchemaNode | null;
  isDirty: boolean;
  filePath: string | null;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}
