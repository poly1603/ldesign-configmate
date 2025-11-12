import { DefineConfigOptions } from '../types';

/**
 * Define configuration with TypeScript support
 * 
 * @example
 * ```ts
 * export default defineConfig({
 *   server: {
 *     port: 3000,
 *     host: 'localhost'
 *   },
 *   database: {
 *     url: 'mongodb://localhost:27017'
 *   }
 * })
 * ```
 * 
 * @example With environment overrides
 * ```ts
 * export default defineConfig({
 *   server: { port: 3000 },
 *   env: {
 *     production: {
 *       server: { port: 80 }
 *     }
 *   }
 * })
 * ```
 */
export function defineConfig<T = any>(
  config: T & { env?: Record<string, Partial<T>> }
): T & { __isConfigObject: true } {
  return {
    ...config,
    __isConfigObject: true as const,
  };
}

/**
 * Define configuration with options
 * 
 * @example
 * ```ts
 * export default defineConfigWithOptions({
 *   schema: {
 *     server: { port: 3000 }
 *   },
 *   env: {
 *     production: {
 *       server: { port: 80 }
 *     }
 *   },
 *   validate: (config) => {
 *     if (config.server.port < 0) {
 *       throw new Error('Port must be positive');
 *     }
 *   }
 * })
 * ```
 */
export function defineConfigWithOptions<T = any>(
  options: DefineConfigOptions<T>
): any {
  const { schema = {} as T, env = {}, validate, transform } = options;
  
  let config: any = {
    ...schema,
    env,
    __isConfigObject: true as const,
  };
  
  // Apply transform if provided
  if (transform) {
    const baseConfig = transform(schema);
    config = {
      ...baseConfig,
      env,
      __isConfigObject: true as const,
    };
  }
  
  // Validate if provided
  if (validate) {
    const result = validate(schema);
    if (result === false) {
      throw new Error('Config validation failed');
    }
  }
  
  return config;
}

/**
 * Type helper for configuration
 */
export type Config<T> = T & {
  env?: Record<string, Partial<T>>;
};

/**
 * Helper to merge environment configs
 */
export function mergeEnvConfig<T>(
  base: T,
  envConfigs: Record<string, Partial<T>>,
  currentEnv: string
): T {
  const envConfig = envConfigs[currentEnv] || {};
  return {
    ...base,
    ...envConfig,
  };
}

/**
 * Helper to validate config against a schema
 */
export function validateConfig<T>(
  config: any,
  schema: T,
  strict = false
): config is T {
  if (strict) {
    // Strict validation: config must match schema exactly
    const schemaKeys = Object.keys(schema as any);
    const configKeys = Object.keys(config);
    
    // Check for missing keys
    for (const key of schemaKeys) {
      if (!(key in config)) {
        console.error(`Missing required config key: ${key}`);
        return false;
      }
    }
    
    // Check for extra keys
    for (const key of configKeys) {
      if (!(key in (schema as any))) {
        console.error(`Unknown config key: ${key}`);
        return false;
      }
    }
  }
  
  // Type checking would be done by TypeScript at compile time
  // At runtime, we just ensure required fields exist
  for (const key in schema) {
    if (schema[key] !== undefined && !(key in config)) {
      console.error(`Missing required config key: ${key}`);
      return false;
    }
  }
  
  return true;
}