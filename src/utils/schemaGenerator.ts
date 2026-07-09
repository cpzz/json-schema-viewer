import { SchemaNode } from '@/types/schema';

export function generateJsonSchema(node: SchemaNode): any {
  const schema: any = {};

  if (node.type) {
    schema.type = node.type;
  }

  if (!node._parentId) {
    schema.$schema = 'https://json-schema.org/draft/2020-12/schema';
  }

  if (node.title) schema.title = node.title;
  if (node.description) schema.description = node.description;
  if (node.$comment) schema.$comment = node.$comment;
  if (node.examples && node.examples.length > 0) schema.examples = node.examples;
  if (node.readOnly !== undefined) schema.readOnly = node.readOnly;
  if (node.writeOnly !== undefined) schema.writeOnly = node.writeOnly;
  if (node.deprecated !== undefined) schema.deprecated = node.deprecated;
  
  // Handle enum and const - if enum has only one value, use const instead
  let enumValues = node.enum;
  if (node.enumRaw) {
    enumValues = node.enumRaw
      .split(',')
      .map((v) => {
        const trimmed = v.trim();
        // Convert to appropriate type based on node.type
        if (node.type === 'number') {
          const num = parseFloat(trimmed);
          return isNaN(num) ? trimmed : num;
        } else if (node.type === 'integer') {
          const num = parseInt(trimmed);
          return isNaN(num) ? trimmed : num;
        } else if (node.type === 'boolean') {
          if (trimmed.toLowerCase() === 'true') return true;
          if (trimmed.toLowerCase() === 'false') return false;
          return trimmed;
        }
        return trimmed;
      })
      .filter((v) => v !== '');
  }
  
  if (enumValues && enumValues.length > 0) {
    if (enumValues.length === 1) {
      schema.const = enumValues[0];
    } else {
      schema.enum = enumValues;
    }
  }
  
  if (node.default !== undefined) schema.default = node.default;
  if (node.$ref) schema.$ref = node.$ref;
  if (node.minimum !== undefined) schema.minimum = node.minimum;
  if (node.maximum !== undefined) schema.maximum = node.maximum;
  if (node.exclusiveMinimum !== undefined) schema.exclusiveMinimum = node.exclusiveMinimum;
  if (node.exclusiveMaximum !== undefined) schema.exclusiveMaximum = node.exclusiveMaximum;
  if (node.multipleOf !== undefined) schema.multipleOf = node.multipleOf;
  if (node.minItems !== undefined) schema.minItems = node.minItems;
  if (node.maxItems !== undefined) schema.maxItems = node.maxItems;
  if (node.uniqueItems !== undefined) schema.uniqueItems = node.uniqueItems;
  if (node.minContains !== undefined) schema.minContains = node.minContains;
  if (node.maxContains !== undefined) schema.maxContains = node.maxContains;
  if (node.minLength !== undefined) schema.minLength = node.minLength;
  if (node.maxLength !== undefined) schema.maxLength = node.maxLength;
  if (node.pattern) schema.pattern = node.pattern;
  if (node.format) schema.format = node.format;

  if ((node.type === 'object' || !node.type) && node.properties) {
    schema.properties = {};
    for (const [key, value] of Object.entries(node.properties)) {
      schema.properties[key] = generateJsonSchema(value);
    }
  }

  // Collect required fields from both properties and patternProperties
  if (node.type === 'object' || !node.type) {
    const requiredFields: Set<string> = new Set();
    
    // Add required from properties (node.required)
    if (node.required && node.required.length > 0) {
      node.required.forEach(key => requiredFields.add(key));
    }
    
    // Add required from patternProperties container
    const patternPropertiesContainer = node._containers?.find(c => c._nodeKind === 'patternProperties');
    if (patternPropertiesContainer?.requiredRaw) {
      const values = patternPropertiesContainer.requiredRaw
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v);
      values.forEach(key => requiredFields.add(key));
    }
    
    // Add the collected required fields to schema
    if (requiredFields.size > 0) {
      schema.required = Array.from(requiredFields);
    }
  }

  if ((node.type === 'object' || !node.type) && node.patternProperties) {
    // Output patternProperties only if it has entries or if the applicator exists in _containers
    if (Object.keys(node.patternProperties).length > 0 || node._containers?.some(c => c._nodeKind === 'patternProperties')) {
      schema.patternProperties = {};
      for (const [pattern, value] of Object.entries(node.patternProperties)) {
        schema.patternProperties[pattern] = generateJsonSchema(value);
      }
    }
  }

  if (node.type === 'object' || !node.type) {
    // Output additionalProperties only if the applicator exists in _containers
    if (node._containers?.some(c => c._nodeKind === 'additionalProperties')) {
      if (typeof node.additionalProperties === 'boolean') {
        schema.additionalProperties = node.additionalProperties;
      } else if (node.additionalProperties) {
        schema.additionalProperties = generateJsonSchema(node.additionalProperties);
      }
    }
  }

  if ((node.type === 'object' || !node.type) && node.propertyNames) {
    schema.propertyNames = generateJsonSchema(node.propertyNames);
  }

  if ((node.type === 'object' || !node.type) && node.dependentSchemas) {
    // Output dependentSchemas only if the applicator exists in _containers
    if (node._containers?.some(c => c._nodeKind === 'dependentSchemas')) {
      schema.dependentSchemas = {};
      for (const [key, value] of Object.entries(node.dependentSchemas)) {
        schema.dependentSchemas[key] = generateJsonSchema(value);
      }
    }
  }

  if (node.type === 'array') {
    const hasPrefixItemsContainer = node._containers?.some(c => c._nodeKind === 'prefixItems');
    const hasItemsContainer = node._containers?.some(c => c._nodeKind === 'items');
    const hasContainsContainer = node._containers?.some(c => c._nodeKind === 'contains');

    if ((node.prefixItems && node.prefixItems.length > 0) || hasPrefixItemsContainer) {
      schema.prefixItems = (node.prefixItems || []).map((item) => generateJsonSchema(item));
    }

    if (node.items === false) {
      schema.items = false;
    } else if (node.items) {
      schema.items = generateJsonSchema(node.items);
    } else if (hasItemsContainer) {
      schema.items = {};
    }

    if (node.contains) {
      schema.contains = generateJsonSchema(node.contains);
    } else if (hasContainsContainer) {
      schema.contains = {};
    }
  }

  // 组合关键字（allOf/anyOf/oneOf/not），对任意类型均可输出
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    const arr = node[key];
    const hasContainer = node._containers?.some((c) => c._nodeKind === key);
    if (arr && arr.length > 0) {
      schema[key] = arr.map((s) => generateJsonSchema(s));
    } else if (hasContainer) {
      schema[key] = [];
    }
  }

  if (node.not) {
    schema.not = generateJsonSchema(node.not);
  } else if (node._containers?.some((c) => c._nodeKind === 'not')) {
    schema.not = {};
  }

  if (node.definitions) {
    schema.definitions = {};
    for (const [key, value] of Object.entries(node.definitions)) {
      schema.definitions[key] = generateJsonSchema(value);
    }
  }

  return schema;
}

