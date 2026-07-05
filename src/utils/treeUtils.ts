import { SchemaNode } from '@/types/schema';

/** 遍历节点的 properties、patternProperties、additionalProperties、propertyNames、dependentSchemas、_containers、items 中的子节点 */
function forEachChild(
  node: SchemaNode,
  fn: (child: SchemaNode) => void
): void {
  if (node.properties) {
    for (const child of Object.values(node.properties)) {
      fn(child);
    }
  }
  if (node.patternProperties) {
    for (const child of Object.values(node.patternProperties)) {
      fn(child);
    }
  }
  if (node.additionalProperties && typeof node.additionalProperties === 'object') {
    fn(node.additionalProperties);
  }
  if (node.propertyNames) {
    fn(node.propertyNames);
  }
  if (node.dependentSchemas) {
    for (const child of Object.values(node.dependentSchemas)) {
      fn(child);
    }
  }
  if (node._containers) {
    for (const container of node._containers) {
      fn(container);
    }
  }
  if (node.items) {
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        fn(item);
      }
    } else {
      fn(node.items);
    }
  }
}

export function findNodeById(
  root: SchemaNode | null,
  nodeId: string
): SchemaNode | null {
  if (!root) return null;
  if (root.id === nodeId) return root;

  let found: SchemaNode | null = null;
  forEachChild(root, (child) => {
    if (!found) found = findNodeById(child, nodeId);
  });
  return found;
}

export function getAllNodeIds(root: SchemaNode | null): string[] {
  if (!root) return [];
  const ids: string[] = [root.id];

  forEachChild(root, (child) => {
    ids.push(...getAllNodeIds(child));
  });

  return ids;
}

export function getNodePath(
  root: SchemaNode | null,
  nodeId: string,
  path: string[] = []
): string[] | null {
  if (!root) return null;
  if (root.id === nodeId) return path;

  if (root.properties) {
    for (const [key, child] of Object.entries(root.properties)) {
      const result = getNodePath(child, nodeId, [...path, key]);
      if (result) return result;
    }
  }

  if (root.patternProperties) {
    for (const [key, child] of Object.entries(root.patternProperties)) {
      const result = getNodePath(child, nodeId, [...path, `pattern:${key}`]);
      if (result) return result;
    }
  }

  if (root._containers) {
    for (const container of root._containers) {
      const result = getNodePath(container, nodeId, [
        ...path,
        container.title || container._nodeKind || 'container',
      ]);
      if (result) return result;
    }
  }

  if (root.propertyNames) {
    const result = getNodePath(root.propertyNames, nodeId, [...path, 'propertyNames']);
    if (result) return result;
  }

  if (root.dependentSchemas) {
    for (const [key, child] of Object.entries(root.dependentSchemas)) {
      const result = getNodePath(child, nodeId, [...path, `dependent:${key}`]);
      if (result) return result;
    }
  }

  if (root.items) {
    if (Array.isArray(root.items)) {
      for (let i = 0; i < root.items.length; i++) {
        const result = getNodePath(root.items[i], nodeId, [
          ...path,
          'items',
          String(i),
        ]);
        if (result) return result;
      }
    } else {
      const result = getNodePath(root.items, nodeId, [...path, 'items']);
      if (result) return result;
    }
  }

  return null;
}

export function findParentNode(
  root: SchemaNode | null,
  nodeId: string
): SchemaNode | null {
  if (!root) return null;

  let parent: SchemaNode | null = null;
  forEachChild(root, (child) => {
    if (parent) return;
    if (child.id === nodeId) {
      parent = root;
    } else {
      parent = findParentNode(child, nodeId);
    }
  });

  return parent;
}
