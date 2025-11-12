import { diff } from 'deep-diff';
import { ConfigChange } from '../types';

export class ChangeDetector {
  /**
   * Detect changes between two configurations
   */
  detectChanges(
    oldConfig: any,
    newConfig: any,
    file: string,
    environment?: string
  ): ConfigChange[] {
    const changes: ConfigChange[] = [];
    const differences = diff(oldConfig, newConfig);
    
    if (!differences) {
      return changes;
    }
    
    for (const difference of differences) {
      const path = this.buildPath(difference.path);
      const timestamp = new Date();
      
      switch (difference.kind) {
        case 'N': // New
          changes.push({
            type: 'added',
            path,
            newValue: difference.rhs,
            file,
            environment,
            timestamp,
          });
          break;
        
        case 'D': // Deleted
          changes.push({
            type: 'deleted',
            path,
            oldValue: difference.lhs,
            file,
            environment,
            timestamp,
          });
          break;
        
        case 'E': // Edited
          changes.push({
            type: 'modified',
            path,
            oldValue: difference.lhs,
            newValue: difference.rhs,
            file,
            environment,
            timestamp,
          });
          break;
        
        case 'A': // Array change
          changes.push({
            type: 'modified',
            path: `${path}[${(difference as any).index}]`,
            oldValue: (difference as any).item?.lhs,
            newValue: (difference as any).item?.rhs,
            file,
            environment,
            timestamp,
          });
          break;
      }
    }
    
    return changes;
  }
  
  /**
   * Build a path string from an array of keys
   */
  private buildPath(pathArray?: (string | number)[]): string {
    if (!pathArray || pathArray.length === 0) {
      return '';
    }
    
    return pathArray
      .map((key, index) => {
        if (typeof key === 'number') {
          return `[${key}]`;
        }
        if (index === 0) {
          return key;
        }
        // Check if key needs to be accessed with bracket notation
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
          return `["${key}"]`;
        }
        return `.${key}`;
      })
      .join('');
  }
  
  /**
   * Compare two values for equality
   */
  isEqual(a: any, b: any): boolean {
    return !diff(a, b);
  }
  
  /**
   * Get a human-readable description of the change
   */
  describeChange(change: ConfigChange): string {
    const { type, path, oldValue, newValue, environment } = change;
    const envStr = environment ? ` (${environment})` : '';
    
    switch (type) {
      case 'added':
        return `Added '${path}'${envStr}: ${JSON.stringify(newValue)}`;
      
      case 'deleted':
        return `Deleted '${path}'${envStr}: ${JSON.stringify(oldValue)}`;
      
      case 'modified':
        return `Modified '${path}'${envStr}: ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`;
      
      default:
        return `Unknown change at '${path}'${envStr}`;
    }
  }
  
  /**
   * Filter changes by type
   */
  filterByType(changes: ConfigChange[], type: ConfigChange['type']): ConfigChange[] {
    return changes.filter(c => c.type === type);
  }
  
  /**
   * Filter changes by path pattern
   */
  filterByPath(changes: ConfigChange[], pattern: string | RegExp): ConfigChange[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return changes.filter(c => regex.test(c.path));
  }
  
  /**
   * Group changes by file
   */
  groupByFile(changes: ConfigChange[]): Map<string, ConfigChange[]> {
    const grouped = new Map<string, ConfigChange[]>();
    
    for (const change of changes) {
      if (!grouped.has(change.file)) {
        grouped.set(change.file, []);
      }
      grouped.get(change.file)!.push(change);
    }
    
    return grouped;
  }
  
  /**
   * Group changes by environment
   */
  groupByEnvironment(changes: ConfigChange[]): Map<string | undefined, ConfigChange[]> {
    const grouped = new Map<string | undefined, ConfigChange[]>();
    
    for (const change of changes) {
      if (!grouped.has(change.environment)) {
        grouped.set(change.environment, []);
      }
      grouped.get(change.environment)!.push(change);
    }
    
    return grouped;
  }
}