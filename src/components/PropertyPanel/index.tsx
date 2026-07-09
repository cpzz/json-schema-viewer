import { useEffect, useState } from 'react';
import {
  ChevronDown,
  Type,
  Box,
  List,
  Hash,
  ToggleLeft,
  CircleOff,
  FolderOpen,
  Ban,
  Key,
  GitBranch,
} from 'lucide-react';
import { SchemaNode, SchemaType } from '@/types/schema';
import { useSchemaStore } from '@/stores/schemaStore';
import { useEditorStore } from '@/stores/editorStore';
import { findNodeById, findParentNode } from '@/utils/treeUtils';
import { ClearableInput } from './ClearableInput';
import { useI18n } from '@/stores/languageStore';

function getTypeIcon(type?: SchemaType) {
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

export function PropertyPanel() {
  const { rootSchema, updateNode, renamePropertyKey, setRequired } = useSchemaStore();
  const { selectedNodeId } = useEditorStore();
  const { t } = useI18n();
  const [propertyKey, setPropertyKey] = useState('');
  const [isAnnotationExpanded, setIsAnnotationExpanded] = useState(false);

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

  // 判断是否是父 object properties 的直接子属性（不含 patternProperties）
  const isDirectProperty = parentNode?.type === 'object' && propertyKey !== '' &&
    parentNode.properties != null &&
    Object.keys(parentNode.properties).includes(propertyKey);

  const isRequired = isDirectProperty && (parentNode?.required || []).includes(propertyKey);
  const isContainsChild = parentNode?.type === 'array' && parentNode.contains?.id === selectedNodeId;

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
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        {t('selectNode')}
      </div>
    );
  }

  const handleUpdate = (updates: Partial<SchemaNode>) => {
    if (selectedNodeId) {
      updateNode(selectedNodeId, updates);
    }
  };

  // 容器节点显示编辑面板
  if (selectedNode._nodeKind && selectedNode._nodeKind !== 'normal') {
    const containerLabels: Record<string, string> = {
      properties: t('properties'),
      patternProperties: t('patternProperties'),
      additionalProperties: t('additionalProperties'),
      propertyNames: t('propertyNames'),
      dependentSchemas: t('dependentSchemas'),
      items: t('arrayItemsNode'),
      prefixItems: t('arrayPrefixItemsNode'),
      contains: t('arrayContainsNode'),
    };

    const containerLabel = containerLabels[selectedNode._nodeKind] || selectedNode._nodeKind;

    return (
      <div className="flex-1 overflow-auto p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          {t('propertyType')}: {getContainerIcon(selectedNode._nodeKind)}
          {containerLabel}
        </h3>
        
        {selectedNode._nodeKind === 'patternProperties' && (
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('forPatternProperties')}
              </label>
              <ClearableInput
                value={selectedNode.requiredRaw || ''}
                onChange={(e) => handleUpdate({ requiredRaw: e })}
                placeholder={t('placeholderRequiredKeys')}
              />
            </div>
          </div>
        )}

        {selectedNode._nodeKind === 'items' && parentNode?.type === 'array' && (
          <div className="space-y-4 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`items-mode-${selectedNode.id}`}
                checked={parentNode.items !== false}
                onChange={() => updateNode(parentNode.id, { items: undefined })}
                className="border-gray-300 dark:border-gray-600"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">{t('arrayItemsSchema')}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`items-mode-${selectedNode.id}`}
                checked={parentNode.items === false}
                onChange={() => updateNode(parentNode.id, { items: false })}
                className="border-gray-300 dark:border-gray-600"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">{t('arrayItemsFalse')}</span>
            </label>
          </div>
        )}
        

      </div>
    );
  }

  const handlePropertyKeyChange = (newKey: string) => {
    if (parentNode && propertyKey !== newKey) {
      renamePropertyKey(parentNode.id, propertyKey, newKey);
    }
    setPropertyKey(newKey);
  };

  return (
    <div className="flex-1 overflow-auto p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        {t('propertyType')}: {getTypeIcon(selectedNode.type)}
        {selectedNode.type || 'any'}
      </h3>

      <div className="space-y-4">
        {parentNode?.type === 'object' && !isAdditionalPropertyChild && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('propertyKey')}
            </label>
            <ClearableInput
              value={propertyKey}
              onChange={(e) => handlePropertyKeyChange(e)}
              placeholder={t('placeholderPropertyName')}
            />
            {isDirectProperty && (
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setRequired(parentNode.id, propertyKey, e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-xs text-gray-700 dark:text-gray-300">{t('required')}</span>
              </label>
            )}
          </div>
        )}

        {isObjectNode ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('title')}</label>
              <ClearableInput
                value={selectedNode.title || ''}
                onChange={(e) => handleUpdate({ title: e })}
                placeholder={t('placeholderTitle')}
              />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              {/* Collapsible Annotation Section */}
              <button
                onClick={() => setIsAnnotationExpanded(!isAnnotationExpanded)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isAnnotationExpanded ? 'rotate-0' : '-rotate-90'}`}
                />
                {t('annotation')}
              </button>
              {isAnnotationExpanded && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('description')}</label>
                    <ClearableInput
                      value={selectedNode.description || ''}
                      onChange={(e) => handleUpdate({ description: e })}
                      placeholder={t('placeholderDescription')}
                      isTextarea={true}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('comment')} (${'$comment'})</label>
                    <ClearableInput
                      value={selectedNode.$comment || ''}
                      onChange={(e) => handleUpdate({ $comment: e || undefined })}
                      placeholder={t('placeholderComment')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('examples')}</label>
                    <ClearableInput
                      value={selectedNode.examples ? selectedNode.examples.join(', ') : ''}
                      onChange={(e) => {
                        const values = e
                          .split(',')
                          .map((v) => v.trim())
                          .filter((v) => v);
                        handleUpdate({ examples: values.length > 0 ? values : undefined });
                      }}
                      placeholder={t('placeholderEnum')}
                    />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedNode.readOnly === true}
                        onChange={(e) => handleUpdate({ readOnly: e.target.checked || undefined })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">readOnly</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedNode.writeOnly === true}
                        onChange={(e) => handleUpdate({ writeOnly: e.target.checked || undefined })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">writeOnly</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedNode.deprecated === true}
                        onChange={(e) => handleUpdate({ deprecated: e.target.checked || undefined })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">deprecated</span>
                    </label>
                  </div>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3" />
            </div>

            {selectedNode.type !== 'boolean' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('enum')}</label>
                <ClearableInput
                  value={selectedNode.enumRaw || ''}
                  onChange={(e) => handleUpdate({ enumRaw: e })}
                  placeholder={t('placeholderEnum')}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('default')}</label>
              <ClearableInput
                value={selectedNode.default !== undefined ? String(selectedNode.default) : ''}
                onChange={(e) => {
                  const inputValue = e;
                  if (!inputValue) {
                    handleUpdate({ default: undefined });
                    return;
                  }
                  let defaultValue: any = inputValue;
                  if (selectedNode.type === 'number' || selectedNode.type === 'integer') {
                    defaultValue = selectedNode.type === 'integer' ? parseInt(inputValue) : parseFloat(inputValue);
                    if (isNaN(defaultValue)) {
                      return;
                    }
                  } else if (selectedNode.type === 'boolean') {
                    defaultValue = inputValue.toLowerCase() === 'true' || inputValue === '1';
                  }
                  handleUpdate({ default: defaultValue });
                }}
                placeholder={t('placeholderDefault')}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('title')}</label>
              <ClearableInput
                value={selectedNode.title || ''}
                onChange={(e) => handleUpdate({ title: e })}
                placeholder={t('placeholderTitle')}
              />
            </div>

            {/* Annotation 字段 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={() => setIsAnnotationExpanded(!isAnnotationExpanded)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isAnnotationExpanded ? 'rotate-0' : '-rotate-90'}`}
                />
                {t('annotation')}
              </button>
              {isAnnotationExpanded && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('description')}</label>
                    <ClearableInput
                      value={selectedNode.description || ''}
                      onChange={(e) => handleUpdate({ description: e })}
                      placeholder={t('placeholderDescription')}
                      isTextarea={true}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('comment')} (${'$comment'})</label>
                    <ClearableInput
                      value={selectedNode.$comment || ''}
                      onChange={(e) => handleUpdate({ $comment: e || undefined })}
                      placeholder={t('placeholderComment')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('examples')}</label>
                    <ClearableInput
                      value={selectedNode.examples ? selectedNode.examples.join(', ') : ''}
                      onChange={(e) => {
                        const values = e
                          .split(',')
                          .map((v) => v.trim())
                          .filter((v) => v);
                        handleUpdate({ examples: values.length > 0 ? values : undefined });
                      }}
                      placeholder={t('placeholderEnum')}
                    />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedNode.readOnly === true}
                        onChange={(e) => handleUpdate({ readOnly: e.target.checked || undefined })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">readOnly</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedNode.writeOnly === true}
                        onChange={(e) => handleUpdate({ writeOnly: e.target.checked || undefined })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">writeOnly</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedNode.deprecated === true}
                        onChange={(e) => handleUpdate({ deprecated: e.target.checked || undefined })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">deprecated</span>
                    </label>
                  </div>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3" />
            </div>

            {(selectedNode.type === 'string' || !selectedNode.type) && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('minLength')}</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedNode.maxLength ?? ''}
                    value={selectedNode.minLength ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        handleUpdate({ minLength: undefined });
                        return;
                      }
                      const numValue = Number(value);
                      if (numValue < 0) {
                        handleUpdate({ minLength: 0 });
                        return;
                      }
                      if (selectedNode.maxLength !== undefined && numValue > selectedNode.maxLength) {
                        handleUpdate({ minLength: selectedNode.maxLength });
                        return;
                      }
                      handleUpdate({ minLength: numValue });
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('maxLength')}</label>
                  <input
                    type="number"
                    min={selectedNode.minLength ?? 0}
                    value={selectedNode.maxLength ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        handleUpdate({ maxLength: undefined });
                        return;
                      }
                      const numValue = Number(value);
                      if (numValue < 0) {
                        handleUpdate({ maxLength: 0 });
                        return;
                      }
                      if (selectedNode.minLength !== undefined && numValue < selectedNode.minLength) {
                        handleUpdate({ maxLength: selectedNode.minLength });
                        return;
                      }
                      handleUpdate({ maxLength: numValue });
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pattern')}</label>
                  <ClearableInput
                    value={selectedNode.pattern || ''}
                    onChange={(e) => handleUpdate({ pattern: e })}
                    placeholder={t('placeholderPattern')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('format')}</label>
                  <select
                    value={selectedNode.format || ''}
                    onChange={(e) => handleUpdate({ format: e.target.value || undefined })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('noFormat')}</option>
                    <option value="date-time">date-time (RFC 3339)</option>
                    <option value="date">date</option>
                    <option value="time">time</option>
                    <option value="duration">duration (RFC 3339)</option>
                    <option value="email">email</option>
                    <option value="idn-email">idn-email</option>
                    <option value="hostname">hostname</option>
                    <option value="idn-hostname">idn-hostname</option>
                    <option value="ipv4">ipv4</option>
                    <option value="ipv6">ipv6</option>
                    <option value="uri">uri</option>
                    <option value="uri-reference">uri-reference</option>
                    <option value="iri">iri</option>
                    <option value="iri-reference">iri-reference</option>
                    <option value="uri-template">uri-template</option>
                    <option value="json-pointer">json-pointer</option>
                    <option value="relative-json-pointer">relative-json-pointer</option>
                    <option value="regex">regex</option>
                    <option value="uuid">uuid</option>
                  </select>
                </div>
              </>
            )}

            {(selectedNode.type === 'number' || selectedNode.type === 'integer' || !selectedNode.type) && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('minimum')}</label>
                  <input
                    type="number"
                    value={selectedNode.minimum || ''}
                    onChange={(e) =>
                      handleUpdate({ minimum: Number(e.target.value) || undefined })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('exclusiveMin')}</label>
                  <input
                    type="number"
                    value={selectedNode.exclusiveMinimum || ''}
                    onChange={(e) =>
                      handleUpdate({ exclusiveMinimum: Number(e.target.value) || undefined })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('maximum')}</label>
                  <input
                    type="number"
                    value={selectedNode.maximum || ''}
                    onChange={(e) =>
                      handleUpdate({ maximum: Number(e.target.value) || undefined })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('exclusiveMax')}</label>
                  <input
                    type="number"
                    value={selectedNode.exclusiveMaximum || ''}
                    onChange={(e) =>
                      handleUpdate({ exclusiveMaximum: Number(e.target.value) || undefined })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('multipleOf')}</label>
                  <input
                    type="number"
                    value={selectedNode.multipleOf || ''}
                    onChange={(e) =>
                      handleUpdate({ multipleOf: Number(e.target.value) || undefined })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('placeholderMultipleOf')}
                  />
                </div>
              </>
            )}

            {(selectedNode.type === 'array' || !selectedNode.type) && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('minItems') || 'Min Items'}</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedNode.maxItems ?? ''}
                    value={selectedNode.minItems ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        handleUpdate({ minItems: undefined });
                        return;
                      }
                      const numValue = Number(value);
                      if (numValue < 0) {
                        handleUpdate({ minItems: 0 });
                        return;
                      }
                      if (selectedNode.maxItems !== undefined && numValue > selectedNode.maxItems) {
                        handleUpdate({ minItems: selectedNode.maxItems });
                        return;
                      }
                      handleUpdate({ minItems: numValue });
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('maxItems') || 'Max Items'}</label>
                  <input
                    type="number"
                    min={selectedNode.minItems ?? 0}
                    value={selectedNode.maxItems ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        handleUpdate({ maxItems: undefined });
                        return;
                      }
                      const numValue = Number(value);
                      if (numValue < 0) {
                        handleUpdate({ maxItems: 0 });
                        return;
                      }
                      if (selectedNode.minItems !== undefined && numValue < selectedNode.minItems) {
                        handleUpdate({ maxItems: selectedNode.minItems });
                        return;
                      }
                      handleUpdate({ maxItems: numValue });
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedNode.uniqueItems === true}
                    onChange={(e) => handleUpdate({ uniqueItems: e.target.checked || undefined })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('uniqueItemsLabel')}</span>
                </label>
              </>
            )}

            {isContainsChild && parentNode && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('minContains')}</label>
                  <input
                    type="number"
                    value={parentNode.minContains ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateNode(parentNode.id, { minContains: value === '' ? undefined : Number(value) });
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('maxContains')}</label>
                  <input
                    type="number"
                    value={parentNode.maxContains ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateNode(parentNode.id, { maxContains: value === '' ? undefined : Number(value) });
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {selectedNode.type !== 'boolean' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('enum')}</label>
                <ClearableInput
                  value={selectedNode.enumRaw || ''}
                  onChange={(e) => handleUpdate({ enumRaw: e })}
                  placeholder={t('placeholderEnum')}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('default')}</label>
              <ClearableInput
                value={selectedNode.default !== undefined ? String(selectedNode.default) : ''}
                onChange={(e) => {
                  const inputValue = e;
                  if (!inputValue) {
                    handleUpdate({ default: undefined });
                    return;
                  }
                  let defaultValue: any = inputValue;
                  if (selectedNode.type === 'number' || selectedNode.type === 'integer') {
                    defaultValue = selectedNode.type === 'integer' ? parseInt(inputValue) : parseFloat(inputValue);
                    if (isNaN(defaultValue)) {
                      return;
                    }
                  } else if (selectedNode.type === 'boolean') {
                    defaultValue = inputValue.toLowerCase() === 'true' || inputValue === '1';
                  }
                  handleUpdate({ default: defaultValue });
                }}
                placeholder={t('placeholderDefault')}
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
