import { EventEmitter } from 'eventemitter3';

export type ConfigFormat = 'ts' | 'js' | 'mjs' | 'cjs' | 'json' | 'yaml' | 'yml' | 'toml' | 'ini';

export interface ConfigOptions {
  /** Base directory to search for config files */
  dir?: string;
  /** Config file name without extension */
  name?: string;
  /** Current environment (e.g., 'development', 'production') */
  env?: string;
  /** Custom environment variable name to read env from */
  envKey?: string;
  /** Supported file formats in order of preference */
  formats?: ConfigFormat[];
  /** Enable file watching for changes */
  watch?: boolean;
  /** Deep merge strategy */
  mergeStrategy?: 'deep' | 'shallow' | 'replace';
  /** Default configuration */
  defaults?: any;
  /** Schema validation function */
  validate?: (config: any) => boolean | void;
  /** Enable environment variable resolution */
  resolveEnv?: boolean;
  /** Environment variable resolution options */
  envResolver?: {
    strict?: boolean;
    prefix?: string;
    warn?: boolean;
  };
  /** Enable configuration caching */
  cache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** File change debounce delay in milliseconds */
  debounceDelay?: number;
  /** Enable automatic snapshots on changes */
  autoSnapshot?: boolean;
  /** Maximum number of snapshots to keep */
  maxSnapshots?: number;
  /** Schema validator (e.g., Zod schema) */
  schema?: any;
}

export interface ConfigChange {
  /** Type of change */
  type: 'added' | 'modified' | 'deleted';
  /** Path to the changed field (e.g., 'server.port') */
  path: string;
  /** Previous value */
  oldValue?: any;
  /** New value */
  newValue?: any;
  /** File that was changed */
  file: string;
  /** Environment of the change */
  environment?: string;
  /** Timestamp of the change */
  timestamp: Date;
}

export interface ConfigFile {
  /** Full path to the config file */
  path: string;
  /** File format */
  format: ConfigFormat;
  /** Whether this is an environment-specific file */
  isEnvFile: boolean;
  /** Environment name if it's an env file */
  environment?: string;
  /** Raw content of the file */
  content?: any;
  /** Parsed content */
  parsed?: any;
}

export interface ConfigEvents {
  'change': (changes: ConfigChange[]) => void;
  'file:added': (file: ConfigFile) => void;
  'file:modified': (file: ConfigFile, changes: ConfigChange[]) => void;
  'file:deleted': (file: ConfigFile) => void;
  'error': (error: Error) => void;
  'loaded': (config: any) => void;
  'reload': () => void;
}

export interface IConfigManager extends EventEmitter<ConfigEvents> {
  /** Get the current configuration */
  get<T = any>(path?: string, defaultValue?: T): T;
  
  /** Set a configuration value */
  set(path: string, value: any): void;
  
  /** Check if a configuration path exists */
  has(path: string): boolean;
  
  /** Delete a configuration value */
  delete(path: string): void;
  
  /** Reload configuration from files */
  reload(): Promise<void>;
  
  /** Save current configuration to file */
  save(options?: SaveOptions): Promise<void>;
  
  /** Get all loaded config files */
  getFiles(): ConfigFile[];
  
  /** Get configuration for specific environment */
  getEnv(env: string): any;
  
  /** Start watching for file changes */
  startWatching(): void;
  
  /** Stop watching for file changes */
  stopWatching(): void;
  
  /** Export configuration */
  toJSON(): any;
  
  /** Validate configuration */
  validate(): boolean;
  
  /** Create a snapshot of current configuration */
  snapshot(id: string, description?: string): any;
  
  /** Rollback to a snapshot */
  rollback(id: string): void;
  
  /** List all snapshots */
  listSnapshots(): string[];
  
  /** Clear cache */
  clearCache(): void;
}

export interface SaveOptions {
  /** Target file path */
  file?: string;
  /** Format to save as */
  format?: ConfigFormat;
  /** Environment to save */
  environment?: string;
  /** Pretty print JSON/YAML */
  pretty?: boolean;
}

export interface DefineConfigOptions<T = any> {
  /** Configuration schema/type */
  schema?: T;
  /** Environment-specific overrides */
  env?: Record<string, Partial<T>>;
  /** Validation function */
  validate?: (config: T) => boolean | void;
  /** Transform function */
  transform?: (config: T) => T;
}