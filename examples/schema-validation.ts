import { z } from 'zod';
import { createValidator, validateWithZod } from '../src';

// Define a Zod schema for your configuration
const configSchema = z.object({
  app: z.object({
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    port: z.number().min(1).max(65535),
  }),
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    ssl: z.boolean().optional(),
    pool: z.object({
      min: z.number().min(0),
      max: z.number().min(1),
    }).optional(),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    format: z.enum(['json', 'text']).optional(),
  }).optional(),
});

type ConfigSchema = z.infer<typeof configSchema>;

console.log('=== Schema Validation Examples ===\n');

// Example 1: Valid configuration
console.log('1. Validating a valid configuration:');
const validConfig = {
  app: {
    name: 'MyApp',
    version: '1.0.0',
    port: 3000,
  },
  database: {
    host: 'localhost',
    port: 5432,
    name: 'mydb',
    ssl: false,
    pool: {
      min: 2,
      max: 10,
    },
  },
  logging: {
    level: 'info' as const,
    format: 'json' as const,
  },
};

const result1 = validateWithZod(configSchema, validConfig);
console.log('Valid:', result1.valid);
if (result1.valid) {
  console.log('Validated data:', JSON.stringify(result1.data, null, 2));
}
console.log();

// Example 2: Invalid configuration - missing required field
console.log('2. Validating an invalid configuration (missing field):');
const invalidConfig1 = {
  app: {
    name: 'MyApp',
    version: '1.0.0',
    // Missing port
  },
  database: {
    host: 'localhost',
    port: 5432,
    name: 'mydb',
  },
};

const result2 = validateWithZod(configSchema, invalidConfig1);
console.log('Valid:', result2.valid);
if (!result2.valid) {
  console.log('Errors:', result2.errors);
}
console.log();

// Example 3: Invalid configuration - wrong type
console.log('3. Validating an invalid configuration (wrong type):');
const invalidConfig2 = {
  app: {
    name: 'MyApp',
    version: '1.0.0',
    port: '3000', // Should be number
  },
  database: {
    host: 'localhost',
    port: 5432,
    name: 'mydb',
  },
};

const result3 = validateWithZod(configSchema, invalidConfig2);
console.log('Valid:', result3.valid);
if (!result3.valid) {
  console.log('Errors:', result3.errors);
}
console.log();

// Example 4: Using SchemaValidator class
console.log('4. Using SchemaValidator class:');
const validator = createValidator(configSchema, 'zod');

try {
  const validated = validator.validateOrThrow(validConfig);
  console.log('Validation passed!');
  console.log('App name:', validated.app.name);
  console.log('Database port:', validated.database.port);
} catch (error: any) {
  console.error('Validation failed:', error.message);
}
console.log();

// Example 5: Invalid configuration with formatted error messages
console.log('5. Formatted error messages:');
const invalidConfig3 = {
  app: {
    name: '',  // Too short
    version: 'invalid',  // Invalid format
    port: 99999,  // Out of range
  },
  database: {
    host: 'localhost',
    port: 5432,
    name: 'mydb',
  },
  logging: {
    level: 'verbose',  // Invalid enum value
  },
};

const result5 = validateWithZod(configSchema, invalidConfig3);
if (!result5.valid && result5.errors) {
  const errorMessages = validator.getErrorMessages(result5.errors);
  console.log('Validation errors:');
  errorMessages.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg}`);
  });
}
console.log();

// Example 6: Partial validation (optional fields)
console.log('6. Configuration with optional fields:');
const minimalConfig = {
  app: {
    name: 'MinimalApp',
    version: '1.0.0',
    port: 8080,
  },
  database: {
    host: 'localhost',
    port: 5432,
    name: 'mydb',
    // Optional fields omitted
  },
  // logging is optional
};

const result6 = validateWithZod(configSchema, minimalConfig);
console.log('Valid:', result6.valid);
if (result6.valid) {
  console.log('Minimal config validated successfully');
}
console.log();

// Example 7: Custom validation function
console.log('7. Using custom validator:');
const customValidator = createValidator((config: any) => {
  if (!config.app || !config.app.name) {
    throw new Error('App name is required');
  }
  if (config.app.port < 1024 && config.app.port !== 80 && config.app.port !== 443) {
    throw new Error('Port below 1024 requires elevated privileges (except 80, 443)');
  }
  return true;
}, 'custom');

const customResult = customValidator.validate(validConfig);
console.log('Custom validation result:', customResult.valid);
console.log();

// Example 8: Refine and transform with Zod
console.log('8. Zod refine and transform:');
const refinedSchema = z.object({
  database: z.object({
    url: z.string().url().or(
      z.string().transform(val => {
        // Transform legacy host:port format to URL
        if (!val.includes('://')) {
          return `postgres://localhost:5432/${val}`;
        }
        return val;
      })
    ),
  }),
});

const legacyConfig = {
  database: {
    url: 'mydb',  // Will be transformed
  },
};

const result8 = validateWithZod(refinedSchema, legacyConfig);
if (result8.valid && result8.data) {
  console.log('Original URL:', legacyConfig.database.url);
  console.log('Transformed URL:', result8.data.database.url);
}
console.log();

console.log('=== Schema Validation Examples Complete ===');
