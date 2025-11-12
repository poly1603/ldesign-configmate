# @ldesign/configmate

A powerful Node.js configuration management package with jiti support, multi-environment handling, and real-time change monitoring.

## Features

✨ **Multi-Format Support**: Load configs from TypeScript, JavaScript, JSON, YAML, and more  
🔄 **Environment Management**: Automatic environment-specific configuration merging  
👀 **File Watching**: Real-time monitoring with detailed change detection  
🎯 **Type-Safe**: Full TypeScript support with `defineConfig` helper  
🔍 **Deep Change Detection**: Track exact field changes across environments  
⚡ **Powered by Jiti**: Load TypeScript configs without compilation  
🔧 **Flexible API**: Get, set, delete, and save configurations easily  
📦 **Zero Config**: Works out of the box with sensible defaults

## Installation

```bash
npm install @ldesign/configmate
```

## Quick Start

### 1. Create a config file

**config.ts**
```typescript
import { defineConfig } from '@ldesign/configmate';

export default defineConfig({
  server: {
    host: 'localhost',
    port: 3000,
  },
  database: {
    host: 'localhost',
    port: 27017,
  },
  env: {
    production: {
      server: {
        host: '0.0.0.0',
        port: 80,
      },
    },
  },
});
```

### 2. Load and use the config

```typescript
import { createConfig } from '@ldesign/configmate';

const config = await createConfig({
  dir: './config',
  name: 'config',
  env: process.env.NODE_ENV || 'development',
});

console.log(config.get('server.port')); // 3000
console.log(config.get('database.host')); // localhost
```

## API Reference

### `createConfig(options?)`

Create and initialize a config manager instance.

```typescript
const config = await createConfig({
  dir: './config',           // Config directory
  name: 'config',            // Config file name (without extension)
  env: 'development',        // Current environment
  watch: true,               // Enable file watching
  formats: ['ts', 'js', 'json', 'yaml'],  // File formats to support
  mergeStrategy: 'deep',     // 'deep' | 'shallow' | 'replace'
  defaults: {},              // Default configuration
  validate: (cfg) => true,   // Validation function
});
```

### `defineConfig(config)`

Define configuration with TypeScript support.

```typescript
export default defineConfig({
  app: { name: 'MyApp' },
  env: {
    production: { app: { name: 'MyApp-Prod' } },
  },
});
```

### Configuration Methods

#### `get(path?, defaultValue?)`

Get a configuration value.

```typescript
config.get();                          // Get entire config
config.get('server.port');             // Get nested value
config.get('missing.key', 'default');  // With default value
```

#### `set(path, value)`

Set a configuration value at runtime.

```typescript
config.set('server.port', 8080);
config.set('new.nested.key', { foo: 'bar' });
```

#### `has(path)`

Check if a configuration path exists.

```typescript
if (config.has('database.url')) {
  console.log('Database URL is configured');
}
```

#### `delete(path)`

Delete a configuration value.

```typescript
config.delete('server.debug');
```

#### `save(options?)`

Save configuration to file.

```typescript
await config.save({
  file: './config/config.json',
  format: 'json',
  pretty: true,
});
```

#### `reload()`

Manually reload configuration from files.

```typescript
await config.reload();
```

#### `getEnv(env)`

Get configuration for a specific environment.

```typescript
const prodConfig = config.getEnv('production');
```

#### `getFiles()`

Get all loaded configuration files.

```typescript
const files = config.getFiles();
files.forEach(file => {
  console.log(file.path, file.format, file.environment);
});
```

#### `toJSON()`

Export configuration as JSON.

```typescript
const json = config.toJSON();
```

### Event Listening

Listen for configuration changes.

