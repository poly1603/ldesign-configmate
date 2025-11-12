import { createConfig, ConfigManager, ConfigChange } from '../src';
import * as path from 'path';

async function main() {
  // Create a config manager instance
  const config = await createConfig({
    dir: __dirname,
    name: 'config',
    env: process.env.NODE_ENV || 'development',
    watch: true, // Enable file watching
    mergeStrategy: 'deep',
    defaults: {
      app: {
        name: 'Default App',
      },
    },
    validate: (cfg) => {
      // Custom validation
      if (!cfg.app?.name) {
        console.error('App name is required');
        return false;
      }
      return true;
    },
  });

  // Get configuration values
  console.log('App name:', config.get('app.name'));
  console.log('Server port:', config.get('server.port', 3000));
  console.log('Database:', config.get('database'));
  
  // Check if a path exists
  if (config.has('redis.host')) {
    console.log('Redis host:', config.get('redis.host'));
  }

  // Modify configuration at runtime
  config.set('server.port', 8080);
  console.log('Updated port:', config.get('server.port'));

  // Listen for configuration changes
  config.on('change', (changes: ConfigChange[]) => {
    console.log('Configuration changed:');
    for (const change of changes) {
      console.log(`  - ${change.type}: ${change.path}`);
      if (change.type === 'modified') {
        console.log(`    Old: ${JSON.stringify(change.oldValue)}`);
        console.log(`    New: ${JSON.stringify(change.newValue)}`);
      }
    }
  });

  // Listen for file-specific events
  config.on('file:modified', (file, changes) => {
    console.log(`File modified: ${file.path}`);
    console.log(`Environment: ${file.environment || 'base'}`);
    console.log(`Changes in this file:`);
    for (const change of changes) {
      console.log(`  - ${change.path}: ${change.oldValue} → ${change.newValue}`);
    }
  });

  config.on('file:added', (file) => {
    console.log(`New config file detected: ${file.path}`);
  });

  config.on('file:deleted', (file) => {
    console.log(`Config file removed: ${file.path}`);
  });

  // Error handling
  config.on('error', (error) => {
    console.error('Configuration error:', error);
  });

  // Get all loaded files
  const files = config.getFiles();
  console.log('Loaded configuration files:');
  for (const file of files) {
    console.log(`  - ${file.path} (${file.format})`);
    if (file.isEnvFile) {
      console.log(`    Environment: ${file.environment}`);
    }
  }

  // Get environment-specific config
  const prodConfig = config.getEnv('production');
  console.log('Production config:', prodConfig);

  // Export configuration as JSON
  const jsonConfig = config.toJSON();
  console.log('Full configuration:', JSON.stringify(jsonConfig, null, 2));

  // Save configuration to file
  await config.save({
    file: path.join(__dirname, 'config.saved.json'),
    format: 'json',
    pretty: true,
  });

  // Manual reload
  await config.reload();

  // Validate configuration
  const isValid = config.validate();
  console.log('Configuration is valid:', isValid);

  // Keep the process running to test file watching
  console.log('\nWatching for configuration changes... (Press Ctrl+C to exit)');
}

// Advanced usage example with custom ConfigManager
async function advancedExample() {
  const manager = new ConfigManager({
    dir: process.cwd(),
    name: 'app',
    formats: ['ts', 'js', 'json', 'yaml'], // Specify format priority
    env: 'production',
    watch: false,
  });

  // Initialize manually
  await manager.init();

  // Use change detector features
  const { ChangeDetector } = await import('../src');
  const detector = new ChangeDetector();

  // Track changes between two config states
  const oldConfig = { server: { port: 3000 } };
  const newConfig = { server: { port: 8080 }, database: { host: 'localhost' } };
  
  const changes = detector.detectChanges(oldConfig, newConfig, 'manual', 'production');
  
  for (const change of changes) {
    console.log(detector.describeChange(change));
  }

  // Filter changes
  const additions = detector.filterByType(changes, 'added');
  const serverChanges = detector.filterByPath(changes, /^server\./);
  
  console.log('Additions:', additions);
  console.log('Server changes:', serverChanges);

  // Group changes
  const byFile = detector.groupByFile(changes);
  const byEnv = detector.groupByEnvironment(changes);
  
  console.log('Changes by file:', byFile);
  console.log('Changes by environment:', byEnv);

  // Cleanup
  manager.destroy();
}

// Run the examples
if (require.main === module) {
  main().catch(console.error);
  
  // Uncomment to run advanced example
  // advancedExample().catch(console.error);
}