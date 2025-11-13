/**
 * Base configuration error class
 */
export class ConfigError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * Error thrown when configuration validation fails
 */
export class ValidationError extends ConfigError {
  constructor(
    message: string,
    public readonly path?: string,
    public readonly value?: any
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when file loading fails
 */
export class LoaderError extends ConfigError {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly format?: string,
    public readonly originalError?: Error
  ) {
    super(message, 'LOADER_ERROR');
    this.name = 'LoaderError';
    Object.setPrototypeOf(this, LoaderError.prototype);
  }
}

/**
 * Error thrown when file watching fails
 */
export class WatcherError extends ConfigError {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly originalError?: Error
  ) {
    super(message, 'WATCHER_ERROR');
    this.name = 'WatcherError';
    Object.setPrototypeOf(this, WatcherError.prototype);
  }
}

/**
 * Error thrown when environment variable resolution fails
 */
export class EnvResolutionError extends ConfigError {
  constructor(
    message: string,
    public readonly variable?: string,
    public readonly path?: string
  ) {
    super(message, 'ENV_RESOLUTION_ERROR');
    this.name = 'EnvResolutionError';
    Object.setPrototypeOf(this, EnvResolutionError.prototype);
  }
}

/**
 * Error thrown when schema validation fails
 */
export class SchemaValidationError extends ConfigError {
  constructor(
    message: string,
    public readonly errors?: any[],
    public readonly path?: string,
    public readonly value?: any
  ) {
    super(message, 'SCHEMA_VALIDATION_ERROR');
    this.name = 'SchemaValidationError';
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }
}
