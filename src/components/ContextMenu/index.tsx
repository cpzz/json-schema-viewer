import { useEffect, useRef, RefObject } from 'react';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { SchemaType, NodeKind, SchemaNode } from '@/types/schema';
import { findNodeById } from '@/utils/treeUtils';
import {
  Type,
  Hash,
  ToggleLeft,
  Box,
  List,
  Copy,
  Trash2,
  FolderOpen,
} from 'lucide-react';

interface NodeMenuProps {
  nodeId: string;
  nodeType: SchemaType;
  nodeKind?: NodeKind;
  anchorRef: RefObject<HTMLButtonElement>;
  onClose: () => void;
}

const ADD_ITEMS: { type: SchemaType; label: string; icon: typeof Type }[] = [
  { type: 'string', label: '字符串', icon: Type },
  { type: 'number', label: '数字', icon: Hash },
  { type: 'boolean', label: '布尔值', icon: ToggleLeft },
  { type: 'object', label: '对象', icon: Box },
  { type: 'array', label: '数组', icon: List },
];

const APPLICATOR_KINDS: Array<{ kind: NodeKind; label: string }> = [
  { kind: 'properties', label: '普通属性定义' },
  { kind: 'patternProperties', label: '模式属性定义' },
  { kind: 'additionalProperties', label: '额外属性控制' },
  { kind: 'propertyNames', label: '属性名约束' },
  { kind: 'dependentSchemas', label: '条件依赖' },
];

const APPLICATOR_KIND_SET = new Set(APPLICATOR_KINDS.map(a => a.kind));

const APPLICATOR_MENU_LABELS: Record<string, string> = {
  properties: '添加属性',
  patternProperties: '添加模式属性',
  dependentSchemas: '添加依赖',
};

export function NodeMenu({ nodeId, nodeType, nodeKind, anchorRef, onClose }: NodeMenuProps) {
  const { addNode, removeNode, createNode } = useSchemaStore();
  const { copyNode } = useEditorStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const isApplicatorNode = nodeKind != null && APPLICATOR_KIND_SET.has(nodeKind);

  // 获取当前节点信息（用于默认值判断等）
  const { rootSchema: currentRoot } = useSchemaStore.getState();
  const currentNode = nodeId && currentRoot ? findNodeById(currentRoot, nodeId) : null;
  const hasDefault = currentNode?.default !== undefined;

  // 计算当前 object 节点缺失的应用器类型
  let missingApplicatorKinds: Array<{ kind: NodeKind; label: string }> = [];
  if (!isApplicatorNode && nodeType === 'object') {
    const { rootSchema } = useSchemaStore.getState();
    const thisNode = rootSchema ? findNodeById(rootSchema, nodeId) : null;
    const existingKinds = new Set(thisNode?._containers?.map(c => c._nodeKind) || []);
    missingApplicatorKinds = APPLICATOR_KINDS.filter(a => !existingKinds.has(a.kind));
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

  const handleAddChild = (type: SchemaType) => {
    const node = createNode(type);
    addNode(nodeId, node);
    onClose();
  };

  const handleAddApplicator = (kind: NodeKind) => {
    const { rootSchema, updateNode } = useSchemaStore.getState();
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

    const existingContainers = thisNode._containers || [];
    updateNode(nodeId, { _containers: [...existingContainers, newContainer] });
    toggleExpand(nodeId);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('确定要删除这个节点吗？')) {
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

  const handleSetDefault = () => {
    const value = prompt('输入默认值:');
    if (value !== null) {
      const { updateNode } = useSchemaStore.getState();
      updateNode(nodeId, { default: value || undefined });
    }
    onClose();
  };

  const handleClearDefault = () => {
    const { updateNode } = useSchemaStore.getState();
    updateNode(nodeId, { default: undefined });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
    >
      {/* 应用器节点：添加子节点 */}
      {isApplicatorNode && (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 font-medium">
            {APPLICATOR_MENU_LABELS[nodeKind!] || '添加子节点'}
          </div>
          {ADD_ITEMS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => handleAddChild(type)}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Icon size={14} className="text-gray-500" />
              <span>{label}</span>
            </button>
          ))}
          <div className="border-t border-gray-200 my-1" />
        </>
      )}

      {/* object 节点：添加应用器 */}
      {nodeType === 'object' && !isApplicatorNode && (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 font-medium">添加应用器</div>
          {missingApplicatorKinds.length > 0 ? (
            missingApplicatorKinds.map(({ kind, label }) => (
              <button
                key={kind}
                onClick={() => handleAddApplicator(kind)}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <FolderOpen size={14} className="text-gray-500" />
                <span>{label}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-1.5 text-sm text-gray-400 italic">已包含全部应用器类型</div>
          )}
          <div className="border-t border-gray-200 my-1" />
        </>
      )}

      {nodeType === 'object' && !isApplicatorNode && (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 font-medium">默认值</div>
          <button
            onClick={handleSetDefault}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <span>设置默认值</span>
          </button>
          {hasDefault && (
            <button
              onClick={handleClearDefault}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>清除默认值</span>
            </button>
          )}
          <div className="border-t border-gray-200 my-1" />
        </>
      )}

      {/* array 节点：添加子节点 */}
      {nodeType === 'array' && (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 font-medium">添加子节点</div>
          {ADD_ITEMS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => handleAddChild(type)}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Icon size={14} className="text-gray-500" />
              <span>{label}</span>
            </button>
          ))}
          <div className="border-t border-gray-200 my-1" />
        </>
      )}

      {/* 复制 / 删除 */}
      {!isApplicatorNode && (
        <>
          <button
            onClick={handleCopy}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <Copy size={14} className="text-gray-500" />
            <span>复制</span>
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <Trash2 size={14} />
            <span>删除</span>
          </button>
        </>
      )}
      {/* 应用器节点的删除 */}
      {isApplicatorNode && (
        <button
          onClick={handleDelete}
          className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
        >
          <Trash2 size={14} />
          <span>删除</span>
        </button>
      )}
    </div>
  );
}
