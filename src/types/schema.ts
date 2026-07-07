export type SchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

/** 应用器节点类型 */
export type NodeKind =
  | 'normal'
  | 'properties'
  | 'patternProperties'
  | 'additionalProperties'
  | 'propertyNames'
  | 'dependentSchemas'
  | 'items'
  | 'prefixItems'
  | 'contains';

export interface SchemaNode {
  id: string;
  type: SchemaType;
  title?: string;
  description?: string;
  $comment?: string;
  examples?: any[];
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  properties?: Record<string, SchemaNode>;
  patternProperties?: Record<string, SchemaNode>;
  additionalProperties?: boolean | SchemaNode;
  propertyNames?: SchemaNode;
  dependentSchemas?: Record<string, SchemaNode>;
  items?: SchemaNode | false;
  prefixItems?: SchemaNode[];
  contains?: SchemaNode;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minContains?: number;
  maxContains?: number;
  required?: string[];
  requiredRaw?: string;
  enum?: any[];
  enumRaw?: string;
  const?: any;
  default?: any;
  $ref?: string;
  definitions?: Record<string, SchemaNode>;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  _parentId?: string;
  _order: number;
  /** 标识特殊节点类型（应用器节点等） */
  _nodeKind?: NodeKind;
  /** object 类型的五种应用器子节点 */
  _containers?: SchemaNode[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  severity: 'warning' | 'info';
}

export interface ExportOptions {
  format: boolean;
  indentSize: number;
}
