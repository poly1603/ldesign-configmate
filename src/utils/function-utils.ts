/**
 * Function utilities
 * Helper functions for common operations like debouncing, throttling, and cloning
 */

/**
 * Debounce function - delays execution until after delay has passed since last call
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```ts
 * const debouncedSave = debounce(save, 300);
 * debouncedSave(); // Only executes after 300ms of no calls
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = function (this: unknown, ...args: Parameters<T>): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  // Add cancel method
  debouncedFn.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  // Add flush method to execute immediately
  debouncedFn.flush = function (this: unknown, ...args: Parameters<T>): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      fn.apply(this, args);
    }
  };

  return debouncedFn;
}

/**
 * Throttle function - limits execution to at most once per specified time period
 *
 * @param fn - Function to throttle
 * @param limit - Minimum time between executions in milliseconds
 * @param options - Optional settings for leading/trailing calls
 * @returns Throttled function
 *
 * @example
 * ```ts
 * const throttledScroll = throttle(onScroll, 100);
 * window.addEventListener('scroll', throttledScroll);
 * ```
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options;
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  let lastContext: unknown = null;

  const throttledFn = function (this: unknown, ...args: Parameters<T>): void {
    if (!inThrottle) {
      if (leading) {
        fn.apply(this, args);
      }
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        if (trailing && lastArgs !== null) {
          fn.apply(lastContext, lastArgs);
          lastArgs = null;
          lastContext = null;
        }
      }, limit);
    } else if (trailing) {
      lastArgs = args;
      lastContext = this;
    }
  };

  // Add cancel method
  throttledFn.cancel = (): void => {
    inThrottle = false;
    lastArgs = null;
    lastContext = null;
  };

  return throttledFn;
}

/**
 * Deep clone using structuredClone (Node 17+) with fallback
 *
 * @param obj - Object to clone
 * @returns Deep cloned object
 *
 * @example
 * ```ts
 * const original = { a: { b: 1 } };
 * const clone = cloneDeep(original);
 * clone.a.b = 2;
 * console.log(original.a.b); // 1
 * ```
 */
export function cloneDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Use structuredClone if available (Node 17+)
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(obj);
    } catch {
      // Fall back to JSON method if structuredClone fails
    }
  }

  // Fallback for older Node versions or when structuredClone fails
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    // Last resort: manual deep clone
    return manualDeepClone(obj);
  }
}

/**
 * Manual deep clone implementation
 * Handles special types like Date, RegExp, Map, Set
 */
function manualDeepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map((item) => manualDeepClone(item)) as unknown as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as unknown as T;
  }

  if (obj instanceof Map) {
    const map = new Map();
    obj.forEach((value, key) => {
      map.set(key, manualDeepClone(value));
    });
    return map as unknown as T;
  }

  if (obj instanceof Set) {
    const set = new Set();
    obj.forEach((value) => {
      set.add(manualDeepClone(value));
    });
    return set as unknown as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = manualDeepClone((obj as Record<string, unknown>)[key]);
    }
  }

  return cloned as T;
}

/**
 * Memoize a function - caches results based on arguments
 *
 * @param fn - Function to memoize
 * @param options - Optional cache settings
 * @returns Memoized function
 *
 * @example
 * ```ts
 * const memoizedFib = memoize((n: number) => {
 *   if (n <= 1) return n;
 *   return memoizedFib(n - 1) + memoizedFib(n - 2);
 * });
 * ```
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: { maxSize?: number; keyGenerator?: (...args: Parameters<T>) => string } = {}
): T & { cache: Map<string, ReturnType<T>>; clear: () => void } {
  const { maxSize = 100, keyGenerator = (...args) => JSON.stringify(args) } = options;
  const cache = new Map<string, ReturnType<T>>();

  const memoized = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn.apply(this, args) as ReturnType<T>;

    // Evict oldest entry if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, result);
    return result;
  };

  memoized.cache = cache;
  memoized.clear = (): void => cache.clear();

  return memoized as T & { cache: Map<string, ReturnType<T>>; clear: () => void };
}

/**
 * Compose multiple functions into one (right to left)
 *
 * @param fns - Functions to compose
 * @returns Composed function
 *
 * @example
 * ```ts
 * const add1 = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const add1ThenDouble = compose(double, add1);
 * add1ThenDouble(5); // 12
 * ```
 */
export function compose<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
  return (arg: T): T => fns.reduceRight((acc, fn) => fn(acc), arg);
}

/**
 * Pipe multiple functions (left to right)
 *
 * @param fns - Functions to pipe
 * @returns Piped function
 *
 * @example
 * ```ts
 * const add1 = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const add1ThenDouble = pipe(add1, double);
 * add1ThenDouble(5); // 12
 * ```
 */
export function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
  return (arg: T): T => fns.reduce((acc, fn) => fn(acc), arg);
}

/**
 * Once - ensures a function is only called once
 *
 * @param fn - Function to wrap
 * @returns Function that only executes once
 *
 * @example
 * ```ts
 * const initialize = once(() => console.log('Initialized'));
 * initialize(); // 'Initialized'
 * initialize(); // (nothing)
 * ```
 */
export function once<T extends (...args: unknown[]) => unknown>(
  fn: T
): T & { reset: () => void } {
  let called = false;
  let result: ReturnType<T>;

  const onceFn = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    if (!called) {
      called = true;
      result = fn.apply(this, args) as ReturnType<T>;
    }
    return result;
  };

  onceFn.reset = (): void => {
    called = false;
  };

  return onceFn as T & { reset: () => void };
}

/**
 * Delay execution for specified time
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 *
 * @example
 * ```ts
 * await delay(1000);
 * console.log('1 second later');
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Result of successful function call
 *
 * @example
 * ```ts
 * const result = await retry(
 *   () => fetchData(),
 *   { maxAttempts: 3, delay: 1000, backoffMultiplier: 2 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoffMultiplier?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: Error;
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts || !shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(lastError, attempt);
      }

      await delay(Math.min(currentDelay, maxDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError!;
}

/**
 * Create a timeout wrapper for promises
 *
 * @param promise - Promise to wrap
 * @param ms - Timeout in milliseconds
 * @param message - Optional timeout error message
 * @returns Promise that rejects if timeout is exceeded
 *
 * @example
 * ```ts
 * try {
 *   const result = await timeout(fetchData(), 5000);
 * } catch (error) {
 *   console.log('Request timed out');
 * }
 * ```
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  message = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
