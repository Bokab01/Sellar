/**
 * Network Retry Mechanisms with Exponential Backoff
 * Handles network failures, offline scenarios, and automatic retries
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { logSuspiciousActivity } from './securityLogger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  enableJitter: boolean;
  timeoutMs: number;
  retryableErrors: string[];
  enableLogging: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  wasRetried: boolean;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWifiEnabled: boolean;
  strength: number | null;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
  enableJitter: true,
  timeoutMs: 30000, // 30 seconds
  retryableErrors: [
    'NetworkError',
    'TimeoutError',
    'ConnectionError',
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'fetch failed',
    'network request failed',
  ],
  enableLogging: true,
};

/**
 * Advanced Network Retry Manager
 */
export class NetworkRetryManager {
  private config: RetryConfig;
  private networkStatus: NetworkStatus | null = null;
  private retryQueues: Map<string, Array<() => Promise<any>>> = new Map();
  private isProcessingQueue = false;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeNetworkMonitoring();
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context: string = 'unknown'
  ): Promise<RetryResult<T>> {
    const fullConfig = { ...this.config, ...config };
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
      try {
        // Check network connectivity before attempting
        if (!(await this.isNetworkAvailable())) {
          throw new Error('No network connection available');
        }

        // Add timeout wrapper
        const result = await this.withTimeout(operation(), fullConfig.timeoutMs);
        
        const totalTime = Date.now() - startTime;
        
        if (fullConfig.enableLogging && attempt > 1) {
          console.log(`✅ Operation succeeded after ${attempt} attempts (${totalTime}ms): ${context}`);
        }

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime,
          wasRetried: attempt > 1,
        };
      } catch (error: any) {
        lastError = error;
        
        if (fullConfig.enableLogging) {
          console.warn(`❌ Attempt ${attempt}/${fullConfig.maxAttempts} failed: ${error.message} (${context})`);
        }

        // Check if error is retryable
        if (!this.isRetryableError(error, fullConfig.retryableErrors)) {
          if (fullConfig.enableLogging) {
            console.log(`🚫 Non-retryable error, stopping attempts: ${error.message}`);
          }
          break;
        }

        // Don't wait after the last attempt
        if (attempt < fullConfig.maxAttempts) {
          const delay = this.calculateDelay(attempt, fullConfig);
          if (fullConfig.enableLogging) {
            console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}...`);
          }
          await this.sleep(delay);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    
    // Log suspicious activity for excessive failures
    if (fullConfig.maxAttempts >= 3 && fullConfig.enableLogging) {
      await logSuspiciousActivity(
        undefined,
        'network_operation_failed_all_retries',
        {
          context,
          attempts: fullConfig.maxAttempts,
          totalTime,
          error: lastError?.message,
          networkStatus: this.networkStatus,
        }
      );
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: fullConfig.maxAttempts,
      totalTime,
      wasRetried: fullConfig.maxAttempts > 1,
    };
  }

  /**
   * Queue operation for retry when network becomes available
   */
  async queueForRetry<T>(
    operation: () => Promise<T>,
    queueName: string = 'default',
    priority: number = 0
  ): Promise<void> {
    if (!this.retryQueues.has(queueName)) {
      this.retryQueues.set(queueName, []);
    }

    const queue = this.retryQueues.get(queueName)!;
    
    // Insert based on priority (higher priority first)
    const insertIndex = queue.findIndex((_, index) => priority > (queue as any)[index]?.priority || 0);
    const wrappedOperation = Object.assign(operation, { priority });
    
    if (insertIndex === -1) {
      queue.push(wrappedOperation);
    } else {
      queue.splice(insertIndex, 0, wrappedOperation);
    }

    console.log(`📋 Queued operation for retry (queue: ${queueName}, size: ${queue.length})`);
  }

  /**
   * Process retry queue when network becomes available
   */
  private async processRetryQueue(queueName: string = 'default'): Promise<void> {
    if (this.isProcessingQueue || !this.retryQueues.has(queueName)) {
      return;
    }

    const queue = this.retryQueues.get(queueName)!;
    if (queue.length === 0) return;

    this.isProcessingQueue = true;
    console.log(`🔄 Processing retry queue (${queue.length} operations)`);

    try {
      while (queue.length > 0 && await this.isNetworkAvailable()) {
        const operation = queue.shift()!;
        
        try {
          await this.executeWithRetry(operation, { maxAttempts: 2 }, 'queued_retry');
        } catch (error) {
          console.error('Queued operation failed:', error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Check if network is available
   */
  async isNetworkAvailable(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected === true && state.isInternetReachable !== false;
    } catch (error) {
      console.warn('Network check failed:', error);
      return false; // Assume no network if check fails
    }
  }

  /**
   * Get current network status
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const state = await NetInfo.fetch();
      return {
        isConnected: state.isConnected || false,
        isInternetReachable: state.isInternetReachable || false,
        type: state.type || 'unknown',
        isWifiEnabled: state.type === 'wifi',
        strength: (state.details as any)?.strength || null,
      };
    } catch (error) {
      console.warn('Failed to get network status:', error);
      return {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
        isWifiEnabled: false,
        strength: null,
      };
    }
  }

  /**
   * Show network error dialog to user
   */
  showNetworkErrorDialog(
    error: Error,
    context: string = 'operation',
    onRetry?: () => void,
    onCancel?: () => void
  ): void {
    const isNetworkError = this.isRetryableError(error, this.config.retryableErrors);
    
    if (isNetworkError) {
      Alert.alert(
        'Connection Problem',
        `Unable to complete ${context} due to network issues. Please check your connection and try again.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel,
          },
          {
            text: 'Retry',
            onPress: onRetry || (() => {}),
          },
        ]
      );
    } else {
      Alert.alert(
        'Error',
        `Failed to complete ${context}. ${error.message}`,
        [{ text: 'OK', onPress: onCancel }]
      );
    }
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.networkStatus?.isConnected || false;
      
      this.networkStatus = {
        isConnected: state.isConnected || false,
        isInternetReachable: state.isInternetReachable || false,
        type: state.type || 'unknown',
        isWifiEnabled: state.type === 'wifi',
        strength: (state.details as any)?.strength || null,
      };

      // Process queues when network becomes available
      if (!wasConnected && this.networkStatus.isConnected) {
        console.log('🌐 Network connection restored, processing retry queues');
        this.retryQueues.forEach((_, queueName) => {
          this.processRetryQueue(queueName);
        });
      }

      if (this.config.enableLogging) {
        console.log('📶 Network status changed:', this.networkStatus);
      }
    });
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, retryableErrors: string[]): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) ||
      errorName.includes(retryableError.toLowerCase())
    );
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    
    if (config.enableJitter) {
      // Add random jitter (±25%)
      const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);
      return Math.max(0, cappedDelay + jitter);
    }
    
    return cappedDelay;
  }

  /**
   * Add timeout to a promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
      }),
    ]);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all retry queues
   */
  clearQueues(): void {
    this.retryQueues.clear();
    console.log('🗑️ Cleared all retry queues');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    this.retryQueues.forEach((queue, name) => {
      status[name] = queue.length;
    });
    return status;
  }
}

