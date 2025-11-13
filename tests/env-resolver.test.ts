import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvResolver } from '../src/utils/env-resolver';
import { EnvResolutionError } from '../src/errors';

describe('EnvResolver', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Setup test environment variables
    process.env.TEST_VAR = 'test_value';
    process.env.TEST_PORT = '3000';
    process.env.TEST_HOST = 'localhost';
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('resolve', () => {
    it('should resolve environment variables in strings', () => {
      const resolver = new EnvResolver();
      const result = resolver.resolve('${TEST_VAR}');
      expect(result).toBe('test_value');
    });

    it('should resolve variables with default values', () => {
      const resolver = new EnvResolver();
      const result = resolver.resolve('${MISSING_VAR:default_value}');
      expect(result).toBe('default_value');
    });

    it('should resolve variables in objects', () => {
      const resolver = new EnvResolver();
      const config = {
        host: '${TEST_HOST}',
        port: '${TEST_PORT}',
      };
      const result = resolver.resolve(config);
      expect(result).toEqual({
        host: 'localhost',
        port: '3000',
      });
    });

    it('should resolve nested objects', () => {
      const resolver = new EnvResolver();
      const config = {
        server: {
          host: '${TEST_HOST}',
          port: '${TEST_PORT:8080}',
        },
        database: {
          url: '${DB_URL:mongodb://localhost}',
        },
      };
      const result = resolver.resolve(config);
      expect(result.server.host).toBe('localhost');
      expect(result.server.port).toBe('3000');
      expect(result.database.url).toBe('mongodb://localhost');
    });

    it('should resolve variables in arrays', () => {
      const resolver = new EnvResolver();
      const config = ['${TEST_VAR}', '${TEST_PORT}'];
      const result = resolver.resolve(config);
      expect(result).toEqual(['test_value', '3000']);
    });

    it('should handle mixed strings', () => {
      const resolver = new EnvResolver();
      const result = resolver.resolve('http://${TEST_HOST}:${TEST_PORT}/api');
      expect(result).toBe('http://localhost:3000/api');
    });

    it('should throw error in strict mode for missing variables', () => {
      const resolver = new EnvResolver({ strict: true });
      expect(() => {
        resolver.resolve('${MISSING_VAR}');
      }).toThrow(EnvResolutionError);
    });

    it('should not throw in non-strict mode for missing variables', () => {
      const resolver = new EnvResolver({ strict: false, warn: false });
      const result = resolver.resolve('${MISSING_VAR}');
      expect(result).toBe('${MISSING_VAR}');
    });

    it('should use prefix when specified', () => {
      process.env.APP_NAME = 'myapp';
      const resolver = new EnvResolver({ prefix: 'APP_' });
      const result = resolver.resolve('${NAME}');
      expect(result).toBe('myapp');
    });
  });

  describe('hasEnvVars', () => {
    it('should detect environment variables in strings', () => {
      const resolver = new EnvResolver();
      expect(resolver.hasEnvVars('${TEST_VAR}')).toBe(true);
      expect(resolver.hasEnvVars('plain string')).toBe(false);
    });

    it('should detect environment variables in objects', () => {
      const resolver = new EnvResolver();
      const config = { key: '${TEST_VAR}' };
      expect(resolver.hasEnvVars(config)).toBe(true);
    });

    it('should detect environment variables in arrays', () => {
      const resolver = new EnvResolver();
      const config = ['plain', '${TEST_VAR}'];
      expect(resolver.hasEnvVars(config)).toBe(true);
    });
  });

  describe('extractEnvVars', () => {
    it('should extract variable names from strings', () => {
      const resolver = new EnvResolver();
      const vars = resolver.extractEnvVars('${VAR1} and ${VAR2}');
      expect(vars).toEqual(['VAR1', 'VAR2']);
    });

    it('should extract variables from objects', () => {
      const resolver = new EnvResolver();
      const config = {
        a: '${VAR1}',
        b: {
          c: '${VAR2}',
          d: '${VAR3:default}',
        },
      };
      const vars = resolver.extractEnvVars(config);
      expect(vars).toContain('VAR1');
      expect(vars).toContain('VAR2');
      expect(vars).toContain('VAR3');
    });

    it('should not duplicate variable names', () => {
      const resolver = new EnvResolver();
      const config = {
        a: '${VAR1}',
        b: '${VAR1}',
      };
      const vars = resolver.extractEnvVars(config);
      expect(vars.filter(v => v === 'VAR1')).toHaveLength(1);
    });
  });

  describe('validate', () => {
    it('should validate all required variables are present', () => {
      const resolver = new EnvResolver();
      const config = { key: '${TEST_VAR}' };
      const result = resolver.validate(config);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should detect missing variables', () => {
      const resolver = new EnvResolver();
      const config = { key: '${MISSING_VAR}' };
      const result = resolver.validate(config);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('MISSING_VAR');
    });

    it('should not report missing for variables with defaults', () => {
      const resolver = new EnvResolver();
      const config = { key: '${MISSING_VAR:default}' };
      const result = resolver.validate(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('setEnv and getEnv', () => {
    it('should set and get environment variables', () => {
      const resolver = new EnvResolver();
      resolver.setEnv('CUSTOM_VAR', 'custom_value');
      const env = resolver.getEnv();
      expect(env.CUSTOM_VAR).toBe('custom_value');
    });

    it('should use custom env in resolution', () => {
      const resolver = new EnvResolver({ env: { CUSTOM: 'value' } });
      const result = resolver.resolve('${CUSTOM}');
      expect(result).toBe('value');
    });
  });
});
