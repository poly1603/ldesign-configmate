/**
 * @ldesign/configmate
 * A powerful Node.js configuration management package
 *
 * @packageDocumentation
 */

// Core exports
export { ConfigManager } from './core/config-manager';
export { ConfigLoader } from './loaders/config-loader';
export { ChangeDetector } from './detectors/change-detector';

// Helpers
export {
  defineConfig,
  defineConfigWithOptions,
  mergeEnvConfig,
  validateConfig,
  type Config,
} from './helpers/define-config';

// Watchers
export {
  ConfigWatcher,
  createConfigWatcher,
  type ConfigWatcherOptions,
  type WatcherEvents,
} from './watchers';

// Utilities - Cache
export { Cache, debounce, throttle, cloneDeep } from './utils/cache';
export { EnhancedCache, type CacheStats, type CacheOptions } from './utils/enhanced-cache';

// Utilities - Function helpers
export {
  memoize,
  compose,
  pipe,
  once,
  delay,
  retry,
  timeout,
} from './utils/function-utils';

// Utilities - Object manipulation
export {
  setPath,
  getPath,
  hasPath,
  deletePath,
  mergeDeep,
  deepFreeze,
  deepSeal,
  pick,
  omit,
  flatten,
  unflatten,
  isEmpty,
  isEqual,
  getAllKeys,
  diff,
  mapValues,
  filterObject,
  parsePath,
  isSafeKey,
} from './utils/object-utils';

// Utilities - Environment resolution
export {
  EnvResolver,
  type EnvResolverOptions,
  type EnvVarType,
} from './utils/env-resolver';

// Utilities - Snapshots
export { SnapshotManager, type Snapshot } from './utils/snapshot';

// Utilities - Validation
export { SchemaValidator, createValidator, validateWithZod } from './utils/schema-validator';

// Utilities - Error recovery
export {
  RetryManager,
  CircuitBreaker,
  GracefulDegradation,
  ConfigRecoveryManager,
  ErrorContext as RecoveryErrorContext,
  type RetryOptions,
  type CircuitBreakerOptions,
} from './utils/error-recovery';

// Errors
export {
  ConfigError,
  ValidationError,
  LoaderError,
  WatcherError,
  EnvResolutionError,
  SchemaValidationError,
  AggregateConfigError,
  SnapshotError,
  CacheError,
  ErrorCollector,
  isConfigError,
  wrapError,
  type ErrorContext,
} from './errors';

// Constants
export {
  DEFAULT_OPTIONS,
  ErrorCode,
  ERROR_RECOVERY_SUGGESTIONS,
  FILE_FORMATS,
  ENV_VAR_PATTERNS,
  RESERVED_KEYS,
  LogLevel,
  EVENTS,
  type EventName,
} from './constants';

// Types
export type {
  ConfigOptions,
  ConfigFormat,
  ConfigFile,
  ConfigChange,
  ConfigEvents,
  IConfigManager,
  SaveOptions,
  DefineConfigOptions,
} from './types';

// Advanced types
export type {
  PathKeys,
  PathValue,
  DeepPartial,
  DeepRequired,
  DeepReadonly,
  DeepMutable,
  DeepMerge,
  ConfigWithEnv,
  Result,
  ValidationResult,
  ValidationError as ValidationErrorType,
  JSONValue,
  JSONObject,
  JSONArray,
  JSONPrimitive,
} from './types/utils';

import { ConfigManager } from './core/config-manager';
import type { ConfigOptions } from './types';

/**
 * Create and initialize a configuration manager
 *
 * @typeParam T - Configuration type
 * @param options - Configuration options
 * @returns Initialized ConfigManager instance
 *
 * @example
 * ```ts
 * interface AppConfig {
 *   server: { port: number; host: string };
 *   database: { url: string };
 * }
 *
 * const config = await createConfig<AppConfig>({
 *   dir: './config',
 *   name: 'app',
 *   env: 'production',
 * });
 *
 * const port = config.get('server.port');
 * ```
 */
export async function createConfig<T extends object = Record<string, unknown>>(
  options?: ConfigOptions
): Promise<ConfigManager<T>> {
  const manager = new ConfigManager<T>(options);
  await manager.init();
  return manager;
}

// Default export
export default ConfigManager;
