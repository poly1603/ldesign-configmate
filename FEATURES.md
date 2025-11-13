# ConfigMate - New Features Guide

This document describes the newly added features in ConfigMate.

## 🌟 New Features

### 1. Environment Variable Resolution

Automatically resolve environment variables in your configuration files.

#### Syntax

- `${VAR_NAME}` - Use environment variable
- `${VAR_NAME:default}` - Use environment variable with default value

#### Usage

**config.ts**
```typescript
import { defineConfig } from '@ldesign/configmate';

export default defineConfig({
  database: {
    host: '${DB_HOST:localhost}',
    port: '${DB_PORT:5432}',
    password: '${DB_PASSWORD}', // Required, no default
  },
  api: {
    url: '${API_URL:http://localhost:3000}',
    timeout: '${API_TIMEOUT:5000}',
  },
});
```

**Enable in ConfigManager**
```typescript
const config = await createConfig({
  dir: './config',
  resolveEnv: true, // Enable environment variable resolution
  envResolver: {
    strict: false,  // Don't throw error for missing variables
    warn: true,     // Warn about missing variables
    prefix: '',     // Optional prefix for env variables
  },
});

// Access resolved values
console.log(config.get('database.host')); // Returns value from DB_HOST or 'localhost'
```

#### Advanced Environment Resolution

```typescript
import { EnvResolver } from '@ldesign/configmate';

const resolver = new EnvResolver({
  strict: true,  // Throw error for missing required variables
  prefix: 'APP_', // Look for APP_* variables
});

// Resolve configuration
const resolved = resolver.resolve(configData);

// Extract all environment variables used
const vars = resolver.extractEnvVars(configData);

// Validate all required variables are present
const { valid, missing } = resolver.validate(configData);
if (!valid) {
  console.error('Missing environment variables:', missing);
}
```

---

### 2. Configuration Caching

Improve performance by caching loaded configuration files.

#### Usage

```typescript
const config = await createConfig({
  dir: './config',
  cache: true,      // Enable caching
  cacheTTL: 60000,  // Cache duration in milliseconds (60 seconds)
});

// Check cache statistics
const stats = config.getCacheStats();
console.log('Cached files:', stats.size);
console.log('Cache keys:', stats.keys);

// Clear cache manually
config.clearCache();
```

#### How It Works

- Files are cached based on their modification time
- Cache is automatically invalidated when files change
- Reduces I/O operations for frequently accessed configurations
- Configurable TTL (Time To Live) for cache entries

---

### 3. Configuration Snapshots & Rollback

Create snapshots of your configuration and rollback to previous states.

#### Usage

```typescript
const config = await createConfig({
  dir: './config',
  autoSnapshot: true,  // Automatically create snapshots on changes
  maxSnapshots: 50,    // Keep up to 50 snapshots
});

// Create manual snapshot
const snapshot = config.snapshot('before-update', 'Before major update');

// Make changes
config.set('server.port', 9000);
config.set('feature.enabled', true);

// List all snapshots
const snapshots = config.listSnapshots();
console.log('Available snapshots:', snapshots);

// Get snapshot details
const details = config.getSnapshot('before-update');
console.log('Snapshot created at:', details.timestamp);
console.log('Description:', details.description);

// Rollback to previous state
config.rollback('before-update');
console.log('Rolled back successfully');

// Delete a snapshot
config.deleteSnapshot('before-update');
```

#### Standalone Snapshot Manager

```typescript
import { SnapshotManager } from '@ldesign/configmate';

const manager = new SnapshotManager(100); // Keep max 100 snapshots

// Create snapshots
manager.create('v1', config1, 'Version 1');
manager.create('v2', config2, 'Version 2');

// Compare snapshots
const comparison = manager.compare('v1', 'v2');
console.log('Identical:', comparison.identical);

// Get snapshots by time range
const recent = manager.getByTimeRange(
  new Date('2024-01-01'),
  new Date()
);

// Export/Import snapshots
const exported = manager.export();
fs.writeFileSync('snapshots.json', exported);

const imported = fs.readFileSync('snapshots.json', 'utf-8');
manager.import(imported);
```

---

### 4. Debounced File Watching

Batch rapid file changes together to avoid excessive reloads.

#### Usage

```typescript
const config = await createConfig({
  dir: './config',
  watch: true,
  debounceDelay: 500, // Wait 500ms before reloading after changes
});

// Multiple rapid file changes will trigger only one reload
// after the debounce delay
```

#### Benefits

- Prevents reload storms during bulk file operations
- Reduces CPU usage during rapid file changes
- Configurable delay to suit your needs
- Automatic cleanup on manager destroy

---

### 5. Enhanced Error Handling

Better error messages with custom error classes.

#### Error Types

```typescript
import {
  ConfigError,
  ValidationError,
  LoaderError,
  WatcherError,
  EnvResolutionError,
  SchemaValidationError,
} from '@ldesign/configmate';

try {
  const config = await createConfig({
    dir: './config',
    resolveEnv: true,
    envResolver: { strict: true },
  });
} catch (error) {
  if (error instanceof EnvResolutionError) {
    console.error('Missing environment variable:', error.variable);
    console.error('At path:', error.path);
  } else if (error instanceof LoaderError) {
    console.error('Failed to load:', error.filePath);
    console.error('Format:', error.format);
    console.error('Original error:', error.originalError);
  } else if (error instanceof ValidationError) {
    console.error('Validation failed at:', error.path);
    console.error('Value:', error.value);
  }
  
  // All errors have a code property
  console.error('Error code:', error.code);
}
```

