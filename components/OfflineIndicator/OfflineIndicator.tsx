import React, { useState } from 'react';
import { View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { AppModal } from '@/components/Modal/Modal';
import { useNetworkAware } from '@/hooks/useNetworkAware';
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  AlertCircle, 
  RefreshCw, 
  Database,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react-native';

interface OfflineIndicatorProps {
  position?: 'top' | 'bottom';
  showDetailedInfo?: boolean;
  compact?: boolean;
}

export function OfflineIndicator({ 
  position = 'top', 
  showDetailedInfo = false,
  compact = false 
}: OfflineIndicatorProps) {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));
  
  const {
    isOnline,
    isConnected,
    networkQuality,
    networkSpeed,
    latency,
    canReachSupabase,
    lastSync,
    syncInProgress,
    queuedItems,
    error,
    forceSync,
    getStorageStats,
  } = useNetworkAware();

  const getNetworkIcon = () => {
    if (!isConnected) return <WifiOff size={16} color={theme.colors.error} />;
    if (!canReachSupabase) return <AlertCircle size={16} color={theme.colors.warning} />;
    
    switch (networkQuality) {
      case 'excellent': return <Wifi size={16} color={theme.colors.success} />;
      case 'good': return <Signal size={16} color={theme.colors.success} />;
      case 'fair': return <Signal size={16} color={theme.colors.warning} />;
      case 'poor': return <Signal size={16} color={theme.colors.error} />;
      default: return <Wifi size={16} color={theme.colors.text.secondary} />;
    }
  };

  const getStatusColor = () => {
    if (!isConnected) return theme.colors.error;
    if (!canReachSupabase) return theme.colors.warning;
    if (networkQuality === 'poor') return theme.colors.warning;
    return theme.colors.success;
  };

  const getStatusText = () => {
    if (!isConnected) return 'Offline';
    if (!canReachSupabase) return 'Limited Connection';
    if (syncInProgress) return 'Syncing...';
    if (queuedItems > 0) return `${queuedItems} pending`;
    return networkSpeed === 'slow' ? 'Slow Connection' : 'Online';
  };

  const handleSync = async () => {
    try {
      await forceSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  // Don't show if everything is working well and compact mode
  if (compact && isConnected && canReachSupabase && networkQuality !== 'poor' && queuedItems === 0) {
    return null;
  }

  const statusColor = getStatusColor();
  const statusText = getStatusText();

  return (
    <>
      <View
        style={{
          position: 'absolute',
          [position]: 0,
          left: 0,
          right: 0,
          backgroundColor: statusColor + '15',
          borderBottomWidth: position === 'top' ? 1 : 0,
          borderTopWidth: position === 'bottom' ? 1 : 0,
          borderColor: statusColor + '30',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={() => showDetailedInfo && setShowDetails(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          disabled={!showDetailedInfo}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {getNetworkIcon()}
            
            <Text 
              variant="caption" 
              style={{ 
                marginLeft: theme.spacing.sm,
                color: statusColor,
                fontWeight: '600',
              }}
            >
              {statusText}
            </Text>

            {error && (
              <Badge 
                text="Error" 
                variant="error" 
                size="sm" 
                style={{ marginLeft: theme.spacing.sm }}
              />
            )}

            {syncInProgress && (
              <Animated.View
                style={{
                  marginLeft: theme.spacing.sm,
                  transform: [{
                    rotate: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  }],
                }}
              >
                <RefreshCw size={14} color={theme.colors.primary} />
              </Animated.View>
            )}
          </View>

          {!isConnected && (
            <Button
              variant="secondary"
              size="sm"
              onPress={handleSync}
              disabled={syncInProgress}
              style={{ minWidth: 80 }}
            >
              Retry
            </Button>
          )}

          {queuedItems > 0 && canReachSupabase && (
            <Button
              variant="primary"
              size="sm"
              onPress={handleSync}
              disabled={syncInProgress}
              loading={syncInProgress}
              style={{ minWidth: 80 }}
            >
              Sync
            </Button>
          )}
        </TouchableOpacity>
      </View>

      {/* Detailed Network Info Modal */}
      <NetworkDetailsModal
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        networkQuality={networkQuality}
        networkSpeed={networkSpeed}
        latency={latency}
        isConnected={isConnected}
        canReachSupabase={canReachSupabase}
        lastSync={lastSync}
        queuedItems={queuedItems}
        error={error}
        onSync={handleSync}
        syncInProgress={syncInProgress}
        getStorageStats={getStorageStats}
      />
    </>
  );
}

interface NetworkDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  networkQuality: 'poor' | 'fair' | 'good' | 'excellent';
  networkSpeed: 'slow' | 'medium' | 'fast';
  latency: number;
  isConnected: boolean;
  canReachSupabase: boolean;
  lastSync: string | null;
  queuedItems: number;
  error: string | null;
  onSync: () => Promise<void>;
  syncInProgress: boolean;
  getStorageStats: () => Promise<any>;
}

function NetworkDetailsModal({
  visible,
  onClose,
  networkQuality,
  networkSpeed,
  latency,
  isConnected,
  canReachSupabase,
  lastSync,
  queuedItems,
  error,
  onSync,
  syncInProgress,
  getStorageStats,
}: NetworkDetailsModalProps) {
  const { theme } = useTheme();
  const [storageStats, setStorageStats] = useState<any>(null);

  React.useEffect(() => {
    if (visible) {
      loadStorageStats();
    }
  }, [visible]);

  const loadStorageStats = async () => {
    try {
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return theme.colors.success;
      case 'good': return theme.colors.success;
      case 'fair': return theme.colors.warning;
      case 'poor': return theme.colors.error;
      default: return theme.colors.text.secondary;
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Network Status"
      size="md"
    >
      <View style={{ padding: theme.spacing.lg }}>
        {/* Connection Status */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Connection Status
          </Text>
          
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body">Internet Connection</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isConnected ? (
                  <CheckCircle size={16} color={theme.colors.success} />
                ) : (
                  <XCircle size={16} color={theme.colors.error} />
                )}
                <Text 
                  variant="body" 
                  style={{ 
                    marginLeft: theme.spacing.xs,
                    color: isConnected ? theme.colors.success : theme.colors.error,
                  }}
                >
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body">Server Connection</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {canReachSupabase ? (
                  <CheckCircle size={16} color={theme.colors.success} />
                ) : (
                  <XCircle size={16} color={theme.colors.error} />
                )}
                <Text 
                  variant="body" 
                  style={{ 
                    marginLeft: theme.spacing.xs,
                    color: canReachSupabase ? theme.colors.success : theme.colors.error,
                  }}
                >
                  {canReachSupabase ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body">Network Quality</Text>
              <Badge 
                text={networkQuality.toUpperCase()} 
                variant={networkQuality === 'excellent' || networkQuality === 'good' ? 'success' : 
                       networkQuality === 'fair' ? 'warning' : 'error'}
                size="sm"
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body">Speed</Text>
              <Text variant="body" style={{ color: getQualityColor(networkSpeed) }}>
                {networkSpeed.toUpperCase()} ({latency}ms)
              </Text>
            </View>
          </View>
        </View>

        {/* Sync Status */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Sync Status
          </Text>
          
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body">Last Sync</Text>
              <Text variant="body" color="secondary">
                {formatLastSync(lastSync)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body">Pending Items</Text>
              <Badge 
                text={queuedItems.toString()} 
                variant={queuedItems > 0 ? 'warning' : 'success'}
                size="sm"
              />
            </View>

            {error && (
              <View style={{
                backgroundColor: theme.colors.error + '10',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                marginTop: theme.spacing.sm,
              }}>
                <Text variant="caption" color="error">
                  {error}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Storage Stats */}
        {storageStats && (
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
          }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Offline Storage
            </Text>
            
            <View style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="body">Cached Listings</Text>
                <Text variant="body" color="secondary">
                  {storageStats.listings}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="body">Cached Messages</Text>
                <Text variant="body" color="secondary">
                  {storageStats.messages}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="body">Storage Used</Text>
                <Text variant="body" color="secondary">
                  {storageStats.totalSizeKB} KB
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            variant="secondary"
            onPress={onClose}
            style={{ flex: 1 }}
          >
            Close
          </Button>
          
          <Button
            variant="primary"
            onPress={onSync}
            disabled={!canReachSupabase || syncInProgress}
            loading={syncInProgress}
            style={{ flex: 1 }}
            leftIcon={<RefreshCw size={16} color="white" />}
          >
            Sync Now
          </Button>
        </View>
      </View>
    </AppModal>
  );
}

// Compact version for status bars
export function CompactOfflineIndicator() {
  const { isConnected, networkQuality, queuedItems } = useNetworkAware();
  const { theme } = useTheme();

  if (isConnected && networkQuality !== 'poor' && queuedItems === 0) {
    return null;
  }

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.warning + '15',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    }}>
      {!isConnected ? (
        <WifiOff size={12} color={theme.colors.error} />
      ) : (
        <Signal size={12} color={theme.colors.warning} />
      )}
      
      <Text 
        variant="caption" 
        style={{ 
          marginLeft: theme.spacing.xs,
          color: theme.colors.warning,
          fontSize: 10,
        }}
      >
        {!isConnected ? 'Offline' : queuedItems > 0 ? `${queuedItems}` : 'Slow'}
      </Text>
    </View>
  );
}
