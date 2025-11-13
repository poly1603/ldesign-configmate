/**
 * Error recovery and resilience utilities
 */

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  private defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000,
    shouldRetry: (error: Error, attempt: number) => attempt < 3,
  };

  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error;
    let delay = opts.delay;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError, attempt)) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        await this.sleep(Math.min(delay, opts.maxDelay));
        delay *= opts.backoffMultiplier;
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  
  constructor(private options: Required<CircuitBreakerOptions>) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Graceful degradation manager
 */
export class GracefulDegradation {
  private fallbackStrategies = new Map<string, () => any>();
  private healthChecks = new Map<string, () => Promise<boolean>>();

  /**
   * Register a fallback strategy for a service
   */
  registerFallback(service: string, fallback: () => any): void {
    this.fallbackStrategies.set(service, fallback);
  }

  /**
   * Register a health check for a service
   */
  registerHealthCheck(service: string, healthCheck: () => Promise<boolean>): void {
    this.healthChecks.set(service, healthCheck);
  }

  /**
   * Execute operation with fallback
   */
  async executeWithFallback<T>(
    service: string,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      // Check service health first
      const healthCheck = this.healthChecks.get(service);
      if (healthCheck && !(await healthCheck())) {
        throw new Error(`Service ${service} is unhealthy`);
      }

      return await operation();
    } catch (error) {
      console.warn(`Service ${service} failed, using fallback:`, error);
      
      const fallback = this.fallbackStrategies.get(service);
      if (fallback) {
        return fallback();
      }
      
      throw error;
    }
  }
}

/**
 * Error context collector for better debugging
 */
export class ErrorContext {
  private context: Map<string, any> = new Map();

  set(key: string, value: any): void {
    this.context.set(key, value);
  }

  get(key: string): any {
    return this.context.get(key);
  }

  getAll(): Record<string, any> {
    return Object.fromEntries(this.context);
  }

  clear(): void {
    this.context.clear();
  }

  /**
   * Wrap an error with additional context
   */
  wrapError(error: Error, additionalContext?: Record<string, any>): Error {
    const context = { ...this.getAll(), ...additionalContext };
    const wrappedError = new Error(`${error.message}\nContext: ${JSON.stringify(context, null, 2)}`);
    wrappedError.stack = error.stack;
    return wrappedError;
  }
}

/**
 * Configuration recovery manager
 */
export class ConfigRecoveryManager {
  private retryManager = new RetryManager();
  private circuitBreaker: CircuitBreaker;
  private degradation = new GracefulDegradation();
  private errorContext = new ErrorContext();
  private lastKnownGoodConfig?: any;

  constructor(circuitBreakerOptions?: CircuitBreakerOptions) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 60000,
      ...circuitBreakerOptions,
    });

    // Register default fallback strategies
    this.degradation.registerFallback('config-load', () => {
      if (this.lastKnownGoodConfig) {
        console.warn('Using last known good configuration');
        return this.lastKnownGoodConfig;
      }
      throw new Error('No fallback configuration available');
    });
  }

  /**
   * Load configuration with recovery mechanisms
   */
  async loadConfigWithRecovery(
    loader: () => Promise<any>,
    retryOptions?: RetryOptions
  ): Promise<any> {
    this.errorContext.set('operation', 'config-load');
    this.errorContext.set('timestamp', new Date().toISOString());

    try {
      const config = await this.degradation.executeWithFallback(
        'config-load',
        () => this.circuitBreaker.execute(
          () => this.retryManager.execute(loader, {
            shouldRetry: (error, attempt) => {
              // Don't retry on syntax errors
              if (error.message.includes('SyntaxError') || error.message.includes('parse')) {
                return false;
              }
              return attempt < 3;
            },
            ...retryOptions,
          })
        )
      );

      // Store as last known good config
      this.lastKnownGoodConfig = config;
      return config;
    } catch (error) {
      throw this.errorContext.wrapError(error as Error, {
        circuitBreakerState: this.circuitBreaker.getState(),
      });
    } finally {
      this.errorContext.clear();
    }
  }

  /**
   * Set last known good configuration
   */
  setLastKnownGoodConfig(config: any): void {
    this.lastKnownGoodConfig = config;
  }

  /**
   * Get recovery statistics
   */
  getStats(): {
    circuitBreakerState: string;
    hasLastKnownGoodConfig: boolean;
  } {
    return {
      circuitBreakerState: this.circuitBreaker.getState(),
      hasLastKnownGoodConfig: !!this.lastKnownGoodConfig,
    };
  }

  /**
   * Reset all recovery mechanisms
   */
  reset(): void {
    this.circuitBreaker.reset();
    this.errorContext.clear();
    this.lastKnownGoodConfig = undefined;
  }
}
