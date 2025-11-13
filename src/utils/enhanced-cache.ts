/**
 * Enhanced cache implementation with memory management and statistics
 */
export interface CacheEntry<V> {
  value: V;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size?: number; // Estimated memory size in bytes
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
  maxMemory: number;
  keys: string[];
  oldestEntry?: number;
  newestEntry?: number;
}

export interface CacheOptions {
  maxSize?: number;
  ttl?: number;
  maxMemory?: number; // Maximum memory usage in bytes
  onEvict?: (key: string, entry: CacheEntry<any>) => void;
}

/**
 * Enhanced LRU cache with memory management and performance monitoring
 */
export class EnhancedCache<K extends string, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private ttl: number;
  private maxMemory: number;
  private currentMemory: number = 0;
  private hits: number = 0;
  private misses: number = 0;
  private onEvict?: (key: string, entry: CacheEntry<V>) => void;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 60000;
    this.maxMemory = options.maxMemory || 50 * 1024 * 1024; // 50MB default
    this.onEvict = options.onEvict;
  }

  /**
   * Get a value from cache with access tracking
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in cache with memory management
   */
  set(key: K, value: V): void {
    const size = this.estimateSize(value);
    
    // Check if single item exceeds max memory
    if (size > this.maxMemory) {
      console.warn(`Cache item too large: ${size} bytes exceeds max memory ${this.maxMemory}`);
      return;
    }

    // Remove existing entry if updating
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentMemory -= existing.size || 0;
      this.cache.delete(key);
    }

    // Evict entries if necessary
    this.evictIfNeeded(size);

    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    };

    this.cache.set(key, entry);
    this.currentMemory += size;
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemory -= entry.size || 0;
      if (this.onEvict) {
        this.onEvict(key, entry);
      }
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    if (this.onEvict) {
      for (const [key, entry] of this.cache) {
        this.onEvict(key, entry);
      }
    }
    this.cache.clear();
    this.currentMemory = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
      memoryUsage: this.currentMemory,
      maxMemory: this.maxMemory,
      keys: this.keys(),
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key);
        removed++;
      }
    }
    
    return removed;
  }

  /**
   * Evict entries if cache limits are exceeded
   */
  private evictIfNeeded(newItemSize: number): void {
    // Check memory limit
    while (this.currentMemory + newItemSize > this.maxMemory && this.cache.size > 0) {
      this.evictLeastRecentlyUsed();
    }

    // Check size limit
    while (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.delete(firstKey);
    }
  }

  /**
   * Estimate memory size of a value
   */
  private estimateSize(value: V): number {
    if (value === null || value === undefined) {
      return 8; // Rough estimate for null/undefined
    }

    if (typeof value === 'string') {
      return value.length * 2; // UTF-16 encoding
    }

    if (typeof value === 'number') {
      return 8; // 64-bit number
    }

    if (typeof value === 'boolean') {
      return 4; // Boolean
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).length * 2; // Rough estimate
      } catch {
        return 1024; // Default estimate for complex objects
      }
    }

    return 64; // Default estimate
  }

  /**
   * Get entries sorted by access frequency
   */
  getMostAccessed(limit: number = 10): Array<{ key: K; accessCount: number; lastAccessed: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Preload cache with values
   */
  async preload(loader: (key: K) => Promise<V>, keys: K[]): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const value = await loader(key);
        this.set(key, value);
      } catch (error) {
        console.warn(`Failed to preload cache key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }
}
