import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { Badge } from '@/components/Badge/Badge';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useMemoryManager } from '@/utils/memoryManager';
import { offlineStorage } from '@/lib/offlineStorage';

interface PerformanceDashboardProps {
  visible?: boolean;
  onClose?: () => void;
}

export function PerformanceDashboard({ 
  visible = false, 
  onClose 
}: PerformanceDashboardProps) {
  const { theme } = useTheme();
  const { metrics, getReport } = usePerformanceMonitor();
  const { isOnline, pendingChanges, lastSyncTime, isSyncing } = useOfflineSync();
  const { memoryUsage, cacheStats, clearCache } = useMemoryManager();
  
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [syncInfo, setSyncInfo] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      loadCacheInfo();
      loadSyncInfo();
    }
  }, [visible]);

  const loadCacheInfo = async () => {
    const stats = await offlineStorage.getCacheStats();
    setCacheInfo(stats);
  };

  const loadSyncInfo = async () => {
    const info = offlineStorage.getSyncQueueStatus();
    setSyncInfo(info);
  };

  const handleClearCache = async () => {
    await offlineStorage.clear();
    clearCache();
    loadCacheInfo();
  };

  const handleForceSync = async () => {
    await offlineStorage.forcSync();
    loadSyncInfo();
  };

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.background,
        zIndex: 1000,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.xl,
          }}
        >
          <Text variant="h2">Performance Dashboard</Text>
          <Button variant="secondary" onPress={onClose} size="sm">
            Close
          </Button>
        </View>

        {/* Network Status */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            ...theme.shadows.sm,
          }}
        >
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Network & Sync
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <Badge 
              variant={isOnline ? 'success' : 'error'} 
              text={isOnline ? 'Online' : 'Offline'} 
              size="sm"
            />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
              {isOnline ? 'Connected' : 'No connection'}
            </Text>
          </View>

          {pendingChanges > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <Badge variant="warning" text={pendingChanges.toString()} size="sm" />
              <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
                Pending changes
              </Text>
            </View>
          )}

          {lastSyncTime && (
            <Text variant="caption" color="muted">
              Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
            </Text>
          )}

          <Button
            variant="primary"
            size="sm"
            onPress={handleForceSync}
            loading={isSyncing}
            disabled={!isOnline}
            style={{ marginTop: theme.spacing.md }}
          >
            Force Sync
          </Button>
        </View>

        {/* Memory Usage */}
        {memoryUsage && (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              ...theme.shadows.sm,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Memory Usage
            </Text>
            
            <View style={{ marginBottom: theme.spacing.sm }}>
              <Text variant="body">
                Usage: {(memoryUsage.percentage * 100).toFixed(1)}%
              </Text>
              <View
                style={{
                  height: 8,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: 4,
                  marginTop: theme.spacing.xs,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${memoryUsage.percentage * 100}%`,
                    backgroundColor: memoryUsage.percentage > 0.8 
                      ? theme.colors.error 
                      : memoryUsage.percentage > 0.6 
                        ? theme.colors.warning 
                        : theme.colors.success,
                  }}
                />
              </View>
            </View>

            <Text variant="caption" color="muted">
              Used: {(memoryUsage.used / 1024 / 1024).toFixed(1)}MB / 
              Total: {(memoryUsage.total / 1024 / 1024).toFixed(1)}MB
            </Text>
          </View>
        )}

        {/* Cache Statistics */}
        {cacheInfo && (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              ...theme.shadows.sm,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Cache Statistics
            </Text>
            
            <View style={{ marginBottom: theme.spacing.sm }}>
              <Text variant="body">Items: {cacheInfo.totalItems}</Text>
              <Text variant="body">
                Size: {(cacheInfo.totalSize / 1024).toFixed(1)}KB
              </Text>
              <Text variant="body">
                Usage: {(cacheInfo.usage * 100).toFixed(1)}%
              </Text>
            </View>

            {cacheInfo.oldestItem > 0 && (
              <Text variant="caption" color="muted">
                Oldest item: {new Date(cacheInfo.oldestItem).toLocaleString()}
              </Text>
            )}

            <Button
              variant="secondary"
              size="sm"
              onPress={handleClearCache}
              style={{ marginTop: theme.spacing.md }}
            >
              Clear Cache
            </Button>
          </View>
        )}

        {/* Performance Metrics */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            ...theme.shadows.sm,
          }}
        >
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Performance Metrics
          </Text>
          
          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text variant="body">Render Time: {metrics.renderTime}ms</Text>
            <Text variant="body">Navigation Time: {metrics.navigationTime}ms</Text>
            <Text variant="body">API Response Time: {metrics.apiResponseTime}ms</Text>
            <Text variant="body">Image Load Time: {metrics.imageLoadTime}ms</Text>
          </View>

          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text variant="body">Errors: {metrics.errorCount}</Text>
            <Text variant="body">Crashes: {metrics.crashCount}</Text>
          </View>
        </View>

        {/* Sync Queue Status */}
        {syncInfo && (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              ...theme.shadows.sm,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Sync Queue
            </Text>
            
            <View style={{ marginBottom: theme.spacing.sm }}>
              <Text variant="body">Pending Items: {syncInfo.pendingItems}</Text>
              <Text variant="body">Failed Items: {syncInfo.failedItems}</Text>
            </View>

            {syncInfo.oldestPendingItem > 0 && (
              <Text variant="caption" color="muted">
                Oldest pending: {new Date(syncInfo.oldestPendingItem).toLocaleString()}
              </Text>
            )}
          </View>
        )}

        {/* Performance Report */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            ...theme.shadows.sm,
          }}
        >
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Performance Report
          </Text>
          
          <ScrollView
            horizontal
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
            }}
          >
            <Text variant="caption" style={{ fontFamily: 'monospace' }}>
              {getReport()}
            </Text>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

// Hook to toggle performance dashboard
export function usePerformanceDashboard() {
  const [visible, setVisible] = useState(false);

  const toggle = () => setVisible(!visible);
  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return {
    visible,
    toggle,
    show,
    hide,
    PerformanceDashboard: (props: Omit<PerformanceDashboardProps, 'visible' | 'onClose'>) => (
      <PerformanceDashboard
        {...props}
        visible={visible}
        onClose={hide}
      />
    ),
  };
}
