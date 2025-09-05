/**
 * Moderation Dashboard Component
 * Admin interface for content moderation
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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { contentModerationService, ModerationQueueItem } from '../../lib/contentModerationService';

interface ModerationStats {
  totalItems: number;
  pendingItems: number;
  approvedItems: number;
  rejectedItems: number;
  flagsByType: Record<string, number>;
}

interface ModerationDashboardProps {
  isAdmin?: boolean;
}

export function ModerationDashboard({ isAdmin = false }: ModerationDashboardProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    totalItems: 0,
    pendingItems: 0,
    approvedItems: 0,
    rejectedItems: 0,
    flagsByType: {},
  });
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected' | 'escalated'>('approved');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (isAdmin) {
      loadModerationData();
    }
  }, [isAdmin, filterStatus, filterType]);

  const loadModerationData = async () => {
    try {
      setLoading(true);
      
      // Load queue items and stats in parallel
      const [items, statistics] = await Promise.all([
        contentModerationService.getModerationQueue({
          status: filterStatus === 'all' ? undefined : filterStatus,
          contentType: filterType === 'all' ? undefined : filterType,
          limit: 50,
        }),
        contentModerationService.getModerationStats('week'),
      ]);
      
      setQueueItems(items);
      setStats(statistics);
      
    } catch (error) {
      console.error('Error loading moderation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadModerationData();
    setRefreshing(false);
  };

  const handleItemPress = (item: ModerationQueueItem) => {
    setSelectedItem(item);
    setShowReviewModal(true);
    setReviewNotes('');
    setReviewDecision('approved');
  };

  const handleReviewSubmit = async () => {
    if (!selectedItem || !user?.id) return;

    try {
      const success = await contentModerationService.reviewModerationItem(
        selectedItem.id,
        reviewDecision,
        user.id,
        reviewNotes
      );

      if (success) {
        setShowReviewModal(false);
        setSelectedItem(null);
        await loadModerationData(); // Refresh data
        
        Alert.alert(
          'Review Submitted',
          `Content has been ${reviewDecision}.`
        );
      } else {
        Alert.alert('Error', 'Failed to submit review. Please try again.');
      }

    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return theme.colors.success || '#4CAF50';
      case 'rejected':
        return theme.colors.error;
      case 'escalated':
        return theme.colors.warning || '#FF9800';
      default:
        return theme.colors.primary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'escalated':
        return 'warning';
      default:
        return 'hourglass';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return theme.colors.error;
    if (priority >= 3) return theme.colors.warning || '#FF9800';
    return theme.colors.textSecondary;
  };

  const formatContentType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="shield-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={[styles.noAccessText, { color: theme.colors.textSecondary }]}>
          Admin access required
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
          Loading moderation dashboard...
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
      {/* Statistics */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Moderation Statistics (Last 7 Days)
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {stats.totalItems}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Items
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.warning || '#FF9800' }]}>
              {stats.pendingItems}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Pending
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.success || '#4CAF50' }]}>
              {stats.approvedItems}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Approved
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.error }]}>
              {stats.rejectedItems}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Rejected
            </Text>
          </View>
        </View>

        {/* Flag Types */}
        {Object.keys(stats.flagsByType).length > 0 && (
          <View style={styles.flagsSection}>
            <Text style={[styles.flagsTitle, { color: theme.colors.text.primary }]}>
              Common Flags
            </Text>
            <View style={styles.flagsGrid}>
              {Object.entries(stats.flagsByType).map(([type, count]) => (
                <View key={type} style={styles.flagItem}>
                  <Text style={[styles.flagType, { color: theme.colors.text.primary }]}>
                    {type.replace('_', ' ')}
                  </Text>
                  <Text style={[styles.flagCount, { color: theme.colors.textSecondary }]}>
                    {count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Filters */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Filters
        </Text>
        
        <View style={styles.filtersRow}>
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.colors.text.primary }]}>
              Status
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterOptions}>
                {['all', 'pending', 'approved', 'rejected', 'escalated'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: filterStatus === status 
                          ? theme.colors.primary 
                          : theme.colors.background,
                        borderColor: theme.colors.border,
                      }
                    ]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      {
                        color: filterStatus === status 
                          ? 'white' 
                          : theme.colors.text.primary
                      }
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.colors.text.primary }]}>
              Content Type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterOptions}>
                {['all', 'listing', 'post', 'comment', 'message', 'profile'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: filterType === type 
                          ? theme.colors.primary 
                          : theme.colors.background,
                        borderColor: theme.colors.border,
                      }
                    ]}
                    onPress={() => setFilterType(type)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      {
                        color: filterType === type 
                          ? 'white' 
                          : theme.colors.text.primary
                      }
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Moderation Queue */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Moderation Queue ({queueItems.length})
        </Text>
        
        {queueItems.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No items in the moderation queue
          </Text>
        ) : (
          queueItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.queueItem, { borderBottomColor: theme.colors.border }]}
              onPress={() => handleItemPress(item)}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <View style={styles.itemType}>
                    <Ionicons 
                      name={getStatusIcon(item.status) as any} 
                      size={16} 
                      color={getStatusColor(item.status)} 
                    />
                    <Text style={[styles.itemTypeText, { color: theme.colors.text.primary }]}>
                      {formatContentType(item.contentType)}
                    </Text>
                  </View>
                  
                  <View style={styles.itemMeta}>
                    <View style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(item.priority) + '20' }
                    ]}>
                      <Text style={[
                        styles.priorityText,
                        { color: getPriorityColor(item.priority) }
                      ]}>
                        P{item.priority}
                      </Text>
                    </View>
                    
                    <Text style={[styles.itemDate, { color: theme.colors.textSecondary }]}>
                      {item.createdAt.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={theme.colors.textSecondary} 
                />
              </View>
              
              <Text style={[styles.itemContent, { color: theme.colors.text.primary }]}>
                {truncateContent(item.content)}
              </Text>
              
              {item.flags.length > 0 && (
                <View style={styles.flagsContainer}>
                  {item.flags.slice(0, 3).map((flag, index) => (
                    <View key={index} style={[
                      styles.flagBadge,
                      { backgroundColor: theme.colors.error + '20' }
                    ]}>
                      <Text style={[styles.flagBadgeText, { color: theme.colors.error }]}>
                        {flag.type}
                      </Text>
                    </View>
                  ))}
                  {item.flags.length > 3 && (
                    <Text style={[styles.moreFlagsText, { color: theme.colors.textSecondary }]}>
                      +{item.flags.length - 3} more
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Review Content
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.contentPreview}>
                  <Text style={[styles.contentType, { color: theme.colors.textSecondary }]}>
                    {formatContentType(selectedItem.contentType)}
                  </Text>
                  <Text style={[styles.contentText, { color: theme.colors.text.primary }]}>
                    {selectedItem.content}
                  </Text>
                  
                  {selectedItem.images.length > 0 && (
                    <Text style={[styles.imagesNote, { color: theme.colors.textSecondary }]}>
                      Contains {selectedItem.images.length} image(s)
                    </Text>
                  )}
                </View>

                <View style={styles.decisionSection}>
                  <Text style={[styles.decisionTitle, { color: theme.colors.text.primary }]}>
                    Decision
                  </Text>
                  
                  <View style={styles.decisionOptions}>
                    {(['approved', 'rejected', 'escalated'] as const).map((decision) => (
                      <TouchableOpacity
                        key={decision}
                        style={[
                          styles.decisionOption,
                          {
                            backgroundColor: reviewDecision === decision 
                              ? theme.colors.primary 
                              : theme.colors.background,
                            borderColor: theme.colors.border,
                          }
                        ]}
                        onPress={() => setReviewDecision(decision)}
                      >
                        <Text style={[
                          styles.decisionText,
                          {
                            color: reviewDecision === decision 
                              ? 'white' 
                              : theme.colors.text.primary
                          }
                        ]}>
                          {decision.charAt(0).toUpperCase() + decision.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.notesSection}>
                  <Text style={[styles.notesTitle, { color: theme.colors.text.primary }]}>
                    Review Notes (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      {
                        borderColor: theme.colors.border,
                        color: theme.colors.text.primary,
                        backgroundColor: theme.colors.background,
                      }
                    ]}
                    placeholder="Add notes about your decision..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleReviewSubmit}
                >
                  <Text style={styles.submitButtonText}>
                    Submit Review
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
  noAccessText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  flagsSection: {
    marginTop: 16,
  },
  flagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  flagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flagType: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  flagCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  filtersRow: {
    gap: 16,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  queueItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTypeText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemDate: {
    fontSize: 12,
  },
  itemContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  flagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  flagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  flagBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreFlagsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
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
  contentPreview: {
    marginBottom: 24,
  },
  contentType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  imagesNote: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  decisionSection: {
    marginBottom: 24,
  },
  decisionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  decisionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  decisionOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  decisionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
