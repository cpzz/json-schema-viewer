import { create } from 'zustand';
import { SchemaNode, SchemaType } from '@/types/schema';
import { useEditorStore } from './editorStore';
import { findNodeById } from '@/utils/treeUtils';

interface SchemaStore {
  rootSchema: SchemaNode | null;
  definitions: Record<string, SchemaNode>;

  setRootSchema: (schema: SchemaNode) => void;
  updateNode: (nodeId: string, updates: Partial<SchemaNode>) => void;
  addNode: (parentId: string | null, node: SchemaNode) => void;
  addArrayContainer: (arrayNodeId: string, target: 'items' | 'prefixItems' | 'contains') => void;
  removeNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string, newIndex: number) => void;
  renamePropertyKey: (parentId: string, oldKey: string, newKey: string) => void;
  setRequired: (parentId: string, propertyKey: string, required: boolean) => void;

  addDefinition: (name: string, schema: SchemaNode) => void;
  updateDefinition: (name: string, schema: SchemaNode) => void;
  removeDefinition: (name: string) => void;
  createRef: (definitionName: string) => string;

  createNode: (type?: SchemaType, name?: string) => SchemaNode;
  convertContainerNode: (containerId: string, newKind: string) => void;}

let nodeIdCounter = 0;

export const createNodeId = (): string => {
  return `node_${Date.now()}_${nodeIdCounter++}`;
};

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  rootSchema: null,
  definitions: {},

  setRootSchema: (schema) => set({ rootSchema: schema }),

  updateNode: (nodeId, updates) => {
    const { rootSchema } = get();
    if (!rootSchema) return;

    const updateNodeRecursive = (node: SchemaNode): SchemaNode => {
      if (node.id === nodeId) {
        const updated = { ...node, ...updates };
        // 类型变更为 object 时确保 properties 字段存在
        if (updates.type === 'object' && node.type !== 'object') {
          if (!updated.properties) updated.properties = {};
        }
        return updated;
      }

      let result: SchemaNode = node;

      if (node.properties) {
        const newProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.properties)) {
          newProperties[key] = updateNodeRecursive(child);
        }
        result = { ...result, properties: newProperties };
      }

      if (node.patternProperties) {
        const newPatternProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.patternProperties)) {
          newPatternProperties[key] = updateNodeRecursive(child);
        }
        result = { ...result, patternProperties: newPatternProperties };
      }

      if (node.additionalProperties && typeof node.additionalProperties === 'object') {
        result = { ...result, additionalProperties: updateNodeRecursive(node.additionalProperties) };
      }

      if (node.propertyNames) {
        result = { ...result, propertyNames: updateNodeRecursive(node.propertyNames) };
      }

      if (node.dependentSchemas) {
        const newDependentSchemas: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.dependentSchemas)) {
          newDependentSchemas[key] = updateNodeRecursive(child);
        }
        result = { ...result, dependentSchemas: newDependentSchemas };
      }

      if (node._containers) {
        result = {
          ...result,
          _containers: node._containers.map((container) =>
            updateNodeRecursive(container)
          ),
        };
      }

      if (node.items) {
        result = { ...result, items: updateNodeRecursive(node.items) };
      }

      if (node.prefixItems) {
        result = {
          ...result,
          prefixItems: node.prefixItems.map((item) => updateNodeRecursive(item)),
        };
      }

      if (node.contains) {
        result = { ...result, contains: updateNodeRecursive(node.contains) };
      }

      if (node.allOf) {
        result = { ...result, allOf: node.allOf.map((item) => updateNodeRecursive(item)) };
      }
      if (node.anyOf) {
        result = { ...result, anyOf: node.anyOf.map((item) => updateNodeRecursive(item)) };
      }
      if (node.oneOf) {
        result = { ...result, oneOf: node.oneOf.map((item) => updateNodeRecursive(item)) };
      }
      if (node.not) {
        result = { ...result, not: updateNodeRecursive(node.not) };
      }

      return result;
    };

    set({ rootSchema: updateNodeRecursive(rootSchema) });
    useEditorStore.getState().markDirty();
  },

  addNode: (parentId, node) => {
    const { rootSchema } = get();

    if (!parentId) {
      set({ rootSchema: node });
      useEditorStore.getState().markDirty();
      useEditorStore.getState().selectNode(node.id);
      return;
    }

    if (!rootSchema) return;

    // 检查 parentId 是否是容器节点，如果是则重定向到实际的 object 节点
    let actualParentId = parentId;
    let containerKind: string | undefined;
    const parentNode = findNodeById(rootSchema, parentId);
    if (parentNode && parentNode._nodeKind && parentNode._nodeKind !== 'normal') {
      containerKind = parentNode._nodeKind;
      actualParentId = parentNode._parentId!;
    }

    const addNodeRecursive = (current: SchemaNode): SchemaNode => {
      if (current.id === actualParentId) {
        if (containerKind === 'properties') {
          const nodeName = node.title || `property_${Date.now()}`;
          const isPattern = nodeName.includes('*') || nodeName.startsWith('^') || nodeName.includes('[');

          if (isPattern) {
            const newNode = { ...node, _parentId: current.id, _order: Object.keys(current.patternProperties || {}).length };
            return {
              ...current,
              patternProperties: {
                ...current.patternProperties,
                [nodeName]: newNode,
              },
            };
          } else {
            const newNode = { ...node, _parentId: current.id, _order: Object.keys(current.properties || {}).length };
            return {
              ...current,
              properties: {
                ...(current.properties || {}),
                [nodeName]: newNode,
              },
            };
          }
        }

        if (containerKind === 'patternProperties') {
          const nodeName = node.title || `pattern_${Date.now()}`;
          const newNode = { ...node, _parentId: current.id, _order: Object.keys(current.patternProperties || {}).length };
          return {
            ...current,
            patternProperties: {
              ...current.patternProperties,
              [nodeName]: newNode,
            },
          };
        }

        if (containerKind === 'additionalProperties') {
          return {
            ...current,
            additionalProperties: { ...node, _parentId: current.id },
          };
        }

        if (containerKind === 'dependentSchemas') {
          const nodeName = node.title || `dependency_${Date.now()}`;
          const newNode = { ...node, _parentId: current.id, _order: Object.keys(current.dependentSchemas || {}).length };
          return {
            ...current,
            dependentSchemas: {
              ...current.dependentSchemas,
              [nodeName]: newNode,
            },
          };
        }

        if (containerKind === 'propertyNames') {
          return {
            ...current,
            propertyNames: { ...node, _parentId: current.id },
          };
        }

        if (containerKind === 'items') {
          return {
            ...current,
            items: { ...node, _parentId: current.id, _order: 0 },
          };
        }

        if (containerKind === 'prefixItems') {
          return {
            ...current,
            prefixItems: [...(current.prefixItems || []), { ...node, _parentId: current.id, _order: (current.prefixItems || []).length }],
          };
        }

        if (containerKind === 'contains') {
          return {
            ...current,
            contains: { ...node, _parentId: current.id, _order: 0 },
          };
        }

        if (containerKind === 'allOf') {
          return {
            ...current,
            allOf: [
              ...(current.allOf || []),
              { ...node, _parentId: current.id, _order: (current.allOf || []).length },
            ],
          };
        }

        if (containerKind === 'anyOf') {
          return {
            ...current,
            anyOf: [
              ...(current.anyOf || []),
              { ...node, _parentId: current.id, _order: (current.anyOf || []).length },
            ],
          };
        }

        if (containerKind === 'oneOf') {
          return {
            ...current,
            oneOf: [
              ...(current.oneOf || []),
              { ...node, _parentId: current.id, _order: (current.oneOf || []).length },
            ],
          };
        }

        if (containerKind === 'not') {
          return {
            ...current,
            not: { ...node, _parentId: current.id, _order: 0 },
          };
        }

        // 直接向 object / 无类型节点添加子节点（原有的逻辑）
        if (current.type === 'object' || !current.type) {
          const nodeName = node.title || `property_${Date.now()}`;
          const isPattern = nodeName.includes('*') || nodeName.startsWith('^') || nodeName.includes('[');

          if (isPattern) {
            const newNode = { ...node, _parentId: current.id, _order: Object.keys(current.patternProperties || {}).length };
            return {
              ...current,
              patternProperties: {
                ...current.patternProperties,
                [nodeName]: newNode,
              },
            };
          } else {
            const newNode = { ...node, _parentId: current.id, _order: Object.keys(current.properties || {}).length };
            return {
              ...current,
              properties: {
                ...(current.properties || {}),
                [nodeName]: newNode,
              },
            };
          }
        }
      }

      let result: SchemaNode = current;

      if (current.properties) {
        const newProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(current.properties)) {
          newProperties[key] = addNodeRecursive(child);
        }
        result = { ...result, properties: newProperties };
      }

      if (current.patternProperties) {
        const newPatternProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(current.patternProperties)) {
          newPatternProperties[key] = addNodeRecursive(child);
        }
        result = { ...result, patternProperties: newPatternProperties };
      }

      if (current.additionalProperties && typeof current.additionalProperties === 'object') {
        result = { ...result, additionalProperties: addNodeRecursive(current.additionalProperties) };
      }

      if (current.propertyNames) {
        result = { ...result, propertyNames: addNodeRecursive(current.propertyNames) };
      }

      if (current.dependentSchemas) {
        const newDependentSchemas: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(current.dependentSchemas)) {
          newDependentSchemas[key] = addNodeRecursive(child);
        }
        result = { ...result, dependentSchemas: newDependentSchemas };
      }

      if (current._containers) {
        result = {
          ...result,
          _containers: current._containers.map((container) => addNodeRecursive(container)),
        };
      }

      if (current.items) {
        result = { ...result, items: addNodeRecursive(current.items) };
      }

      if (current.prefixItems) {
        result = {
          ...result,
          prefixItems: current.prefixItems.map((item) => addNodeRecursive(item)),
        };
      }

      if (current.contains) {
        result = { ...result, contains: addNodeRecursive(current.contains) };
      }

      if (current.allOf) {
        result = { ...result, allOf: current.allOf.map((item) => addNodeRecursive(item)) };
      }
      if (current.anyOf) {
        result = { ...result, anyOf: current.anyOf.map((item) => addNodeRecursive(item)) };
      }
      if (current.oneOf) {
        result = { ...result, oneOf: current.oneOf.map((item) => addNodeRecursive(item)) };
      }
      if (current.not) {
        result = { ...result, not: addNodeRecursive(current.not) };
      }

      return result;
    };

    set({ rootSchema: addNodeRecursive(rootSchema) });
    useEditorStore.getState().markDirty();
    const editorStore = useEditorStore.getState();
    // Expand the target object node so the new node is visible
    if (!editorStore.expandedNodes.has(actualParentId)) {
      editorStore.toggleExpand(actualParentId);
    }
    // When adding through an applicator container, also expand that container so the new node is visible
    if (containerKind && parentId !== actualParentId && !editorStore.expandedNodes.has(parentId)) {
      editorStore.toggleExpand(parentId);
    }
    // Move focus to the newly created node
    setTimeout(() => {
      useEditorStore.getState().selectNode(node.id);
    }, 0);
  },

  addArrayContainer: (arrayNodeId, target) => {
    const { rootSchema } = get();
    if (!rootSchema) return;

    const addArrayContainerRecursive = (current: SchemaNode): SchemaNode => {
      if (current.id === arrayNodeId && current.type === 'array') {
        const exists = current._containers?.some((container) => container._nodeKind === target);
        if (exists) return current;

        return {
          ...current,
          _containers: [
            ...(current._containers || []),
            {
              id: createNodeId(),
              type: 'array',
              title: target,
              _nodeKind: target,
              _order: (current._containers || []).length,
              _parentId: current.id,
            },
          ],
        };
      }

      let result: SchemaNode = current;

      if (current.properties) {
        const newProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(current.properties)) {
          newProperties[key] = addArrayContainerRecursive(child);
        }
        result = { ...result, properties: newProperties };
      }

      if (current.patternProperties) {
        const newPatternProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(current.patternProperties)) {
          newPatternProperties[key] = addArrayContainerRecursive(child);
        }
        result = { ...result, patternProperties: newPatternProperties };
      }

      if (current.additionalProperties && typeof current.additionalProperties === 'object') {
        result = { ...result, additionalProperties: addArrayContainerRecursive(current.additionalProperties) };
      }

      if (current.propertyNames) {
        result = { ...result, propertyNames: addArrayContainerRecursive(current.propertyNames) };
      }

      if (current.dependentSchemas) {
        const newDependentSchemas: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(current.dependentSchemas)) {
          newDependentSchemas[key] = addArrayContainerRecursive(child);
        }
        result = { ...result, dependentSchemas: newDependentSchemas };
      }

      if (current._containers) {
        result = {
          ...result,
          _containers: current._containers.map((container) => addArrayContainerRecursive(container)),
        };
      }

      if (current.items) {
        result = { ...result, items: addArrayContainerRecursive(current.items) };
      }

      if (current.prefixItems) {
        result = {
          ...result,
          prefixItems: current.prefixItems.map((item) => addArrayContainerRecursive(item)),
        };
      }

      if (current.contains) {
        result = { ...result, contains: addArrayContainerRecursive(current.contains) };
      }

      return result;
    };

    const nextRootSchema = addArrayContainerRecursive(rootSchema);
    set({ rootSchema: nextRootSchema });
    useEditorStore.getState().markDirty();

    const editorStore = useEditorStore.getState();
    if (!editorStore.expandedNodes.has(arrayNodeId)) {
      editorStore.toggleExpand(arrayNodeId);
    }

    const arrayNode = findNodeById(nextRootSchema, arrayNodeId);
    const containerNode = arrayNode?._containers?.find((container) => container._nodeKind === target);
    if (containerNode) {
      setTimeout(() => {
        useEditorStore.getState().selectNode(containerNode.id);
      }, 0);
    }
  },

  removeNode: (nodeId) => {
    const { rootSchema } = get();
    if (!rootSchema || rootSchema.id === nodeId) {
      set({ rootSchema: null });
      useEditorStore.getState().markDirty();
      useEditorStore.getState().selectNode(null);
      return;
    }

    const findParentId = (node: SchemaNode, targetId: string): string | null => {
      if (node.properties) {
        for (const child of Object.values(node.properties)) {
          if (child.id === targetId) return node.id;
          const found = findParentId(child, targetId);
          if (found) return found;
        }
      }
      if (node.patternProperties) {
        for (const child of Object.values(node.patternProperties)) {
          if (child.id === targetId) return node.id;
          const found = findParentId(child, targetId);
          if (found) return found;
        }
      }
      if (node.additionalProperties && typeof node.additionalProperties === 'object') {
        if (node.additionalProperties.id === targetId) return node.id;
        const found = findParentId(node.additionalProperties, targetId);
        if (found) return found;
      }
      if (node.propertyNames) {
        if (node.propertyNames.id === targetId) return node.id;
        const found = findParentId(node.propertyNames, targetId);
        if (found) return found;
      }
      if (node.dependentSchemas) {
        for (const child of Object.values(node.dependentSchemas)) {
          if (child.id === targetId) return node.id;
          const found = findParentId(child, targetId);
          if (found) return found;
        }
      }
      if (node.items) {
        if (node.items.id === targetId) return node.id;
        const found = findParentId(node.items, targetId);
        if (found) return found;
      }
      if (node.prefixItems) {
        for (const item of node.prefixItems) {
          if (item.id === targetId) return node.id;
          const found = findParentId(item, targetId);
          if (found) return found;
        }
      }
      if (node.contains) {
        if (node.contains.id === targetId) return node.id;
        const found = findParentId(node.contains, targetId);
        if (found) return found;
      }
      if (node.allOf) {
        for (const child of node.allOf) {
          if (child.id === targetId) return node.id;
          const found = findParentId(child, targetId);
          if (found) return found;
        }
      }
      if (node.anyOf) {
        for (const child of node.anyOf) {
          if (child.id === targetId) return node.id;
          const found = findParentId(child, targetId);
          if (found) return found;
        }
      }
      if (node.oneOf) {
        for (const child of node.oneOf) {
          if (child.id === targetId) return node.id;
          const found = findParentId(child, targetId);
          if (found) return found;
        }
      }
      if (node.not) {
        if (node.not.id === targetId) return node.id;
        const found = findParentId(node.not, targetId);
        if (found) return found;
      }
      if (node._containers) {
        for (const container of node._containers) {
          if (container.id === targetId) return node.id;
          const found = findParentId(container, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const parentId = findParentId(rootSchema, nodeId);

    const removeNodeRecursive = (node: SchemaNode): SchemaNode => {
      let result: SchemaNode = node;

      if (node.properties) {
        const newProperties: Record<string, SchemaNode> = {};
        const removedKeys: string[] = [];
        for (const [key, child] of Object.entries(node.properties)) {
          if (child.id !== nodeId) {
            newProperties[key] = removeNodeRecursive(child);
          } else {
            removedKeys.push(key);
          }
        }
        result = { ...result, properties: newProperties };
        // 同步清理 required 数组
        if (removedKeys.length > 0 && result.required) {
          const newRequired = result.required.filter((k) => !removedKeys.includes(k));
          result = { ...result, required: newRequired.length > 0 ? newRequired : undefined };
        }
      }

      if (node.patternProperties) {
        const newPatternProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.patternProperties)) {
          if (child.id !== nodeId) {
            newPatternProperties[key] = removeNodeRecursive(child);
          }
        }
        result = { ...result, patternProperties: newPatternProperties };
      }

      if (node.additionalProperties && typeof node.additionalProperties === 'object') {
        if (node.additionalProperties.id === nodeId) {
          result = { ...result, additionalProperties: false };
        } else {
          result = { ...result, additionalProperties: removeNodeRecursive(node.additionalProperties) };
        }
      }

      if (node.propertyNames) {
        if (node.propertyNames.id === nodeId) {
          result = { ...result, propertyNames: undefined };
        } else {
          result = { ...result, propertyNames: removeNodeRecursive(node.propertyNames) };
        }
      }

      if (node.dependentSchemas) {
        const newDependentSchemas: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.dependentSchemas)) {
          if (child.id !== nodeId) {
            newDependentSchemas[key] = removeNodeRecursive(child);
          }
        }
        result = { ...result, dependentSchemas: newDependentSchemas };
      }

      // 记录是否删除了数组容器
      let deletedArrayContainerKind: string | null | undefined = null;

      if (node._containers) {
        // 先找到被删除的容器（在过滤之前）
        const deletedContainer = node._containers.find(c => c.id === nodeId);
        
        const newContainers = node._containers
          .filter(c => c.id !== nodeId)
          .map(c => removeNodeRecursive(c));
        
        result = {
          ...result,
          _containers: newContainers.length > 0 ? newContainers : undefined,
        };

        // When an applicator container is deleted, also clear the corresponding field
        if (deletedContainer) {
          deletedArrayContainerKind = deletedContainer._nodeKind;
          if (deletedContainer._nodeKind === 'properties') {
            result = { ...result, properties: undefined, required: undefined };
          } else if (deletedContainer._nodeKind === 'patternProperties') {
            result = { ...result, patternProperties: undefined };
          } else if (deletedContainer._nodeKind === 'additionalProperties') {
            result = { ...result, additionalProperties: undefined };
          } else if (deletedContainer._nodeKind === 'propertyNames') {
            result = { ...result, propertyNames: undefined };
          } else if (deletedContainer._nodeKind === 'dependentSchemas') {
            result = { ...result, dependentSchemas: undefined };
          } else if (deletedContainer._nodeKind === 'items') {
            result = { ...result, items: undefined };
          } else if (deletedContainer._nodeKind === 'prefixItems') {
            result = { ...result, prefixItems: undefined };
          } else if (deletedContainer._nodeKind === 'contains') {
            result = { ...result, contains: undefined, minContains: undefined, maxContains: undefined };
          } else if (deletedContainer._nodeKind === 'allOf') {
            result = { ...result, allOf: undefined };
          } else if (deletedContainer._nodeKind === 'anyOf') {
            result = { ...result, anyOf: undefined };
          } else if (deletedContainer._nodeKind === 'oneOf') {
            result = { ...result, oneOf: undefined };
          } else if (deletedContainer._nodeKind === 'not') {
            result = { ...result, not: undefined };
          }
        }
      }

      // 只有在没有删除对应容器的情况下才处理这些字段
      if (node.items && deletedArrayContainerKind !== 'items') {
        if (node.items.id === nodeId) {
          result = { ...result, items: undefined };
        } else {
          result = { ...result, items: removeNodeRecursive(node.items) };
        }
      }

      if (node.prefixItems && deletedArrayContainerKind !== 'prefixItems') {
        result = {
          ...result,
          prefixItems: node.prefixItems
            .filter((item) => item.id !== nodeId)
            .map((item, index) => ({ ...removeNodeRecursive(item), _order: index })),
        };
      }

      if (node.contains && deletedArrayContainerKind !== 'contains') {
        if (node.contains.id === nodeId) {
          result = { ...result, contains: undefined };
        } else {
          result = { ...result, contains: removeNodeRecursive(node.contains) };
        }
      }

      if (node.allOf && deletedArrayContainerKind !== 'allOf') {
        result = {
          ...result,
          allOf: node.allOf
            .filter((item) => item.id !== nodeId)
            .map((item, index) => ({ ...removeNodeRecursive(item), _order: index })),
        };
      }

      if (node.anyOf && deletedArrayContainerKind !== 'anyOf') {
        result = {
          ...result,
          anyOf: node.anyOf
            .filter((item) => item.id !== nodeId)
            .map((item, index) => ({ ...removeNodeRecursive(item), _order: index })),
        };
      }

      if (node.oneOf && deletedArrayContainerKind !== 'oneOf') {
        result = {
          ...result,
          oneOf: node.oneOf
            .filter((item) => item.id !== nodeId)
            .map((item, index) => ({ ...removeNodeRecursive(item), _order: index })),
        };
      }

      if (node.not && deletedArrayContainerKind !== 'not') {
        if (node.not.id === nodeId) {
          result = { ...result, not: undefined };
        } else {
          result = { ...result, not: removeNodeRecursive(node.not) };
        }
      }

      return result;
    };

    set({ rootSchema: removeNodeRecursive(rootSchema) });
    useEditorStore.getState().markDirty();
    if (parentId) {
      useEditorStore.getState().selectNode(parentId);
    }
  },

  moveNode: (nodeId, newParentId, newIndex) => {
    console.log('Move node', nodeId, 'to', newParentId, 'at index', newIndex);
  },

  renamePropertyKey: (parentId, oldKey, newKey) => {
    const { rootSchema } = get();
    if (!rootSchema || oldKey === newKey) return;

    const renameKeyRecursive = (node: SchemaNode): SchemaNode => {
      if (node.id === parentId) {
        // 处理 properties
        if (node.properties && oldKey in node.properties) {
          const newProperties = { ...node.properties };
          const childNode = newProperties[oldKey];
          delete newProperties[oldKey];
          newProperties[newKey] = childNode;
          // 同步更新 required 数组
          const newRequired = node.required
            ? node.required.map((k) => (k === oldKey ? newKey : k))
            : undefined;
          return { ...node, properties: newProperties, required: newRequired };
        }
        // 处理 patternProperties
        if (node.patternProperties && oldKey in node.patternProperties) {
          const newPatternProperties = { ...node.patternProperties };
          const childNode = newPatternProperties[oldKey];
          delete newPatternProperties[oldKey];
          newPatternProperties[newKey] = childNode;
          return { ...node, patternProperties: newPatternProperties };
        }
        // 处理 dependentSchemas
        if (node.dependentSchemas && oldKey in node.dependentSchemas) {
          const newDependentSchemas = { ...node.dependentSchemas };
          const childNode = newDependentSchemas[oldKey];
          delete newDependentSchemas[oldKey];
          newDependentSchemas[newKey] = childNode;
          return { ...node, dependentSchemas: newDependentSchemas };
        }
      }

      // 递归处理子节点
      if (node.properties) {
        const newProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.properties)) {
          newProperties[key] = renameKeyRecursive(child);
        }
        node = { ...node, properties: newProperties };
      }

      if (node.patternProperties) {
        const newPatternProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.patternProperties)) {
          newPatternProperties[key] = renameKeyRecursive(child);
        }
        node = { ...node, patternProperties: newPatternProperties };
      }

      if (node.additionalProperties && typeof node.additionalProperties === 'object') {
        node = { ...node, additionalProperties: renameKeyRecursive(node.additionalProperties) };
      }

      if (node.propertyNames) {
        node = { ...node, propertyNames: renameKeyRecursive(node.propertyNames) };
      }

      if (node.dependentSchemas) {
        const newDependentSchemas: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.dependentSchemas)) {
          newDependentSchemas[key] = renameKeyRecursive(child);
        }
        node = { ...node, dependentSchemas: newDependentSchemas };
      }

      if (node._containers) {
        node = {
          ...node,
          _containers: node._containers.map((container) =>
            renameKeyRecursive(container)
          ),
        };
      }

      if (node.items) {
        node = { ...node, items: renameKeyRecursive(node.items) };
      }

      if (node.prefixItems) {
        node = {
          ...node,
          prefixItems: node.prefixItems.map((item) => renameKeyRecursive(item)),
        };
      }

      if (node.contains) {
        node = { ...node, contains: renameKeyRecursive(node.contains) };
      }

      return node;
    };

    set({ rootSchema: renameKeyRecursive(rootSchema) });
    useEditorStore.getState().markDirty();
  },

  setRequired: (parentId, propertyKey, required) => {
    const { rootSchema, updateNode } = get();
    if (!rootSchema) return;
    const parentNode = findNodeById(rootSchema, parentId);
    if (!parentNode || parentNode.type !== 'object') return;

    const currentRequired = parentNode.required || [];
    let newRequired: string[];
    if (required) {
      newRequired = currentRequired.includes(propertyKey)
        ? currentRequired
        : [...currentRequired, propertyKey];
    } else {
      newRequired = currentRequired.filter((k) => k !== propertyKey);
    }
    updateNode(parentId, { required: newRequired.length > 0 ? newRequired : undefined });
  },

  addDefinition: (name, schema) => {
    const { definitions } = get();
    set({ definitions: { ...definitions, [name]: schema } });
    useEditorStore.getState().markDirty();
  },

  updateDefinition: (name, schema) => {
    const { definitions } = get();
    set({ definitions: { ...definitions, [name]: schema } });
    useEditorStore.getState().markDirty();
  },

  removeDefinition: (name) => {
    const { definitions } = get();
    const newDefinitions = { ...definitions };
    delete newDefinitions[name];
    set({ definitions: newDefinitions });
    useEditorStore.getState().markDirty();
  },

  createRef: (definitionName) => {
    return `#/definitions/${definitionName}`;
  },

  createNode: (type, name) => {
    const node: SchemaNode = {
      id: createNodeId(),
      type,
      title: name,
      _order: 0,
    };

    if (type === 'array') {
      node._containers = [];
    }

    return node;
  },

  convertContainerNode: (containerId, newKind) => {
    const { rootSchema } = get();
    if (!rootSchema) return;

    const container = findNodeById(rootSchema, containerId);
    if (!container || !container._nodeKind || container._nodeKind === newKind) return;

    const oldKind = container._nodeKind;
    const parentId = container._parentId;
    if (!parentId) return;

    const parentNode = findNodeById(rootSchema, parentId);
    if (!parentNode) return;

    // 检查目标类型是否已被其他容器占用
    const existingKinds = new Set(parentNode._containers?.map(c => c._nodeKind) || []);
    if (existingKinds.has(newKind as any)) return;

    const kindLabels: Record<string, string> = {
      properties: 'properties',
      patternProperties: 'patternProperties',
      additionalProperties: 'additionalProperties',
      propertyNames: 'propertyNames',
      dependentSchemas: 'dependentSchemas',
    };

    const convertRecursive = (node: SchemaNode): SchemaNode => {
      let result = { ...node };

      // 如果当前节点是父节点，做数据迁移
      if (node.id === parentId) {
        // 移出旧数据
        if (oldKind === 'properties') {
          result.properties = {};
        } else if (oldKind === 'patternProperties') {
          result.patternProperties = {};
        } else if (oldKind === 'additionalProperties') {
          result.additionalProperties = false;
        } else if (oldKind === 'propertyNames') {
          result.propertyNames = undefined;
        } else if (oldKind === 'dependentSchemas') {
          result.dependentSchemas = undefined;
        }

        // 移入新数据（仅 properties ↔ patternProperties 之间可迁移数据）
        if (newKind === 'properties' && oldKind === 'patternProperties' && node.patternProperties) {
          result.properties = { ...node.patternProperties };
        } else if (newKind === 'patternProperties' && oldKind === 'properties' && node.properties) {
          result.patternProperties = { ...node.properties };
        } else if (newKind === 'additionalProperties') {
          result.additionalProperties = false;
        } else if (newKind === 'propertyNames') {
          result.propertyNames = { id: createNodeId(), type: 'string', _order: 0, _parentId: node.id };
        } else if (newKind === 'dependentSchemas') {
          result.dependentSchemas = {};
        } else if (newKind === 'properties' && !result.properties) {
          result.properties = {};
        } else if (newKind === 'patternProperties' && !result.patternProperties) {
          result.patternProperties = {};
        }
      }

      // 递归处理子节点
      if (node.properties) {
        const newProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.properties)) {
          newProperties[key] = convertRecursive(child);
        }
        result = { ...result, properties: newProperties };
      }

      if (node.patternProperties) {
        const newPatternProperties: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.patternProperties)) {
          newPatternProperties[key] = convertRecursive(child);
        }
        result = { ...result, patternProperties: newPatternProperties };
      }

      if (node.additionalProperties && typeof node.additionalProperties === 'object') {
        result = { ...result, additionalProperties: convertRecursive(node.additionalProperties) };
      }

      if (node.propertyNames) {
        result = { ...result, propertyNames: convertRecursive(node.propertyNames) };
      }

      if (node.dependentSchemas) {
        const newDependentSchemas: Record<string, SchemaNode> = {};
        for (const [key, child] of Object.entries(node.dependentSchemas)) {
          newDependentSchemas[key] = convertRecursive(child);
        }
        result = { ...result, dependentSchemas: newDependentSchemas };
      }

      if (node._containers) {
        result = {
          ...result,
          _containers: node._containers.map(c => convertRecursive(c)),
        };
      }

      if (node.items) {
        result = { ...result, items: convertRecursive(node.items) };
      }

      if (node.prefixItems) {
        result = { ...result, prefixItems: node.prefixItems.map(item => convertRecursive(item)) };
      }

      if (node.contains) {
        result = { ...result, contains: convertRecursive(node.contains) };
      }

      // 如果当前节点是容器本身，更新类型
      if (node.id === containerId) {
        result = {
          ...result,
          _nodeKind: newKind as any,
          title: kindLabels[newKind] || newKind,
        };
      }

      return result;
    };

    set({ rootSchema: convertRecursive(rootSchema) });
    useEditorStore.getState().markDirty();
  },
}));
