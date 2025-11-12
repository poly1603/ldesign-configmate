import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'eventemitter3';
import { watch, FSWatcher } from 'chokidar';
import merge from 'lodash.merge';
import get from 'lodash.get';
import set from 'lodash.set';
import { 
  ConfigOptions, 
  ConfigFile, 
  ConfigChange, 
  ConfigEvents,
  IConfigManager,
  SaveOptions
} from '../types';
import { ConfigLoader } from '../loaders/config-loader';
import { ChangeDetector } from '../detectors/change-detector';

export class ConfigManager extends EventEmitter<ConfigEvents> implements IConfigManager {
  private config: any = {};
  private files: ConfigFile[] = [];
  private options: Required<ConfigOptions>;
  private loader: ConfigLoader;
  private detector: ChangeDetector;
  private watcher?: FSWatcher;
  private fileContents: Map<string, any> = new Map();
  private isLoading = false;

  constructor(options: ConfigOptions = {}) {
    super();
    
    // Set default options
    this.options = {
      dir: options.dir || process.cwd(),
      name: options.name || 'config',
      env: options.env || process.env.NODE_ENV || 'development',
      envKey: options.envKey || 'NODE_ENV',
      formats: options.formats || ['ts', 'js', 'json', 'yaml', 'yml'],
      watch: options.watch ?? false,
      mergeStrategy: options.mergeStrategy || 'deep',
      defaults: options.defaults || {},
      validate: options.validate || (() => true),
    };

    // Override env from environment variable if specified
    if (this.options.envKey && process.env[this.options.envKey]) {
      this.options.env = process.env[this.options.envKey]!;
    }

    this.loader = new ConfigLoader(this.options.dir);
    this.detector = new ChangeDetector();

    // Start with defaults
    this.config = this.cloneDeep(this.options.defaults);
  }

  /**
   * Initialize and load configuration
   */
  async init(): Promise<void> {
    await this.reload();
    
    if (this.options.watch) {
      this.startWatching();
    }
  }

