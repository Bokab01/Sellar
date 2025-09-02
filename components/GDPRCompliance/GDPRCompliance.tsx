/**
 * GDPR Compliance Component
 * Handles data export, deletion requests, and privacy rights
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { dataProtectionService } from '../../lib/dataProtectionService';
import { supabase } from '../../lib/supabase';

interface DataRequest {
  id: string;
  type: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestedAt: Date;
  scheduledFor?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

interface ConsentInfo {
  hasConsent: boolean;
  consentDate?: Date;
  purposes: string[];
}

export function GDPRCompliance() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [consentInfo, setConsentInfo] = useState<ConsentInfo>({
    hasConsent: false,
    purposes: [],
  });
  const [showRetentionPolicy, setShowRetentionPolicy] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    loadGDPRData();
  }, []);

  const loadGDPRData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Load data requests and consent info in parallel
      const [exportRequests, deletionRequests, consent] = await Promise.all([
        loadDataExportRequests(),
        loadDataDeletionRequests(),
        dataProtectionService.checkDataProcessingConsent(user.id),
      ]);

      const allRequests = [...exportRequests, ...deletionRequests];
      setDataRequests(allRequests);
      setConsentInfo(consent);

    } catch (error) {
      console.error('Error loading GDPR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDataExportRequests = async (): Promise<DataRequest[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error loading export requests:', error);
        return [];
      }

      return (data || []).map(request => ({
        id: request.id,
        type: 'export' as const,
        status: request.status,
        requestedAt: new Date(request.requested_at),
        downloadUrl: request.download_url,
        expiresAt: request.expires_at ? new Date(request.expires_at) : undefined,
      }));

    } catch (error) {
      console.error('Error loading export requests:', error);
      return [];
    }
  };

  const loadDataDeletionRequests = async (): Promise<DataRequest[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('data_deletion_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error loading deletion requests:', error);
        return [];
      }

      return (data || []).map(request => ({
        id: request.id,
        type: 'deletion' as const,
        status: request.status,
        requestedAt: new Date(request.requested_at),
        scheduledFor: request.scheduled_for ? new Date(request.scheduled_for) : undefined,
      }));

    } catch (error) {
      console.error('Error loading deletion requests:', error);
      return [];
    }
  };

  const handleDataExportRequest = () => {
    Alert.alert(
      'Request Data Export',
      'We will prepare a complete export of your personal data and send you a download link within 24 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Export', onPress: requestDataExport },
      ]
    );
  };

  const requestDataExport = async () => {
    if (!user?.id) return;

    try {
      setProcessingRequest('export');
      
      const result = await dataProtectionService.requestDataExport(user.id);
      
      if (result.success) {
        Alert.alert(
          'Export Requested',
          'Your data export has been requested. You will receive an email with a download link within 24 hours.'
        );
        await loadGDPRData(); // Refresh the list
      } else {
        Alert.alert('Error', result.error || 'Failed to request data export');
      }

    } catch (error) {
      console.error('Error requesting data export:', error);
      Alert.alert('Error', 'Failed to request data export. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleAccountDeletionRequest = () => {
    Alert.alert(
      'Request Account Deletion',
      'This will permanently delete your account and all associated data after a 30-day grace period. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Deletion',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your account will be scheduled for deletion in 30 days. You can cancel this request during the grace period.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, Delete My Account', style: 'destructive', onPress: requestAccountDeletion },
              ]
            );
          },
        },
      ]
    );
  };

  const requestAccountDeletion = async () => {
    if (!user?.id) return;

    try {
      setProcessingRequest('deletion');
      
      const result = await dataProtectionService.requestAccountDeletion(user.id, 'User requested deletion');
      
      if (result.success) {
        Alert.alert(
          'Deletion Scheduled',
          `Your account has been scheduled for deletion on ${result.scheduledFor?.toLocaleDateString()}. You can cancel this request anytime before then.`
        );
        await loadGDPRData(); // Refresh the list
      } else {
        Alert.alert('Error', result.error || 'Failed to request account deletion');
      }

    } catch (error) {
      console.error('Error requesting account deletion:', error);
      Alert.alert('Error', 'Failed to request account deletion. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCancelDeletion = (request: DataRequest) => {
    Alert.alert(
      'Cancel Account Deletion',
      'Are you sure you want to cancel your account deletion request?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel Deletion', onPress: () => cancelAccountDeletion(request.id) },
      ]
    );
  };

  const cancelAccountDeletion = async (requestId: string) => {
    if (!user?.id) return;

    try {
      const result = await dataProtectionService.cancelAccountDeletion(user.id);
      
      if (result.success) {
        Alert.alert('Deletion Cancelled', 'Your account deletion request has been cancelled.');
        await loadGDPRData(); // Refresh the list
      } else {
        Alert.alert('Error', result.error || 'Failed to cancel deletion request');
      }

    } catch (error) {
      console.error('Error cancelling deletion:', error);
      Alert.alert('Error', 'Failed to cancel deletion request. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success || '#4CAF50';
      case 'processing':
        return theme.colors.warning || '#FF9800';
      case 'failed':
        return theme.colors.error;
      case 'cancelled':
        return theme.colors.textSecondary;
      default:
        return theme.colors.primary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'processing':
        return 'time';
      case 'failed':
        return 'close-circle';
      case 'cancelled':
        return 'ban';
      default:
        return 'hourglass';
    }
  };

  const formatRequestType = (type: string) => {
    return type === 'export' ? 'Data Export' : 'Account Deletion';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading GDPR data...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Your Rights */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Your Privacy Rights
        </Text>
        
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Under GDPR, you have the right to access, rectify, erase, and port your personal data. 
          You can also object to processing and withdraw consent at any time.
        </Text>

        <View style={styles.rightsGrid}>
          <View style={styles.rightItem}>
            <Ionicons name="eye-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.rightTitle, { color: theme.colors.text }]}>
              Right to Access
            </Text>
            <Text style={[styles.rightDescription, { color: theme.colors.textSecondary }]}>
              Request a copy of your data
            </Text>
          </View>

          <View style={styles.rightItem}>
            <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.rightTitle, { color: theme.colors.text }]}>
              Right to Rectify
            </Text>
            <Text style={[styles.rightDescription, { color: theme.colors.textSecondary }]}>
              Correct inaccurate data
            </Text>
          </View>

          <View style={styles.rightItem}>
            <Ionicons name="trash-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.rightTitle, { color: theme.colors.text }]}>
              Right to Erase
            </Text>
            <Text style={[styles.rightDescription, { color: theme.colors.textSecondary }]}>
              Delete your data
            </Text>
          </View>

          <View style={styles.rightItem}>
            <Ionicons name="download-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.rightTitle, { color: theme.colors.text }]}>
              Right to Port
            </Text>
            <Text style={[styles.rightDescription, { color: theme.colors.textSecondary }]}>
              Export your data
            </Text>
          </View>
        </View>
      </View>

      {/* Data Processing Consent */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Data Processing Consent
        </Text>
        
        <View style={styles.consentInfo}>
          <View style={styles.consentStatus}>
            <Ionicons 
              name={consentInfo.hasConsent ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={consentInfo.hasConsent ? theme.colors.success || '#4CAF50' : theme.colors.error} 
            />
            <Text style={[styles.consentText, { color: theme.colors.text }]}>
              {consentInfo.hasConsent ? 'Consent Given' : 'No Consent'}
            </Text>
          </View>
          
          {consentInfo.consentDate && (
            <Text style={[styles.consentDate, { color: theme.colors.textSecondary }]}>
              Last updated: {consentInfo.consentDate.toLocaleDateString()}
            </Text>
          )}
        </View>

        {consentInfo.purposes.length > 0 && (
          <View style={styles.purposes}>
            <Text style={[styles.purposesTitle, { color: theme.colors.text }]}>
              Data processing purposes:
            </Text>
            {consentInfo.purposes.map((purpose, index) => (
              <Text key={index} style={[styles.purposeItem, { color: theme.colors.textSecondary }]}>
                • {purpose}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Data Management Actions */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Data Management
        </Text>
        
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.colors.border }]}
          onPress={handleDataExportRequest}
          disabled={processingRequest === 'export'}
        >
          <Ionicons name="download-outline" size={24} color={theme.colors.primary} />
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
              Request Data Export
            </Text>
            <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>
              Download a complete copy of your personal data
            </Text>
          </View>
          {processingRequest === 'export' && (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.colors.error }]}
          onPress={handleAccountDeletionRequest}
          disabled={processingRequest === 'deletion'}
        >
          <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: theme.colors.error }]}>
              Request Account Deletion
            </Text>
            <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>
              Permanently delete your account and all data
            </Text>
          </View>
          {processingRequest === 'deletion' && (
            <ActivityIndicator size="small" color={theme.colors.error} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.colors.border }]}
          onPress={() => setShowRetentionPolicy(true)}
        >
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
              Data Retention Policy
            </Text>
            <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>
              Learn how long we keep your data
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Request History */}
      {dataRequests.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Request History
          </Text>
          
          {dataRequests.map((request) => (
            <View key={request.id} style={styles.requestItem}>
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <Ionicons 
                    name={getStatusIcon(request.status) as any} 
                    size={20} 
                    color={getStatusColor(request.status)} 
                  />
                  <Text style={[styles.requestType, { color: theme.colors.text }]}>
                    {formatRequestType(request.type)}
                  </Text>
                </View>
                <Text style={[styles.requestStatus, { color: getStatusColor(request.status) }]}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Text>
              </View>
              
              <Text style={[styles.requestDate, { color: theme.colors.textSecondary }]}>
                Requested: {request.requestedAt.toLocaleDateString()}
              </Text>
              
              {request.scheduledFor && (
                <Text style={[styles.requestDate, { color: theme.colors.textSecondary }]}>
                  Scheduled for: {request.scheduledFor.toLocaleDateString()}
                </Text>
              )}
              
              {request.downloadUrl && request.status === 'completed' && (
                <TouchableOpacity style={styles.downloadButton}>
                  <Ionicons name="download" size={16} color={theme.colors.primary} />
                  <Text style={[styles.downloadText, { color: theme.colors.primary }]}>
                    Download
                  </Text>
                </TouchableOpacity>
              )}
              
              {request.type === 'deletion' && request.status === 'pending' && (
                <TouchableOpacity 
                  style={[styles.cancelButton, { borderColor: theme.colors.error }]}
                  onPress={() => handleCancelDeletion(request)}
                >
                  <Text style={[styles.cancelText, { color: theme.colors.error }]}>
                    Cancel Deletion
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Data Retention Policy Modal */}
      <Modal
        visible={showRetentionPolicy}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowRetentionPolicy(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Data Retention Policy
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.policyDescription, { color: theme.colors.textSecondary }]}>
              We retain your personal data only as long as necessary for the purposes outlined in our privacy policy.
            </Text>

            {Object.entries(dataProtectionService.getDataRetentionPolicy()).map(([dataType, policy]) => (
              <View key={dataType} style={[styles.policyItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.policyDataType, { color: theme.colors.text }]}>
                  {dataType}
                </Text>
                <Text style={[styles.policyPeriod, { color: theme.colors.textSecondary }]}>
                  Retention: {policy.retentionPeriod}
                </Text>
                <Text style={[styles.policyReason, { color: theme.colors.textSecondary }]}>
                  Reason: {policy.reason}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  rightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  rightItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
  },
  rightTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  rightDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  consentInfo: {
    marginBottom: 16,
  },
  consentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  consentText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  consentDate: {
    fontSize: 14,
    marginLeft: 32,
  },
  purposes: {
    marginTop: 12,
  },
  purposesTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  purposeItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
  },
  requestItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestType: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  requestStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  requestDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  downloadText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  policyDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  policyItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  policyDataType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  policyPeriod: {
    fontSize: 14,
    marginBottom: 2,
  },
  policyReason: {
    fontSize: 14,
  },
});
