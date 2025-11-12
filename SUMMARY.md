# ConfigMate - Package Summary

## ✅ Package Created Successfully!

A comprehensive configuration management package for Node.js applications with advanced features.

## 📦 What's Included

### Core Files
- **src/types.ts** - Complete TypeScript type definitions
- **src/loader.ts** - Multi-format file loader (TS, JS, JSON, YAML, TOML, INI)
- **src/config-manager.ts** - Main configuration manager class
- **src/change-detector.ts** - Advanced change detection system
- **src/define-config.ts** - Type-safe config helper functions
- **src/index.ts** - Main export file

### Examples
- **examples/config.ts** - Full-featured TypeScript config example
- **examples/usage.ts** - Comprehensive usage demonstrations
- **examples/config.json** - JSON format example
- **examples/config.yaml** - YAML format example

### Build Output
- **dist/index.js** - CommonJS build
- **dist/index.mjs** - ESM build
- **dist/index.d.ts** - TypeScript declarations

## 🎯 Key Features

### 1. Multi-Format Support
```typescript
// Supports: .ts, .js, .mjs, .cjs, .json, .yaml, .yml, .toml, .ini
```

### 2. Environment Management
```typescript
// Base config + environment-specific overrides
config.ts → base configuration
config.development.ts → development overrides
config.production.ts → production overrides
```

### 3. Real-time Change Monitoring
```typescript
config.on('change', (changes) => {
  // Know exactly what changed:
  // - Which file
  // - Which environment
  // - Which field (e.g., 'server.port')
  // - Old and new values
});
```

### 4. Type-Safe defineConfig
```typescript
import { defineConfig } from '@ldesign/configmate';

export default defineConfig({
  server: { port: 3000 },
  env: {
    production: { server: { port: 80 } }
  }
});
```

### 5. Flexible API
```typescript
config.get('server.port');          // Get values
config.set('server.port', 8080);   // Set values
config.has('database.url');        // Check existence
config.delete('temp.data');        // Delete values
await config.save();               // Save to file
await config.reload();             // Reload from files
```

## 🚀 Quick Start

### 1. Create a config file

**config/config.ts**
```typescript
import { defineConfig } from '@ldesign/configmate';

export default defineConfig({
  app: {
    name: 'My App',
    port: 3000,
  },
  database: {
    host: 'localhost',
    port: 27017,
  },
  env: {
    production: {
      app: { port: 80 },
      database: { host: 'prod-db.example.com' },
    },
  },
});
```

### 2. Load and use

```typescript
import { createConfig } from '@ldesign/configmate';

const config = await createConfig({
  dir: './config',
  name: 'config',
  watch: true,  // Enable hot-reloading
});

// Use it
const port = config.get('app.port');
const dbHost = config.get('database.host');

// Listen for changes
config.on('change', (changes) => {
  console.log('Config changed:', changes);
});
```

## 📊 Change Detection Details

The change detection system provides granular information:

```typescript
{
  type: 'modified',              // 'added' | 'modified' | 'deleted'
  path: 'server.port',           // Exact field path
  oldValue: 3000,                // Previous value
  newValue: 8080,                // New value
  file: 'config.ts',             // Which file changed
  environment: 'production',     // Which environment
  timestamp: Date                // When it changed
}
```

## 🔧 Configuration Options

```typescript
createConfig({
  dir: './config',               // Config directory
  name: 'config',                // File name (no extension)
  env: 'development',            // Current environment
  envKey: 'NODE_ENV',            // Env variable to read from
  watch: true,                   // Enable file watching
  formats: ['ts', 'js', 'json'], // Supported formats
  mergeStrategy: 'deep',         // Merge strategy
  defaults: {},                  // Default values
  validate: (cfg) => true,       // Validation function
});
```

## 📚 File Naming Patterns

The package automatically discovers and loads:

1. **Base configs**: `config.{ts,js,json,yaml}`
2. **Environment-specific**: `config.{env}.{ext}`
3. **Alternative pattern**: `config.env.{env}.{ext}`

Example:
```
config/
├── config.ts              ← Base config
├── config.development.ts  ← Dev overrides
├── config.production.ts   ← Prod overrides
└── config.test.ts         ← Test overrides
```

## 🧪 Testing

Run the example:
```bash
npm run example
```

Or use in your code:
```bash
npm run build
```

## 📦 Package Info

- **Name**: @ldesign/configmate
- **Version**: 1.0.0
- **License**: MIT
- **Node**: >=14.0.0

## 🔗 Dependencies

### Runtime
- jiti - TypeScript loading without compilation
- chokidar - File watching
- js-yaml - YAML support
- deep-diff - Change detection
- lodash.{get,set,merge} - Object manipulation
- eventemitter3 - Event system

### Optional
- toml - TOML support (install separately)
- ini - INI support (install separately)

## 📝 Notes

1. **TypeScript Native**: Load .ts files directly without pre-compilation
2. **Zero Config**: Works out of the box with defaults
3. **Hot Reload**: Automatically reloads when files change
4. **Type Safe**: Full TypeScript support with inference
5. **Flexible**: Supports multiple file formats and merge strategies

## 🎓 Advanced Features

### Custom Validation
```typescript
const config = await createConfig({
  validate: (cfg) => {
    if (!cfg.server?.port) throw new Error('Port required');
    return true;
  }
});
```

### Change Filtering
```typescript
import { ChangeDetector } from '@ldesign/configmate';

const detector = new ChangeDetector();
const additions = detector.filterByType(changes, 'added');
const serverChanges = detector.filterByPath(changes, /^server\./);
```

### Environment-Specific Loading
```typescript
// Get config for specific environment
const prodConfig = config.getEnv('production');
const devConfig = config.getEnv('development');
```

## 🎉 Ready to Use!

Your configuration management package is fully set up and ready to use. Check the README.md for complete documentation and the examples/ directory for detailed usage examples.