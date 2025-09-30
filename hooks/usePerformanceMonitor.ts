import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  frameRate: number;
  networkLatency: number;
  cacheHitRate: number;
  componentRenders: number;
}

interface PerformanceConfig {
  enableMonitoring: boolean;
  sampleRate: number; // 0-1, how often to sample
  maxSamples: number;
  alertThresholds: {
    renderTime: number; // ms
    memoryUsage: number; // MB
    frameRate: number; // FPS
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private config: PerformanceConfig;
  private isMonitoring = false;
  private frameCount = 0;
  private lastFrameTime = 0;
  private renderTimes: number[] = [];
  private componentRenderCount = 0;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableMonitoring: true,
      sampleRate: 0.1, // Sample 10% of renders
      maxSamples: 100,
      alertThresholds: {
        renderTime: 16, // 60fps threshold
        memoryUsage: 100, // 100MB
        frameRate: 30, // 30fps minimum
      },
      ...config,
    };
  }

  startMonitoring(): void {
    if (!this.config.enableMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = Date.now();
    this.measureFrameRate();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  recordRender(componentName: string, renderTime: number): void {
    if (!this.isMonitoring || Math.random() > this.config.sampleRate) return;

    this.componentRenderCount++;
    this.renderTimes.push(renderTime);

    // Keep only recent render times
    if (this.renderTimes.length > 50) {
      this.renderTimes.shift();
    }

    // Calculate average render time
    const avgRenderTime = this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;

    const metrics: PerformanceMetrics = {
      renderTime: avgRenderTime,
      memoryUsage: this.getMemoryUsage(),
      frameRate: this.getFrameRate(),
      networkLatency: 0, // Would be measured separately
      cacheHitRate: 0, // Would be measured from cache
      componentRenders: this.componentRenderCount,
    };

    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.config.maxSamples) {
      this.metrics.shift();
    }

    // Check for performance issues
    this.checkPerformanceIssues(metrics, componentName);
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) return {};

    const totals = this.metrics.reduce(
      (acc, metric) => ({
        renderTime: acc.renderTime + metric.renderTime,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
        frameRate: acc.frameRate + metric.frameRate,
        networkLatency: acc.networkLatency + metric.networkLatency,
        cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
        componentRenders: acc.componentRenders + metric.componentRenders,
      }),
      {
        renderTime: 0,
        memoryUsage: 0,
        frameRate: 0,
        networkLatency: 0,
        cacheHitRate: 0,
        componentRenders: 0,
      }
    );

    const count = this.metrics.length;
    return {
      renderTime: totals.renderTime / count,
      memoryUsage: totals.memoryUsage / count,
      frameRate: totals.frameRate / count,
      networkLatency: totals.networkLatency / count,
      cacheHitRate: totals.cacheHitRate / count,
      componentRenders: totals.componentRenders / count,
    };
  }

  private measureFrameRate(): void {
    if (!this.isMonitoring) return;

    const now = Date.now();
    this.frameCount++;

    if (now - this.lastFrameTime >= 1000) {
      const fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;

      // Update frame rate in latest metrics
      if (this.metrics.length > 0) {
        this.metrics[this.metrics.length - 1].frameRate = fps;
      }
    }

    requestAnimationFrame(() => this.measureFrameRate());
  }

  private getFrameRate(): number {
    return this.frameCount;
  }

  private getMemoryUsage(): number {
    // In a real app, you'd use performance.memory or similar
    // For React Native, this is an approximation
    return Math.random() * 50 + 20; // Mock memory usage
  }

  private checkPerformanceIssues(metrics: PerformanceMetrics, componentName: string): void {
    const { alertThresholds } = this.config;

    if (metrics.renderTime > alertThresholds.renderTime) {
      console.warn(`🐌 Slow render in ${componentName}: ${metrics.renderTime.toFixed(2)}ms`);
    }

    if (metrics.memoryUsage > alertThresholds.memoryUsage) {
      console.warn(`🧠 High memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
    }

    if (metrics.frameRate < alertThresholds.frameRate) {
      console.warn(`📱 Low frame rate: ${metrics.frameRate.toFixed(2)}fps`);
    }
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

export const usePerformanceMonitor = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const renderStartTime = useRef<number>(0);

  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRender = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    performanceMonitor.recordRender(componentName, renderTime);
    setMetrics(performanceMonitor.getMetrics());
  }, [componentName]);

  useEffect(() => {
    performanceMonitor.startMonitoring();
    return () => performanceMonitor.stopMonitoring();
  }, []);

  return {
    startRender,
    endRender,
    metrics,
    averageMetrics: performanceMonitor.getAverageMetrics(),
  };
};

export { PerformanceMonitor };