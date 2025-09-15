import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offlineStorage';

export interface NetworkStatus {
  isConnected: boolean;
  canReachSupabase: boolean;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  latency: number;
  speed: 'slow' | 'medium' | 'fast';
  error?: string;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

export interface RequestBatch {
  id: string;
  requests: Array<{
    id: string;
    method: string;
    url: string;
    data?: any;
    priority: 'low' | 'medium' | 'high';
  }>;
  createdAt: string;
}

class NetworkUtilsService {
  private requestQueue: Array<{
    id: string;
    request: () => Promise<any>;
    priority: 'low' | 'medium' | 'high';
    retries: number;
    maxRetries: number;
  }> = [];
  
  private isProcessingQueue = false;
  private networkQuality: NetworkStatus['quality'] = 'good';
  private lastQualityCheck = 0;
  private qualityCheckInterval = 5 * 60 * 1000; // 5 minutes

  // ============ NETWORK QUALITY DETECTION ============

  async checkNetworkStatus(): Promise<NetworkStatus> {
    const startTime = Date.now();
    let latency = 0;
    let isConnected = false;
    let canReachSupabase = false;
    let error: string | undefined;

    try {
      // Test basic connectivity with multiple endpoints for Ghana
      const connectivityTests = [
        this.testEndpoint('https://www.google.com', 'HEAD'),
        this.testEndpoint('https://www.mtn.com.gh', 'HEAD'),
        this.testEndpoint('https://vodafone.com.gh', 'HEAD'),
      ];

      const results = await Promise.allSettled(connectivityTests);
      const successfulTests = results.filter(r => r.status === 'fulfilled').length;
      
      if (successfulTests === 0) {
        return {
          isConnected: false,
          canReachSupabase: false,
          quality: 'poor',
          latency: 0,
          speed: 'slow',
          error: 'No network connection detected'
        };
      }

      isConnected = true;
      latency = Date.now() - startTime;

      // Test Supabase connectivity
      try {
        const supabaseStart = Date.now();
        const { data, error: supabaseError } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Supabase timeout')), 10000)
          )
        ]) as any;

        const supabaseLatency = Date.now() - supabaseStart;
        latency = Math.max(latency, supabaseLatency);