  /**
   * Reload all configuration files
   */
  async reload(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    
    try {
      // Find all config files
      this.files = this.loader.findConfigFiles(
        this.options.dir,
        this.options.name,
        this.options.formats,
        this.options.env
      );

      if (this.files.length === 0) {
        console.warn(`No configuration files found in ${this.options.dir}`);
      }

      // Start with defaults
      let newConfig = this.cloneDeep(this.options.defaults);

      // Load and merge base configs first
      const baseFiles = this.files.filter(f => !f.isEnvFile);
      for (const file of baseFiles) {
        const content = await this.loader.loadFile(file.path);
        file.content = content;
        file.parsed = this.parseConfigContent(content);
        this.fileContents.set(file.path, file.parsed);
        newConfig = this.mergeConfig(newConfig, file.parsed);
      }

      // Then load and merge environment-specific configs
      const envFiles = this.files.filter(f => f.isEnvFile);
      for (const file of envFiles) {
        const content = await this.loader.loadFile(file.path);
        file.content = content;
        file.parsed = this.parseConfigContent(content);
        this.fileContents.set(file.path, file.parsed);
        
        // Handle environment-specific content
        if (file.environment === this.options.env) {
          newConfig = this.mergeConfig(newConfig, file.parsed);
        }
      }

      // Validate the new configuration
      const validationResult = this.options.validate(newConfig);
      if (validationResult === false) {
        throw new Error('Configuration validation failed');
      }

      // Detect changes
      const changes = this.detector.detectChanges(
        this.config,
        newConfig,
        'reload',
        this.options.env
      );

      // Update config
      this.config = newConfig;

      // Emit events
      this.emit('loaded', this.config);
      if (changes.length > 0) {
        this.emit('change', changes);
      }
      this.emit('reload');
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Parse config content (handle defineConfig and env sections)
   */
  private parseConfigContent(content: any): any {
    if (!content || typeof content !== 'object') {
      return content;
    }

    // Check if this is a defineConfig result
    if (content.__isConfigObject) {
      const base = content.config || {};
      const envOverrides = content.env?.[this.options.env] || {};
      return this.mergeConfig(base, envOverrides);
    }

    // Check for env property in regular config
    if (content.env && typeof content.env === 'object') {
      const { env, ...base } = content;
      const envOverrides = env[this.options.env] || {};
      return this.mergeConfig(base, envOverrides);
    }

    return content;
  }

  /**
   * Merge configurations based on strategy
   */
  private mergeConfig(target: any, source: any): any {
    if (this.options.mergeStrategy === 'replace') {
      return source;
    }

    if (this.options.mergeStrategy === 'shallow') {
      return { ...target, ...source };
    }

    // Deep merge
    return merge({}, target, source);
  }

  /**
   * Get configuration value
   */
  get<T = any>(path?: string, defaultValue?: T): T {
    if (!path) {
      return this.config as T;
    }
    return get(this.config, path, defaultValue) as T;
  }

  /**
   * Set configuration value
   */
  set(path: string, value: any): void {
    const oldValue = this.get(path);
    set(this.config, path, value);
    
    // Emit change event
    const change: ConfigChange = {
      type: oldValue === undefined ? 'added' : 'modified',
      path,
      oldValue,
      newValue: value,
      file: 'runtime',
      timestamp: new Date(),
    };
    
    this.emit('change', [change]);
  }

  /**
   * Check if configuration path exists
   */
  has(path: string): boolean {
    return get(this.config, path) !== undefined;
  }

  /**
   * Delete configuration value
   */
  delete(path: string): void {
    const oldValue = this.get(path);
    
    if (oldValue !== undefined) {
      const parts = path.split('.');
      const lastKey = parts.pop()!;
      const parent = parts.length > 0 ? get(this.config, parts.join('.')) : this.config;
      
      if (parent && typeof parent === 'object') {
        delete parent[lastKey];
        
        // Emit change event
        const change: ConfigChange = {
          type: 'deleted',
          path,
          oldValue,
          file: 'runtime',
          timestamp: new Date(),
        };
        
        this.emit('change', [change]);
      }
    }
  }

  /**
   * Save configuration to file
   */
  async save(options: SaveOptions = {}): Promise<void> {
    const saveFile = options.file || this.files[0]?.path;
    
    if (!saveFile) {
      throw new Error('No file specified for saving');
    }

    const format = options.format || path.extname(saveFile).slice(1) as any;
    let contentToSave = this.config;

    if (options.environment) {
      contentToSave = {
        ...this.config,
        env: {
          [options.environment]: this.getEnv(options.environment),
        },
      };
    }

    await this.loader.saveFile(saveFile, contentToSave, format);
  }

  /**
   * Get configuration for specific environment
   */
  getEnv(env: string): any {
    const envFiles = this.files.filter(
      f => f.isEnvFile && f.environment === env
    );

    let envConfig = {};
    for (const file of envFiles) {
      if (file.parsed) {
        envConfig = this.mergeConfig(envConfig, file.parsed);
      }
    }

    return envConfig;
  }

  /**
   * Get all loaded config files
   */
  getFiles(): ConfigFile[] {
    return [...this.files];
  }

  /**
   * Start watching for file changes
   */
  startWatching(): void {
    if (this.watcher) {
      return;
    }

    const watchPaths = this.files.map(f => f.path);
    
    if (watchPaths.length === 0) {
      return;
    }

    this.watcher = watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    this.watcher.on('change', async (filePath) => {
      await this.handleFileChange(filePath);
    });

    this.watcher.on('add', async (filePath) => {
      await this.handleFileAdd(filePath);
    });

    this.watcher.on('unlink', async (filePath) => {
      await this.handleFileDelete(filePath);
    });

    this.watcher.on('error', (error) => {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    });
  }

  /**
   * Stop watching for file changes
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }

  /**
   * Handle file change
   */
  private async handleFileChange(filePath: string): Promise<void> {
    const file = this.files.find(f => f.path === filePath);
    
    if (!file) {
      return;
    }

    try {
      const oldContent = this.fileContents.get(filePath);
      const newContent = await this.loader.loadFile(filePath);
      const newParsed = this.parseConfigContent(newContent);

      // Detect specific changes
      const changes = this.detector.detectChanges(
        oldContent,
        newParsed,
        filePath,
        file.environment
      );

      // Update file content
      file.content = newContent;
      file.parsed = newParsed;
      this.fileContents.set(filePath, newParsed);

      // Reload full config
      await this.reload();

      // Emit file-specific event
      this.emit('file:modified', file, changes);
    } catch (error: any) {
      this.emit('error', error);
    }
  }

  /**
   * Handle file addition
   */
  private async handleFileAdd(filePath: string): Promise<void> {
    try {
      const format = path.extname(filePath).slice(1) as any;
      const fileName = path.basename(filePath, path.extname(filePath));
      const isEnvFile = fileName.includes(`.${this.options.env}`);
      
      const file: ConfigFile = {
        path: filePath,
        format,
        isEnvFile,
        environment: isEnvFile ? this.options.env : undefined,
      };

      this.files.push(file);
      await this.reload();
      
      this.emit('file:added', file);
    } catch (error: any) {
      this.emit('error', error);
    }
  }

  /**
   * Handle file deletion
   */
  private async handleFileDelete(filePath: string): Promise<void> {
    const fileIndex = this.files.findIndex(f => f.path === filePath);
    
    if (fileIndex === -1) {
      return;
    }

    const file = this.files[fileIndex];
    this.files.splice(fileIndex, 1);
    this.fileContents.delete(filePath);

    await this.reload();
    
    this.emit('file:deleted', file);
  }

  /**
   * Export configuration as JSON
   */
  toJSON(): any {
    return this.cloneDeep(this.config);
  }

  /**
   * Validate current configuration
   */
  validate(): boolean {
    const result = this.options.validate(this.config);
    return result !== false;
  }

  /**
   * Deep clone an object
   */
  private cloneDeep(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopWatching();
    this.removeAllListeners();
    this.config = {};
    this.files = [];
    this.fileContents.clear();
  }
}