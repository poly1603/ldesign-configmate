/**
 * ConfigMate Constants
 * Centralized constants for default values, error codes, and configuration
 */

import type { ConfigFormat } from './types';

/**
 * Default configuration options
 */
export const DEFAULT_OPTIONS = {
  /** Default configuration file name */
  CONFIG_NAME: 'config',

  /** Default environment */
  ENVIRONMENT: 'development',

  /** Default environment variable key */
  ENV_KEY: 'NODE_ENV',

  /** Default merge strategy */
  MERGE_STRATEGY: 'deep' as const,

  /** Default file formats in order of preference */
  FORMATS: ['ts', 'js', 'json', 'yaml', 'yml'] as ConfigFormat[],

  /** Default cache settings */
  CACHE: {
    ENABLED: true,
    MAX_SIZE: 100,
    TTL: 60000, // 1 minute
  },

  /** Default snapshot settings */
  SNAPSHOT: {
    AUTO_ENABLED: false,
    MAX_COUNT: 50,
  },

  /** Default file watching settings */
  WATCHER: {
    DEBOUNCE_DELAY: 300,
    STABILITY_THRESHOLD: 100,
    POLL_INTERVAL: 100,
  },

  /** Default error recovery settings */
  RECOVERY: {
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
    MAX_RETRY_DELAY: 30000,
    CIRCUIT_BREAKER_THRESHOLD: 5,
    CIRCUIT_BREAKER_RESET_TIMEOUT: 30000,
  },

  /** Default enhanced cache settings */
  ENHANCED_CACHE: {
    MAX_SIZE: 100,
    TTL: 60000,
    MAX_MEMORY: 50 * 1024 * 1024, // 50MB
  },
} as const;

/**
 * Error codes for ConfigMate errors
 */
export enum ErrorCode {
  // General errors (1xxx)
  UNKNOWN_ERROR = 'ERR_UNKNOWN',
  INVALID_ARGUMENT = 'ERR_INVALID_ARGUMENT',
  NOT_INITIALIZED = 'ERR_NOT_INITIALIZED',

  // Configuration errors (2xxx)
  CONFIG_NOT_FOUND = 'ERR_CONFIG_NOT_FOUND',
  CONFIG_PARSE_ERROR = 'ERR_CONFIG_PARSE',
  CONFIG_MERGE_ERROR = 'ERR_CONFIG_MERGE',
  CONFIG_SAVE_ERROR = 'ERR_CONFIG_SAVE',

  // Validation errors (3xxx)
  VALIDATION_FAILED = 'ERR_VALIDATION_FAILED',
  SCHEMA_VALIDATION_FAILED = 'ERR_SCHEMA_VALIDATION',
  REQUIRED_FIELD_MISSING = 'ERR_REQUIRED_FIELD',
  INVALID_TYPE = 'ERR_INVALID_TYPE',

  // Loader errors (4xxx)
  FILE_NOT_FOUND = 'ERR_FILE_NOT_FOUND',
  FILE_READ_ERROR = 'ERR_FILE_READ',
  FILE_WRITE_ERROR = 'ERR_FILE_WRITE',
  UNSUPPORTED_FORMAT = 'ERR_UNSUPPORTED_FORMAT',
  FORMAT_PARSE_ERROR = 'ERR_FORMAT_PARSE',

  // Watcher errors (5xxx)
  WATCHER_START_ERROR = 'ERR_WATCHER_START',
  WATCHER_STOP_ERROR = 'ERR_WATCHER_STOP',
  FILE_WATCH_ERROR = 'ERR_FILE_WATCH',

  // Environment resolution errors (6xxx)
  ENV_VAR_NOT_FOUND = 'ERR_ENV_VAR_NOT_FOUND',
  ENV_VAR_INVALID = 'ERR_ENV_VAR_INVALID',
  ENV_RESOLUTION_ERROR = 'ERR_ENV_RESOLUTION',

  // Snapshot errors (7xxx)
  SNAPSHOT_NOT_FOUND = 'ERR_SNAPSHOT_NOT_FOUND',
  SNAPSHOT_CREATE_ERROR = 'ERR_SNAPSHOT_CREATE',
  SNAPSHOT_RESTORE_ERROR = 'ERR_SNAPSHOT_RESTORE',
  SNAPSHOT_LIMIT_EXCEEDED = 'ERR_SNAPSHOT_LIMIT',

  // Cache errors (8xxx)
  CACHE_ERROR = 'ERR_CACHE',
  CACHE_MEMORY_EXCEEDED = 'ERR_CACHE_MEMORY',
  CACHE_ITEM_TOO_LARGE = 'ERR_CACHE_ITEM_SIZE',

  // Circuit breaker errors (9xxx)
  CIRCUIT_BREAKER_OPEN = 'ERR_CIRCUIT_OPEN',
  CIRCUIT_BREAKER_HALF_OPEN = 'ERR_CIRCUIT_HALF_OPEN',
  RETRY_EXHAUSTED = 'ERR_RETRY_EXHAUSTED',
}

/**
 * Error recovery suggestions
 */
