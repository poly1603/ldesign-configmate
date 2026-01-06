import { ErrorCode, ERROR_RECOVERY_SUGGESTIONS } from '../constants';

/**
 * Error context interface for additional error information
 */
export interface ErrorContext {
  /** Path where error occurred */
  path?: string;
  /** Value that caused the error */
  value?: unknown;
  /** File path if applicable */
  filePath?: string;
  /** Original error if wrapping another error */
  originalError?: Error;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Base configuration error class
 * Provides structured error handling with codes and recovery suggestions
 */
export class ConfigError extends Error {
  /** Error code for programmatic handling */
  public readonly code: ErrorCode;

  /** Recovery suggestion for the error */
  public readonly suggestion?: string;

  /** Error context with additional information */
  public readonly context: ErrorContext;

  /** Timestamp when error occurred */
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.suggestion = ERROR_RECOVERY_SUGGESTIONS[code];
    Object.setPrototypeOf(this, ConfigError.prototype);
  }

  /**
   * Create a formatted error message with context
   */
  toDetailedString(): string {
    const parts = [`[${this.code}] ${this.message}`];

    if (this.context.path) {
      parts.push(`  Path: ${this.context.path}`);
    }

    if (this.context.filePath) {
      parts.push(`  File: ${this.context.filePath}`);
    }

    if (this.suggestion) {
      parts.push(`  Suggestion: ${this.suggestion}`);
    }

    return parts.join('\n');
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      suggestion: this.suggestion,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when configuration validation fails
 */
export class ValidationError extends ConfigError {
  constructor(
    message: string,
    public readonly path?: string,
    public readonly value?: unknown
  ) {
    super(message, ErrorCode.VALIDATION_FAILED, { path, value });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when file loading fails
 */
export class LoaderError extends ConfigError {
  public readonly filePath?: string;
  public readonly format?: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    filePath?: string,
    format?: string,
    originalError?: Error
  ) {
    super(message, ErrorCode.FILE_NOT_FOUND, { filePath, originalError });
    this.name = 'LoaderError';
    this.filePath = filePath;
    this.format = format;
    this.originalError = originalError;
    Object.setPrototypeOf(this, LoaderError.prototype);
  }
}

/**
 * Error thrown when file watching fails
 */
export class WatcherError extends ConfigError {
  public readonly filePath?: string;
  public readonly originalError?: Error;

  constructor(message: string, filePath?: string, originalError?: Error) {
    super(message, ErrorCode.FILE_WATCH_ERROR, { filePath, originalError });
    this.name = 'WatcherError';
    this.filePath = filePath;
    this.originalError = originalError;
    Object.setPrototypeOf(this, WatcherError.prototype);
  }
}

/**
 * Error thrown when environment variable resolution fails
 */
export class EnvResolutionError extends ConfigError {
  public readonly variable?: string;
  public readonly configPath?: string;

  constructor(message: string, variable?: string, configPath?: string) {
    super(message, ErrorCode.ENV_VAR_NOT_FOUND, {
      path: configPath,
      metadata: { variable },
    });
    this.name = 'EnvResolutionError';
    this.variable = variable;
    this.configPath = configPath;
    Object.setPrototypeOf(this, EnvResolutionError.prototype);
  }
}

/**
 * Error thrown when schema validation fails
 */
export class SchemaValidationError extends ConfigError {
  public readonly errors?: Array<{ path?: string; message: string; code?: string }>;
  public readonly configPath?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    errors?: Array<{ path?: string; message: string; code?: string }>,
    configPath?: string,
    value?: unknown
  ) {
    super(message, ErrorCode.SCHEMA_VALIDATION_FAILED, {
      path: configPath,
      value,
      metadata: { errors },
    });
    this.name = 'SchemaValidationError';
    this.errors = errors;
    this.configPath = configPath;
    this.value = value;
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }

  /**
   * Get formatted validation error messages
   */
  getFormattedErrors(): string[] {
    if (!this.errors) return [this.message];
    return this.errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message));
  }
}

/**
 * Aggregate error for collecting multiple errors
 */
export class AggregateConfigError extends ConfigError {
  public readonly errors: ConfigError[];

  constructor(message: string, errors: ConfigError[]) {
    super(message, ErrorCode.VALIDATION_FAILED, {
      metadata: { errorCount: errors.length },
    });
    this.name = 'AggregateConfigError';
    this.errors = errors;
    Object.setPrototypeOf(this, AggregateConfigError.prototype);
  }

  /**
   * Get all error messages
   */
  getAllMessages(): string[] {
    return this.errors.map((e) => e.message);
  }

  /**
   * Get all error codes
   */
  getAllCodes(): ErrorCode[] {
    return this.errors.map((e) => e.code);
  }

  /**
   * Check if any error has a specific code
   */
  hasErrorCode(code: ErrorCode): boolean {
    return this.errors.some((e) => e.code === code);
  }

  /**
   * Get errors by code
   */
  getErrorsByCode(code: ErrorCode): ConfigError[] {
    return this.errors.filter((e) => e.code === code);
  }
}

/**
 * Snapshot error for snapshot-related issues
 */
export class SnapshotError extends ConfigError {
  public readonly snapshotId?: string;

  constructor(message: string, snapshotId?: string) {
    super(message, ErrorCode.SNAPSHOT_NOT_FOUND, {
      metadata: { snapshotId },
    });
    this.name = 'SnapshotError';
    this.snapshotId = snapshotId;
    Object.setPrototypeOf(this, SnapshotError.prototype);
  }
}

/**
 * Cache error for cache-related issues
 */
export class CacheError extends ConfigError {
  public readonly cacheKey?: string;

  constructor(message: string, code: ErrorCode = ErrorCode.CACHE_ERROR, cacheKey?: string) {
    super(message, code, {
      metadata: { cacheKey },
    });
    this.name = 'CacheError';
    this.cacheKey = cacheKey;
    Object.setPrototypeOf(this, CacheError.prototype);
  }
}

/**
 * Type guard to check if error is a ConfigError
 */
export function isConfigError(error: unknown): error is ConfigError {
  return error instanceof ConfigError;
}

/**
 * Wrap any error in a ConfigError
 */
export function wrapError(
  error: unknown,
  code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
  context: ErrorContext = {}
): ConfigError {
  if (error instanceof ConfigError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const originalError = error instanceof Error ? error : undefined;

  return new ConfigError(message, code, { ...context, originalError });
}

/**
 * Create an error collector for aggregating multiple errors
 */
export class ErrorCollector {
  private errors: ConfigError[] = [];

  /**
   * Add an error to the collector
   */
  add(error: ConfigError | Error | string): void {
    if (typeof error === 'string') {
      this.errors.push(new ConfigError(error));
    } else if (error instanceof ConfigError) {
      this.errors.push(error);
    } else {
      this.errors.push(wrapError(error));
    }
  }

  /**
   * Check if any errors have been collected
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get all collected errors
   */
  getErrors(): ConfigError[] {
    return [...this.errors];
  }

  /**
   * Get error count
   */
  count(): number {
    return this.errors.length;
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Throw an aggregate error if any errors were collected
   */
  throwIfErrors(message?: string): void {
    if (this.errors.length > 0) {
      throw new AggregateConfigError(
        message || `${this.errors.length} error(s) occurred`,
        this.errors
      );
    }
  }
}
