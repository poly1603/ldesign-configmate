import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache, debounce, throttle, cloneDeep } from '../src/utils/cache';

describe('Cache', () => {
  let cache: Cache<string, any>;

  beforeEach(() => {
    cache = new Cache<string, any>(3, 1000);
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should delete keys', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    cache.delete('key1');
    expect(cache.has('key1')).toBe(false);
  });

  it('should respect max size (LRU)', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // Should evict key1

    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });

  it('should expire entries after TTL', async () => {
    const shortCache = new Cache<string, any>(10, 50); // 50ms TTL
    shortCache.set('key1', 'value1');
    
    expect(shortCache.has('key1')).toBe(true);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(shortCache.has('key1')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('should return all keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    const keys = cache.keys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
    expect(keys.length).toBe(2);
  });
});

describe('debounce', () => {
  it('should debounce function calls', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to debounced function', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced('arg1', 'arg2');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('throttle', () => {
  it('should throttle function calls', async () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);

    await new Promise(resolve => setTimeout(resolve, 150));

    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('cloneDeep', () => {
  it('should clone primitive values', () => {
    expect(cloneDeep(42)).toBe(42);
    expect(cloneDeep('string')).toBe('string');
    expect(cloneDeep(true)).toBe(true);
    expect(cloneDeep(null)).toBe(null);
  });

  it('should deep clone objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = cloneDeep(obj);

    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  it('should deep clone arrays', () => {
    const arr = [1, [2, 3], { a: 4 }];
    const cloned = cloneDeep(arr);

    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[1]).not.toBe(arr[1]);
    expect(cloned[2]).not.toBe(arr[2]);
  });

  it('should clone Date objects', () => {
    const date = new Date('2024-01-01');
    const cloned = cloneDeep(date);

    expect(cloned).toEqual(date);
    expect(cloned).not.toBe(date);
    expect(cloned.getTime()).toBe(date.getTime());
  });

  it('should clone RegExp objects', () => {
    const regex = /test/gi;
    const cloned = cloneDeep(regex);

    expect(cloned).toEqual(regex);
    expect(cloned.source).toBe(regex.source);
    expect(cloned.flags).toBe(regex.flags);
  });

  it('should clone Map objects', () => {
    const map = new Map([['key1', 'value1'], ['key2', 'value2']]);
    const cloned = cloneDeep(map);

    expect(cloned).toEqual(map);
    expect(cloned).not.toBe(map);
    expect(cloned.get('key1')).toBe('value1');
  });

  it('should clone Set objects', () => {
    const set = new Set([1, 2, 3]);
    const cloned = cloneDeep(set);

    expect(cloned).toEqual(set);
    expect(cloned).not.toBe(set);
    expect(cloned.has(1)).toBe(true);
  });
});
