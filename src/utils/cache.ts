/**
 * Cache utilities
 * Provides LRU cache implementation and re-exports function utilities
 */

// Re-export function utilities for backward compatibility
export { debounce, throttle, cloneDeep, memoize, delay, retry, timeout, once, compose, pipe } from './function-utils';

/**
 * Cache entry structure
 */
export interface CacheEntry<V> {
  value: V;
  timestamp: number;
}

/**
 * Simple LRU cache implementation
 *
 * @typeParam K - Key type
 * @typeParam V - Value type
 *
 * @example
 * ```ts
 * const cache = new Cache<string, object>(100, 60000);
 * cache.set('config', { port: 3000 });
 * const config = cache.get('config');
 * ```
 */
export class Cache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly ttl: number;
  private hits = 0;
  private misses = 0;

  /**
   * Create a new cache instance
   * @param maxSize - Maximum number of entries (default: 100)
   * @param ttl - Time to live in milliseconds (default: 60000)
   */
  constructor(maxSize = 100, ttl = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry.value;
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void {
    // Remove existing entry to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Remove oldest entry if cache is full
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if key exists in cache (and not expired)
   * @param key - Cache key
   * @returns true if key exists and is not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   * @param key - Cache key
   * @returns true if key was deleted
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache size
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys
   * @returns Array of cache keys
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values
   * @returns Array of cached values
   */
  values(): V[] {
    return Array.from(this.cache.values()).map((entry) => entry.value);
  }

  /**
   * Get all entries
   * @returns Array of [key, value] pairs
   */
  entries(): Array<[K, V]> {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  /**
   * Get cache hit rate
   * @returns Hit rate as a number between 0 and 1
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
    };
  }

  /**
   * Remove expired entries
   * @returns Number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get value or set if not present
   * @param key - Cache key
   * @param factory - Factory function to create value if not cached
   * @returns Cached or newly created value
   */
  getOrSet(key: K, factory: () => V): V {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const value = factory();
    this.set(key, value);
    return value;
  }

  /**
   * Async version of getOrSet
   * @param key - Cache key
   * @param factory - Async factory function
   * @returns Cached or newly created value
   */
  async getOrSetAsync(key: K, factory: () => Promise<V>): Promise<V> {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const value = await factory();
    this.set(key, value);
    return value;
  }
}
