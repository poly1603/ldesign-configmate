import { defineConfig } from '../src';

/**
 * Example configuration with environment variable resolution
 * 
 * Use ${VAR_NAME} to reference environment variables
 * Use ${VAR_NAME:default} to provide a default value
 */
export default defineConfig({
  app: {
    name: 'ConfigMate Example',
    version: '1.0.0',
    env: '${NODE_ENV:development}',
  },
  
  server: {
    host: '${SERVER_HOST:localhost}',
    port: '${SERVER_PORT:3000}',
    ssl: {
      enabled: '${SSL_ENABLED:false}',
      cert: '${SSL_CERT_PATH:/etc/ssl/cert.pem}',
      key: '${SSL_KEY_PATH:/etc/ssl/key.pem}',
    },
  },
  
  database: {
    // Use DATABASE_URL from environment, no default
    url: '${DATABASE_URL}',
    
    // With defaults
    host: '${DB_HOST:localhost}',
    port: '${DB_PORT:5432}',
    name: '${DB_NAME:myapp}',
    username: '${DB_USER:admin}',
    password: '${DB_PASSWORD}',
    
    pool: {
      min: '${DB_POOL_MIN:2}',
      max: '${DB_POOL_MAX:10}',
    },
  },
  
  cache: {
    redis: {
      host: '${REDIS_HOST:localhost}',
      port: '${REDIS_PORT:6379}',
      password: '${REDIS_PASSWORD}',
      db: '${REDIS_DB:0}',
    },
  },
  
  logging: {
    level: '${LOG_LEVEL:info}',
    format: '${LOG_FORMAT:json}',
    file: '${LOG_FILE:./logs/app.log}',
  },
  
  security: {
    jwtSecret: '${JWT_SECRET}',
    apiKey: '${API_KEY}',
    encryptionKey: '${ENCRYPTION_KEY}',
  },
  
  features: {
    enableCache: '${FEATURE_CACHE:true}',
    enableMetrics: '${FEATURE_METRICS:false}',
    maxUploadSize: '${MAX_UPLOAD_SIZE:10485760}', // 10MB default
  },
  
  // Environment-specific overrides
  env: {
    development: {
      logging: {
        level: 'debug',
      },
    },
    
    production: {
      server: {
        host: '0.0.0.0',
      },
      logging: {
        level: 'warn',
      },
    },
    
    test: {
      database: {
        name: 'myapp_test',
      },
      logging: {
        level: 'error',
      },
    },
  },
});