/**
 * Pre-configured retry managers for different use cases
 */
export class AuthNetworkRetry {
  // Authentication operations: Quick retries
  static readonly auth = new NetworkRetryManager({
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    timeoutMs: 15000,
  });

  // Data operations: More patient retries
  static readonly data = new NetworkRetryManager({
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    timeoutMs: 30000,
  });

  // Critical operations: Aggressive retries
  static readonly critical = new NetworkRetryManager({
    maxAttempts: 7,
    baseDelayMs: 500,
    maxDelayMs: 60000,
    timeoutMs: 60000,
  });
}

/**
 * Utility functions for network operations
 */
export const networkUtils = {
  /**
   * Wrap Supabase operations with retry logic
   */
  async supabaseWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'supabase_operation'
  ): Promise<T> {
    const result = await AuthNetworkRetry.data.executeWithRetry(
      operation,
      {},
      context
    );

    if (result.success && result.data) {
      return result.data;
    }

    // For failed operations, return the original error structure
    throw result.error || new Error('Network operation failed');
  },

  /**
   * Wrap fetch operations with retry logic
   */
  async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    context: string = 'fetch_operation'
  ): Promise<Response> {
    const result = await AuthNetworkRetry.data.executeWithRetry(
      () => fetch(url, options),
      {},
      context
    );

    if (result.success && result.data) {
      return result.data;
    }

    throw result.error || new Error('Network request failed');
  },

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    return await AuthNetworkRetry.auth.isNetworkAvailable();
  },

  /**
   * Show appropriate error message for network failures
   */
  handleNetworkError(error: Error, context: string, onRetry?: () => void): void {
    AuthNetworkRetry.auth.showNetworkErrorDialog(error, context, onRetry);
  },
};
