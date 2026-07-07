import { SchemaNode, SchemaType } from '@/types/schema';
import { createNodeId } from '@/stores/schemaStore';

export function parseJsonSchema(json: any): SchemaNode {
  return parseNode(json, undefined, 0);
}

function parseNode(node: any, parentId?: string, order: number = 0): SchemaNode {
  const schemaNode: SchemaNode = {
    id: createNodeId(),
    type: inferType(node),
    _parentId: parentId,
    _order: order,
  };

  if (node.title) schemaNode.title = node.title;
  if (node.description) schemaNode.description = node.description;
  if (node.$comment) schemaNode.$comment = node.$comment;
  if (node.examples) schemaNode.examples = node.examples;
  if (node.readOnly !== undefined) schemaNode.readOnly = node.readOnly;
  if (node.writeOnly !== undefined) schemaNode.writeOnly = node.writeOnly;
  if (node.deprecated !== undefined) schemaNode.deprecated = node.deprecated;
  
  // Handle enum and const - convert to enumRaw for editing
  if (node.enum) {
    schemaNode.enumRaw = node.enum.join(', ');
  }
  // Convert const to enumRaw for internal representation
  if (node.const !== undefined) {
    schemaNode.enumRaw = String(node.const);
  }
  
  if (node.default !== undefined) schemaNode.default = node.default;
  if (node.$ref) schemaNode.$ref = node.$ref;
  if (node.minimum !== undefined) schemaNode.minimum = node.minimum;
  if (node.maximum !== undefined) schemaNode.maximum = node.maximum;
  if (node.exclusiveMinimum !== undefined) schemaNode.exclusiveMinimum = node.exclusiveMinimum;
  if (node.exclusiveMaximum !== undefined) schemaNode.exclusiveMaximum = node.exclusiveMaximum;
  if (node.multipleOf !== undefined) schemaNode.multipleOf = node.multipleOf;
  if (node.minItems !== undefined) schemaNode.minItems = node.minItems;
  if (node.maxItems !== undefined) schemaNode.maxItems = node.maxItems;
  if (node.uniqueItems !== undefined) schemaNode.uniqueItems = node.uniqueItems;
  if (node.minContains !== undefined) schemaNode.minContains = node.minContains;
  if (node.maxContains !== undefined) schemaNode.maxContains = node.maxContains;
  if (node.minLength !== undefined) schemaNode.minLength = node.minLength;
  if (node.maxLength !== undefined) schemaNode.maxLength = node.maxLength;
  if (node.pattern) schemaNode.pattern = node.pattern;
  if (node.format) schemaNode.format = node.format;

  if (node.type === 'object' || (!node.type && node.properties)) {
    schemaNode.properties = {};
    const containers: SchemaNode[] = [];

    // properties 容器
    if (node.properties) {
      const propsContainer: SchemaNode = {
        id: createNodeId(),
        type: 'object',
        title: 'properties',
        _nodeKind: 'properties',
        _order: 0,
        _parentId: schemaNode.id,
      };
      containers.push(propsContainer);

      let childOrder = 0;
      for (const [key, value] of Object.entries(node.properties)) {
        const childNode = parseNode(value, schemaNode.id, childOrder++);
        schemaNode.properties[key] = childNode;
      }

      if (node.required) {
        schemaNode.required = node.required;
      }
    }

    // patternProperties 容器
    if (node.patternProperties && Object.keys(node.patternProperties).length > 0) {
      const patternContainer: SchemaNode = {
        id: createNodeId(),
        type: 'object',
        title: 'patternProperties',
        _nodeKind: 'patternProperties',
        _order: 1,
        _parentId: schemaNode.id,
      };
      containers.push(patternContainer);

      let childOrder = 0;
      for (const [pattern, value] of Object.entries(node.patternProperties)) {
        const childNode = parseNode(value, schemaNode.id, childOrder++);
        schemaNode.patternProperties![pattern] = childNode;
      }
    } else {
      schemaNode.patternProperties = {};
    }

    // additionalProperties 容器
    if (node.additionalProperties !== undefined) {
      const additionalContainer: SchemaNode = {
        id: createNodeId(),
        type: 'object',
        title: 'additionalProperties',
        _nodeKind: 'additionalProperties',
        _order: 2,
        _parentId: schemaNode.id,
      };

      if (typeof node.additionalProperties === 'boolean') {
        schemaNode.additionalProperties = node.additionalProperties;
        additionalContainer.additionalProperties = node.additionalProperties;
      } else {
        const additionalSchema = parseNode(node.additionalProperties, schemaNode.id, 0);
        schemaNode.additionalProperties = additionalSchema;
      }
      containers.push(additionalContainer);
    } else {
      schemaNode.additionalProperties = false;
    }

    // propertyNames 容器
    if (node.propertyNames) {
      const propertyNamesContainer: SchemaNode = {
        id: createNodeId(),
        type: 'object',
        title: 'propertyNames',
        _nodeKind: 'propertyNames',
        _order: 3,
        _parentId: schemaNode.id,
      };
      containers.push(propertyNamesContainer);
      schemaNode.propertyNames = parseNode(node.propertyNames, schemaNode.id, 0);
    }

    // dependentSchemas 容器
    if (node.dependentSchemas && Object.keys(node.dependentSchemas).length > 0) {
      const dependentSchemasContainer: SchemaNode = {
        id: createNodeId(),
        type: 'object',
        title: 'dependentSchemas',
        _nodeKind: 'dependentSchemas',
        _order: 4,
        _parentId: schemaNode.id,
      };
      containers.push(dependentSchemasContainer);

      schemaNode.dependentSchemas = {};
      for (const [key, value] of Object.entries(node.dependentSchemas)) {
        const childNode = parseNode(value, schemaNode.id, 0);
        schemaNode.dependentSchemas[key] = childNode;
      }
    }

    if (containers.length > 0) {
      schemaNode._containers = containers;
    }
  }

  if (node.type === 'array') {
    const containers: SchemaNode[] = [];

    if (Object.prototype.hasOwnProperty.call(node, 'items')) {
      containers.push({
        id: createNodeId(),
        type: 'array',
        title: 'items',
        _nodeKind: 'items',
        _order: containers.length,
        _parentId: schemaNode.id,
      });
    }

    if (Array.isArray(node.prefixItems)) {
      containers.push({
        id: createNodeId(),
        type: 'array',
        title: 'prefixItems',
        _nodeKind: 'prefixItems',
        _order: containers.length,
        _parentId: schemaNode.id,
      });
      schemaNode.prefixItems = node.prefixItems.map((item: any, idx: number) =>
        parseNode(item, schemaNode.id, idx)
      );
    }

    if (node.items === false) {
      schemaNode.items = false;
    } else if (node.items && typeof node.items === 'object' && !Array.isArray(node.items)) {
      schemaNode.items = parseNode(node.items, schemaNode.id, 0);
    }

    if (node.contains && typeof node.contains === 'object') {
      containers.push({
        id: createNodeId(),
        type: 'array',
        title: 'contains',
        _nodeKind: 'contains',
        _order: containers.length,
        _parentId: schemaNode.id,
      });
      schemaNode.contains = parseNode(node.contains, schemaNode.id, 0);
    }

    if (containers.length > 0) {
      schemaNode._containers = containers;
    }
  }

  if (node.definitions) {
    schemaNode.definitions = {};
    for (const [key, value] of Object.entries(node.definitions)) {
      schemaNode.definitions[key] = parseNode(value, schemaNode.id);
    }
  }

  return schemaNode;
}

function inferType(node: any): SchemaType {
  if (node.type) {
    return node.type as SchemaType;
  }
  if (node.properties) return 'object';
  if (node.items || node.prefixItems || node.contains) return 'array';
  return 'object';
}
