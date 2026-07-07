import { useRef, useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Type,
  Box,
  List,
  Hash,
  Sigma,
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
import { useI18n } from '@/stores/languageStore';
import { NodeMenu } from '@/components/ContextMenu';

interface TreeNodeProps {
  node: SchemaNode;
  level: number;
  parentObject?: SchemaNode;
  propertyKey?: string;
}

function getTypeIcon(type: SchemaType) {
  switch (type) {
    case 'string':
      return <Type size={14} className="text-green-600" />;
    case 'number':
      return <Sigma size={14} className="text-blue-600" />;
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
    case 'items':
      return <List size={14} className="text-pink-500" />;
    case 'prefixItems':
      return <List size={14} className="text-rose-500" />;
    case 'contains':
      return <List size={14} className="text-fuchsia-500" />;
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
    case 'items': {
      if (parentObject.items) {
        return [parentObject.items];
      }
      return [];
    }
    case 'prefixItems':
      return parentObject.prefixItems || [];
    case 'contains': {
      if (parentObject.contains) {
        return [parentObject.contains];
      }
      return [];
    }
    default:
      return [];
  }
}

function sortByOrder(entries: Array<[string, SchemaNode]>): Array<[string, SchemaNode]> {
  return entries.sort((a, b) => (a[1]._order ?? 0) - (b[1]._order ?? 0));
}

function getContainerChildrenWithKeys(
  node: SchemaNode,
  parentObject?: SchemaNode
): Array<[string, SchemaNode]> {
  if (!parentObject) return [];
  let entries: Array<[string, SchemaNode]> = [];
  switch (node._nodeKind) {
    case 'properties':
      entries = Object.entries(parentObject.properties || {});
      break;
    case 'patternProperties':
      entries = Object.entries(parentObject.patternProperties || {});
      break;
    case 'additionalProperties': {
      if (parentObject.additionalProperties && typeof parentObject.additionalProperties === 'object') {
        return [['additionalProperties', parentObject.additionalProperties]];
      }
      return [];
    }
    case 'propertyNames': {
      if (parentObject.propertyNames) {
        return [['propertyNames', parentObject.propertyNames]];
      }
      return [];
    }
    case 'dependentSchemas':
      entries = Object.entries(parentObject.dependentSchemas || {});
      break;
    case 'items': {
      if (parentObject.items) {
        return [[tStatic('arrayItemsValue'), parentObject.items]];
      }
      return [];
    }
    case 'prefixItems':
      return (parentObject.prefixItems || []).map((child) => ['', child]);
    case 'contains': {
      if (parentObject.contains) {
        return [[tStatic('arrayContainsValue'), parentObject.contains]];
      }
      return [];
    }
    default:
      return [];
  }
  return sortByOrder(entries);
}

function tStatic(key: 'arrayItemsValue' | 'arrayContainsValue') {
  const map = {
    arrayItemsValue: 'schema',
    arrayContainsValue: 'schema',
  };
  return map[key];
}

function hasContainerChildren(node: SchemaNode, parentObject?: SchemaNode): boolean {
  return getContainerChildren(node, parentObject).length > 0;
}

function TreeNode({ node, level, parentObject, propertyKey }: TreeNodeProps) {
  const { selectedNodeId, selectNode, expandedNodes, toggleExpand } =
    useEditorStore();
  const { t } = useI18n();
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
  } else {
    // 如果节点有 _containers（array 类型），只显示容器，不显示原始字段
    if (node._containers !== undefined) {
      children = node._containers || [];
    } else {
      // 没有 _containers 时才显示原始字段
      if (node.items) {
        children = [node.items];
      }
      if (node.prefixItems) {
        children = [...children, ...node.prefixItems];
      }
      if (node.contains) {
        children = [...children, node.contains];
      }
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
      return <span className="text-xs text-red-500 dark:text-red-400 ml-1">false</span>;
    }
    if (value === true) {
      return <span className="text-xs text-green-500 dark:text-green-400 ml-1">true</span>;
    }
    return null;
  };

  return (
    <div>
      <div
        ref={nodeRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`group flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900 border-l-2 border-blue-500' : ''
        } ${isContainer ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={handleToggleClick}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded shrink-0"
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

        <span className={`text-sm truncate ${isContainer ? 'text-gray-500 dark:text-gray-400 font-medium' : 'font-medium text-gray-900 dark:text-gray-100'}`}>
          {node.title || propertyKey || t('unnamed')}
        </span>
        {!isContainer && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 shrink-0">({node.type})</span>
        )}
        {renderAdditionalValue()}

        <div className="relative ml-auto shrink-0">
          <button
            ref={menuBtnRef}
            onClick={handleMenuBtnClick}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            title="操作"
          >
            <MoreHorizontal size={14} className="text-gray-500 dark:text-gray-400" />
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
            getContainerChildrenWithKeys(node, parentObject).map(([key, child]) => (
              <TreeNode key={child.id} node={child} level={level + 1} propertyKey={key} />
            ))
          ) : (
            // 普通节点
            <>
              {/* 如果节点有 _containers，渲染容器子节点 */}
              {node._containers?.map((container) => (
                <TreeNode key={container.id} node={container} level={level + 1} parentObject={node} />
              ))}
              {/* 普通子节点：仅当没有 _containers 时直接渲染 */}
              {!node._containers && node.properties && sortByOrder(Object.entries(node.properties)).map(([key, child]) => (
                <TreeNode key={child.id} node={child} level={level + 1} propertyKey={key} />
              ))}
              {!node._containers && node.patternProperties && sortByOrder(Object.entries(node.patternProperties)).map(([key, child]) => (
                <TreeNode key={child.id} node={child} level={level + 1} propertyKey={key} />
              ))}
              {!node._containers && node.items && (
                <TreeNode node={node.items} level={level + 1} propertyKey="items" />
              )}
              {!node._containers && node.prefixItems && node.prefixItems.map((item, index) => (
                <TreeNode key={item.id} node={item} level={level + 1} propertyKey={`prefixItems[${index}]`} />
              ))}
              {!node._containers && node.contains && (
                <TreeNode node={node.contains} level={level + 1} propertyKey="contains" />
              )}
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
  const { t } = useI18n();
  if (!schema) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="mb-4">{t('noSchema')}</p>
          <button
            onClick={onAddRootNode}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('createRootNode')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
      <TreeNode node={schema} level={0} propertyKey={schema.title} />
    </div>
  );
}
