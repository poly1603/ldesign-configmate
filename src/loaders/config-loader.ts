import * as path from 'path';
import * as fs from 'fs';
import { createJiti } from 'jiti';
import * as yaml from 'js-yaml';
import { ConfigFormat, ConfigFile } from '../types';

export class ConfigLoader {
  private jiti: any;
  private supportedFormats: ConfigFormat[] = [
    'ts', 'js', 'mjs', 'cjs', 'json', 'yaml', 'yml', 'toml', 'ini'
  ];

  constructor(private baseDir: string = process.cwd()) {
    this.jiti = createJiti(this.baseDir, {
      interopDefault: true,
      requireCache: false,
    });
  }

  /**
   * Load a configuration file
   */
  async loadFile(filePath: string): Promise<any> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }

    const ext = path.extname(filePath).slice(1).toLowerCase() as ConfigFormat;
    
    switch (ext) {
      case 'ts':
      case 'js':
      case 'mjs':
      case 'cjs':
        return this.loadJavaScript(filePath);
      
      case 'json':
        return this.loadJSON(filePath);
      
      case 'yaml':
      case 'yml':
        return this.loadYAML(filePath);
      
      case 'toml':
        return this.loadTOML(filePath);
      
      case 'ini':
        return this.loadINI(filePath);
      
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
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
}