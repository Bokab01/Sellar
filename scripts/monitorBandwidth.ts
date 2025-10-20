import { supabase } from '@/lib/supabase';

interface BandwidthMetrics {
  totalRequests: number;
  totalBytes: number;
  averageRequestSize: number;
  topEndpoints: Array<{ endpoint: string; requests: number; bytes: number }>;
  hourlyUsage: Array<{ hour: string; requests: number; bytes: number }>;
}

export class BandwidthMonitor {
  private static instance: BandwidthMonitor;
  private metrics: BandwidthMetrics = {
    totalRequests: 0,
    totalBytes: 0,
    averageRequestSize: 0,
    topEndpoints: [],
    hourlyUsage: []
  };

  static getInstance(): BandwidthMonitor {
    if (!BandwidthMonitor.instance) {
      BandwidthMonitor.instance = new BandwidthMonitor();
    }
    return BandwidthMonitor.instance;
  }

  // Track image requests
  trackImageRequest(url: string, size: number): void {
    this.metrics.totalRequests++;
    this.metrics.totalBytes += size;
    this.metrics.averageRequestSize = this.metrics.totalBytes / this.metrics.totalRequests;

    // Track by endpoint
    const endpoint = this.extractEndpoint(url);
    const existing = this.metrics.topEndpoints.find(e => e.endpoint === endpoint);
    if (existing) {
      existing.requests++;
      existing.bytes += size;
    } else {
      this.metrics.topEndpoints.push({ endpoint, requests: 1, bytes: size });
    }

    // Track hourly usage
    const hour = new Date().toISOString().slice(0, 13);
    const hourly = this.metrics.hourlyUsage.find(h => h.hour === hour);
    if (hourly) {
      hourly.requests++;
      hourly.bytes += size;
    } else {
      this.metrics.hourlyUsage.push({ hour, requests: 1, bytes: size });
    }

    // Log large requests
    if (size > 500 * 1024) { // 500KB
      console.warn(`🚨 Large image request: ${url} (${Math.round(size / 1024)}KB)`);
    }
  }

  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname.split('/').slice(0, 3).join('/')}`;
    } catch {
      return 'unknown';
    }
  }

  getMetrics(): BandwidthMetrics {
    return { ...this.metrics };
  }

  getTopEndpoints(limit: number = 10): Array<{ endpoint: string; requests: number; bytes: number }> {
    return this.metrics.topEndpoints
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, limit);
  }

  getHourlyUsage(): Array<{ hour: string; requests: number; bytes: number }> {
    return this.metrics.hourlyUsage.sort((a, b) => a.hour.localeCompare(b.hour));
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      totalBytes: 0,
      averageRequestSize: 0,
      topEndpoints: [],
      hourlyUsage: []
    };
  }

  // Generate report
  generateReport(): string {
    const topEndpoints = this.getTopEndpoints(5);
    const totalMB = Math.round(this.metrics.totalBytes / 1024 / 1024);
    
    return `
📊 Bandwidth Usage Report
========================
Total Requests: ${this.metrics.totalRequests}
Total Data: ${totalMB}MB
Average Request Size: ${Math.round(this.metrics.averageRequestSize / 1024)}KB

Top Endpoints:
${topEndpoints.map(e => 
  `  ${e.endpoint}: ${e.requests} requests, ${Math.round(e.bytes / 1024)}KB`
).join('\n')}
    `;
  }
}

// Export singleton
export const bandwidthMonitor = BandwidthMonitor.getInstance();

// React Native interceptor for network requests
export function setupNetworkInterceptor(): void {
  // This would be implemented with a network interceptor library
  // For now, we'll use console logging
  const originalFetch = global.fetch;
  
  global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    const startTime = Date.now();
    const response = await originalFetch(url, options);
    const endTime = Date.now();
    
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // Track image requests
    if (urlString.includes('/storage/') && urlString.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength, 10) : 0;
      
      bandwidthMonitor.trackImageRequest(urlString, size);
      
    }
    
    return response;
  };
}
