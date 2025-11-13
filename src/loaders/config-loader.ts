import * as path from 'path';
import * as fs from 'fs';
import { createJiti } from 'jiti';
import * as yaml from 'js-yaml';
import { ConfigFormat, ConfigFile } from '../types';
import { Cache } from '../utils/cache';
import { LoaderError } from '../errors';

export class ConfigLoader {
  private jiti: any;
  private supportedFormats: ConfigFormat[] = [
    'ts', 'js', 'mjs', 'cjs', 'json', 'yaml', 'yml', 'toml', 'ini'
  ];
  private cache?: Cache<string, any>;
  private fileStats: Map<string, number> = new Map(); // Track file modification times

  constructor(
    private baseDir: string = process.cwd(),
    enableCache: boolean = false,
    cacheTTL: number = 60000
  ) {
    this.jiti = createJiti(this.baseDir, {
      interopDefault: true,
      requireCache: false,
    });
    
    if (enableCache) {
      this.cache = new Cache(100, cacheTTL);
    }
  }

  /**
   * Load a configuration file
   */
  async loadFile(filePath: string): Promise<any> {
    if (!fs.existsSync(filePath)) {
      throw new LoaderError(
        `Config file not found: ${filePath}`,
        filePath
      );
    }

    // Check cache first
    if (this.cache) {
      const stats = fs.statSync(filePath);
      const mtime = stats.mtimeMs;
      const cachedMtime = this.fileStats.get(filePath);
      
      // Use cache if file hasn't been modified
      if (cachedMtime === mtime && this.cache.has(filePath)) {
        return this.cache.get(filePath);
      }
      
      // Update file modification time
      this.fileStats.set(filePath, mtime);
    }

    const ext = path.extname(filePath).slice(1).toLowerCase() as ConfigFormat;
    
    let result: any;
    switch (ext) {
      case 'ts':
      case 'js':
      case 'mjs':
      case 'cjs':
        result = this.loadJavaScript(filePath);
        break;
      
      case 'json':
        result = this.loadJSON(filePath);
        break;
      
      case 'yaml':
      case 'yml':
        result = this.loadYAML(filePath);
        break;
      
      case 'toml':
        result = await this.loadTOML(filePath);
        break;
      
      case 'ini':
        result = await this.loadINI(filePath);
        break;
      
      default:
        throw new LoaderError(
          `Unsupported file format: ${ext}`,
          filePath,
          ext
        );
    }
    
    // Cache the result
    if (this.cache) {
      this.cache.set(filePath, result);
    }
    
    return result;
  }

  /**
   * Load JavaScript/TypeScript files
   */
  private loadJavaScript(filePath: string): any {
    try {
      const module = this.jiti(filePath);
      
      // Handle different export styles
      if (module && typeof module === 'object') {
        // Check for defineConfig function result
        if (module.__isConfigObject) {
          return module.config;
        }
        
        // Check for default export
        if (module.default) {
          return module.default;
        }
        
        // Check for module.exports style
        if (module.config) {
          return module.config;
        }
      }
      
      return module;
    } catch (error: any) {
      throw new Error(`Failed to load JavaScript config: ${error.message}`);
    }
  }

  /**
   * Load JSON files
   */
  private loadJSON(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      throw new Error(`Failed to load JSON config: ${error.message}`);
    }
  }

  /**
   * Load YAML files
   */
  private loadYAML(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return yaml.load(content);
    } catch (error: any) {
      throw new Error(`Failed to load YAML config: ${error.message}`);
    }
  }

  /**
   * Load TOML files
   */
  private async loadTOML(filePath: string): Promise<any> {
    try {
      // @ts-ignore - Optional module, loaded dynamically
      const toml = await import('toml').catch(() => null) as any;
      if (!toml) {
        throw new Error('TOML support requires installing the "toml" package');
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      return toml.parse(content);
    } catch (error: any) {
      throw new Error(`Failed to load TOML config: ${error.message}`);
    }
  }

  /**
   * Load INI files
   */
  private async loadINI(filePath: string): Promise<any> {
    try {
      // @ts-ignore - Optional module, loaded dynamically
      const ini = await import('ini').catch(() => null) as any;
      if (!ini) {
        throw new Error('INI support requires installing the "ini" package');
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      return ini.parse(content);
    } catch (error: any) {
      throw new Error(`Failed to load INI config: ${error.message}`);
    }
  }

  /**
   * Find config files in a directory
   */
  findConfigFiles(
    dir: string,
    name: string,
    formats?: ConfigFormat[],
    includeEnv?: string
  ): ConfigFile[] {
    const files: ConfigFile[] = [];
    const searchFormats = formats || this.supportedFormats;
    
    // Look for base config files
    for (const format of searchFormats) {
      const filePath = path.join(dir, `${name}.${format}`);
      if (fs.existsSync(filePath)) {
        files.push({
          path: filePath,
          format,
          isEnvFile: false,
        });
      }
    }
    
    // Look for environment-specific config files
    if (includeEnv) {
      for (const format of searchFormats) {
        // Pattern: config.development.js
        const envFilePath = path.join(dir, `${name}.${includeEnv}.${format}`);
        if (fs.existsSync(envFilePath)) {
          files.push({
            path: envFilePath,
            format,
            isEnvFile: true,
            environment: includeEnv,
          });
        }
        
        // Pattern: config.env.development.js
        const envFilePath2 = path.join(dir, `${name}.env.${includeEnv}.${format}`);
        if (fs.existsSync(envFilePath2)) {
          files.push({
            path: envFilePath2,
            format,
            isEnvFile: true,
            environment: includeEnv,
          });
        }
      }
    }
    
    return files;
  }

  /**
   * Save configuration to file
   */
  async saveFile(filePath: string, content: any, format?: ConfigFormat): Promise<void> {
    const ext = format || (path.extname(filePath).slice(1).toLowerCase() as ConfigFormat);
    
    let output: string;
    
    switch (ext) {
      case 'json':
        output = JSON.stringify(content, null, 2);
        break;
      
      case 'yaml':
      case 'yml':
        output = yaml.dump(content, { indent: 2 });
        break;
      
      case 'js':
      case 'mjs':
      case 'cjs':
        output = `module.exports = ${JSON.stringify(content, null, 2)};`;
        break;
      
      case 'ts':
        output = `export default ${JSON.stringify(content, null, 2)};`;
        break;
      
      default:
        throw new Error(`Cannot save to format: ${ext}`);
    }
    
    fs.writeFileSync(filePath, output, 'utf-8');
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
      this.fileStats.clear();
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    if (!this.cache) {
      return { size: 0, keys: [] };
    }
    return {
      size: this.cache.size(),
      keys: this.cache.keys(),
    };
  }
}
