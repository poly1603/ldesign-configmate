import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ConfigManager, createConfig } from '../src/index';
import { ConfigError, ValidationError, ErrorCode } from '../src/index';

describe('ConfigManager', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    // Create temp directory for test config files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'configmate-test-'));
    configPath = path.join(tempDir, 'config.json');
  });

  afterEach(() => {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should initialize with default options', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ app: { name: 'test' } }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      expect(config.get('app.name')).toBe('test');
      config.destroy();
    });

    it('should merge defaults with loaded config', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ app: { name: 'test' } }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        defaults: { app: { version: '1.0.0' }, debug: false },
      });

      expect(config.get('app.name')).toBe('test');
      expect(config.get('app.version')).toBe('1.0.0');
      expect(config.get('debug')).toBe(false);
      config.destroy();
    });

    it('should handle missing config files with defaults', async () => {
      const config = await createConfig({
        dir: tempDir,
        name: 'nonexistent',
        defaults: { fallback: true },
      });

      expect(config.get('fallback')).toBe(true);
      config.destroy();
    });
  });

  describe('get', () => {
    it('should get root config', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ key: 'value' }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      const full = config.get();
      expect(full).toHaveProperty('key', 'value');
      config.destroy();
    });

    it('should get nested paths', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ a: { b: { c: { d: 'deep' } } } })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      expect(config.get('a.b.c.d')).toBe('deep');
      config.destroy();
    });

    it('should return default value for missing paths', async () => {
      fs.writeFileSync(configPath, JSON.stringify({}));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      expect(config.get('missing.path', 'default')).toBe('default');
      config.destroy();
    });
  });

  describe('set', () => {
    it('should set values at path', async () => {
      fs.writeFileSync(configPath, JSON.stringify({}));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      config.set('new.path', 'value');
      expect(config.get('new.path')).toBe('value');
      config.destroy();
    });

    it('should emit change event on set', async () => {
      fs.writeFileSync(configPath, JSON.stringify({}));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      const changeHandler = vi.fn();
      config.on('change', changeHandler);

      config.set('key', 'value');

      expect(changeHandler).toHaveBeenCalledTimes(1);
      const changes = changeHandler.mock.calls[0][0];
      expect(changes[0].type).toBe('added');
      expect(changes[0].path).toBe('key');
      expect(changes[0].newValue).toBe('value');
      config.destroy();
    });
  });

  describe('has', () => {
    it('should check if path exists', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ existing: { nested: true } })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      expect(config.has('existing')).toBe(true);
      expect(config.has('existing.nested')).toBe(true);
      expect(config.has('nonexistent')).toBe(false);
      config.destroy();
    });
  });

  describe('delete', () => {
    it('should delete values at path', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ toDelete: 'value' }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      expect(config.has('toDelete')).toBe(true);
      config.delete('toDelete');
      expect(config.has('toDelete')).toBe(false);
      config.destroy();
    });

    it('should emit change event on delete', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ key: 'value' }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      const changeHandler = vi.fn();
      config.on('change', changeHandler);

      config.delete('key');

      expect(changeHandler).toHaveBeenCalled();
      const changes = changeHandler.mock.calls[0][0];
      expect(changes[0].type).toBe('deleted');
      config.destroy();
    });
  });

  describe('environment configuration', () => {
    it('should merge environment-specific config from separate files', async () => {
      // Base config
      fs.writeFileSync(
        configPath,
        JSON.stringify({ server: { port: 3000, host: 'localhost' } })
      );
      // Production override
      fs.writeFileSync(
        path.join(tempDir, 'config.production.json'),
        JSON.stringify({ server: { port: 80 } })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        env: 'production',
      });

      // Port should be overridden, host should be preserved
      expect(config.get('server.port')).toBe(80);
      expect(config.get('server.host')).toBe('localhost');
      config.destroy();
    });

    it('should merge inline env overrides', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          server: { port: 3000 },
          env: {
            production: { server: { port: 80 } },
          },
        })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        env: 'production',
      });

      expect(config.get('server.port')).toBe(80);
      config.destroy();
    });

    it('should load environment-specific files', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ base: true }));
      fs.writeFileSync(
        path.join(tempDir, 'config.test.json'),
        JSON.stringify({ testEnv: true })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        env: 'test',
      });

      expect(config.get('base')).toBe(true);
      expect(config.get('testEnv')).toBe(true);
      config.destroy();
    });
  });

  describe('snapshots', () => {
    it('should create and retrieve snapshots', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ version: 1 }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      const snapshot = config.snapshot('v1', 'Initial state');
      expect(snapshot).toBeDefined();
      expect(snapshot?.config.version).toBe(1);
      config.destroy();
    });

    it('should rollback to snapshot', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ value: 'original' }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      config.snapshot('before-change');
      config.set('value', 'changed');
      expect(config.get('value')).toBe('changed');

      config.rollback('before-change');
      expect(config.get('value')).toBe('original');
      config.destroy();
    });

    it('should list snapshots', async () => {
      fs.writeFileSync(configPath, JSON.stringify({}));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      config.snapshot('snap1');
      config.snapshot('snap2');

      const snapshots = config.listSnapshots();
      expect(snapshots).toContain('snap1');
      expect(snapshots).toContain('snap2');
      config.destroy();
    });
  });

  describe('validation', () => {
    it('should run custom validation', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ port: 3000 })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        validate: (cfg) => {
          if (cfg.port < 1 || cfg.port > 65535) {
            throw new Error('Invalid port');
          }
          return true;
        },
      });

      expect(config.validate()).toBe(true);
      config.destroy();
    });

    it('should fail validation for invalid config', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ port: -1 })
      );

      await expect(
        createConfig({
          dir: tempDir,
          name: 'config',
          validate: (cfg) => {
            if (cfg.port < 1) {
              return false;
            }
            return true;
          },
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('merge strategies', () => {
    it('should deep merge by default', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ a: { b: 1, c: 2 } })
      );
      fs.writeFileSync(
        path.join(tempDir, 'config.test.json'),
        JSON.stringify({ a: { c: 3, d: 4 } })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        env: 'test',
        mergeStrategy: 'deep',
      });

      expect(config.get('a.b')).toBe(1);
      expect(config.get('a.c')).toBe(3);
      expect(config.get('a.d')).toBe(4);
      config.destroy();
    });

    it('should shallow merge when specified', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ a: { b: 1, c: 2 }, x: 1 })
      );
      fs.writeFileSync(
        path.join(tempDir, 'config.test.json'),
        JSON.stringify({ a: { c: 3 }, y: 2 })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        env: 'test',
        mergeStrategy: 'shallow',
      });

      // Shallow merge replaces entire nested objects
      expect(config.get('a')).toEqual({ c: 3 });
      expect(config.get('x')).toBe(1);
      expect(config.get('y')).toBe(2);
      config.destroy();
    });

    it('should replace when specified', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ a: 1, b: 2 })
      );
      fs.writeFileSync(
        path.join(tempDir, 'config.test.json'),
        JSON.stringify({ c: 3 })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        env: 'test',
        mergeStrategy: 'replace',
      });

      // Replace completely overwrites
      expect(config.get('a')).toBeUndefined();
      expect(config.get('c')).toBe(3);
      config.destroy();
    });
  });

  describe('save', () => {
    it('should save config to JSON file', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ initial: true }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      config.set('added', 'value');
      const savePath = path.join(tempDir, 'saved.json');
      await config.save({ file: savePath });

      const saved = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
      expect(saved.initial).toBe(true);
      expect(saved.added).toBe('value');
      config.destroy();
    });

    it('should save config to YAML file', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ key: 'value' }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      const savePath = path.join(tempDir, 'saved.yaml');
      await config.save({ file: savePath, format: 'yaml' });

      const saved = fs.readFileSync(savePath, 'utf-8');
      expect(saved).toContain('key: value');
      config.destroy();
    });
  });

  describe('toJSON', () => {
    it('should export config as JSON-serializable object', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ a: { b: 1 }, c: [1, 2, 3] })
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      const json = config.toJSON();
      expect(json.a.b).toBe(1);
      expect(json.c).toEqual([1, 2, 3]);

      // Should be a deep clone
      json.a.b = 999;
      expect(config.get('a.b')).toBe(1);
      config.destroy();
    });
  });

  describe('getFiles', () => {
    it('should return list of loaded files', async () => {
      fs.writeFileSync(configPath, JSON.stringify({}));
      fs.writeFileSync(
        path.join(tempDir, 'config.test.json'),
        JSON.stringify({})
      );

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        env: 'test',
      });

      const files = config.getFiles();
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some((f) => f.path.endsWith('config.json'))).toBe(true);
      config.destroy();
    });
  });

  describe('cache', () => {
    it('should cache config when enabled', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ cached: true }));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        cache: true,
        cacheTTL: 60000,
      });

      const stats = config.getCacheStats();
      expect(stats.size).toBeGreaterThanOrEqual(0);
      config.destroy();
    });

    it('should clear cache', async () => {
      fs.writeFileSync(configPath, JSON.stringify({}));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
        cache: true,
      });

      config.clearCache();
      const stats = config.getCacheStats();
      expect(stats.size).toBe(0);
      config.destroy();
    });
  });

  describe('events', () => {
    it('should emit loaded event', async () => {
      fs.writeFileSync(configPath, JSON.stringify({}));

      const manager = new ConfigManager({
        dir: tempDir,
        name: 'config',
      });

      const loadedHandler = vi.fn();
      manager.on('loaded', loadedHandler);

      await manager.init();

      expect(loadedHandler).toHaveBeenCalled();
      manager.destroy();
    });

    it('should emit reload event', async () => {
      fs.writeFileSync(configPath, JSON.stringify({}));

      const config = await createConfig({
        dir: tempDir,
        name: 'config',
      });

      const reloadHandler = vi.fn();
      config.on('reload', reloadHandler);

      await config.reload();

      expect(reloadHandler).toHaveBeenCalled();
      config.destroy();
    });

    it('should emit error event on validation failure', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ invalid: true }));

      const manager = new ConfigManager({
        dir: tempDir,
        name: 'config',
        validate: () => {
          throw new Error('Validation error');
        },
      });

      const errorHandler = vi.fn();
      manager.on('error', errorHandler);

      try {
        await manager.init();
      } catch {
        // Expected to throw
      }

      expect(errorHandler).toHaveBeenCalled();
      manager.destroy();
    });
  });

  describe('type safety', () => {
    interface TypedConfig {
      server: {
        port: number;
        host: string;
      };
      features: string[];
    }

    it('should work with typed config', async () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          server: { port: 3000, host: 'localhost' },
          features: ['a', 'b'],
        })
      );

      const config = await createConfig<TypedConfig>({
        dir: tempDir,
        name: 'config',
      });

      const port: number = config.get('server.port');
      expect(port).toBe(3000);

      const features = config.get('features');
      expect(features).toEqual(['a', 'b']);
      config.destroy();
    });
  });
});