```typescript
// Listen for any configuration change
config.on('change', (changes) => {
  changes.forEach(change => {
    console.log(`${change.type}: ${change.path}`);
    console.log(`File: ${change.file}`);
    console.log(`Environment: ${change.environment}`);
    console.log(`Old: ${change.oldValue} -> New: ${change.newValue}`);
  });
});

// Listen for file-specific changes
config.on('file:modified', (file, changes) => {
  console.log(`File ${file.path} was modified`);
  console.log(`Changes:`, changes);
});

config.on('file:added', (file) => {
  console.log(`New config file: ${file.path}`);
});

config.on('file:deleted', (file) => {
  console.log(`Config file removed: ${file.path}`);
});

// Handle errors
config.on('error', (error) => {
  console.error('Config error:', error);
});
```

## File Naming Conventions

ConfigMate supports multiple naming patterns for environment-specific configs:

- `config.ts` - Base configuration
- `config.development.ts` - Environment-specific config
- `config.env.development.ts` - Alternative pattern
- `config.json` - JSON format
- `config.yaml` - YAML format

All files are loaded and merged in order:
1. Base config files (e.g., `config.ts`)
2. Environment-specific files (e.g., `config.development.ts`)

## Environment Configuration

### Inline Environment Overrides

```typescript
export default defineConfig({
  server: { port: 3000 },
  
  env: {
    development: {
      server: { port: 3000 },
    },
    production: {
      server: { port: 80 },
    },
    test: {
      server: { port: 3001 },
    },
  },
});
```

### Separate Environment Files

**config.ts**
```typescript
export default {
  server: { host: 'localhost', port: 3000 },
};
```

**config.production.ts**
```typescript
export default {
  server: { host: '0.0.0.0', port: 80 },
};
```

## Supported File Formats

### TypeScript/JavaScript

```typescript
// config.ts
import { defineConfig } from '@ldesign/configmate';

export default defineConfig({
  app: { name: 'MyApp' },
});
```

### JSON

```json
{
  "app": {
    "name": "MyApp"
  }
}
```

### YAML

```yaml
app:
  name: MyApp
  version: 1.0.0
```

### TOML (optional)

Install `toml` package:
```bash
npm install toml
```

```toml
[app]
name = "MyApp"
version = "1.0.0"
```

## Advanced Usage

### Custom Validation

```typescript
const config = await createConfig({
  validate: (cfg) => {
    if (!cfg.server?.port) {
      throw new Error('Server port is required');
    }
    if (cfg.server.port < 1024) {
      console.warn('Using privileged port');
    }
    return true;
  },
});
```

### Change Detection

```typescript
import { ChangeDetector } from '@ldesign/configmate';

const detector = new ChangeDetector();

const oldConfig = { server: { port: 3000 } };
const newConfig = { server: { port: 8080 } };

const changes = detector.detectChanges(
  oldConfig,
  newConfig,
  'config.ts',
  'production'
);

// Filter changes
const serverChanges = detector.filterByPath(changes, /^server\./);
const additions = detector.filterByType(changes, 'added');

// Describe changes
changes.forEach(change => {
  console.log(detector.describeChange(change));
});
```

### Merge Strategies

```typescript
// Deep merge (default)
const config = await createConfig({
  mergeStrategy: 'deep',
});

// Shallow merge
const config = await createConfig({
  mergeStrategy: 'shallow',
});

// Replace (no merge)
const config = await createConfig({
  mergeStrategy: 'replace',
});
```

### Manual Instance Management

```typescript
import { ConfigManager } from '@ldesign/configmate';

const manager = new ConfigManager({
  dir: './config',
  name: 'app',
});

await manager.init();

// Use the manager
const port = manager.get('server.port');

// Watch for changes
manager.startWatching();

// Stop watching
manager.stopWatching();

// Cleanup
manager.destroy();
```

## Examples

See the `examples` directory for complete examples:

- Basic usage
- TypeScript config
- JSON config
- YAML config

## TypeScript Support

Full TypeScript support with type inference:

```typescript
interface MyConfig {
  server: {
    host: string;
    port: number;
  };
  database: {
    url: string;
  };
}

const config = await createConfig<MyConfig>({
  dir: './config',
});

// Type-safe access
const port: number = config.get('server.port');
```

## License

MIT © LDesign Team