export { ConfigManager } from './core/config-manager';
export { ConfigLoader } from './loaders/config-loader';
export { ChangeDetector } from './detectors/change-detector';
export {
  defineConfig,
  defineConfigWithOptions,
  mergeEnvConfig,
  validateConfig,
  type Config,
} from './helpers/define-config';

// Export new utilities
export { EnvResolver, type EnvResolverOptions } from './utils/env-resolver';
export { SnapshotManager, type Snapshot } from './utils/snapshot';
export { Cache, debounce, throttle, cloneDeep } from './utils/cache';
export { SchemaValidator, createValidator, validateWithZod } from './utils/schema-validator';
export { setPath, getPath, hasPath, deletePath, mergeDeep } from './utils/object-utils';
export { EnhancedCache, type CacheStats, type CacheOptions } from './utils/enhanced-cache';
export { 
  RetryManager, 
  CircuitBreaker, 
  GracefulDegradation, 
  ConfigRecoveryManager,
  type RetryOptions,
  type CircuitBreakerOptions 
} from './utils/error-recovery';

// Export errors
export {
  ConfigError,
  ValidationError,
  LoaderError,
  WatcherError,
  EnvResolutionError,
  SchemaValidationError,
} from './errors';

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

import { ConfigManager } from './core/config-manager';
import type { ConfigOptions } from './types';

// Convenience function to create and initialize a config manager
export async function createConfig<T = any>(options?: ConfigOptions): Promise<ConfigManager<T>> {
  const manager = new ConfigManager<T>(options);
  await manager.init();
  return manager;
}

// Default export
export default ConfigManager;
