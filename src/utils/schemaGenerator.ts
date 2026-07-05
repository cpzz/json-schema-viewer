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
  if (node.enum) schema.enum = node.enum;
  if (node.default !== undefined) schema.default = node.default;
  if (node.$ref) schema.$ref = node.$ref;
  if (node.minimum !== undefined) schema.minimum = node.minimum;
  if (node.maximum !== undefined) schema.maximum = node.maximum;
  if (node.minLength !== undefined) schema.minLength = node.minLength;
  if (node.maxLength !== undefined) schema.maxLength = node.maxLength;
  if (node.pattern) schema.pattern = node.pattern;
  if (node.format) schema.format = node.format;

  if (node.type === 'object' && node.properties) {
    schema.properties = {};
    for (const [key, value] of Object.entries(node.properties)) {
      schema.properties[key] = generateJsonSchema(value);
    }

    if (node.required && node.required.length > 0) {
      schema.required = node.required;
    }
  }

  if (node.type === 'object' && node.patternProperties && Object.keys(node.patternProperties).length > 0) {
    schema.patternProperties = {};
    for (const [pattern, value] of Object.entries(node.patternProperties)) {
      schema.patternProperties[pattern] = generateJsonSchema(value);
    }
  }

  if (node.type === 'object') {
    // 仅当 additionalProperties 应用器存在时输出，否则不输出
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

  if (node.type === 'object' && node.dependentSchemas && Object.keys(node.dependentSchemas).length > 0) {
    schema.dependentSchemas = {};
    for (const [key, value] of Object.entries(node.dependentSchemas)) {
      schema.dependentSchemas[key] = generateJsonSchema(value);
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
