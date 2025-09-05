/**
 * Security Dashboard Component
 * Shows security events, device management, and security status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { securityService, DeviceInfo, SecurityEvent } from '../../lib/securityService';

interface SecurityDashboardProps {
  onSecurityEventPress?: (event: SecurityEvent) => void;
}

export function SecurityDashboard({ onSecurityEventPress }: SecurityDashboardProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityScore, setSecurityScore] = useState(0);

  useEffect(() => {
    loadSecurityData();
    
    // Listen for security events
    const handleSecurityEvent = (event: SecurityEvent) => {
      setSecurityEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
    };
    
    securityService.addSecurityEventListener(handleSecurityEvent);
    
    return () => {
      securityService.removeSecurityEventListener(handleSecurityEvent);
    };
  }, []);

  const loadSecurityData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Load devices and security events in parallel
      const [devicesData, eventsData] = await Promise.all([
        securityService.getUserDevices(user.id),
        loadSecurityEvents(),
      ]);
      
      setDevices(devicesData);
      setSecurityEvents(eventsData);
      setSecurityScore(calculateSecurityScore(devicesData, eventsData));
      
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityEvents = async (): Promise<SecurityEvent[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading security events:', error);
        return [];
      }

      return (data || []).map(event => ({
        id: event.id,
        userId: event.user_id,
        eventType: event.event_type as SecurityEvent['eventType'],
        deviceFingerprint: event.device_fingerprint || '',
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        location: event.location,
        timestamp: new Date(event.created_at),
        metadata: event.metadata,
      }));

    } catch (error) {
      console.error('Error loading security events:', error);
      return [];
    }
  };

  const calculateSecurityScore = (devices: DeviceInfo[], events: SecurityEvent[]): number => {
    let score = 100;
    
    // Deduct points for suspicious activities
    const recentSuspiciousEvents = events.filter(
      event => event.eventType === 'suspicious_activity' && 
      Date.now() - event.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );
    
    score -= recentSuspiciousEvents.length * 10;
    
    // Deduct points for failed logins
    const recentFailedLogins = events.filter(
      event => event.eventType === 'failed_login' && 
      Date.now() - event.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    score -= recentFailedLogins.length * 5;
    
    // Deduct points for too many devices
    if (devices.length > 5) {
      score -= (devices.length - 5) * 5;
    }
    
    // Deduct points for untrusted devices
    const untrustedDevices = devices.filter(device => !device.isTrusted);
    score -= untrustedDevices.length * 10;
    
    return Math.max(0, Math.min(100, score));
  };

  const handleRevokeDevice = (device: DeviceInfo) => {
    Alert.alert(
      'Revoke Device Access',
      `Are you sure you want to revoke access for "${device.name}"? This will sign out the device immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Access',
          style: 'destructive',
          onPress: () => revokeDeviceAccess(device),
        },
      ]
    );
  };

  const revokeDeviceAccess = async (device: DeviceInfo) => {
    if (!user?.id) return;

    try {
      const success = await securityService.revokeDeviceAccess(user.id, device.fingerprint);
      
      if (success) {
        setDevices(prev => prev.filter(d => d.fingerprint !== device.fingerprint));
        Alert.alert('Success', 'Device access has been revoked.');
      } else {
        Alert.alert('Error', 'Failed to revoke device access. Please try again.');
      }
    } catch (error) {
      console.error('Error revoking device access:', error);
      Alert.alert('Error', 'Failed to revoke device access. Please try again.');
    }
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Logout All Devices',
      'This will sign out all devices except the current one. You will need to sign in again on other devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: logoutAllDevices,
        },
      ]
    );
  };

  const logoutAllDevices = async () => {
    if (!user?.id) return;

    try {
      const success = await securityService.forceLogoutAllDevices(user.id);
      
      if (success) {
        await loadSecurityData(); // Refresh data
        Alert.alert('Success', 'All devices have been signed out.');
      } else {
        Alert.alert('Error', 'Failed to sign out all devices. Please try again.');
      }
    } catch (error) {
      console.error('Error logging out all devices:', error);
      Alert.alert('Error', 'Failed to sign out all devices. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSecurityData();
    setRefreshing(false);
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success || '#4CAF50';
    if (score >= 60) return theme.colors.warning || '#FF9800';
    return theme.colors.error;
  };

  const getEventIcon = (eventType: SecurityEvent['eventType']) => {
    switch (eventType) {
      case 'login':
        return 'log-in-outline';
      case 'failed_login':
        return 'warning-outline';
      case 'logout':
        return 'log-out-outline';
      case 'password_change':
        return 'key-outline';
      case 'suspicious_activity':
        return 'alert-circle-outline';
      case 'device_change':
        return 'phone-portrait-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const formatEventDescription = (event: SecurityEvent) => {
    switch (event.eventType) {
      case 'login':
        return 'Successful login';
      case 'failed_login':
        return 'Failed login attempt';
      case 'logout':
        return 'Logged out';
      case 'password_change':
        return 'Password changed';
      case 'suspicious_activity':
        return 'Suspicious activity detected';
      case 'device_change':
        return 'Device access changed';
      default:
        return (event.eventType as string).replace('_', ' ');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
          Loading security dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Security Score */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.scoreHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Security Score
          </Text>
          <View style={[styles.scoreCircle, { borderColor: getSecurityScoreColor(securityScore) }]}>
            <Text style={[styles.scoreText, { color: getSecurityScoreColor(securityScore) }]}>
              {securityScore}
            </Text>
          </View>
        </View>
        <Text style={[styles.scoreDescription, { color: theme.colors.textSecondary }]}>
          {securityScore >= 80 ? 'Excellent security' : 
           securityScore >= 60 ? 'Good security, consider improvements' : 
           'Security needs attention'}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Quick Actions
        </Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, { borderColor: theme.colors.border }]}
          onPress={handleLogoutAllDevices}
        >
          <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
          <Text style={[styles.actionText, { color: theme.colors.text.primary }]}>
            Logout All Devices
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Devices */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Your Devices ({devices.length})
        </Text>
        
        {devices.map((device, index) => (
          <View key={device.fingerprint} style={styles.deviceItem}>
            <View style={styles.deviceInfo}>
              <Ionicons 
                name={device.isCurrentDevice ? "phone-portrait" : "phone-portrait-outline"} 
                size={24} 
                color={device.isCurrentDevice ? theme.colors.primary : theme.colors.textSecondary} 
              />
              <View style={styles.deviceText}>
                <Text style={[styles.deviceName, { color: theme.colors.text.primary }]}>
                  {device.name}
                  {device.isCurrentDevice && (
                    <Text style={[styles.currentDevice, { color: theme.colors.primary }]}>
                      {' '}(Current)
                    </Text>
                  )}
                </Text>
                <Text style={[styles.deviceDetails, { color: theme.colors.textSecondary }]}>
                  {device.platform} • Last seen {device.lastSeen.toLocaleDateString()}
                </Text>
                {device.isTrusted && (
                  <View style={styles.trustedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={theme.colors.success || '#4CAF50'} />
                    <Text style={[styles.trustedText, { color: theme.colors.success || '#4CAF50' }]}>
                      Trusted
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {!device.isCurrentDevice && (
              <TouchableOpacity
                style={[styles.revokeButton, { borderColor: theme.colors.error }]}
                onPress={() => handleRevokeDevice(device)}
              >
                <Text style={[styles.revokeText, { color: theme.colors.error }]}>
                  Revoke
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {devices.length === 0 && (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No devices found
          </Text>
        )}
      </View>

      {/* Recent Security Events */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Recent Activity
        </Text>
        
        {securityEvents.map((event, index) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventItem}
            onPress={() => onSecurityEventPress?.(event)}
          >
            <Ionicons 
              name={getEventIcon(event.eventType) as any} 
              size={20} 
              color={event.eventType.includes('failed') || event.eventType === 'suspicious_activity' 
                ? theme.colors.error 
                : theme.colors.primary
              } 
            />
            <View style={styles.eventText}>
              <Text style={[styles.eventTitle, { color: theme.colors.text.primary }]}>
                {formatEventDescription(event)}
              </Text>
              <Text style={[styles.eventTime, { color: theme.colors.textSecondary }]}>
                {event.timestamp.toLocaleString()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
        
        {securityEvents.length === 0 && (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No recent security events
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreDescription: {
    fontSize: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceText: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  currentDevice: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  trustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustedText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  revokeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
  },
  revokeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  eventText: {
    marginLeft: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
  },
});
