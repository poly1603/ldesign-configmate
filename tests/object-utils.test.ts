import { describe, it, expect } from 'vitest';
import { setPath, getPath, hasPath, deletePath, mergeDeep } from '../src/utils/object-utils';

describe('Object Utils', () => {
  describe('setPath', () => {
    it('should set nested values', () => {
      const obj = { a: { b: 1 } };
      const result = setPath(obj, 'a.c', 2);
      
      expect(result).toEqual({ a: { b: 1, c: 2 } });
      expect(obj).toEqual({ a: { b: 1 } }); // Original should be unchanged
    });

    it('should create nested paths', () => {
      const obj = {};
      const result = setPath(obj, 'a.b.c', 'value');
      
      expect(result).toEqual({ a: { b: { c: 'value' } } });
    });

    it('should prevent prototype pollution', () => {
      const obj = {};
      const result = setPath(obj, '__proto__.polluted', true);
      
      expect(result).toEqual({});
      expect((result as any).polluted).toBeUndefined();
    });

    it('should handle array paths', () => {
      const obj = {};
      const result = setPath(obj, ['a', 'b', 'c'], 'value');
      
      expect(result).toEqual({ a: { b: { c: 'value' } } });
    });

    it('should handle non-object inputs', () => {
      expect(setPath(null, 'a.b', 'value')).toBe(null);
      expect(setPath('string', 'a.b', 'value')).toBe('string');
    });
  });

  describe('getPath', () => {
    const obj = {
      a: {
        b: {
          c: 'value'
        },
        array: [1, 2, { nested: true }]
      },
      null_value: null,
      zero: 0,
      empty_string: ''
    };

    it('should get nested values', () => {
      expect(getPath(obj, 'a.b.c')).toBe('value');
      expect(getPath(obj, 'a.array.2.nested')).toBe(true);
    });

    it('should return default for missing paths', () => {
      expect(getPath(obj, 'missing.path', 'default')).toBe('default');
      expect(getPath(obj, 'a.missing', 'default')).toBe('default');
    });

    it('should handle falsy values correctly', () => {
      expect(getPath(obj, 'null_value')).toBe(null);
      expect(getPath(obj, 'zero')).toBe(0);
      expect(getPath(obj, 'empty_string')).toBe('');
    });

    it('should handle array paths', () => {
      expect(getPath(obj, ['a', 'b', 'c'])).toBe('value');
    });

    it('should handle non-object inputs', () => {
      expect(getPath(null, 'a.b', 'default')).toBe('default');
      expect(getPath(undefined, 'a.b', 'default')).toBe('default');
    });
  });

  describe('hasPath', () => {
    const obj = {
      a: {
        b: {
          c: 'value'
        }
      },
      null_value: null,
      zero: 0,
      empty_string: ''
    };

    it('should return true for existing paths', () => {
      expect(hasPath(obj, 'a.b.c')).toBe(true);
      expect(hasPath(obj, 'null_value')).toBe(true);
      expect(hasPath(obj, 'zero')).toBe(true);
      expect(hasPath(obj, 'empty_string')).toBe(true);
    });

    it('should return false for missing paths', () => {
      expect(hasPath(obj, 'missing')).toBe(false);
      expect(hasPath(obj, 'a.missing')).toBe(false);
      expect(hasPath(obj, 'a.b.missing')).toBe(false);
    });

    it('should handle array paths', () => {
      expect(hasPath(obj, ['a', 'b', 'c'])).toBe(true);
      expect(hasPath(obj, ['missing'])).toBe(false);
    });

    it('should handle non-object inputs', () => {
      expect(hasPath(null, 'a')).toBe(false);
      expect(hasPath(undefined, 'a')).toBe(false);
      expect(hasPath('string', 'a')).toBe(false);
    });
  });

  describe('deletePath', () => {
    it('should delete nested values', () => {
      const obj = { a: { b: { c: 'value', d: 'keep' } } };
      const result = deletePath(obj, 'a.b.c');
      
      expect(result).toEqual({ a: { b: { d: 'keep' } } });
      expect(obj).toEqual({ a: { b: { c: 'value', d: 'keep' } } }); // Original unchanged
    });

    it('should handle missing paths gracefully', () => {
      const obj = { a: { b: 1 } };
      const result = deletePath(obj, 'a.missing');
      
      expect(result).toEqual({ a: { b: 1 } });
    });

    it('should prevent deletion of prototype properties', () => {
      const obj = { a: 1 };
      const result = deletePath(obj, '__proto__');
      
      expect(result).toEqual({ a: 1 });
    });

    it('should handle array paths', () => {
      const obj = { a: { b: { c: 'value' } } };
      const result = deletePath(obj, ['a', 'b', 'c']);
      
      expect(result).toEqual({ a: { b: {} } });
    });

    it('should handle non-object inputs', () => {
      expect(deletePath(null, 'a')).toBe(null);
      expect(deletePath('string', 'a')).toBe('string');
    });
  });

  describe('mergeDeep', () => {
    it('should merge objects deeply', () => {
      const target = { a: { b: 1, c: 2 } };
      const source = { a: { b: 3, d: 4 }, e: 5 };
      
      const result = mergeDeep(target, source);
      
      expect(result).toEqual({
        a: { b: 3, c: 2, d: 4 },
        e: 5
      });
    });

    it('should handle multiple sources', () => {
      const target = { a: 1 };
      const source1 = { b: 2 };
      const source2 = { c: 3 };
      
      const result = mergeDeep(target, source1, source2);
      
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should prevent prototype pollution', () => {
      const target = {};
      const source = JSON.parse('{"__proto__": {"polluted": true}}');
      
      const result = mergeDeep(target, source);
      
      expect((result as any).polluted).toBeUndefined();
    });

    it('should handle arrays correctly', () => {
      const target = { arr: [1, 2] };
      const source = { arr: [3, 4] };
      
      const result = mergeDeep(target, source);
      
      expect(result).toEqual({ arr: [3, 4] }); // Arrays are replaced, not merged
    });

    it('should handle null and undefined sources', () => {
      const target = { a: 1 };
      
      expect(mergeDeep(target, null)).toEqual({ a: 1 });
      expect(mergeDeep(target, undefined)).toEqual({ a: 1 });
    });

    it('should not mutate original objects', () => {
      const target = { a: { b: 1 } };
      const source = { a: { c: 2 } };
      
      const result = mergeDeep(target, source);
      
      expect(target).toEqual({ a: { b: 1 } });
      expect(source).toEqual({ a: { c: 2 } });
      expect(result).toEqual({ a: { b: 1, c: 2 } });
    });
  });
});
