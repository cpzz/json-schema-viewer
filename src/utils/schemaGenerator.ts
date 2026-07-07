import { SchemaNode } from '@/types/schema';

export function generateJsonSchema(node: SchemaNode): any {
  const schema: any = {
    type: node.type,
  };

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
  if (node.minLength !== undefined) schema.minLength = node.minLength;
  if (node.maxLength !== undefined) schema.maxLength = node.maxLength;
  if (node.pattern) schema.pattern = node.pattern;
  if (node.format) schema.format = node.format;

  if (node.type === 'object' && node.properties) {
    schema.properties = {};
    for (const [key, value] of Object.entries(node.properties)) {
      schema.properties[key] = generateJsonSchema(value);
    }
  }

  // Collect required fields from both properties and patternProperties
  if (node.type === 'object') {
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

  if (node.type === 'object' && node.patternProperties) {
    // Output patternProperties only if it has entries or if the applicator exists in _containers
    if (Object.keys(node.patternProperties).length > 0 || node._containers?.some(c => c._nodeKind === 'patternProperties')) {
      schema.patternProperties = {};
      for (const [pattern, value] of Object.entries(node.patternProperties)) {
        schema.patternProperties[pattern] = generateJsonSchema(value);
      }
    }
  }

  if (node.type === 'object') {
    // Output additionalProperties only if the applicator exists in _containers
    if (node._containers?.some(c => c._nodeKind === 'additionalProperties')) {
      if (typeof node.additionalProperties === 'boolean') {
        schema.additionalProperties = node.additionalProperties;
      } else if (node.additionalProperties) {
        schema.additionalProperties = generateJsonSchema(node.additionalProperties);
      }
    }
  }

  if (node.type === 'object' && node.propertyNames) {
    schema.propertyNames = generateJsonSchema(node.propertyNames);
  }

  if (node.type === 'object' && node.dependentSchemas) {
    // Output dependentSchemas only if the applicator exists in _containers
    if (node._containers?.some(c => c._nodeKind === 'dependentSchemas')) {
      schema.dependentSchemas = {};
      for (const [key, value] of Object.entries(node.dependentSchemas)) {
        schema.dependentSchemas[key] = generateJsonSchema(value);
      }
    }
  }

  if (node.type === 'array' && node.items) {
    if (Array.isArray(node.items)) {
      schema.items = node.items.map((item) => generateJsonSchema(item));
    } else {
      schema.items = generateJsonSchema(node.items);
    }
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
  
  // 递归标记所有节点
  const markNodeLines = (schemaNode: SchemaNode, jsonObj: any, currentLine: number) => {
    const lines = json.split('\n');
    
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
        const keyLine = lines.findIndex((l, i) => i >= currentLine && l.includes(`"${key}"`));
        if (keyLine >= 0) {
          lineMap.set(child.id, keyLine + 1);
          markNodeLines(child, jsonObj.patternProperties[key], keyLine);
        }
      }
    }
    
    // 为 items 中的节点标记行号
    if (schemaNode.items && jsonObj.items) {
      const itemsLine = lines.findIndex((l, i) => i >= currentLine && l.includes('"items"'));
      if (itemsLine >= 0) {
        if (Array.isArray(schemaNode.items)) {
          schemaNode.items.forEach((child, idx) => {
            lineMap.set(child.id, itemsLine + 1);
            markNodeLines(child, jsonObj.items[idx], itemsLine);
          });
        } else {
          lineMap.set(schemaNode.items.id, itemsLine + 1);
          markNodeLines(schemaNode.items, jsonObj.items, itemsLine);
        }
      }
    }
    
    // 为 dependentSchemas 中的节点标记行号
    if (schemaNode.dependentSchemas && jsonObj.dependentSchemas) {
      const sortedDependents = Object.entries(schemaNode.dependentSchemas).sort((a, b) => (a[1]._order ?? 0) - (b[1]._order ?? 0));
      for (const [key, child] of sortedDependents) {
        const keyLine = lines.findIndex((l, i) => i >= currentLine && l.includes(`"${key}"`));
        if (keyLine >= 0) {
          lineMap.set(child.id, keyLine + 1);
          markNodeLines(child, jsonObj.dependentSchemas[key], keyLine);
        }
      }
    }
  };
  
  markNodeLines(node, schema, 0);
  
  return { json, lineMap };
}