export const ERROR_RECOVERY_SUGGESTIONS: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN_ERROR]: 'Check the error details and try again.',
  [ErrorCode.INVALID_ARGUMENT]: 'Verify the provided arguments are correct.',
  [ErrorCode.NOT_INITIALIZED]: 'Call init() before using the ConfigManager.',

  [ErrorCode.CONFIG_NOT_FOUND]: 'Ensure the config file exists in the specified directory.',
  [ErrorCode.CONFIG_PARSE_ERROR]: 'Check the config file syntax and format.',
  [ErrorCode.CONFIG_MERGE_ERROR]: 'Verify config structures are compatible for merging.',
  [ErrorCode.CONFIG_SAVE_ERROR]: 'Check write permissions for the target file.',

  [ErrorCode.VALIDATION_FAILED]: 'Review the configuration against expected structure.',
  [ErrorCode.SCHEMA_VALIDATION_FAILED]: 'Ensure configuration matches the defined schema.',
  [ErrorCode.REQUIRED_FIELD_MISSING]: 'Add the missing required field to your config.',
  [ErrorCode.INVALID_TYPE]: 'Check the data types in your configuration.',

  [ErrorCode.FILE_NOT_FOUND]: 'Verify the file path is correct and the file exists.',
  [ErrorCode.FILE_READ_ERROR]: 'Check file permissions and ensure the file is readable.',
  [ErrorCode.FILE_WRITE_ERROR]: 'Check file permissions and ensure the directory is writable.',
  [ErrorCode.UNSUPPORTED_FORMAT]: 'Use a supported format: ts, js, json, yaml, yml, toml, ini.',
  [ErrorCode.FORMAT_PARSE_ERROR]: 'Check the file content syntax for the specified format.',

  [ErrorCode.WATCHER_START_ERROR]: 'Ensure the file paths are valid and accessible.',
  [ErrorCode.WATCHER_STOP_ERROR]: 'The watcher may have already been stopped.',
  [ErrorCode.FILE_WATCH_ERROR]: 'Check file system permissions and inotify limits.',

  [ErrorCode.ENV_VAR_NOT_FOUND]: 'Set the environment variable or provide a default value.',
  [ErrorCode.ENV_VAR_INVALID]: 'Check the environment variable value format.',
  [ErrorCode.ENV_RESOLUTION_ERROR]: 'Review the ${VAR} or ${VAR:default} syntax.',

  [ErrorCode.SNAPSHOT_NOT_FOUND]: 'Use listSnapshots() to see available snapshots.',
  [ErrorCode.SNAPSHOT_CREATE_ERROR]: 'Ensure the configuration is valid before creating snapshot.',
  [ErrorCode.SNAPSHOT_RESTORE_ERROR]: 'The snapshot may be corrupted. Try a different snapshot.',
  [ErrorCode.SNAPSHOT_LIMIT_EXCEEDED]: 'Increase maxSnapshots or delete old snapshots.',

  [ErrorCode.CACHE_ERROR]: 'Clear the cache and retry the operation.',
  [ErrorCode.CACHE_MEMORY_EXCEEDED]: 'Reduce cache size or increase maxMemory limit.',
  [ErrorCode.CACHE_ITEM_TOO_LARGE]: 'Split large configurations or increase memory limit.',

  [ErrorCode.CIRCUIT_BREAKER_OPEN]: 'Wait for the circuit breaker reset timeout.',
  [ErrorCode.CIRCUIT_BREAKER_HALF_OPEN]: 'The system is recovering. Wait and retry.',
  [ErrorCode.RETRY_EXHAUSTED]: 'Check the underlying service and increase retry limits.',
};

/**
 * Supported file formats with their properties
 */
export const FILE_FORMATS: Record<
  ConfigFormat,
  {
    extensions: string[];
    mimeType: string;
    requiresPackage?: string;
    isNative: boolean;
  }
> = {
  ts: {
    extensions: ['.ts'],
    mimeType: 'application/typescript',
    isNative: true,
  },
  js: {
    extensions: ['.js'],
    mimeType: 'application/javascript',
    isNative: true,
  },
  mjs: {
    extensions: ['.mjs'],
    mimeType: 'application/javascript',
    isNative: true,
  },
  cjs: {
    extensions: ['.cjs'],
    mimeType: 'application/javascript',
    isNative: true,
  },
  json: {
    extensions: ['.json'],
    mimeType: 'application/json',
    isNative: true,
  },
  yaml: {
    extensions: ['.yaml'],
    mimeType: 'application/x-yaml',
    isNative: true,
  },
  yml: {
    extensions: ['.yml'],
    mimeType: 'application/x-yaml',
    isNative: true,
  },
  toml: {
    extensions: ['.toml'],
    mimeType: 'application/toml',
    requiresPackage: 'toml',
    isNative: false,
  },
  ini: {
    extensions: ['.ini'],
    mimeType: 'text/plain',
    requiresPackage: 'ini',
    isNative: false,
  },
};

/**
 * Environment variable pattern
 */
export const ENV_VAR_PATTERNS = {
  /** Standard pattern: ${VAR} or ${VAR:default} */
  STANDARD: /\$\{([^}:]+)(?::([^}]*))?\}/g,

  /** Typed pattern: ${VAR:type:default} where type is number, boolean, json */
  TYPED: /\$\{([^}:]+):(?:(number|boolean|json|string):)?([^}]*)\}/g,

  /** Variable name only */
  VAR_NAME: /^[A-Z][A-Z0-9_]*$/,
} as const;

/**
 * Reserved configuration keys
 */
export const RESERVED_KEYS = [
  '__isConfigObject',
  '__proto__',
  'constructor',
  'prototype',
  'env',
] as const;

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Event names
 */
export const EVENTS = {
  CHANGE: 'change',
  FILE_ADDED: 'file:added',
  FILE_MODIFIED: 'file:modified',
  FILE_DELETED: 'file:deleted',
  ERROR: 'error',
  LOADED: 'loaded',
  RELOAD: 'reload',
} as const;

/**
 * Type for event names
 */
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
