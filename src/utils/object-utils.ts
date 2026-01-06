/**
 * Safe object utilities to replace lodash functions
 * Prevents prototype pollution vulnerabilities
 */

import type { DeepReadonly, DeepPartial } from '../types/utils';

/** Keys that are blocked to prevent prototype pollution */
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Check if a key is safe (not a prototype pollution vector)
 * @param key - Key to check
 * @returns true if key is safe
 */
export function isSafeKey(key: string): boolean {
  return !BLOCKED_KEYS.has(key);
}

/**
 * Check if all keys in a path are safe
 * @param keys - Array of keys
 * @returns true if all keys are safe
 */
function areKeysSafe(keys: string[]): boolean {
  return keys.every(isSafeKey);
}

/**
 * Parse a path string into an array of keys
 * Handles both dot notation and bracket notation
 * @param path - Path string or array
 * @returns Array of keys
 *
 * @example
 * parsePath('a.b.c') // ['a', 'b', 'c']
 * parsePath('a[0].b') // ['a', '0', 'b']
 * parsePath(['a', 'b']) // ['a', 'b']
 */
export function parsePath(path: string | string[]): string[] {
  if (Array.isArray(path)) {
    return path;
  }

  const keys: string[] = [];
  let current = '';
  let inBracket = false;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (char === '[' && !inBracket) {
      if (current) {
        keys.push(current);
        current = '';
      }
      inBracket = true;
    } else if (char === ']' && inBracket) {
      if (current) {
        keys.push(current);
        current = '';
      }
      inBracket = false;
    } else if (char === '.' && !inBracket) {
      if (current) {
        keys.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    keys.push(current);
  }

  return keys;
}

/**
 * Safely set a value at a nested path in an object
 * Replacement for lodash.set with prototype pollution protection
 *
 * @param obj - Object to modify
 * @param path - Path to set (dot notation or array)
 * @param value - Value to set
 * @returns New object with value set
 *
 * @example
 * setPath({ a: { b: 1 } }, 'a.c', 2) // { a: { b: 1, c: 2 } }
 */
export function setPath<T extends object>(obj: T, path: string | string[], value: unknown): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const keys = parsePath(path);

  // Check for prototype pollution in the path
  if (!areKeysSafe(keys)) {
    return obj; // Return original object unchanged
  }

  if (keys.length === 0) {
    return obj;
  }

  const result = { ...obj } as Record<string, unknown>;
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (!current[key] || typeof current[key] !== 'object') {
      // Determine if next key is numeric (array index)
      const nextKey = keys[i + 1];
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    } else {
      current[key] = Array.isArray(current[key])
        ? [...(current[key] as unknown[])]
        : { ...(current[key] as object) };
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return result as T;
}

/**
 * Safely get a value at a nested path in an object
 * Replacement for lodash.get
 */
export function getPath(obj: any, path: string | string[], defaultValue?: any): any {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const keys = Array.isArray(path) ? path : path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object' || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current;
}

/**
 * Check if a path exists in an object
 */
export function hasPath(obj: any, path: string | string[]): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const keys = Array.isArray(path) ? path : path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object' || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  return true;
}

/**
 * Safely delete a property at a nested path
 */
export function deletePath(obj: any, path: string | string[]): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const keys = Array.isArray(path) ? path : path.split('.');
  if (keys.length === 0) {
    return obj;
  }

  const result = { ...obj };
  let current = result;

  // Navigate to the parent of the target key
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    
    if (!current[key] || typeof current[key] !== 'object') {
      return result; // Path doesn't exist
    }
    
    current[key] = { ...current[key] };
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  
  // Prevent deletion of prototype properties
  if (lastKey !== '__proto__' && lastKey !== 'constructor' && lastKey !== 'prototype') {
    delete current[lastKey];
  }

  return result;
}

/**
 * Deep merge objects safely
 * Replacement for lodash.merge with prototype pollution protection
 */
export function mergeDeep(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  
  const result = { ...target };

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    for (const key in source) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          result[key] = mergeDeep(targetValue, sourceValue);
        } else {
          result[key] = sourceValue;
        }
      }
    }
  }

  return result;
}

/**
 * Deep freeze an object (make it immutable)
 *
 * @param obj - Object to freeze
 * @returns Frozen object
 *
 * @example
 * const config = deepFreeze({ a: { b: 1 } });
 * config.a.b = 2; // TypeError in strict mode
 */
export function deepFreeze<T extends object>(obj: T): DeepReadonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj as DeepReadonly<T>;
  }

  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze all nested objects
  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value as object);
    }
  }

  return obj as DeepReadonly<T>;
}

/**
 * Deep seal an object (prevent adding/removing properties but allow modification)
 *
 * @param obj - Object to seal
 * @returns Sealed object
 */
export function deepSeal<T extends object>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  Object.seal(obj);

  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object' && !Object.isSealed(value)) {
      deepSeal(value as object);
    }
  }

  return obj;
}

