/**
 * Enhanced ConfigMate usage example showcasing v1.2.0 features
 */
import { 
  createConfig, 
  EnhancedCache,
  ConfigRecoveryManager,
  RetryManager,
  CircuitBreaker,
  setPath,
  getPath,
  mergeDeep
} from '../src';

// Define configuration interface for type safety
interface AppConfig {
  server: {
    port: number;
    host: string;
    ssl: boolean;
  };
  database: {
    url: string;
    maxConnections: number;
    timeout: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
  features: {
    analytics: boolean;
    logging: boolean;
  };
}

async function enhancedConfigExample() {
  console.log('🚀 ConfigMate v1.2.0 Enhanced Features Demo\n');

  // 1. Type-safe configuration with generics
  console.log('1. Creating type-safe configuration...');
  const config = await createConfig<AppConfig>({
    dir: __dirname,
    name: 'config',
    env: process.env.NODE_ENV || 'development',
    
    // Enhanced options
    resolveEnv: true,
    cache: true,
    cacheTTL: 300000, // 5 minutes
    debounceDelay: 500,
    autoSnapshot: true,
    maxSnapshots: 10,
    
    // Error recovery options
    defaults: {
      server: { port: 3000, host: 'localhost', ssl: false },
      database: { url: 'mongodb://localhost:27017/app', maxConnections: 10, timeout: 5000 },
      cache: { enabled: true, ttl: 3600 },
      features: { analytics: false, logging: true }
    }
  });

  // Type-safe access with full IntelliSense
  const port: number = config.get('server.port');
  const dbUrl: string = config.get('database.url');
  console.log(`✅ Server will run on ${config.get('server.host')}:${port}`);
  console.log(`✅ Database URL: ${dbUrl}\n`);

  // 2. Enhanced caching demonstration
  console.log('2. Enhanced caching system...');
  const enhancedCache = new EnhancedCache<string, any>({
    maxSize: 1000,
    ttl: 60000, // 1 minute
    maxMemory: 10 * 1024 * 1024, // 10MB
    onEvict: (key, entry) => {
      console.log(`🗑️  Evicted cache entry: ${key} (accessed ${entry.accessCount} times)`);
    }
  });

  // Cache some configuration data
  enhancedCache.set('user-preferences', { theme: 'dark', language: 'en' });
  enhancedCache.set('feature-flags', { newUI: true, betaFeatures: false });

  // Get cache statistics
  const cacheStats = enhancedCache.getStats();
  console.log(`📊 Cache stats: ${cacheStats.size} items, ${cacheStats.memoryUsage} bytes used`);
  console.log(`📈 Hit rate: ${(cacheStats.hitRate * 100).toFixed(2)}%\n`);

  // 3. Error recovery and resilience
  console.log('3. Error recovery mechanisms...');
  
  const recoveryManager = new ConfigRecoveryManager({
    failureThreshold: 3,
    resetTimeout: 30000
  });

  // Set a known good configuration
  recoveryManager.setLastKnownGoodConfig(config.toJSON());

  // Simulate loading configuration with potential failures
  const loadConfigWithRetry = async () => {
    return recoveryManager.loadConfigWithRecovery(
      async () => {
        // Simulate occasional failures
        if (Math.random() < 0.3) {
          throw new Error('Network timeout');
        }
        return { loaded: true, timestamp: Date.now() };
      },
      {
        maxAttempts: 3,
        delay: 1000,
        backoffMultiplier: 2
      }
    );
  };

  try {
    const result = await loadConfigWithRetry();
    console.log('✅ Configuration loaded successfully:', result);
  } catch (error) {
    console.log('❌ Failed to load configuration, using fallback');
  }

  const recoveryStats = recoveryManager.getStats();
  console.log(`🛡️  Circuit breaker state: ${recoveryStats.circuitBreakerState}`);
  console.log(`💾 Has fallback config: ${recoveryStats.hasLastKnownGoodConfig}\n`);

  // 4. Safe object operations
  console.log('4. Safe object operations...');
  
  const originalConfig = {
    server: { port: 3000 },
    database: { host: 'localhost' }
  };

  // Safe operations that prevent prototype pollution
  const updatedConfig = setPath(originalConfig, 'server.ssl', true);
  const dbHost = getPath(updatedConfig, 'database.host', 'default-host');
  
  console.log('✅ Original config unchanged:', originalConfig);
  console.log('✅ Updated config:', updatedConfig);
  console.log(`✅ Database host: ${dbHost}\n`);

  // 5. Configuration snapshots and rollback
  console.log('5. Configuration snapshots...');
  
  // Create a snapshot before making changes
  const snapshot = config.snapshot('before-changes', 'Before updating server settings');
  console.log('📸 Created snapshot:', snapshot.id);

  // Make some changes
  config.set('server.port', 8080);
  config.set('server.ssl', true);
  console.log('🔧 Updated server settings');

  // List all snapshots
  const snapshots = config.listSnapshots();
  console.log('📋 Available snapshots:', snapshots);

  // Rollback to previous state
  config.rollback('before-changes');
  console.log('⏪ Rolled back to previous configuration');
  console.log(`✅ Server port restored to: ${config.get('server.port')}\n`);

  // 6. Advanced retry and circuit breaker patterns
  console.log('6. Advanced resilience patterns...');
  
  const retryManager = new RetryManager();
  const circuitBreaker = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeout: 5000
  });

  // Simulate external service calls with retry and circuit breaker
  const callExternalService = async () => {
    return circuitBreaker.execute(async () => {
      return retryManager.execute(async () => {
        // Simulate service that fails sometimes
        if (Math.random() < 0.4) {
          throw new Error('Service unavailable');
        }
        return { status: 'success', data: 'External service response' };
      }, {
        maxAttempts: 2,
        delay: 500
      });
    });
  };

  for (let i = 0; i < 5; i++) {
    try {
      const result = await callExternalService();
      console.log(`✅ Call ${i + 1}: ${result.status}`);
    } catch (error) {
      console.log(`❌ Call ${i + 1}: ${error.message}`);
    }
  }

  console.log(`🔄 Circuit breaker final state: ${circuitBreaker.getState()}\n`);

  // 7. Performance monitoring
  console.log('7. Performance monitoring...');
  
  const startTime = process.hrtime.bigint();
  
  // Perform multiple configuration operations
  for (let i = 0; i < 1000; i++) {
    config.get('server.port');
    config.has('database.url');
  }
  
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  
  console.log(`⚡ Performed 2000 operations in ${duration.toFixed(2)}ms`);
  console.log(`📊 Average: ${(duration / 2000).toFixed(4)}ms per operation\n`);

  // 8. Configuration merging and transformation
  console.log('8. Configuration merging...');
  
  const baseConfig = {
    server: { port: 3000, host: 'localhost' },
    features: { logging: true }
  };
  
  const environmentConfig = {
    server: { port: 8080, ssl: true },
    features: { analytics: true },
    database: { url: 'prod-db-url' }
  };
  
  const mergedConfig = mergeDeep(baseConfig, environmentConfig);
  console.log('🔀 Merged configuration:', JSON.stringify(mergedConfig, null, 2));

  // 9. Event handling and monitoring
  console.log('\n9. Event monitoring...');
  
  let changeCount = 0;
  config.on('change', (changes) => {
    changeCount += changes.length;
    console.log(`📝 Configuration changed: ${changes.length} changes detected`);
  });

  config.on('file:modified', (file, changes) => {
    console.log(`📄 File modified: ${file.path} (${changes.length} changes)`);
  });

  // Trigger some changes
  config.set('features.newFeature', true);
  config.set('server.maxConnections', 100);
  
  console.log(`📊 Total changes tracked: ${changeCount}\n`);

  // 10. Cleanup and final statistics
  console.log('10. Final statistics and cleanup...');
  
  const finalStats = {
    configSize: Object.keys(config.toJSON()).length,
    cacheSize: enhancedCache.size(),
    cacheHitRate: enhancedCache.getStats().hitRate,
    snapshotCount: config.listSnapshots().length,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
  };
  
  console.log('📈 Final Statistics:');
  console.log(`   Config keys: ${finalStats.configSize}`);
  console.log(`   Cache entries: ${finalStats.cacheSize}`);
  console.log(`   Cache hit rate: ${(finalStats.cacheHitRate * 100).toFixed(2)}%`);
  console.log(`   Snapshots: ${finalStats.snapshotCount}`);
  console.log(`   Memory usage: ${finalStats.memoryUsage.toFixed(2)} MB`);

  // Cleanup
  enhancedCache.clear();
  config.destroy();
  
  console.log('\n🎉 Enhanced ConfigMate demo completed successfully!');
}

// Error handling wrapper
async function runDemo() {
  try {
    await enhancedConfigExample();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo();
}

export { enhancedConfigExample };