export function formatJsonSchema(schema: any, indent: number = 2): string {
  return JSON.stringify(schema, null, indent);
}

export function compressJsonSchema(schema: any): string {
  return JSON.stringify(schema);
}

// 生成 JSON Schema 并同时记录每个节点的行号
export function generateJsonSchemaWithLineMap(
  node: SchemaNode,
  indent: number = 2
): { json: string; lineMap: Map<string, number> } {
  const lineMap = new Map<string, number>();
  const schema = generateJsonSchema(node);
  const json = formatJsonSchema(schema, indent);
  
  // 标记根节点
  lineMap.set(node.id, 1);
  
  // 预先分割 JSON 字符串，避免在递归中重复分割
  const lines = json.split('\n');
  
  // 递归标记所有节点
  const markNodeLines = (schemaNode: SchemaNode, jsonObj: any, currentLine: number) => {
    const startTime = performance.now();
    
    // 为 properties 容器节点标记行号
    if (schemaNode._containers?.some(c => c._nodeKind === 'properties')) {
      const propsLine = lines.findIndex((l, i) => i >= currentLine && l.includes('"properties"'));
      if (propsLine >= 0) {
        const container = schemaNode._containers.find(c => c._nodeKind === 'properties');
        if (container) {
          lineMap.set(container.id, propsLine + 1);
        }
      }
    }
    
    // 为 patternProperties 容器节点标记行号
    if (schemaNode._containers?.some(c => c._nodeKind === 'patternProperties')) {
      const propsLine = lines.findIndex((l, i) => i >= currentLine && l.includes('"patternProperties"'));
      if (propsLine >= 0) {
        const container = schemaNode._containers.find(c => c._nodeKind === 'patternProperties');
        if (container) {
          lineMap.set(container.id, propsLine + 1);
        }
      }
    }
    
    // 为 additionalProperties 容器节点标记行号
    if (schemaNode._containers?.some(c => c._nodeKind === 'additionalProperties')) {
      const propsLine = lines.findIndex((l, i) => i >= currentLine && l.includes('"additionalProperties"'));
      if (propsLine >= 0) {
        const container = schemaNode._containers.find(c => c._nodeKind === 'additionalProperties');
        if (container) {
          lineMap.set(container.id, propsLine + 1);
        }
      }
    }
    
    // 为 propertyNames 容器节点标记行号
    if (schemaNode._containers?.some(c => c._nodeKind === 'propertyNames')) {
      const propsLine = lines.findIndex((l, i) => i >= currentLine && l.includes('"propertyNames"'));
      if (propsLine >= 0) {
        const container = schemaNode._containers.find(c => c._nodeKind === 'propertyNames');
        if (container) {
          lineMap.set(container.id, propsLine + 1);
        }
      }
    }
    
    // 为 dependentSchemas 容器节点标记行号
    if (schemaNode._containers?.some(c => c._nodeKind === 'dependentSchemas')) {
      const propsLine = lines.findIndex((l, i) => i >= currentLine && l.includes('"dependentSchemas"'));
      if (propsLine >= 0) {
        const container = schemaNode._containers.find(c => c._nodeKind === 'dependentSchemas');
        if (container) {
          lineMap.set(container.id, propsLine + 1);
        }
      }
    }
    
    // 为 properties 中的节点标记行号
    if (schemaNode.properties && jsonObj.properties) {
      const sortedProps = Object.entries(schemaNode.properties).sort((a, b) => (a[1]._order ?? 0) - (b[1]._order ?? 0));
      for (const [key, child] of sortedProps) {
        const keyLine = lines.findIndex((l, i) => i >= currentLine && l.includes(`"${key}"`));
        if (keyLine >= 0) {
          lineMap.set(child.id, keyLine + 1);
          markNodeLines(child, jsonObj.properties[key], keyLine);
        }
      }
    }
    
    // 为 patternProperties 中的节点标记行号
    if (schemaNode.patternProperties && jsonObj.patternProperties) {
      const sortedPatterns = Object.entries(schemaNode.patternProperties).sort((a, b) => (a[1]._order ?? 0) - (b[1]._order ?? 0));
      for (const [key, child] of sortedPatterns) {
        const escapedKey = key.replace(/\\/g, '\\\\');
        const keyLine = lines.findIndex((l, i) => i >= currentLine && l.includes(`"${escapedKey}"`));
        if (keyLine >= 0) {
          lineMap.set(child.id, keyLine + 1);
          markNodeLines(child, jsonObj.patternProperties[key], keyLine);
        }
      }
    }
    
    // 为 items 中的节点标记行号
    const itemsLine = lines.findIndex((l, i) => i >= currentLine && l.includes('"items"'));
    if (itemsLine >= 0) {
      const itemsContainer = schemaNode._containers?.find(c => c._nodeKind === 'items');
      if (itemsContainer) {
        lineMap.set(itemsContainer.id, itemsLine + 1);
      }
      if (schemaNode.items && jsonObj.items) {
        const childLine = lines.findIndex((l, i) => i > itemsLine && l.includes('"type"'));
        if (childLine >= 0) {
          lineMap.set(schemaNode.items.id, childLine + 1);
          markNodeLines(schemaNode.items, jsonObj.items, childLine);
        }
      }
    }

    // 为 prefixItems 中的节点标记行号
    const prefixItemsLine = lines.findIndex((l, i) => i >= currentLine && l.includes('"prefixItems"'));
    if (prefixItemsLine >= 0) {
      const prefixItemsContainer = schemaNode._containers?.find(c => c._nodeKind === 'prefixItems');
      if (prefixItemsContainer) {
        lineMap.set(prefixItemsContainer.id, prefixItemsLine + 1);
      }
      if (schemaNode.prefixItems && jsonObj.prefixItems) {
        let cursor = prefixItemsLine;
        schemaNode.prefixItems.forEach((child, idx) => {
          const childLine = lines.findIndex((l, i) => i > cursor && l.includes('"type"'));
          if (childLine >= 0) {
            lineMap.set(child.id, childLine + 1);
            markNodeLines(child, jsonObj.prefixItems[idx], childLine);
            cursor = childLine;
          }
        });
      }
    }

    // 为 contains 节点标记行号
    const containsLine = lines.findIndex((l, i) => i >= currentLine && l.includes('"contains"'));
    if (containsLine >= 0) {
      const containsContainer = schemaNode._containers?.find(c => c._nodeKind === 'contains');
      if (containsContainer) {
        lineMap.set(containsContainer.id, containsLine + 1);
      }
      if (schemaNode.contains && jsonObj.contains) {
        const childLine = lines.findIndex((l, i) => i > containsLine && l.includes('"type"'));
        if (childLine >= 0) {
          lineMap.set(schemaNode.contains.id, childLine + 1);
          markNodeLines(schemaNode.contains, jsonObj.contains, childLine);
        }
      }
    }
    
    // 为 dependentSchemas 中的节点标记行号
    if (schemaNode.dependentSchemas && jsonObj.dependentSchemas) {
      const sortedDependents = Object.entries(schemaNode.dependentSchemas).sort((a, b) => (a[1]._order ?? 0) - (b[1]._order ?? 0));
      for (const [key, child] of sortedDependents) {
        const escapedKey = key.replace(/\\/g, '\\\\');
        const keyLine = lines.findIndex((l, i) => i >= currentLine && l.includes(`"${escapedKey}"`));
        if (keyLine >= 0) {
          lineMap.set(child.id, keyLine + 1);
          markNodeLines(child, jsonObj.dependentSchemas[key], keyLine);
        }
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    if (duration > 10) {
      console.log(`[markNodeLines] Node: ${schemaNode.id}, Type: ${schemaNode.type}, Duration: ${duration.toFixed(2)}ms`);
    }
  };
  
  const totalStartTime = performance.now();
  markNodeLines(node, schema, 0);
  const totalEndTime = performance.now();
  const totalDuration = totalEndTime - totalStartTime;
  if (totalDuration > 10) {
    console.log(`[generateJsonSchemaWithLineMap] Total duration: ${totalDuration.toFixed(2)}ms`);
  }
  
  return { json, lineMap };
}
