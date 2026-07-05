import { useRef, useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Type,
  Box,
  List,
  Hash,
  ToggleLeft,
  CircleOff,
  MoreHorizontal,
  FolderOpen,
  Ban,
  Key,
  GitBranch,
} from 'lucide-react';
import { SchemaNode, SchemaType } from '@/types/schema';
import { useEditorStore } from '@/stores/editorStore';
import { NodeMenu } from '@/components/ContextMenu';

interface TreeNodeProps {
  node: SchemaNode;
  level: number;
  parentObject?: SchemaNode;
}

function getTypeIcon(type: SchemaType) {
  switch (type) {
    case 'string':
      return <Type size={14} className="text-green-600" />;
    case 'number':
    case 'integer':
      return <Hash size={14} className="text-blue-600" />;
    case 'boolean':
      return <ToggleLeft size={14} className="text-purple-600" />;
    case 'object':
      return <Box size={14} className="text-orange-600" />;
    case 'array':
      return <List size={14} className="text-pink-600" />;
    case 'null':
      return <CircleOff size={14} className="text-gray-600" />;
    default:
      return <Type size={14} className="text-gray-600" />;
  }
}

function getContainerIcon(kind?: string) {
  switch (kind) {
    case 'properties':
      return <Box size={14} className="text-blue-500" />;
    case 'patternProperties':
      return <List size={14} className="text-purple-500" />;
    case 'additionalProperties':
      return <Ban size={14} className="text-red-400" />;
    case 'propertyNames':
      return <Key size={14} className="text-amber-500" />;
    case 'dependentSchemas':
      return <GitBranch size={14} className="text-teal-500" />;
    default:
      return <FolderOpen size={14} className="text-gray-500" />;
  }
}

function getContainerChildren(node: SchemaNode, parentObject?: SchemaNode): SchemaNode[] {
  if (!parentObject) return [];
  switch (node._nodeKind) {
    case 'properties':
      return Object.values(parentObject.properties || {});
    case 'patternProperties':
      return Object.values(parentObject.patternProperties || {});
    case 'additionalProperties': {
      if (parentObject.additionalProperties && typeof parentObject.additionalProperties === 'object') {
        return [parentObject.additionalProperties];
      }
      return [];
    }
    case 'propertyNames': {
      if (parentObject.propertyNames) {
        return [parentObject.propertyNames];
      }
      return [];
    }
    case 'dependentSchemas':
      return Object.values(parentObject.dependentSchemas || {});
    default:
      return [];
  }
}

function hasContainerChildren(node: SchemaNode, parentObject?: SchemaNode): boolean {
  return getContainerChildren(node, parentObject).length > 0;
}

function TreeNode({ node, level, parentObject }: TreeNodeProps) {
  const { selectedNodeId, selectNode, expandedNodes, toggleExpand } =
    useEditorStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes.has(node.id);

  // 当选中的节点变化时，滚动到该节点
  useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);
  const isContainer = !!node._nodeKind && node._nodeKind !== 'normal';

  // 计算子节点：容器节点从 parentObject 获取虚拟子节点，普通节点从自身字段获取
  let children: SchemaNode[] = [];
  if (isContainer) {
    children = getContainerChildren(node, parentObject);
  } else if (node.items) {
    if (Array.isArray(node.items)) {
      children = node.items;
    } else {
      children = [node.items];
    }
  }
  // 当 _containers 存在时，properties 条目通过容器访问，不在此处渲染
  if (!node._containers) {
    if (node.properties) {
      children = [...children, ...Object.values(node.properties)];
    }
    if (node.patternProperties) {
      children = [...children, ...Object.values(node.patternProperties)];
    }
  }

  const hasChildren = children.length > 0 ||
    (node._containers && node._containers.length > 0) ||
    (isContainer && hasContainerChildren(node, parentObject));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleExpand(node.id);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpand(node.id);
  };

  const handleMenuBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id);
    setMenuOpen((v) => !v);
  };

  const renderAdditionalValue = () => {
    if (node._nodeKind !== 'additionalProperties') return null;
    const value = parentObject?.additionalProperties;
    if (value === undefined || value === false) {
      return <span className="text-xs text-red-500 ml-1">false</span>;
    }
    if (value === true) {
      return <span className="text-xs text-green-500 ml-1">true</span>;
    }
    return null;
  };

  return (
    <div>
      <div
        ref={nodeRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`group flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-100 ${
          isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        } ${isContainer ? 'bg-gray-50' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={handleToggleClick}
            className="p-0.5 hover:bg-gray-200 rounded shrink-0"
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {isContainer ? getContainerIcon(node._nodeKind) : getTypeIcon(node.type)}

        <span className={`text-sm truncate ${isContainer ? 'text-gray-500 font-medium' : 'font-medium text-gray-900'}`}>
          {node.title || '未命名'}
        </span>
        {!isContainer && (
          <span className="text-xs text-gray-500 ml-1 shrink-0">({node.type})</span>
        )}
        {renderAdditionalValue()}

        <div className="relative ml-auto shrink-0">
          <button
            ref={menuBtnRef}
            onClick={handleMenuBtnClick}
            className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
            title="操作"
          >
            <MoreHorizontal size={14} className="text-gray-500" />
          </button>
          {menuOpen && (
            <NodeMenu
              nodeId={node.id}
              nodeType={node.type}
              nodeKind={node._nodeKind}
              anchorRef={menuBtnRef}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {isContainer ? (
            // 容器节点：渲染虚拟子节点
            getContainerChildren(node, parentObject).map((child) => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))
          ) : (
            // 普通节点
            <>
              {/* 如果节点有 _containers，渲染容器子节点 */}
              {node._containers?.map((container) => (
                <TreeNode key={container.id} node={container} level={level + 1} parentObject={node} />
              ))}
              {/* 普通子节点：仅当没有 _containers 时直接渲染 */}
              {!node._containers && node.properties && Object.entries(node.properties).map(([, child]) => (
                <TreeNode key={child.id} node={child} level={level + 1} />
              ))}
              {!node._containers && node.patternProperties && Object.entries(node.patternProperties).map(([, child]) => (
                <TreeNode key={child.id} node={child} level={level + 1} />
              ))}
              {node.items && !Array.isArray(node.items) && (
                <TreeNode node={node.items} level={level + 1} />
              )}
              {node.items && Array.isArray(node.items) && node.items.map((item) => (
                <TreeNode key={item.id} node={item} level={level + 1} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface TreeEditorProps {
  schema: SchemaNode | null;
  onAddRootNode: () => void;
}

export function TreeEditor({ schema, onAddRootNode }: TreeEditorProps) {
  if (!schema) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="mb-4">暂无 Schema</p>
          <button
            onClick={onAddRootNode}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            创建根节点
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <TreeNode node={schema} level={0} />
    </div>
  );
}