#### Error Properties

Each error type includes specific contextual information:

- **ConfigError**: Base error with `code`
- **ValidationError**: Includes `path` and `value`
- **LoaderError**: Includes `filePath`, `format`, `originalError`
- **WatcherError**: Includes `filePath`, `originalError`
- **EnvResolutionError**: Includes `variable`, `path`
- **SchemaValidationError**: Includes `errors[]`, `path`, `value`

---

### 6. Improved Deep Clone

Reliable deep cloning using modern APIs with fallbacks.

#### Implementation

```typescript
import { cloneDeep } from '@ldesign/configmate';

const original = {
  date: new Date(),
  regex: /test/gi,
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
  nested: { deep: { value: 42 } },
};

const cloned = cloneDeep(original);

// Handles:
// - Dates
// - RegExp
// - Map
// - Set
// - Circular references (via structuredClone when available)
// - Nested objects and arrays
```

#### Fallback Strategy

1. Try `structuredClone` (Node 17+)
2. Fall back to JSON parse/stringify
3. Fall back to manual deep clone

---

## 🔧 Utility Functions

### Cache Utility

```typescript
import { Cache } from '@ldesign/configmate';

const cache = new Cache<string, any>(100, 60000); // max 100 items, 60s TTL

cache.set('key', value);
const value = cache.get('key');
const exists = cache.has('key');
cache.delete('key');
cache.clear();

console.log('Cache size:', cache.size());
console.log('Cache keys:', cache.keys());
```

### Debounce & Throttle

```typescript
import { debounce, throttle } from '@ldesign/configmate';

// Debounce: Wait for pause before execution
const debouncedFn = debounce(() => {
  console.log('Executed after pause');
}, 500);

// Throttle: Execute at most once per interval
const throttledFn = throttle(() => {
  console.log('Executed at most once per 1000ms');
}, 1000);
```

---

## 📋 Configuration Options Reference

### Complete Options

```typescript
const config = await createConfig({
  // Core options
  dir: './config',
  name: 'config',
  env: 'development',
  envKey: 'NODE_ENV',
  formats: ['ts', 'js', 'json', 'yaml'],
  watch: true,
  mergeStrategy: 'deep',
  defaults: {},
  validate: (cfg) => true,
  
  // New options
  resolveEnv: true,              // Enable environment variable resolution
  envResolver: {
    strict: false,               // Throw on missing variables
    prefix: '',                  // Environment variable prefix
    warn: true,                  // Warn about missing variables
  },
  cache: true,                   // Enable configuration caching
  cacheTTL: 60000,              // Cache TTL in milliseconds
  debounceDelay: 300,           // File change debounce delay
  autoSnapshot: false,          // Auto-create snapshots on changes
  maxSnapshots: 50,             // Maximum snapshots to keep
  schema: undefined,            // Schema validator (future)
});
```

---

## 🎯 Use Cases

### 1. Multi-Environment Application

```typescript
const config = await createConfig({
  dir: './config',
  env: process.env.NODE_ENV,
  resolveEnv: true,
  cache: true,
  watch: true,
  debounceDelay: 500,
});

// Automatically resolves environment-specific values
// Caches for performance
// Watches for changes with debouncing
```

### 2. Development with Hot Reload

```typescript
const config = await createConfig({
  dir: './config',
  watch: true,
  debounceDelay: 200,  // Fast reload for development
  autoSnapshot: true,   // Keep history of changes
});

config.on('change', (changes) => {
  console.log('Config hot-reloaded:', changes.length, 'changes');
});
```

### 3. Production with Validation

```typescript
const config = await createConfig({
  dir: './config',
  env: 'production',
  resolveEnv: true,
  envResolver: { strict: true }, // Fail on missing required env vars
  cache: true,
  cacheTTL: 300000, // 5 minute cache
  watch: false,     // No watching in production
  validate: (cfg) => {
    // Custom validation
    if (!cfg.database?.url) {
      throw new ValidationError('Database URL is required');
    }
    return true;
  },
});
```

### 4. Testing with Snapshots

```typescript
describe('Config Tests', () => {
  let config;

  beforeEach(async () => {
    config = await createConfig({
      dir: './test/fixtures',
      autoSnapshot: true,
    });
    config.snapshot('test-start', 'Before each test');
  });

  afterEach(() => {
    config.rollback('test-start');
    config.destroy();
  });

  it('should modify config', () => {
    config.set('test.value', 42);
    expect(config.get('test.value')).toBe(42);
  });
});
```

---

## 🚀 Migration Guide

If you're upgrading from an older version:

### Breaking Changes

None! All new features are opt-in and backward compatible.

### Recommended Updates

1. **Enable caching** for better performance:
   ```typescript
   cache: true
   ```

2. **Enable environment variable resolution** for flexibility:
   ```typescript
   resolveEnv: true
   ```

3. **Add debouncing** for file watching:
   ```typescript
   debounceDelay: 300
   ```

4. **Update error handling** to use specific error types:
   ```typescript
   catch (error) {
     if (error instanceof LoaderError) {
       // Handle loader errors specifically
     }
   }
   ```

---

## 📚 Examples

Check the `examples/` directory for complete examples:

- `advanced-usage.ts` - Demonstrates all new features
- `config.env.ts` - Environment variable resolution example
- `usage.ts` - Basic usage example

Run examples:
```bash
npm run example
```

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT © LDesign Team
