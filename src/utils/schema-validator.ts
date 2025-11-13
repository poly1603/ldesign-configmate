import { SchemaValidationError } from '../errors';

/**
 * Schema validator for configuration validation
 * Supports Zod, Yup, Joi, or custom validators
 */
export class SchemaValidator {
  private schema: any;
  private validator: 'zod' | 'yup' | 'joi' | 'custom';

  constructor(schema: any, validator: 'zod' | 'yup' | 'joi' | 'custom' = 'zod') {
    this.schema = schema;
    this.validator = validator;
  }

  /**
   * Validate configuration against schema
   */
  validate(config: any): { valid: boolean; errors?: any[]; data?: any } {
    try {
      switch (this.validator) {
        case 'zod':
          return this.validateZod(config);
        case 'yup':
          return this.validateYup(config);
        case 'joi':
          return this.validateJoi(config);
        case 'custom':
          return this.validateCustom(config);
        default:
          throw new Error(`Unknown validator: ${this.validator}`);
      }
    } catch (error: any) {
      return {
        valid: false,
        errors: [{ message: error.message }],
      };
    }
  }

  /**
   * Validate with Zod
   */
  private validateZod(config: any) {
    if (!this.schema || typeof this.schema.parse !== 'function') {
      throw new Error('Invalid Zod schema');
    }

    try {
      const data = this.schema.parse(config);
      return { valid: true, data };
    } catch (error: any) {
      const errors = error.errors || [{ message: error.message }];
      return { valid: false, errors };
    }
  }

  /**
   * Validate with Yup
   */
  private validateYup(config: any) {
    if (!this.schema || typeof this.schema.validateSync !== 'function') {
      throw new Error('Invalid Yup schema');
    }

    try {
      const data = this.schema.validateSync(config, { abortEarly: false });
      return { valid: true, data };
    } catch (error: any) {
      const errors = error.inner?.map((e: any) => ({
        path: e.path,
        message: e.message,
      })) || [{ message: error.message }];
      return { valid: false, errors };
    }
  }

  /**
   * Validate with Joi
   */
  private validateJoi(config: any) {
    if (!this.schema || typeof this.schema.validate !== 'function') {
      throw new Error('Invalid Joi schema');
    }

    const result = this.schema.validate(config, { abortEarly: false });
    
    if (result.error) {
      const errors = result.error.details?.map((d: any) => ({
        path: d.path.join('.'),
        message: d.message,
      })) || [{ message: result.error.message }];
      return { valid: false, errors };
    }

    return { valid: true, data: result.value };
  }

  /**
   * Validate with custom function
   */
  private validateCustom(config: any) {
    if (typeof this.schema !== 'function') {
      throw new Error('Custom validator must be a function');
    }

    try {
      const result = this.schema(config);
      
      // If result is boolean
      if (typeof result === 'boolean') {
        return result ? { valid: true, data: config } : { valid: false, errors: [] };
      }
      
      // If result is object with valid property
      if (typeof result === 'object' && 'valid' in result) {
        return result;
      }
      
      // Otherwise assume valid if no error thrown
      return { valid: true, data: config };
    } catch (error: any) {
      return {
        valid: false,
        errors: [{ message: error.message }],
      };
    }
  }

  /**
   * Validate and throw on error
   */
  validateOrThrow(config: any): any {
    const result = this.validate(config);
    
    if (!result.valid) {
      throw new SchemaValidationError(
        'Configuration validation failed',
        result.errors
      );
    }
    
    return result.data || config;
  }

  /**
   * Get formatted error messages
   */
  getErrorMessages(errors: any[]): string[] {
    return errors.map(error => {
      if (error.path) {
        return `${error.path}: ${error.message}`;
      }
      return error.message;
    });
  }
}

/**
 * Helper function to create a schema validator
 */
export function createValidator(
  schema: any,
  validator: 'zod' | 'yup' | 'joi' | 'custom' = 'zod'
): SchemaValidator {
  return new SchemaValidator(schema, validator);
}

/**
 * Helper to validate config with Zod schema
 */
export function validateWithZod(schema: any, config: any) {
  const validator = new SchemaValidator(schema, 'zod');
  return validator.validate(config);
}
