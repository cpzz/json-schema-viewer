import { useEffect, useState } from 'react';
import { SchemaNode } from '@/types/schema';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { findNodeById, findParentNode } from '@/utils/treeUtils';

export function PropertyPanel() {
  const { rootSchema, updateNode, renamePropertyKey } = useSchemaStore();
  const { selectedNodeId } = useEditorStore();
  const [propertyKey, setPropertyKey] = useState('');

  const selectedNode = rootSchema && selectedNodeId
    ? findNodeById(rootSchema, selectedNodeId)
    : null;

  const parentNode = rootSchema && selectedNode && selectedNodeId
    ? findParentNode(rootSchema, selectedNodeId)
    : null;

  const isAdditionalPropertyChild = parentNode &&
    typeof parentNode.additionalProperties === 'object' &&
    parentNode.additionalProperties !== null &&
    parentNode.additionalProperties.id === selectedNodeId;

  const isObjectNode = selectedNode?.type === 'object' && !selectedNode?._nodeKind;

  useEffect(() => {
    if (selectedNode && parentNode) {
      // 先从 properties 找 key
      let key = Object.entries(parentNode.properties || {}).find(
        ([, node]) => node.id === selectedNodeId
      )?.[0];
      // 没找到则从 patternProperties 找
      if (!key) {
        key = Object.entries(parentNode.patternProperties || {}).find(
          ([, node]) => node.id === selectedNodeId
        )?.[0];
      }
      setPropertyKey(key || '');
    } else {
      setPropertyKey('');
    }
  }, [selectedNode, parentNode, selectedNodeId]);

  if (!selectedNode) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        请选择一个节点
      </div>
    );
  }

  // 容器节点显示编辑面板
  if (selectedNode._nodeKind && selectedNode._nodeKind !== 'normal') {
    const containerLabels: Record<string, string> = {
      properties: '普通属性定义',
      patternProperties: '模式属性定义',
      additionalProperties: '额外属性控制',
      propertyNames: '属性名约束',
      dependentSchemas: '条件依赖',
    };

    return (
      <div className="flex-1 overflow-auto p-4 bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">应用器节点</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              类型
            </label>
            <input
              type="text"
              value={containerLabels[selectedNode._nodeKind] || selectedNode._nodeKind}
              disabled
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500"
            />
          </div>
          <div className="text-xs text-gray-400">
            在此节点上右键可添加子项
          </div>
        </div>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<SchemaNode>) => {
    if (selectedNodeId) {
      updateNode(selectedNodeId, updates);
    }
  };

  const handlePropertyKeyChange = (newKey: string) => {
    setPropertyKey(newKey);
    if (parentNode && propertyKey && newKey && newKey !== propertyKey) {
      renamePropertyKey(parentNode.id, propertyKey, newKey);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 bg-white">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">属性编辑</h3>

      <div className="space-y-4">
        {parentNode && !isAdditionalPropertyChild && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              属性名 (Property Key)
            </label>
            <input
              type="text"
              value={propertyKey}
              onChange={(e) => handlePropertyKeyChange(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="属性名"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">类型</label>
          <input
            type="text"
            value={selectedNode.type}
            disabled
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500"
          />
        </div>

        {isObjectNode ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">标题</label>
              <input
                type="text"
                value={selectedNode.title || ''}
                onChange={(e) => handleUpdate({ title: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="标题"
              />
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
                  <textarea
                    value={selectedNode.description || ''}
                    onChange={(e) => handleUpdate({ description: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="属性描述"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">注释 (${'$comment'})</label>
                  <input
                    type="text"
                    value={selectedNode.$comment || ''}
                    onChange={(e) => handleUpdate({ $comment: e.target.value || undefined })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="注释文字"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">示例</label>
                  <input
                    type="text"
                    value={selectedNode.examples ? selectedNode.examples.join(', ') : ''}
                    onChange={(e) => {
                      const values = e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter((v) => v);
                      handleUpdate({ examples: values.length > 0 ? values : undefined });
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="逗号分隔，例如: value1, value2"
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedNode.readOnly === true}
                      onChange={(e) => handleUpdate({ readOnly: e.target.checked || undefined })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-700">readOnly</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedNode.writeOnly === true}
                      onChange={(e) => handleUpdate({ writeOnly: e.target.checked || undefined })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-700">writeOnly</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedNode.deprecated === true}
                      onChange={(e) => handleUpdate({ deprecated: e.target.checked || undefined })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-700">deprecated</span>
                  </label>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">标题</label>
              <input
                type="text"
                value={selectedNode.title || ''}
                onChange={(e) => handleUpdate({ title: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="标题"
              />
            </div>

            {/* Annotation 字段 */}
            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">注释 (Annotation)</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
                  <textarea
                    value={selectedNode.description || ''}
                    onChange={(e) => handleUpdate({ description: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="属性描述"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">注释 (${'$comment'})</label>
                  <input
                    type="text"
                    value={selectedNode.$comment || ''}
                    onChange={(e) => handleUpdate({ $comment: e.target.value || undefined })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="注释文字"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">示例</label>
                  <input
                    type="text"
                    value={selectedNode.examples ? selectedNode.examples.join(', ') : ''}
                    onChange={(e) => {
                      const values = e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter((v) => v);
                      handleUpdate({ examples: values.length > 0 ? values : undefined });
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="逗号分隔，例如: value1, value2"
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedNode.readOnly === true}
                      onChange={(e) => handleUpdate({ readOnly: e.target.checked || undefined })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-700">readOnly</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedNode.writeOnly === true}
                      onChange={(e) => handleUpdate({ writeOnly: e.target.checked || undefined })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-700">writeOnly</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedNode.deprecated === true}
                      onChange={(e) => handleUpdate({ deprecated: e.target.checked || undefined })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-700">deprecated</span>
                  </label>
                </div>
              </div>
            </div>

            {selectedNode.type === 'string' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">最小长度</label>
                  <input
                    type="number"
                    value={selectedNode.minLength || ''}
                    onChange={(e) =>
                      handleUpdate({ minLength: Number(e.target.value) || undefined })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">最大长度</label>
                  <input
                    type="number"
                    value={selectedNode.maxLength || ''}
                    onChange={(e) =>
                      handleUpdate({ maxLength: Number(e.target.value) || undefined })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">正则模式</label>
                  <input
                    type="text"
                    value={selectedNode.pattern || ''}
                    onChange={(e) => handleUpdate({ pattern: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: ^[a-z]+$"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">格式</label>
                  <select
                    value={selectedNode.format || ''}
                    onChange={(e) => handleUpdate({ format: e.target.value || undefined })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">无</option>
                    <option value="date-time">date-time</option>
                    <option value="date">date</option>
                    <option value="time">time</option>
                    <option value="email">email</option>
                    <option value="uri">uri</option>
                    <option value="uuid">uuid</option>
                  </select>
                </div>
              </>
            )}

            {(selectedNode.type === 'number' || selectedNode.type === 'integer') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">最小值</label>
                  <input
                    type="number"
                    value={selectedNode.minimum || ''}
                    onChange={(e) =>
                      handleUpdate({ minimum: Number(e.target.value) || undefined })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">最大值</label>
                  <input
                    type="number"
                    value={selectedNode.maximum || ''}
                    onChange={(e) =>
                      handleUpdate({ maximum: Number(e.target.value) || undefined })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">默认值</label>
              <input
                type="text"
                value={selectedNode.default !== undefined ? String(selectedNode.default) : ''}
                onChange={(e) => handleUpdate({ default: e.target.value || undefined })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="默认值"
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