        if (supabaseError) {
          error = `Supabase connection failed: ${supabaseError.message}`;
        } else {
          canReachSupabase = true;
        }
      } catch (supabaseError) {
        error = `Supabase connection failed: ${supabaseError instanceof Error ? supabaseError.message : 'Unknown error'}`;
      }

    } catch (connectivityError) {
      error = `Network connectivity test failed: ${connectivityError instanceof Error ? connectivityError.message : 'Unknown error'}`;
    }

    // Determine network quality based on latency and success rate
    const quality = this.calculateNetworkQuality(latency, isConnected, canReachSupabase);
    const speed = this.determineNetworkSpeed(latency, quality);

    const status: NetworkStatus = {
      isConnected,
      canReachSupabase,
      quality,
      latency,
      speed,
      error
    };

    // Record network quality for analytics
    await offlineStorage.recordNetworkQuality({
      timestamp: new Date().toISOString(),
      speed,
      latency,
      success_rate: canReachSupabase ? 1 : 0,
    });

    this.networkQuality = quality;
    this.lastQualityCheck = Date.now();

    return status;
  }

  private async testEndpoint(url: string, method: 'GET' | 'HEAD' = 'HEAD'): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method,
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  }

  private calculateNetworkQuality(
    latency: number, 
    isConnected: boolean, 
    canReachSupabase: boolean
  ): NetworkStatus['quality'] {
    if (!isConnected) return 'poor';
    if (!canReachSupabase) return 'poor';
    
    if (latency < 500) return 'excellent';
    if (latency < 1000) return 'good';
    if (latency < 2000) return 'fair';
    return 'poor';
  }

  private determineNetworkSpeed(latency: number, quality: NetworkStatus['quality']): 'slow' | 'medium' | 'fast' {
    if (quality === 'excellent' && latency < 300) return 'fast';
    if (quality === 'good' || (quality === 'excellent' && latency < 800)) return 'medium';
    return 'slow';
  }

  // ============ ADAPTIVE REQUEST HANDLING ============

  async adaptiveRequest<T>(
    requestFn: () => Promise<T>,
    options: {
      priority?: 'low' | 'medium' | 'high';
      timeout?: number;
      retries?: number;
      fallbackData?: T;
      cacheKey?: string;
    } = {}
  ): Promise<T> {
    const {
      priority = 'medium',
      timeout,
      retries,
      fallbackData,
      cacheKey
    } = options;

    // Check network quality and adapt behavior
    const shouldCheckQuality = Date.now() - this.lastQualityCheck > this.qualityCheckInterval;
    if (shouldCheckQuality) {
      await this.checkNetworkStatus();
    }

    // Adjust timeout based on network quality
    const adaptiveTimeout = timeout || this.getAdaptiveTimeout();
    const adaptiveRetries = retries || this.getAdaptiveRetries();

    try {
      // Try to get cached data first for slow networks
      if (cacheKey && this.networkQuality === 'poor') {
        const cached = await this.getCachedResponse(cacheKey);
        if (cached) {
          console.log(`Using cached data for ${cacheKey} due to poor network`);
          return cached;
        }
      }

      // Execute request with adaptive settings
      const result = await this.executeWithRetry(
        requestFn,
        {
          maxRetries: adaptiveRetries,
          baseDelay: this.getAdaptiveDelay(),
          maxDelay: 30000,
          backoffFactor: 2,
          retryCondition: (error) => this.shouldRetryRequest(error),
        },
        adaptiveTimeout
      );

      // Cache successful responses
      if (cacheKey && result) {
        await this.cacheResponse(cacheKey, result);
      }

      return result;

    } catch (error) {
      console.error('Adaptive request failed:', error);

      // Try cached data as fallback
      if (cacheKey) {
        const cached = await this.getCachedResponse(cacheKey);
        if (cached) {
          console.log(`Using cached fallback for ${cacheKey}`);
          return cached;
        }
      }

      // Use provided fallback data
      if (fallbackData !== undefined) {
        console.log('Using provided fallback data');
        return fallbackData;
      }

      throw error;
    }
  }

  private getAdaptiveTimeout(): number {
    switch (this.networkQuality) {
      case 'excellent': return 5000;
      case 'good': return 10000;
      case 'fair': return 20000;
      case 'poor': return 30000;
      default: return 15000;
    }
  }

  private getAdaptiveRetries(): number {
    switch (this.networkQuality) {
      case 'excellent': return 2;
      case 'good': return 3;
      case 'fair': return 4;
      case 'poor': return 5;
      default: return 3;
    }
  }

  private getAdaptiveDelay(): number {
    switch (this.networkQuality) {
      case 'excellent': return 500;
      case 'good': return 1000;
      case 'fair': return 2000;
      case 'poor': return 3000;
      default: return 1500;
    }
  }

  // ============ REQUEST RETRY LOGIC ============

  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    options: RetryOptions,
    timeout?: number
  ): Promise<T> {
    const { maxRetries, baseDelay, maxDelay, backoffFactor, retryCondition } = options;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (timeout) {
          return await this.withTimeout(requestFn(), timeout);
        } else {
          return await requestFn();
        }
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt
        if (attempt === maxRetries) break;

        // Check if we should retry this error
        if (retryCondition && !retryCondition(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        );

        console.log(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private shouldRetryRequest(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.name === 'NetworkError') return true;
    if (error.message?.includes('timeout')) return true;
    if (error.message?.includes('fetch')) return true;
    if (error.status >= 500 && error.status < 600) return true;
    if (error.status === 429) return true; // Rate limiting
    
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============ REQUEST BATCHING ============

  async batchRequests(requests: Array<{
    id: string;
    request: () => Promise<any>;
    priority?: 'low' | 'medium' | 'high';
  }>): Promise<Record<string, { success: boolean; data?: any; error?: any }>> {
    const results: Record<string, { success: boolean; data?: any; error?: any }> = {};

    // Sort by priority
    const sortedRequests = requests.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority || 'medium'] - priorityOrder[a.priority || 'medium'];
    });

    // Execute requests with concurrency limit based on network quality
    const concurrency = this.getConcurrencyLimit();
    const chunks = this.chunkArray(sortedRequests, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (req) => {
        try {
          const data = await this.adaptiveRequest(req.request, { priority: req.priority });
          results[req.id] = { success: true, data };
        } catch (error) {
          results[req.id] = { success: false, error };
        }
      });

      await Promise.allSettled(chunkPromises);
    }

    return results;
  }

  private getConcurrencyLimit(): number {
    switch (this.networkQuality) {
      case 'excellent': return 6;
      case 'good': return 4;
      case 'fair': return 2;
      case 'poor': return 1;
      default: return 3;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============ CACHING UTILITIES ============

  private async cacheResponse(key: string, data: any): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: this.getCacheTTL(),
      };
      
      // Use a simple in-memory cache for now, could be extended to AsyncStorage
      // This is just for demonstration - in production you'd want persistent caching
      (global as any).__networkCache = (global as any).__networkCache || {};
      (global as any).__networkCache[key] = cacheEntry;
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  private async getCachedResponse(key: string): Promise<any | null> {
    try {
      const cache = (global as any).__networkCache || {};
      const entry = cache[key];
      
      if (!entry) return null;
      
      const isExpired = Date.now() - entry.timestamp > entry.ttl;
      if (isExpired) {
        delete cache[key];
        return null;
      }
      
      return entry.data;
    } catch (error) {
      console.warn('Failed to get cached response:', error);
      return null;
    }
  }

  private getCacheTTL(): number {
    // Longer cache times for slower networks
    switch (this.networkQuality) {
      case 'excellent': return 5 * 60 * 1000; // 5 minutes
      case 'good': return 10 * 60 * 1000; // 10 minutes
      case 'fair': return 20 * 60 * 1000; // 20 minutes
      case 'poor': return 60 * 60 * 1000; // 1 hour
      default: return 15 * 60 * 1000; // 15 minutes
    }
  }

  // ============ LEGACY METHODS (MAINTAINED FOR COMPATIBILITY) ============

  async testStorageConnection(): Promise<boolean> {
    try {
      const result = await this.adaptiveRequest(
        async () => {
          const { data: urlData } = supabase.storage
            .from('listing-images')
            .getPublicUrl('test-connection.jpg');
          
          return !!urlData.publicUrl;
        },
        { priority: 'low', timeout: 5000, retries: 2 }
      );

      console.log('Storage connection test:', result ? 'passed' : 'failed');
      return result;
    } catch (error) {
      console.error('Storage connection test error:', error);
      return false;
    }
  }

  async checkStorageBucket(bucketName: string = 'listing-images'): Promise<boolean> {
    try {
      const result = await this.adaptiveRequest(
        async () => {
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl('test-access.jpg');
          
          return !!urlData.publicUrl;
        },
        { priority: 'low', timeout: 5000, retries: 2 }
      );

      console.log(`Bucket '${bucketName}' access test:`, result ? 'passed' : 'failed');
      return result;
    } catch (error) {
      console.error(`Bucket '${bucketName}' access test error:`, error);
      return false;
    }
  }

  // ============ SUPABASE RETRY WRAPPER ============

  async supabaseWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'supabase_operation'
  ): Promise<T> {
    return this.adaptiveRequest(
      operation,
      {
        priority: 'high',
        cacheKey: `supabase_${operationName}_${Date.now()}`,
      }
    );
  }

  // ============ PUBLIC API ============

  getCurrentNetworkQuality(): NetworkStatus['quality'] {
    return this.networkQuality;
  }

  async getNetworkStats(): Promise<{
    quality: NetworkStatus['quality'];
    averageLatency: number;
    successRate: number;
    lastCheck: number;
  }> {
    const stats = await offlineStorage.getAverageNetworkQuality(24);
    
    return {
      quality: this.networkQuality,
      averageLatency: stats.latency,
      successRate: stats.success_rate,
      lastCheck: this.lastQualityCheck,
    };
  }
}

export const networkUtils = new NetworkUtilsService();
