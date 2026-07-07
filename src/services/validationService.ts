import Ajv2020 from 'ajv/dist/2020';
import { SchemaNode, ValidationResult } from '@/types/schema';
import { generateJsonSchema } from '@/utils/schemaGenerator';

const ajv = new Ajv2020({ allErrors: true, strict: false });

export function validateSchema(node: SchemaNode | null): ValidationResult {
  if (!node) {
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  const jsonSchema = generateJsonSchema(node);

  try {
    const validate = ajv.compile(jsonSchema);
    const valid = validate({}) as boolean;

    const errors = validate.errors || [];
    const validationErrors = errors.map((err) => ({
      path: err.instancePath || '/',
      message: err.message || 'Unknown error',
      keyword: err.keyword,
    }));

    const warnings: any[] = [];

    if (!node.title && node === node) {
      warnings.push({
        path: '/',
        message: '根节点缺少标题',
        severity: 'warning' as const,
      });
    }

    return {
      valid: valid || validationErrors.length === 0,
      errors: validationErrors,
      warnings,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          path: '/',
          message: error instanceof Error ? error.message : '校验失败',
          keyword: 'exception',
        },
      ],
      warnings: [],
    };
  }
}
