import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Badge } from '@/components/Badge/Badge';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useMemoryManager } from '@/utils/memoryManager';
import { testPerformanceIntegration, IntegrationTestResult } from '@/utils/testPerformanceIntegration';

interface IntegrationStatusProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function IntegrationStatus({ 
  visible = __DEV__, 
  position = 'top-right' 
}: IntegrationStatusProps) {
  const { theme } = useTheme();
  const { metrics } = usePerformanceMonitor('integration_status');
  const { isOnline, pendingChanges } = useOfflineSync();
  const { memoryUsage } = useMemoryManager();
  
  const [expanded, setExpanded] = useState(false);
  const [testResults, setTestResults] = useState<IntegrationTestResult[]>([]);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);

  const runIntegrationTest = useCallback(async () => {
    try {
      const results = await testPerformanceIntegration();
      setTestResults(results);
      setLastTestTime(new Date());
    } catch (error) {
      console.error('Integration test failed:', error);
    }
  }, []);

  useEffect(() => {
    if (expanded && testResults.length === 0) {
      runIntegrationTest();
    }
  }, [expanded, testResults.length, runIntegrationTest]);

  if (!visible) return null;

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      zIndex: 9999,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      ...theme.shadows.md,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyles, top: 50, left: 10 };
      case 'top-right':
        return { ...baseStyles, top: 50, right: 10 };
      case 'bottom-left':
        return { ...baseStyles, bottom: 50, left: 10 };
      case 'bottom-right':
        return { ...baseStyles, bottom: 50, right: 10 };
      default:
        return { ...baseStyles, top: 50, right: 10 };
    }
  };

  const getOverallStatus = () => {
    if (testResults.length === 0) return 'unknown';
    
    const hasFailures = testResults.some(r => r.status === 'fail');
    const hasWarnings = testResults.some(r => r.status === 'warning');
    
    if (hasFailures) return 'error';
    if (hasWarnings) return 'warning';
    return 'success';
  };

  const getStatusColor = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      default: return theme.colors.primary;
    }
  };

  const getStatusIcon = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  return (
    <View style={getPositionStyles()}>
      {/* Compact Status Indicator */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={{
          padding: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: expanded ? 300 : 60,
        }}
      >
        <Text style={{ fontSize: 16, marginRight: theme.spacing.xs }}>
          {getStatusIcon()}
        </Text>
        
        {expanded && (
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={{ fontWeight: '600' }}>
              Performance Status
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Badge
                variant={isOnline ? 'success' : 'error'}
                text={isOnline ? 'Online' : 'Offline'}
                size="sm"
              />
              {memoryUsage && (
                <Badge
                  variant={memoryUsage.percentage > 0.8 ? 'error' : memoryUsage.percentage > 0.6 ? 'warning' : 'success'}
                  text={`${(memoryUsage.percentage * 100).toFixed(0)}%`}
                  size="sm"
                  style={{ marginLeft: theme.spacing.xs }}
                />
              )}
              {pendingChanges > 0 && (
                <Badge
                  variant="warning"
                  text={`${pendingChanges}`}
                  size="sm"
                  style={{ marginLeft: theme.spacing.xs }}
                />
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Expanded Details */}
      {expanded && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.outline,
            padding: theme.spacing.sm,
            maxHeight: 400,
          }}
        >
          {/* Quick Stats */}
          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text variant="caption" style={{ fontWeight: '600', marginBottom: 4 }}>
              Performance Metrics
            </Text>
            <Text variant="caption">
              Render: {metrics[0]?.renderTime || 0}ms | Nav: {metrics[0]?.frameRate || 0}ms
            </Text>
            <Text variant="caption">
              API: {metrics[0]?.networkLatency || 0}ms | Images: {metrics[0]?.cacheHitRate || 0}ms
            </Text>
          </View>

          {/* Integration Test Results */}
          <View style={{ marginBottom: theme.spacing.sm }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 4 
            }}>
              <Text variant="caption" style={{ fontWeight: '600' }}>
                Integration Tests
              </Text>
              <TouchableOpacity onPress={runIntegrationTest}>
                <Text variant="caption" style={{ color: theme.colors.primary }}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
            
            {testResults.length > 0 ? (
              testResults.map((result, index) => (
                <View key={index} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  marginBottom: 2 
                }}>
                  <Text style={{ fontSize: 10, marginRight: 4 }}>
                    {result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'}
                  </Text>
                  <Text variant="caption" style={{ flex: 1, fontSize: 10 }}>
                    {result.component}
                  </Text>
                </View>
              ))
            ) : (
              <Text variant="caption" style={{ fontStyle: 'italic' }}>
                Run test to see results
              </Text>
            )}
            
            {lastTestTime && (
              <Text variant="caption" style={{ 
                fontSize: 9, 
                color: theme.colors.outline,
                marginTop: 4 
              }}>
                Last test: {lastTestTime.toLocaleTimeString()}
              </Text>
            )}
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={() => setExpanded(false)}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.sm,
              padding: theme.spacing.xs,
              alignItems: 'center',
            }}
          >
            <Text variant="caption" style={{ color: theme.colors.onPrimary }}>
              Minimize
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Hook for managing integration status
export function useIntegrationStatus() {
  const [visible, setVisible] = useState(__DEV__);
  const [position, setPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');

  const toggle = () => setVisible(!visible);
  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return {
    visible,
    position,
    setPosition,
    toggle,
    show,
    hide,
    IntegrationStatus: (props: Omit<IntegrationStatusProps, 'visible' | 'position'>) => (
      <IntegrationStatus
        {...props}
        visible={visible}
        position={position}
      />
    ),
  };
}
