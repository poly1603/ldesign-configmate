/**
 * Safe object utilities to replace lodash functions
 * Prevents prototype pollution vulnerabilities
 */

/**
 * Safely set a value at a nested path in an object
 * Replacement for lodash.set with prototype pollution protection
 */
export function setPath(obj: any, path: string | string[], value: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const keys = Array.isArray(path) ? path : path.split('.');
  
  // Check for prototype pollution in the path
  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return obj; // Return original object unchanged
    }
  }
  
  const result = { ...obj };
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    } else {
      current[key] = { ...current[key] };
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return result;
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
