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
export async function createConfig(options?: ConfigOptions) {
  const manager = new ConfigManager(options);
  await manager.init();
  return manager;
}

// Default export
export default ConfigManager;
