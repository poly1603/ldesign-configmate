import { EnvResolutionError } from '../errors';

export interface EnvResolverOptions {
  /** Environment variables to use (defaults to process.env) */
  env?: Record<string, string | undefined>;
  /** Whether to throw error for missing variables without defaults */
  strict?: boolean;
  /** Prefix for environment variables */
  prefix?: string;
  /** Whether to log warnings for missing variables */
  warn?: boolean;
}

/**
 * Resolves environment variables in configuration
 * Supports syntax: ${VAR} and ${VAR:default}
 */
export class EnvResolver {
  private env: Record<string, string | undefined>;
  private strict: boolean;
  private prefix: string;
  private warn: boolean;

  // Regex to match ${VAR} or ${VAR:default}
  private readonly ENV_VAR_REGEX = /\$\{([^}:]+)(?::([^}]*))?\}/g;

  constructor(options: EnvResolverOptions = {}) {
    this.env = options.env || process.env;
    this.strict = options.strict ?? false;
    this.prefix = options.prefix || '';
    this.warn = options.warn ?? true;
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
   */
  private resolveString(str: string, path: string): string {
    return str.replace(this.ENV_VAR_REGEX, (match, varName, defaultValue) => {
      const fullVarName = this.prefix ? `${this.prefix}${varName}` : varName;
      const envValue = this.env[fullVarName];

      if (envValue !== undefined) {
        return envValue;
      }

      if (defaultValue !== undefined) {
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
}
