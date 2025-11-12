import { defineConfig } from '../src';

export default defineConfig({
  // Base configuration
  app: {
    name: 'My Application',
    version: '1.0.0',
    debug: true,
  },
  
  server: {
    host: 'localhost',
    port: 3000,
    cors: {
      enabled: true,
      origins: ['http://localhost:3000'],
    },
  },
  
  database: {
    type: 'mongodb',
    host: 'localhost',
    port: 27017,
    name: 'myapp_dev',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
  },
  
  logging: {
    level: 'debug',
    format: 'json',
    transports: ['console', 'file'],
  },
  
  // Environment-specific overrides
  env: {
    production: {
      app: {
        debug: false,
      },
      server: {
        host: '0.0.0.0',
        port: 80,
        cors: {
          enabled: true,
          origins: ['https://myapp.com'],
        },
      },
      database: {
        name: 'myapp_prod',
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          ssl: true,
        },
      },
      logging: {
        level: 'info',
        transports: ['file'],
      },
    },
    
    test: {
      server: {
        port: 3001,
      },
      database: {
        name: 'myapp_test',
      },
      logging: {
        level: 'error',
        transports: [],
      },
    },
  },
});