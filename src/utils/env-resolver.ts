import { EnvResolutionError } from '../errors';

/**
 * Supported type coercion types for environment variables
 */
export type EnvVarType = 'string' | 'number' | 'boolean' | 'json' | 'array';

export interface EnvResolverOptions {
  /** Environment variables to use (defaults to process.env) */
  env?: Record<string, string | undefined>;
  /** Whether to throw error for missing variables without defaults */
  strict?: boolean;
  /** Prefix for environment variables */
  prefix?: string;
  /** Whether to log warnings for missing variables */
  warn?: boolean;
  /** Enable type coercion (e.g., ${PORT:number:3000}) */
  typeCoercion?: boolean;
  /** Custom type coercion functions */
  customCoercions?: Record<string, (value: string) => unknown>;
}

/**
 * Type coercion result
 */
interface CoercionResult {
  value: unknown;
  success: boolean;
  error?: string;
}

/**
 * Resolves environment variables in configuration
 * Supports syntax:
 * - ${VAR} - Simple variable
 * - ${VAR:default} - Variable with default
 * - ${VAR:number:3000} - Variable with type and default
 * - ${VAR:boolean:true} - Boolean coercion
 * - ${VAR:json:{"key":"value"}} - JSON coercion
 * - ${VAR:array:a,b,c} - Array coercion (comma-separated)
 */
export class EnvResolver {
  private env: Record<string, string | undefined>;
  private strict: boolean;
  private prefix: string;
  private warn: boolean;
  private typeCoercion: boolean;
  private customCoercions: Record<string, (value: string) => unknown>;