/**
 * Pick specified keys from an object
 *
 * @param obj - Source object
 * @param keys - Keys to pick
 * @returns New object with only specified keys
 *
 * @example
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']) // { a: 1, c: 3 }
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Omit specified keys from an object
 *
 * @param obj - Source object
 * @param keys - Keys to omit
 * @returns New object without specified keys
 *
 * @example
 * omit({ a: 1, b: 2, c: 3 }, ['b']) // { a: 1, c: 3 }
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  const keySet = new Set(keys as unknown[]);

  for (const key of Object.keys(result)) {
    if (keySet.has(key)) {
      delete (result as Record<string, unknown>)[key];
    }
  }

  return result as Omit<T, K>;
}

/**
 * Flatten a nested object into a single-level object with dot notation keys
 *
 * @param obj - Object to flatten
 * @param prefix - Prefix for keys (used internally)
 * @param separator - Separator between keys (default: '.')
 * @returns Flattened object
 *
 * @example
 * flatten({ a: { b: { c: 1 } }, d: 2 })
 * // { 'a.b.c': 1, 'd': 2 }
 */
export function flatten(
  obj: Record<string, unknown>,
  prefix = '',
  separator = '.'
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    if (!isSafeKey(key)) continue;

    const value = obj[key];
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    ) {
      Object.assign(result, flatten(value as Record<string, unknown>, newKey, separator));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Unflatten a dot-notation object back into a nested structure
 *
 * @param obj - Flattened object
 * @param separator - Separator between keys (default: '.')
 * @returns Nested object
 *
 * @example
 * unflatten({ 'a.b.c': 1, 'd': 2 })
 * // { a: { b: { c: 1 } }, d: 2 }
 */
export function unflatten(
  obj: Record<string, unknown>,
  separator = '.'
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split(separator);

    // Check for prototype pollution
    if (!areKeysSafe(keys)) continue;

    let current: Record<string, unknown> = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  return result;
}

/**
 * Check if an object is empty
 *
 * @param obj - Object to check
 * @returns true if object has no own properties
 */
export function isEmpty(obj: unknown): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }

  if (typeof obj !== 'object') {
    return false;
  }

  if (Array.isArray(obj)) {
    return obj.length === 0;
  }

  return Object.keys(obj).length === 0;
}

/**
 * Deep equality check for objects
 *
 * @param a - First object
 * @param b - Second object
 * @returns true if objects are deeply equal
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (a === null || b === null) {
    return a === b;
  }

  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => isEqual(item, b[index]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every((key) =>
    isEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
}

/**
 * Get all keys from a nested object (dot notation)
 *
 * @param obj - Object to get keys from
 * @param prefix - Prefix for keys (used internally)
 * @returns Array of dot-notation keys
 *
 * @example
 * getAllKeys({ a: { b: 1 }, c: 2 }) // ['a.b', 'c']
 */
export function getAllKeys(
  obj: Record<string, unknown>,
  prefix = ''
): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    if (!isSafeKey(key)) continue;

    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    ) {
      keys.push(...getAllKeys(value as Record<string, unknown>, newKey));
    } else {
      keys.push(newKey);
    }
  }

  return keys;
}

/**
 * Create a diff between two objects
 *
 * @param oldObj - Original object
 * @param newObj - New object
 * @returns Object describing the differences
 */
export function diff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): {
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  changed: Record<string, { old: unknown; new: unknown }>;
} {
  const flatOld = flatten(oldObj);
  const flatNew = flatten(newObj);

  const added: Record<string, unknown> = {};
  const removed: Record<string, unknown> = {};
  const changed: Record<string, { old: unknown; new: unknown }> = {};

  // Find added and changed
  for (const key of Object.keys(flatNew)) {
    if (!(key in flatOld)) {
      added[key] = flatNew[key];
    } else if (!isEqual(flatOld[key], flatNew[key])) {
      changed[key] = { old: flatOld[key], new: flatNew[key] };
    }
  }

  // Find removed
  for (const key of Object.keys(flatOld)) {
    if (!(key in flatNew)) {
      removed[key] = flatOld[key];
    }
  }

  return { added, removed, changed };
}

/**
 * Map over object values (like Array.map but for objects)
 *
 * @param obj - Source object
 * @param fn - Mapping function
 * @returns New object with mapped values
 */
export function mapValues<T extends object, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U
): Record<keyof T, U> {
  const result = {} as Record<keyof T, U>;

  for (const key of Object.keys(obj) as Array<keyof T>) {
    result[key] = fn(obj[key], key);
  }

  return result;
}

/**
 * Filter object by predicate
 *
 * @param obj - Source object
 * @param predicate - Filter function
 * @returns New object with filtered entries
 */
export function filterObject<T extends object>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  const result = {} as Partial<T>;

  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  }

  return result;
}
