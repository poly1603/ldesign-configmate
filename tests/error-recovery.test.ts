import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  RetryManager, 
  CircuitBreaker, 
  GracefulDegradation, 
  ConfigRecoveryManager 
} from '../src/utils/error-recovery';

describe('Error Recovery', () => {
  describe('RetryManager', () => {
    let retryManager: RetryManager;

    beforeEach(() => {
      retryManager = new RetryManager();
    });

    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await retryManager.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');
      
      const result = await retryManager.execute(operation, { maxAttempts: 3 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('persistent failure'));
      
      await expect(
        retryManager.execute(operation, { maxAttempts: 2 })
      ).rejects.toThrow('persistent failure');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect shouldRetry condition', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('SyntaxError: invalid'));
      
      await expect(
        retryManager.execute(operation, {
          maxAttempts: 3,
          shouldRetry: (error) => !error.message.includes('SyntaxError')
        })
      ).rejects.toThrow('SyntaxError: invalid');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 5000
      });
    });

    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should open after failure threshold', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // First failure
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('CLOSED');
      
      // Second failure - should open
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reject immediately when OPEN', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Trigger failures to open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Should reject immediately without calling operation
      const newOperation = vi.fn();
      await expect(circuitBreaker.execute(newOperation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(newOperation).not.toHaveBeenCalled();
    });

    it('should reset after timeout', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Open the circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Wait for reset timeout (simulate)
      vi.useFakeTimers();
      vi.advanceTimersByTime(1001);
      
      // Next call should transition to HALF_OPEN
      const successOperation = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(successOperation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      
      vi.useRealTimers();
    });
  });

  describe('GracefulDegradation', () => {
    let degradation: GracefulDegradation;

    beforeEach(() => {
      degradation = new GracefulDegradation();
    });

    it('should execute operation when service is healthy', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await degradation.executeWithFallback('test-service', operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use fallback when operation fails', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('service failure'));
      const fallback = vi.fn().mockReturnValue('fallback-result');
      
      degradation.registerFallback('test-service', fallback);
      
      const result = await degradation.executeWithFallback('test-service', operation);
      
      expect(result).toBe('fallback-result');
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should check health before executing operation', async () => {
      const healthCheck = vi.fn().mockResolvedValue(false);
      const operation = vi.fn().mockResolvedValue('success');
      const fallback = vi.fn().mockReturnValue('fallback-result');
      
      degradation.registerHealthCheck('test-service', healthCheck);
      degradation.registerFallback('test-service', fallback);
      
      const result = await degradation.executeWithFallback('test-service', operation);
      
      expect(result).toBe('fallback-result');
      expect(healthCheck).toHaveBeenCalledTimes(1);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should throw error when no fallback is registered', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('service failure'));
      
      await expect(
        degradation.executeWithFallback('test-service', operation)
      ).rejects.toThrow('service failure');
    });
  });

  describe('ConfigRecoveryManager', () => {
    let recoveryManager: ConfigRecoveryManager;

    beforeEach(() => {
      recoveryManager = new ConfigRecoveryManager();
    });

    it('should load config successfully', async () => {
      const loader = vi.fn().mockResolvedValue({ key: 'value' });
      
      const result = await recoveryManager.loadConfigWithRecovery(loader);
      
      expect(result).toEqual({ key: 'value' });
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should use last known good config as fallback', async () => {
      const goodConfig = { key: 'good-value' };
      recoveryManager.setLastKnownGoodConfig(goodConfig);
      
      const loader = vi.fn().mockRejectedValue(new Error('load failure'));
      
      const result = await recoveryManager.loadConfigWithRecovery(loader);
      
      expect(result).toEqual(goodConfig);
    });

    it('should not retry on syntax errors', async () => {
      // Don't set any fallback config for this test
      const recoveryManager = new ConfigRecoveryManager();
      const loader = vi.fn().mockRejectedValue(new Error('SyntaxError: invalid JSON'));
      
      await expect(
        recoveryManager.loadConfigWithRecovery(loader)
      ).rejects.toThrow();
      
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should provide recovery statistics', () => {
      const stats = recoveryManager.getStats();
      
      expect(stats).toHaveProperty('circuitBreakerState');
      expect(stats).toHaveProperty('hasLastKnownGoodConfig');
      expect(typeof stats.circuitBreakerState).toBe('string');
      expect(typeof stats.hasLastKnownGoodConfig).toBe('boolean');
    });

    it('should reset all recovery mechanisms', () => {
      recoveryManager.setLastKnownGoodConfig({ key: 'value' });
      
      recoveryManager.reset();
      
      const stats = recoveryManager.getStats();
      expect(stats.hasLastKnownGoodConfig).toBe(false);
      expect(stats.circuitBreakerState).toBe('CLOSED');
    });
  });
});