  // Regex to match ${VAR} or ${VAR:default} or ${VAR:type:default}
  private readonly ENV_VAR_REGEX = /\$\{([^}:]+)(?::([^}]*))?\}/g;

  // Regex to match typed syntax ${VAR:type:default}
  private readonly TYPED_VAR_REGEX = /\$\{([^}:]+):(?:(string|number|boolean|json|array):)?([^}]*)\}/g;

  constructor(options: EnvResolverOptions = {}) {
    this.env = options.env || process.env;
    this.strict = options.strict ?? false;
    this.prefix = options.prefix || '';
    this.warn = options.warn ?? true;
    this.typeCoercion = options.typeCoercion ?? true;
    this.customCoercions = options.customCoercions || {};
  }

  /**
   * Coerce a string value to a specific type
   */
  private coerceValue(value: string, type: EnvVarType): CoercionResult {
    // Check for custom coercion first
    if (type in this.customCoercions) {
      try {
        return { value: this.customCoercions[type](value), success: true };
      } catch (error) {
        return {
          value,
          success: false,
          error: `Custom coercion failed: ${(error as Error).message}`,
        };
      }
    }

    switch (type) {
      case 'number': {
        const num = Number(value);
        if (isNaN(num)) {
          return { value, success: false, error: `Cannot convert '${value}' to number` };
        }
        return { value: num, success: true };
      }

      case 'boolean': {
        const lower = value.toLowerCase().trim();
        if (['true', '1', 'yes', 'on'].includes(lower)) {
          return { value: true, success: true };
        }
        if (['false', '0', 'no', 'off', ''].includes(lower)) {
          return { value: false, success: true };
        }
        return { value, success: false, error: `Cannot convert '${value}' to boolean` };
      }

      case 'json': {
        try {
          return { value: JSON.parse(value), success: true };
        } catch {
          return { value, success: false, error: `Invalid JSON: '${value}'` };
        }
      }

      case 'array': {
        // Support both comma-separated and JSON array syntax
        if (value.startsWith('[')) {
          try {
            return { value: JSON.parse(value), success: true };
          } catch {
            // Fall through to comma-separated parsing
          }
        }
        return {
          value: value.split(',').map((s) => s.trim()).filter(Boolean),
          success: true,
        };
      }

      case 'string':
      default:
        return { value, success: true };
    }
  }

  /**
   * Resolve environment variables in a value
   */
  resolve(value: any, path: string = ''): any {
    if (typeof value === 'string') {
      return this.resolveString(value, path);
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => 
        this.resolve(item, `${path}[${index}]`)
      );
    }

    if (value && typeof value === 'object') {
      const resolved: any = {};
      for (const [key, val] of Object.entries(value)) {
        const newPath = path ? `${path}.${key}` : key;
        resolved[key] = this.resolve(val, newPath);
      }
      return resolved;
    }

    return value;
  }

  /**
   * Resolve environment variables in a string
   * Returns the resolved value, potentially with type coercion
   */
  private resolveString(str: string, path: string): unknown {
    // Check if the entire string is a single env var (for type coercion)
    const singleVarMatch = str.match(/^\$\{([^}:]+)(?::(string|number|boolean|json|array))?(?::([^}]*))?\}$/);

    if (singleVarMatch && this.typeCoercion) {
      const [, varName, type, defaultValue] = singleVarMatch;
      return this.resolveSingleVar(varName, type as EnvVarType | undefined, defaultValue, path);
    }

    // Multiple vars or text around vars - always returns string
    return str.replace(this.ENV_VAR_REGEX, (match, varName, defaultValue) => {
      const fullVarName = this.prefix ? `${this.prefix}${varName}` : varName;
      const envValue = this.env[fullVarName];

      if (envValue !== undefined) {
        return envValue;
      }

      // Handle typed default: ${VAR:type:default}
      if (defaultValue !== undefined) {
        const typedMatch = defaultValue.match(/^(string|number|boolean|json|array):(.*)$/);
        if (typedMatch) {
          return typedMatch[2]; // Return just the default as string in multi-var context
        }
        return defaultValue;
      }

      if (this.strict) {
        throw new EnvResolutionError(
          `Environment variable '${fullVarName}' is not defined`,
          fullVarName,
          path
        );
      }

      if (this.warn) {
        console.warn(
          `Warning: Environment variable '${fullVarName}' is not defined at path '${path}', using original value`
        );
      }

      return match;
    });
  }

  /**
   * Resolve a single environment variable with optional type coercion
   */
  private resolveSingleVar(
    varName: string,
    type: EnvVarType | undefined,
    defaultValue: string | undefined,
    path: string
  ): unknown {
    const fullVarName = this.prefix ? `${this.prefix}${varName}` : varName;
    const envValue = this.env[fullVarName];
    const valueToCoerce = envValue ?? defaultValue;

    if (valueToCoerce === undefined) {
      if (this.strict) {
        throw new EnvResolutionError(
          `Environment variable '${fullVarName}' is not defined`,
          fullVarName,
          path
        );
      }

      if (this.warn) {
        console.warn(
          `Warning: Environment variable '${fullVarName}' is not defined at path '${path}'`
        );
      }

      return `\${${varName}}`;
    }

    // Apply type coercion if specified
    if (type && this.typeCoercion) {
      const result = this.coerceValue(valueToCoerce, type);
      if (!result.success && this.warn) {
        console.warn(`Warning: Type coercion failed for '${fullVarName}': ${result.error}`);
      }
      return result.value;
    }

    return valueToCoerce;
  }

  /**
   * Check if a value contains environment variable references
   */
  hasEnvVars(value: any): boolean {
    if (typeof value === 'string') {
      return this.ENV_VAR_REGEX.test(value);
    }

    if (Array.isArray(value)) {
      return value.some(item => this.hasEnvVars(item));
    }

    if (value && typeof value === 'object') {
      return Object.values(value).some(val => this.hasEnvVars(val));
    }

    return false;
  }

  /**
   * Extract all environment variable names from a value
   */
  extractEnvVars(value: any): string[] {
    const vars = new Set<string>();

    const extract = (val: any): void => {
      if (typeof val === 'string') {
        const matches = val.matchAll(this.ENV_VAR_REGEX);
        for (const match of matches) {
          vars.add(match[1]);
        }
      } else if (Array.isArray(val)) {
        val.forEach(extract);
      } else if (val && typeof val === 'object') {
        Object.values(val).forEach(extract);
      }
    };

    extract(value);
    return Array.from(vars);
  }

  /**
   * Validate that all required environment variables are defined
   */
  validate(value: any): { valid: boolean; missing: string[] } {
    const vars = this.extractEnvVars(value);
    const missing: string[] = [];

    for (const varName of vars) {
      const fullVarName = this.prefix ? `${this.prefix}${varName}` : varName;
      if (this.env[fullVarName] === undefined) {
        // Check if it has a default value in the string
        const hasDefault = this.checkHasDefault(value, varName);
        if (!hasDefault) {
          missing.push(varName);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Check if a variable has a default value
   */
  private checkHasDefault(value: any, varName: string): boolean {
    const defaultRegex = new RegExp(`\\$\\{${varName}:([^}]+)\\}`);
    const str = JSON.stringify(value);
    return defaultRegex.test(str);
  }

  /**
   * Set or update environment variables
   */
  setEnv(key: string, value: string): void {
    this.env[key] = value;
  }

  /**
   * Get current environment variables
   */
  getEnv(): Record<string, string | undefined> {
    return { ...this.env };
  }

  /**
   * Register a custom type coercion function
   */
  registerCoercion(typeName: string, coercion: (value: string) => unknown): void {
    this.customCoercions[typeName] = coercion;
  }

  /**
   * Resolve a single environment variable by name
   */
  get(varName: string, defaultValue?: string): string | undefined {
    const fullVarName = this.prefix ? `${this.prefix}${varName}` : varName;
    return this.env[fullVarName] ?? defaultValue;
  }

  /**
   * Resolve a single environment variable with type coercion
   */
  getTyped<T>(varName: string, type: EnvVarType, defaultValue?: string): T | undefined {
    const value = this.get(varName, defaultValue);
    if (value === undefined) {
      return undefined;
    }
    const result = this.coerceValue(value, type);
    return result.value as T;
  }

  /**
   * Get a number from environment
   */
  getNumber(varName: string, defaultValue?: number): number | undefined {
    const value = this.get(varName, defaultValue?.toString());
    if (value === undefined) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get a boolean from environment
   */
  getBoolean(varName: string, defaultValue?: boolean): boolean | undefined {
    const value = this.get(varName, defaultValue?.toString());
    if (value === undefined) {
      return defaultValue;
    }
    const lower = value.toLowerCase().trim();
    if (['true', '1', 'yes', 'on'].includes(lower)) {
      return true;
    }
    if (['false', '0', 'no', 'off', ''].includes(lower)) {
      return false;
    }
    return defaultValue;
  }

  /**
   * Get a JSON-parsed value from environment
   */
  getJSON<T = unknown>(varName: string, defaultValue?: T): T | undefined {
    const value = this.get(varName);
    if (value === undefined) {
      return defaultValue;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Get an array from environment (comma-separated or JSON)
   */
  getArray(varName: string, defaultValue?: string[]): string[] | undefined {
    const value = this.get(varName);
    if (value === undefined) {
      return defaultValue;
    }
    // Try JSON array first
    if (value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through to comma-separated
      }
    }
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }

  /**
   * Check if an environment variable is defined
   */
  isDefined(varName: string): boolean {
    const fullVarName = this.prefix ? `${this.prefix}${varName}` : varName;
    return this.env[fullVarName] !== undefined;
  }

  /**
   * Get all environment variables with a specific prefix
   */
  getWithPrefix(prefix: string): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {};
    const fullPrefix = this.prefix + prefix;

    for (const [key, value] of Object.entries(this.env)) {
      if (key.startsWith(fullPrefix)) {
        const shortKey = key.slice(fullPrefix.length);
        result[shortKey] = value;
      }
    }

    return result;
  }
}
