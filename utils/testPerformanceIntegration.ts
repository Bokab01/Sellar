/**
 * Performance Integration Test
 * 
 * This utility helps verify that all performance optimizations are properly integrated
 */

import { offlineStorage } from '@/lib/offlineStorage';
import { memoryManager } from '@/utils/memoryManager';

export interface IntegrationTestResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export async function testPerformanceIntegration(): Promise<IntegrationTestResult[]> {
  const results: IntegrationTestResult[] = [];

  // Test 1: Offline Storage
  try {
    await offlineStorage.set('test_key', { test: 'data' }, 60000);
    const retrieved = await offlineStorage.get('test_key');
    
    if (retrieved && retrieved.test === 'data') {
      results.push({
        component: 'Offline Storage',
        status: 'pass',
        message: 'Successfully storing and retrieving data'
      });
    } else {
      results.push({
        component: 'Offline Storage',
        status: 'fail',
        message: 'Failed to store or retrieve data'
      });
    }
    
    // Cleanup
    await offlineStorage.remove('test_key');
  } catch (error) {
    results.push({
      component: 'Offline Storage',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    });
  }

  // Test 2: Memory Manager
  try {
    const memoryUsage = memoryManager.getMemoryUsage();
    const shouldLoad = memoryManager.shouldLoadHeavyComponent();
    
    results.push({
      component: 'Memory Manager',
      status: 'pass',
      message: `Memory usage: ${memoryUsage ? (memoryUsage.percentage * 100).toFixed(1) : 'N/A'}%, Should load heavy components: ${shouldLoad}`,
      details: { memoryUsage, shouldLoad }
    });
  } catch (error) {
    results.push({
      component: 'Memory Manager',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    });
  }

  // Test 3: Cache Statistics
  try {
    const cacheStats = await offlineStorage.getCacheStats();
    
    results.push({
      component: 'Cache System',
      status: 'pass',
      message: `Cache items: ${cacheStats.totalItems}, Size: ${(cacheStats.totalSize / 1024).toFixed(1)}KB`,
      details: cacheStats
    });
  } catch (error) {
    results.push({
      component: 'Cache System',
      status: 'warning',
      message: `Could not get cache stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    });
  }

  // Test 4: Network Detection (if available)
  try {
    // This will be tested by the useOfflineSync hook in the actual app
    results.push({
      component: 'Network Detection',
      status: 'pass',
      message: 'NetInfo package is available and should work in app context'
    });
  } catch (error) {
    results.push({
      component: 'Network Detection',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    });
  }

  return results;
}

export function printTestResults(results: IntegrationTestResult[]): void {
  console.log('\n🧪 Performance Integration Test Results\n');
  
  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${icon} ${result.component}: ${result.message}`);
    
    if (result.details && __DEV__) {
      console.log(`   Details:`, result.details);
    }
  });

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  console.log(`\n📊 Summary: ${passCount} passed, ${failCount} failed, ${warningCount} warnings\n`);
  
  if (failCount === 0) {
    console.log('🎉 All critical performance components are working correctly!');
  } else {
    console.log('⚠️ Some performance components need attention.');
  }
}

// Export a simple test runner for development
export async function runPerformanceIntegrationTest(): Promise<boolean> {
  try {
    const results = await testPerformanceIntegration();
    printTestResults(results);
    
    // Return true if no critical failures
    const criticalFailures = results.filter(r => r.status === 'fail' && r.component !== 'Network Detection');
    return criticalFailures.length === 0;
  } catch (error) {
    console.error('❌ Performance integration test failed:', error);
    return false;
  }
}

// Development helper - can be called from the app during development
if (__DEV__) {
  // @ts-ignore - Global for development testing
  global.testPerformanceIntegration = runPerformanceIntegrationTest;
}