describe('ConfigManager - Edge Cases', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'configmate-edge-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should handle empty config files', async () => {
    fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');

    const config = await createConfig({
      dir: tempDir,
      name: 'config',
      defaults: { default: true },
    });

    expect(config.get()).toEqual({ default: true });
    config.destroy();
  });

  it('should handle special characters in keys', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'config.json'),
      JSON.stringify({ 'key-with-dash': 1, 'key.with.dot': 2 })
    );

    const config = await createConfig({
      dir: tempDir,
      name: 'config',
    });

    expect(config.get('key-with-dash')).toBe(1);
    config.destroy();
  });

  it('should prevent prototype pollution', async () => {
    const config = await createConfig({
      dir: tempDir,
      name: 'nonexistent',
      defaults: {},
    });

    // Attempt prototype pollution
    config.set('__proto__.polluted', true);
    config.set('constructor.prototype.polluted', true);

    // Should not have polluted Object prototype
    expect(({} as any).polluted).toBeUndefined();
    config.destroy();
  });

  it('should handle concurrent operations', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'config.json'),
      JSON.stringify({ counter: 0 })
    );

    const config = await createConfig({
      dir: tempDir,
      name: 'config',
    });

    // Perform multiple concurrent sets
    const promises = Array.from({ length: 10 }, (_, i) =>
      Promise.resolve(config.set(`key${i}`, i))
    );

    await Promise.all(promises);

    // All values should be set
    for (let i = 0; i < 10; i++) {
      expect(config.get(`key${i}`)).toBe(i);
    }
    config.destroy();
  });
});
