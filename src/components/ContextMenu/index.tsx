import { useEffect, useRef, RefObject } from 'react';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { useI18n } from '@/stores/languageStore';
import { SchemaType, NodeKind, SchemaNode } from '@/types/schema';
import { findNodeById } from '@/utils/treeUtils';
import {
  Type,
  Hash,
  Sigma,
  ToggleLeft,
  Box,
  List,
  Copy,
  Trash2,
  TableProperties,
  CircleOff,
  Asterisk,
} from 'lucide-react';

interface NodeMenuProps {
  nodeId: string;
  nodeType?: SchemaType;
  nodeKind?: NodeKind;
  anchorRef: RefObject<HTMLButtonElement>;
  onClose: () => void;
}

export function NodeMenu({ nodeId, nodeType, nodeKind, anchorRef, onClose }: NodeMenuProps) {
  const { addNode, addArrayContainer, removeNode, createNode } = useSchemaStore();
  const { copyNode } = useEditorStore();
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);

  // Define constants first so they can be used in calculations
  const ADD_ITEMS: { type?: SchemaType; label: string; icon: typeof Type }[] = [
    { type: 'string', label: t('addString') || '字符串', icon: Type },
    { type: 'number', label: t('addNumber') || '数字', icon: Sigma },
    { type: 'integer', label: t('addInteger') || '整数', icon: Hash },
    { type: 'boolean', label: t('addBoolean') || '布尔值', icon: ToggleLeft },
    { type: 'object', label: t('addObject') || '对象', icon: Box },
    { type: 'array', label: t('addArray') || '数组', icon: List },
    { type: 'null', label: t('addNull') || 'Null', icon: CircleOff },
    { type: undefined, label: t('typeAny'), icon: Asterisk },
  ];

  const APPLICATOR_KINDS: Array<{ kind: NodeKind; label: string }> = [
    { kind: 'properties', label: t('properties') },
    { kind: 'patternProperties', label: t('patternProperties') },
    { kind: 'additionalProperties', label: t('additionalProperties') },
    { kind: 'propertyNames', label: t('propertyNames') },
    { kind: 'dependentSchemas', label: t('dependentSchemas') },
  ];

  const ARRAY_CONTAINER_KINDS: Array<{ kind: NodeKind; label: string }> = [
    { kind: 'prefixItems', label: t('arrayPrefixItemsNode') },
    { kind: 'items', label: t('arrayItemsNode') },
    { kind: 'contains', label: t('arrayContainsNode') },
  ];

  const COMPOSITION_KINDS: Array<{ kind: NodeKind; label: string }> = [
    { kind: 'allOf', label: t('allOf') },
    { kind: 'anyOf', label: t('anyOf') },
    { kind: 'oneOf', label: t('oneOf') },
    { kind: 'not', label: t('not') },
  ];

  const APPLICATOR_KIND_SET = new Set([
    ...APPLICATOR_KINDS.map(a => a.kind),
    ...ARRAY_CONTAINER_KINDS.map(a => a.kind),
    ...COMPOSITION_KINDS.map(a => a.kind),
  ]);

  const isApplicatorNode = nodeKind != null && APPLICATOR_KIND_SET.has(nodeKind);

  // 是否为 *Of 组合容器节点
  const isCompositionContainer =
    nodeKind === 'allOf' || nodeKind === 'anyOf' || nodeKind === 'oneOf' || nodeKind === 'not';

  // 计算当前 object 节点缺失的应用器类型
  let missingApplicatorKinds: Array<{ kind: NodeKind; label: string }> = [];
  if (!isApplicatorNode && nodeType === 'object') {
    const { rootSchema } = useSchemaStore.getState();
    const thisNode = rootSchema ? findNodeById(rootSchema, nodeId) : null;
    const existingKinds = new Set(thisNode?._containers?.map(c => c._nodeKind) || []);
    missingApplicatorKinds = APPLICATOR_KINDS.filter(a => !existingKinds.has(a.kind));
  }

  // 组合关键字（allOf/anyOf/oneOf/not）的新增入口仅在 object 节点上提供
  let missingCompositionKinds: Array<{ kind: NodeKind; label: string }> = [];
  if (!isApplicatorNode && nodeType === 'object') {
    const { rootSchema } = useSchemaStore.getState();
    const thisNode = rootSchema ? findNodeById(rootSchema, nodeId) : null;
    const existingKinds = new Set(thisNode?._containers?.map(c => c._nodeKind) || []);
    missingCompositionKinds = COMPOSITION_KINDS.filter(a => !existingKinds.has(a.kind));
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [anchorRef, onClose]);

  const handleAddChild = (type?: SchemaType) => {
    const node = createNode(type);
    addNode(nodeId, node);
    onClose();
  };

  // 在 *Of 容器上添加一个"带对象应用器"的子模式（无类型，避免多余 type:object）
  const handleAddApplicatorEntry = (applicatorKind: NodeKind) => {
    const entry = createNode();
    const applicatorContainer: SchemaNode = {
      id: `node_${Date.now()}_${Math.random()}`,
      type: 'object',
      title: applicatorKind,
      _nodeKind: applicatorKind,
      _order: 0,
      _parentId: entry.id,
    };
    const entryWithApplicator: SchemaNode = { ...entry, _containers: [applicatorContainer] };

    if (applicatorKind === 'properties') {
      entryWithApplicator.properties = {};
    } else if (applicatorKind === 'patternProperties') {
      entryWithApplicator.patternProperties = {};
    }

    addNode(nodeId, entryWithApplicator);
    onClose();
  };

  const handleAddArrayContainer = (target: 'items' | 'prefixItems' | 'contains') => {
    addArrayContainer(nodeId, target);
    onClose();
  };

  const handleAddApplicator = (kind: NodeKind) => {
    const { rootSchema, updateNode, createNode } = useSchemaStore.getState();
    const { toggleExpand } = useEditorStore.getState();
    const thisNode = rootSchema ? findNodeById(rootSchema, nodeId) : null;
    if (!thisNode) return;

    const newContainer: SchemaNode = {
      id: `node_${Date.now()}_${Math.random()}`,
      type: 'object',
      title: kind,
      _nodeKind: kind,
      _order: 0,
      _parentId: nodeId,
    };

    // Create the actual field data based on the applicator kind
    const updates: Partial<SchemaNode> = {
      _containers: [...(thisNode._containers || []), newContainer],
    };

    if (kind === 'properties') {
      updates.properties = {};
    } else if (kind === 'patternProperties') {
      updates.patternProperties = {};
    } else if (kind === 'propertyNames') {
      updates.propertyNames = createNode('object', 'propertyNames schema');
    } else if (kind === 'dependentSchemas') {
      updates.dependentSchemas = {};
    } else if (kind === 'additionalProperties') {
      updates.additionalProperties = false;
    }

    updateNode(nodeId, updates);
    // Expand the parent node (if not already expanded) so the new applicator node is visible
    if (!useEditorStore.getState().expandedNodes.has(nodeId)) {
      toggleExpand(nodeId);
    }
    // Move focus to the newly created applicator node
    setTimeout(() => {
      useEditorStore.getState().selectNode(newContainer.id);
    }, 0);
    onClose();
  };

  const handleAddComposition = (kind: NodeKind) => {
    const { rootSchema, updateNode } = useSchemaStore.getState();
    const { toggleExpand } = useEditorStore.getState();
    const thisNode = rootSchema ? findNodeById(rootSchema, nodeId) : null;
    if (!thisNode) return;

    const newContainer: SchemaNode = {
      id: `node_${Date.now()}_${Math.random()}`,
      type: 'object',
      title: kind,
      _nodeKind: kind,
      _order: thisNode._containers?.length || 0,
      _parentId: nodeId,
    };

    const updates: Partial<SchemaNode> = {
      _containers: [...(thisNode._containers || []), newContainer],
    };

    if (kind === 'allOf') updates.allOf = thisNode.allOf || [];
    else if (kind === 'anyOf') updates.anyOf = thisNode.anyOf || [];
    else if (kind === 'oneOf') updates.oneOf = thisNode.oneOf || [];
    // not 子模式在添加子节点时才创建

    updateNode(nodeId, updates);
    if (!useEditorStore.getState().expandedNodes.has(nodeId)) {
      toggleExpand(nodeId);
    }
    setTimeout(() => {
      useEditorStore.getState().selectNode(newContainer.id);
    }, 0);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(t('deleteConfirm'))) {
      removeNode(nodeId);
    }
    onClose();
  };

  const handleCopy = () => {
    const { rootSchema } = useSchemaStore.getState();
    if (!rootSchema) return;
    const node = findNodeById(rootSchema, nodeId);
    if (node) {
      copyNode(node);
    }
    onClose();
  };

  const APPLICATOR_MENU_LABELS: Record<string, string> = {
    properties: t('addProperties') || '添加属性',
    patternProperties: t('addPatternProperties') || '添加模式属性',
    dependentSchemas: t('addDependentSchemas') || '添加依赖',
    items: t('arrayAddChildToItems'),
    prefixItems: t('arrayAddChildToPrefixItems'),
    contains: t('arrayAddChildToContains'),
  };

  const rootSchema = useSchemaStore.getState().rootSchema;
  const currentNode = rootSchema ? findNodeById(rootSchema, nodeId) : null;
  const parentNode = currentNode?._parentId && rootSchema ? findNodeById(rootSchema, currentNode._parentId) : null;
  
  // 检查是否可以添加子节点
  let canAddChildren = true;
  if (nodeKind === 'items' || nodeKind === 'contains') {
    // items/contains 容器只能有一个子节点
    if (nodeKind === 'items') {
      canAddChildren = !parentNode?.items;
    } else if (nodeKind === 'contains') {
      canAddChildren = !parentNode?.contains;
    }
  } else if (nodeKind === 'additionalProperties' || nodeKind === 'propertyNames') {
    // additionalProperties/propertyNames 也只能有一个子节点
    if (nodeKind === 'additionalProperties') {
      canAddChildren = !parentNode?.additionalProperties;
    } else if (nodeKind === 'propertyNames') {
      canAddChildren = !parentNode?.propertyNames;
    }
  } else if (nodeKind === 'not') {
    // not 只能有一个子模式
    canAddChildren = !parentNode?.not;
  }

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
    >
      {/* 应用器节点（非 *Of）或无类型节点：添加子节点 */}
      {((isApplicatorNode && !isCompositionContainer) || (!isApplicatorNode && !nodeType)) && canAddChildren && (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 font-medium">
            {APPLICATOR_MENU_LABELS[nodeKind!] || t('addNode')}
          </div>
          {ADD_ITEMS.map(({ type, label, icon: Icon }) => (
            <button
              key={type ?? 'any'}
              onClick={() => handleAddChild(type)}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap"
            >
              <Icon size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        </>
      )}

      {/* *Of 容器：包含 object 的"添加应用器"菜单（每选一个，向该 *Of 追加一个带该应用器的对象子模式） */}
      {isCompositionContainer && canAddChildren && (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 font-medium">{t('addApplicator')}</div>
          {APPLICATOR_KINDS.filter((a) => a.kind === 'properties' || a.kind === 'patternProperties').map(({ kind, label }) => (
            <button
              key={kind}
              onClick={() => handleAddApplicatorEntry(kind)}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap"
            >
              <TableProperties size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        </>
      )}

      {/* object 节点：添加应用器 */}
      {nodeType === 'object' && !isApplicatorNode && (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 font-medium">{t('addApplicator')}</div>
          {missingApplicatorKinds.length > 0 ? (
            missingApplicatorKinds.map(({ kind, label }) => (
              <button
                key={kind}
                onClick={() => handleAddApplicator(kind)}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap"
              >
                <TableProperties size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
                <span>{label}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500 italic">{t('allApplicatorsIncluded')}</div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        </>
      )}

      {/* array 节点：创建数组容器 */}
      {nodeType === 'array' && !isApplicatorNode && (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 font-medium">{t('addNode')}</div>
          {(() => {
            const thisNode = rootSchema ? findNodeById(rootSchema, nodeId) : null;
            const existingKinds = new Set(thisNode?._containers?.map((container) => container._nodeKind) || []);
            return ARRAY_CONTAINER_KINDS.filter(({ kind }) => !existingKinds.has(kind)).map(({ kind, label }) => (
            <button
              key={kind}
              onClick={() => handleAddArrayContainer(kind as 'items' | 'prefixItems' | 'contains')}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap"
            >
              <TableProperties size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <span>{label}</span>
            </button>
            ));
          })()}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        </>
      )}

      {/* 仅 object 节点：添加组合关键字 allOf/anyOf/oneOf/not */}
      {nodeType === 'object' && !isApplicatorNode && missingCompositionKinds.length > 0 && (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 font-medium">{t('addComposition')}</div>
          {missingCompositionKinds.map(({ kind, label }) => (
            <button
              key={kind}
              onClick={() => handleAddComposition(kind)}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap"
            >
              <TableProperties size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        </>
      )}

      {/* 复制 / 删除 */}
      {!isApplicatorNode && (
        <>
          <button
            onClick={handleCopy}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap"
          >
            <Copy size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
            <span>{t('copy')}</span>
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 whitespace-nowrap"
          >
            <Trash2 size={14} className="shrink-0" />
            <span>{t('delete')}</span>
          </button>
        </>
      )}
      {/* 应用器节点的删除 */}
      {isApplicatorNode && (
        <button
          onClick={handleDelete}
          className="w-full px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 whitespace-nowrap"
        >
          <Trash2 size={14} className="shrink-0" />
          <span>{t('delete')}</span>
        </button>
      )}
    </div>
  );
}
