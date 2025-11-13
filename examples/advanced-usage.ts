import { createConfig, EnvResolver, SnapshotManager } from '../src';

async function main() {
  console.log('=== ConfigMate Advanced Features Demo ===\n');

  // 1. Environment Variable Resolution
  console.log('1. Environment Variable Resolution:');
  console.log('-----------------------------------');
  
  // Set some test environment variables
  process.env.DATABASE_HOST = 'prod-db.example.com';
  process.env.DATABASE_PORT = '5432';
  process.env.API_KEY = 'secret-key-12345';

  const config = await createConfig({
    dir: __dirname,
    name: 'config',
    resolveEnv: true, // Enable environment variable resolution
    envResolver: {
      strict: false,  // Don't throw error for missing variables
      warn: true,     // Warn about missing variables
    },
  });

  console.log('Config with env vars resolved:');
  console.log('- Database host:', config.get('database.host'));
  console.log('- Database port:', config.get('database.port'));
  console.log('- API URL:', config.get('api.url'));
  console.log();

  // 2. Configuration Caching
  console.log('2. Configuration Caching:');
  console.log('------------------------');
  
  const cachedConfig = await createConfig({
    dir: __dirname,
    name: 'config',
    cache: true,
    cacheTTL: 60000, // Cache for 60 seconds
  });

  const cacheStats = cachedConfig.getCacheStats();
  console.log('Cache statistics:', cacheStats);
  console.log();

  // 3. Configuration Snapshots
  console.log('3. Configuration Snapshots:');
  console.log('--------------------------');
  
  const snapshotConfig = await createConfig({
    dir: __dirname,
    name: 'config',
    autoSnapshot: true, // Automatically create snapshots on changes
    maxSnapshots: 10,
  });

  // Create a manual snapshot
  const snapshot1 = snapshotConfig.snapshot('before-changes', 'Snapshot before modifications');
  console.log('Created snapshot:', snapshot1?.id);

  // Modify configuration
  snapshotConfig.set('server.port', 9000);
  console.log('Modified server.port to 9000');

  // Create another snapshot
  const snapshot2 = snapshotConfig.snapshot('after-changes', 'Snapshot after modifications');
  console.log('Created snapshot:', snapshot2?.id);

  // List all snapshots
  const snapshots = snapshotConfig.listSnapshots();
  console.log('All snapshots:', snapshots);

  // Rollback to first snapshot
  console.log('Rolling back to snapshot:', snapshot1?.id);
  snapshotConfig.rollback(snapshot1!.id);
  console.log('Server port after rollback:', snapshotConfig.get('server.port'));
  console.log();

  // 4. Debounced File Watching
  console.log('4. Debounced File Watching:');
  console.log('---------------------------');
  
  const debouncedConfig = await createConfig({
    dir: __dirname,
    name: 'config',
    watch: true,
    debounceDelay: 500, // Wait 500ms before reloading
  });

  console.log('File watching with 500ms debounce enabled');
  console.log('Multiple rapid file changes will be batched together');
  console.log();

  // 5. Custom Error Handling
  console.log('5. Custom Error Handling:');
  console.log('------------------------');
  
  try {
    const strictConfig = await createConfig({
      dir: __dirname,
      name: 'non-existent',
      resolveEnv: true,
      envResolver: {
        strict: true, // Throw error for missing variables
      },
    });
  } catch (error: any) {
    console.log('Caught error:', error.name);
    console.log('Error message:', error.message);
    if (error.code) {
      console.log('Error code:', error.code);
    }
  }
  console.log();

  // 6. Cache Management
  console.log('6. Cache Management:');
  console.log('-------------------');
  
  console.log('Cache stats before clear:', cachedConfig.getCacheStats());
  cachedConfig.clearCache();
  console.log('Cache stats after clear:', cachedConfig.getCacheStats());
  console.log();

  // 7. Advanced Environment Variable Resolution
  console.log('7. Advanced Environment Variable Resolution:');
  console.log('--------------------------------------------');
  
  const resolver = new EnvResolver({
    strict: false,
    prefix: 'APP_', // Look for APP_* variables
  });

  const testConfig = {
    database: {
      url: '${DATABASE_URL:mongodb://localhost:27017}',
      maxConnections: '${MAX_CONNECTIONS:100}',
    },
    api: {
      key: '${API_KEY}',
      timeout: '${API_TIMEOUT:5000}',
    },
  };

  console.log('Original config:', JSON.stringify(testConfig, null, 2));
  const resolved = resolver.resolve(testConfig);
  console.log('Resolved config:', JSON.stringify(resolved, null, 2));

  // Extract environment variables used
  const envVars = resolver.extractEnvVars(testConfig);
  console.log('Environment variables used:', envVars);

  // Validate environment variables
  const validation = resolver.validate(testConfig);
  console.log('Validation result:', validation);
  console.log();

  // 8. Snapshot Comparison
  console.log('8. Snapshot Comparison:');
  console.log('----------------------');
  
  const snapshotMgr = new SnapshotManager();
  const config1 = { server: { port: 3000 }, database: { host: 'localhost' } };
  const config2 = { server: { port: 8080 }, database: { host: 'localhost' } };

  snapshotMgr.create('config1', config1, 'First configuration');
  snapshotMgr.create('config2', config2, 'Second configuration');

  const comparison = snapshotMgr.compare('config1', 'config2');
  console.log('Snapshots identical:', comparison.identical);
  console.log('Snapshot 1:', JSON.stringify(comparison.snapshot1?.config, null, 2));
  console.log('Snapshot 2:', JSON.stringify(comparison.snapshot2?.config, null, 2));
  console.log();

  // 9. Configuration Events with New Features
  console.log('9. Configuration Events:');
  console.log('-----------------------');
  
  const eventConfig = await createConfig({
    dir: __dirname,
    name: 'config',
    watch: false,
  });

  eventConfig.on('change', (changes) => {
    console.log(`Configuration changed: ${changes.length} changes detected`);
    changes.forEach(change => {
      console.log(`  - ${change.type}: ${change.path}`);
    });
  });

  eventConfig.set('newProperty', 'newValue');
  eventConfig.delete('newProperty');
  console.log();

  // Cleanup
  console.log('Cleaning up...');
  snapshotConfig.destroy();
  debouncedConfig.destroy();
  eventConfig.destroy();
  
  console.log('\n=== Demo Complete ===');
}

