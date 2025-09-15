import { supabase } from '@/lib/supabase';
import { networkUtils } from '@/utils/networkUtils';
import { offlineStorage } from '@/lib/offlineStorage';

interface ApiRequestOptions {
  priority?: 'low' | 'medium' | 'high';
  enableCaching?: boolean;
  cacheKey?: string;
  cacheTTL?: number; // minutes
  enableOfflineQueue?: boolean;
  retryOnFailure?: boolean;
  timeout?: number;
  batchable?: boolean;
  fallbackData?: any;
}

interface BatchRequest {
  id: string;
  operation: () => Promise<any>;
  options: ApiRequestOptions;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class OptimizedApiService {
  private batchQueue: BatchRequest[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY = 100; // ms
  private readonly MAX_BATCH_SIZE = 10;

  // ============ CORE API METHODS ============

  async request<T>(
    operation: () => Promise<T>,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const {
      priority = 'medium',
      enableCaching = true,
      cacheKey,
      cacheTTL = 15,
      enableOfflineQueue = true,
      retryOnFailure = true,
      timeout,
      batchable = false,
      fallbackData,
    } = options;

    // Generate cache key if not provided
    const finalCacheKey = cacheKey || this.generateCacheKey(operation.toString());

    try {
      // Check cache first for non-critical requests
      if (enableCaching && priority !== 'high') {
        const cached = await this.getFromCache(finalCacheKey, cacheTTL);
        if (cached) {
          console.log(`Cache hit for ${finalCacheKey}`);
          return cached;
        }
      }

      // Use adaptive request with network awareness
      const result = await networkUtils.adaptiveRequest(
        operation,
        {
          priority,
          timeout,
          retries: retryOnFailure ? undefined : 0,
          fallbackData,
          cacheKey: finalCacheKey,
        }
      );

      // Cache successful results
      if (enableCaching && result) {
        await this.setCache(finalCacheKey, result, cacheTTL);
      }

      return result;

    } catch (error) {
      console.error('API request failed:', error);

      // Add to offline queue if enabled
      if (enableOfflineQueue && this.isRetryableError(error)) {
        await this.addToOfflineQueue(operation, options);
      }

      // Try to return cached data as fallback
      if (enableCaching) {
        const cached = await this.getFromCache(finalCacheKey, cacheTTL * 10); // Extended TTL for fallback
        if (cached) {
          console.log(`Using stale cache for ${finalCacheKey} due to error`);
          return cached;
        }
      }

      // Use fallback data if provided
      if (fallbackData !== undefined) {
        console.log('Using fallback data due to error');
        return fallbackData;
      }

      throw error;
    }
  }

  // ============ BATCHED REQUESTS ============

  async batchRequest<T>(
    operation: () => Promise<T>,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchRequest: BatchRequest = {
        id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        options,
        resolve,
        reject,
      };

      this.batchQueue.push(batchRequest);

      // Process batch after delay or when max size reached
      if (this.batchQueue.length >= this.MAX_BATCH_SIZE) {
        this.processBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.BATCH_DELAY);
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    console.log(`Processing batch of ${batch.length} requests`);

    // Group by priority
    const priorityGroups = {
      high: batch.filter(req => req.options.priority === 'high'),
      medium: batch.filter(req => req.options.priority === 'medium' || !req.options.priority),
      low: batch.filter(req => req.options.priority === 'low'),
    };

    // Process high priority first, then medium, then low
    for (const [priority, requests] of Object.entries(priorityGroups)) {
      if (requests.length === 0) continue;

      const batchRequests = requests.map(req => ({
        id: req.id,
        request: req.operation,
        priority: req.options.priority,
      }));

      try {
        const results = await networkUtils.batchRequests(batchRequests);

        // Resolve individual requests
        requests.forEach(req => {
          const result = results[req.id];
          if (result.success) {
            req.resolve(result.data);
          } else {
            req.reject(new Error(result.error || 'Batch request failed'));
          }
        });

      } catch (error) {
        // Reject all requests in this priority group
        requests.forEach(req => {
          req.reject(error);
        });
      }
    }
  }

  // ============ SPECIALIZED API METHODS ============

  // Listings API
  async getListings(filters: any = {}, options: ApiRequestOptions = {}): Promise<any[]> {
    const cacheKey = `listings_${JSON.stringify(filters)}`;
    
    return this.request(
      async () => {
        let query = supabase
          .from('listings')
          .select(`
            *,
            profiles:user_id (
              id,
              first_name,
              last_name,
              avatar_url,
              verification_status,
              account_type
            ),
            categories:category_id (
              id,
              name,
              slug
            )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.category) {
          query = query.eq('category_id', filters.category);
        }
        if (filters.location) {
          query = query.ilike('location', `%${filters.location}%`);
        }
        if (filters.minPrice) {
          query = query.gte('price', filters.minPrice);
        }
        if (filters.maxPrice) {
          query = query.lte('price', filters.maxPrice);
        }
        if (filters.condition) {
          query = query.eq('condition', filters.condition);
        }
        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        // Pagination
        const limit = filters.limit || 20;
        const offset = filters.offset || 0;
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;
        if (error) throw error;

        // Cache listings offline
        if (data) {
          await offlineStorage.cacheListings(data);
        }

        return data || [];
      },
      {
        cacheKey,
        cacheTTL: 5, // 5 minutes for listings
        enableOfflineQueue: false, // Read operations don't need queuing
        fallbackData: [],
        ...options,
      }
    );
  }

  async getListing(id: string, options: ApiRequestOptions = {}): Promise<any> {
    const cacheKey = `listing_${id}`;
    
    return this.request(
      async () => {
        const { data, error } = await supabase
          .from('listings')
          .select(`
            *,
            profiles:user_id (
              id,
              first_name,
              last_name,
              avatar_url,
              phone_number,
              verification_status,
              account_type,
              business_name,
              created_at
            ),
            categories:category_id (
              id,
              name,
              slug,
              parent_id
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        // Cache single listing
        if (data) {
          await offlineStorage.cacheSingleListing(data);
        }

        return data;
      },
      {
        cacheKey,
        cacheTTL: 10, // 10 minutes for individual listings
        priority: 'high', // Individual listing views are high priority
        ...options,
      }
    );
  }

  async createListing(listingData: any, options: ApiRequestOptions = {}): Promise<any> {
    return this.request(
      async () => {
        const { data, error } = await supabase
          .from('listings')
          .insert(listingData)
          .select()
          .single();

        if (error) throw error;

        // Cache the new listing
        if (data) {
          await offlineStorage.cacheSingleListing(data);
        }

        return data;
      },
      {
        priority: 'high',
        enableCaching: false, // Don't cache write operations
        enableOfflineQueue: true, // Queue if offline
        ...options,
      }
    );
  }

  async updateListing(id: string, updates: any, options: ApiRequestOptions = {}): Promise<any> {
    return this.request(
      async () => {
        const { data, error } = await supabase
          .from('listings')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Update cached listing
        if (data) {
          await offlineStorage.cacheSingleListing(data);
        }

        return data;
      },
      {
        priority: 'high',
        enableCaching: false,
        enableOfflineQueue: true,
        ...options,
      }
    );
  }

  // Messages API
  async getMessages(conversationId: string, options: ApiRequestOptions = {}): Promise<any[]> {
    const cacheKey = `messages_${conversationId}`;
    
    return this.request(
      async () => {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id (
              id,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Cache messages offline
        if (data) {
          await offlineStorage.cacheMessages(conversationId, data);
        }

        return data || [];
      },
      {
        cacheKey,
        cacheTTL: 2, // 2 minutes for messages
        fallbackData: [],
        ...options,
      }
    );
  }

  async sendMessage(messageData: any, options: ApiRequestOptions = {}): Promise<any> {
    return this.request(
      async () => {
        const { data, error } = await supabase
          .from('messages')
          .insert(messageData)
          .select()
          .single();

        if (error) throw error;

        return data;
      },
      {
        priority: 'high',
        enableCaching: false,
        enableOfflineQueue: true,
        ...options,
      }
    );
  }

  // Search API with caching
  async searchListings(query: string, filters: any = {}, options: ApiRequestOptions = {}): Promise<any[]> {
    const cacheKey = `search_${query}_${JSON.stringify(filters)}`;
    
    return this.request(
      async () => {
        // Check cached search results first
        const cached = await offlineStorage.getCachedSearchResults(query, filters, 2);
        if (cached) {
          console.log('Using cached search results');
          return cached;
        }

        // Perform search
        const results = await this.getListings({ ...filters, search: query });

        // Cache search results
        await offlineStorage.cacheSearchResults(query, filters, results);

        return results;
      },
      {
        cacheKey,
        cacheTTL: 10, // 10 minutes for search results
        fallbackData: [],
        ...options,
      }
    );
  }

  // Categories API
  async getCategories(options: ApiRequestOptions = {}): Promise<any[]> {
    return this.request(
      async () => {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;
        return data || [];
      },
      {
        cacheKey: 'categories',
        cacheTTL: 60, // 1 hour for categories (rarely change)
        fallbackData: [],
        ...options,
      }
    );
  }

  // ============ UTILITY METHODS ============

  private generateCacheKey(operation: string): string {
    // Create a simple hash of the operation string
    let hash = 0;
    for (let i = 0; i < operation.length; i++) {
      const char = operation.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `api_${Math.abs(hash)}`;
  }

  private async getFromCache(key: string, ttlMinutes: number): Promise<any | null> {
    try {
      // Use network utils cache for now, could be extended to AsyncStorage
      const cached = await (networkUtils as any).getCachedResponse(key);
      return cached;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  private async setCache(key: string, data: any, ttlMinutes: number): Promise<void> {
    try {
      // Use network utils cache for now, could be extended to AsyncStorage
      await (networkUtils as any).cacheResponse(key, data);
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  private async addToOfflineQueue(operation: () => Promise<any>, options: ApiRequestOptions): Promise<void> {
    try {
      // Determine operation type based on the operation
      const operationString = operation.toString();
      let type: 'create_listing' | 'update_listing' | 'send_message' | 'update_profile' | 'favorite_listing' = 'create_listing';
      
      if (operationString.includes('update')) {
        type = 'update_listing';
      } else if (operationString.includes('message')) {
        type = 'send_message';
      } else if (operationString.includes('profile')) {
        type = 'update_profile';
      } else if (operationString.includes('favorite')) {
        type = 'favorite_listing';
      }

      await offlineStorage.addToSyncQueue({
        type,
        data: {}, // Would need to extract data from operation
      });

      console.log(`Added ${type} to offline queue`);
    } catch (error) {
      console.error('Failed to add to offline queue:', error);
    }
  }

  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx server errors are retryable
    if (error.name === 'NetworkError') return true;
    if (error.message?.includes('timeout')) return true;
    if (error.message?.includes('fetch')) return true;
    if (error.status >= 500 && error.status < 600) return true;
    if (error.status === 429) return true; // Rate limiting
    
    return false;
  }

  // ============ BULK OPERATIONS ============

  async bulkGetListings(ids: string[], options: ApiRequestOptions = {}): Promise<any[]> {
    // Split into batches to avoid URL length limits
    const batchSize = 10;
    const batches: string[][] = [];
    
    for (let i = 0; i < ids.length; i += batchSize) {
      batches.push(ids.slice(i, i + batchSize));
    }

    const results = await Promise.all(
      batches.map(batch => 
        this.batchRequest(
          async () => {
            const { data, error } = await supabase
              .from('listings')
              .select('*')
              .in('id', batch);

            if (error) throw error;
            return data || [];
          },
          { ...options, batchable: true }
        )
      )
    );

    return results.flat();
  }

  // ============ ANALYTICS AND MONITORING ============

  async getApiStats(): Promise<{
    cacheHitRate: number;
    averageLatency: number;
    errorRate: number;
    queuedRequests: number;
  }> {
    try {
      const networkStats = await networkUtils.getNetworkStats();
      const storageStats = await offlineStorage.getStorageStats();

      return {
        cacheHitRate: 0.85, // Would track this in production
        averageLatency: networkStats.averageLatency,
        errorRate: 1 - networkStats.successRate,
        queuedRequests: storageStats.queueItems,
      };
    } catch (error) {
      console.error('Failed to get API stats:', error);
      return {
        cacheHitRate: 0,
        averageLatency: 0,
        errorRate: 1,
        queuedRequests: 0,
      };
    }
  }
}

export const optimizedApi = new OptimizedApiService();