// Advanced snapshot management example
async function snapshotManagementExample() {
  console.log('\n=== Snapshot Management Example ===\n');

  const config = await createConfig({
    dir: __dirname,
    name: 'config',
    autoSnapshot: false,
  });

  // Create snapshots at different points
  config.snapshot('initial', 'Initial configuration');

  config.set('feature.enabled', true);
  config.snapshot('feature-enabled', 'After enabling feature');

  config.set('feature.options.level', 5);
  config.snapshot('feature-configured', 'After configuring feature');

  // List all snapshots
  const snapshots = config.listSnapshots();
  console.log('Available snapshots:', snapshots);

  // Get snapshot details
  snapshots.forEach(id => {
    const snapshot = config.getSnapshot(id);
    if (snapshot) {
      console.log(`\nSnapshot: ${snapshot.id}`);
      console.log(`Description: ${snapshot.description}`);
      console.log(`Timestamp: ${snapshot.timestamp}`);
      console.log(`Config:`, JSON.stringify(snapshot.config, null, 2));
    }
  });

  // Rollback to a specific point
  console.log('\nRolling back to "feature-enabled"...');
  config.rollback('feature-enabled');
  console.log('Current config:', config.toJSON());

  config.destroy();
}

// Environment variable resolution example
async function envResolutionExample() {
  console.log('\n=== Environment Variable Resolution Example ===\n');

  // Set up test environment
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = 'postgresql://prod-db:5432/myapp';
  process.env.REDIS_HOST = 'redis.example.com';
  process.env.LOG_LEVEL = 'info';

  const configData = {
    app: {
      name: 'MyApp',
      env: '${NODE_ENV:development}',
    },
    database: {
      url: '${DATABASE_URL}',
      pool: {
        min: '${DB_POOL_MIN:5}',
        max: '${DB_POOL_MAX:20}',
      },
    },
    cache: {
      redis: {
        host: '${REDIS_HOST:localhost}',
        port: '${REDIS_PORT:6379}',
      },
    },
    logging: {
      level: '${LOG_LEVEL:debug}',
      format: '${LOG_FORMAT:json}',
    },
  };

  const resolver = new EnvResolver({ strict: false, warn: true });
  
  console.log('Original config with env variables:');
  console.log(JSON.stringify(configData, null, 2));
  
  console.log('\nResolved config:');
  const resolved = resolver.resolve(configData);
  console.log(JSON.stringify(resolved, null, 2));

  console.log('\nEnvironment variables used:');
  console.log(resolver.extractEnvVars(configData));

  console.log('\nValidation:');
  console.log(resolver.validate(configData));
}

// Run examples
if (require.main === module) {
  main()
    .then(() => snapshotManagementExample())
    .then(() => envResolutionExample())
    .catch(console.error);
}
