import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { useConversations } from '@/hooks/useChat';
import { usePresence } from '@/hooks/usePresence';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  SearchBar,
  ListItem,
  EmptyState,
  ErrorState,
  ChatListSkeleton,
  Button,
  Badge,
} from '@/components';
import { MessageCircle, Plus, Users, CheckSquare, Square, Trash2, Mail, MailOpen, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function InboxScreen() {
  const { theme } = useTheme();
  const { conversations, loading, error, refresh } = useConversations();
  const { unreadCounts, markAsUnread, clearManuallyMarkedAsUnread } = useChatStore();
  const { isUserOnline, getTypingUsers } = usePresence();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Bulk operations state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState({
    markAsRead: false,
    markAsUnread: false,
    delete: false,
  });
  const [longPressedItem, setLongPressedItem] = useState<string | null>(null);
  
  // Animation state
  const bulkActionsOpacity = useRef(new Animated.Value(0)).current;
  const bulkActionsTranslateY = useRef(new Animated.Value(-20)).current;

  // Animate bulk actions when selection changes
  useEffect(() => {
    if (isSelectionMode && selectedConversations.size > 0) {
      Animated.parallel([
        Animated.timing(bulkActionsOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bulkActionsTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bulkActionsOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bulkActionsTranslateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelectionMode, selectedConversations.size]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Bulk operation functions
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedConversations(new Set());
  };

  const toggleConversationSelection = (conversationId: string) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const selectAllConversations = () => {
    const allIds = new Set(filteredConversations.map(conv => conv.id));
    setSelectedConversations(allIds);
  };

  const clearSelection = () => {
    setSelectedConversations(new Set());
  };

  const handleLongPress = (conversationId: string) => {
    // Provide haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptic feedback not available on this device
    }
    
    // Set visual feedback
    setLongPressedItem(conversationId);
    
    // Clear visual feedback after a short delay
    setTimeout(() => {
      setLongPressedItem(null);
    }, 200);
    
    // Enter selection mode if not already in it
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
    
    // Pre-select the long-pressed item
    const newSelected = new Set(selectedConversations);
    newSelected.add(conversationId);
    setSelectedConversations(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedConversations.size === 0) return;

    Alert.alert(
      'Delete Conversations',
      `Are you sure you want to delete ${selectedConversations.size} conversation${selectedConversations.size > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBulkActionLoading(prev => ({ ...prev, delete: true }));
            try {
              console.log('🎯 Bulk delete - selected conversations:', Array.from(selectedConversations));
              
              // Check if these conversations exist
              const { data: existingConversations, error: checkError } = await supabase
                .from('conversations')
                .select('id, participant_1, participant_2')
                .in('id', Array.from(selectedConversations));

              console.log('🎯 Existing conversations found:', existingConversations?.length || 0);

              const { data, error } = await supabase
                .from('conversations')
                .delete()
                .in('id', Array.from(selectedConversations))
                .select();

              console.log('🎯 Bulk delete result:', { data, error });

              if (error) {
                Alert.alert('Error', 'Failed to delete conversations');
                console.error('Bulk delete error:', error);
              } else {
                console.log('🎯 Successfully deleted conversations, count:', data?.length || 0);
                
                // Clear local unread counts for deleted conversations
                const { setUnreadCount } = useChatStore.getState();
                Array.from(selectedConversations).forEach(convId => {
                  setUnreadCount(convId, 0);
                });
                
                clearSelection();
                setIsSelectionMode(false);
                await refresh(true); // Skip loading state
              }
            } catch (err) {
              Alert.alert('Error', 'An unexpected error occurred');
              console.error('Bulk delete error:', err);
            } finally {
              setBulkActionLoading(prev => ({ ...prev, delete: false }));
            }
          },
        },
      ]
    );
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedConversations.size === 0) return;

    console.log('🎯 Bulk mark as read - selected conversations:', Array.from(selectedConversations));
    setBulkActionLoading(prev => ({ ...prev, markAsRead: true }));
    
    try {
      // Check what unread messages exist in these conversations
      const { data: unreadMessages, error: checkError } = await supabase
        .from('messages')
        .select('id, conversation_id, read_at, sender_id')
        .in('conversation_id', Array.from(selectedConversations))
        .is('read_at', null);

      console.log('🎯 Unread messages found:', unreadMessages?.length || 0);

      // Mark messages as read for selected conversations
      const { data, error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('conversation_id', Array.from(selectedConversations))
        .is('read_at', null)
        .select();

      console.log('🎯 Bulk mark as read result:', { data, error });

      if (error) {
        Alert.alert('Error', 'Failed to mark messages as read');
        console.error('Bulk mark as read error:', error);
      } else {
        console.log('🎯 Successfully marked messages as read, count:', data?.length || 0);
        
        // Clear manually marked as unread flag since we're marking as read
        Array.from(selectedConversations).forEach(convId => {
          console.log('🧹 Clearing manual tracking for conversation:', convId);
          clearManuallyMarkedAsUnread(convId);
        });
        
        // Update local unread counts immediately for smooth UX
        const { setUnreadCount } = useChatStore.getState();
        Array.from(selectedConversations).forEach(convId => {
          setUnreadCount(convId, 0);
        });
        
        clearSelection();
        setIsSelectionMode(false);
        
        // Refresh conversations without showing skeleton
        console.log('🔄 Refreshing conversations after bulk mark as read');
        await refresh(true); // Skip loading state
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Bulk mark as read error:', err);
    } finally {
      setBulkActionLoading(prev => ({ ...prev, markAsRead: false }));
    }
  };

  const handleBulkMarkAsUnread = async () => {
    if (selectedConversations.size === 0) return;

    console.log('🎯 Bulk mark as unread - selected conversations:', Array.from(selectedConversations));
    setBulkActionLoading(prev => ({ ...prev, markAsUnread: true }));
    
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Check what read messages exist in these conversations (excluding user's own messages)
      const { data: readMessages, error: checkError } = await supabase
        .from('messages')
        .select('id, conversation_id, read_at, sender_id')
        .in('conversation_id', Array.from(selectedConversations))
        .not('read_at', 'is', null)
        .neq('sender_id', user.id); // Exclude user's own messages

      console.log('🎯 Read messages found (excluding own):', readMessages?.length || 0);

      // Mark messages as unread for selected conversations (excluding user's own messages)
      const { data, error } = await supabase
        .from('messages')
        .update({ read_at: null })
        .in('conversation_id', Array.from(selectedConversations))
        .not('read_at', 'is', null)
        .neq('sender_id', user.id) // Exclude user's own messages
        .select();

      console.log('🎯 Bulk mark as unread result:', { data, error });

      if (error) {
        Alert.alert('Error', 'Failed to mark messages as unread');
        console.error('Bulk mark as unread error:', error);
      } else {
        console.log('🎯 Successfully marked messages as unread, count:', data?.length || 0);
        
        // Mark conversations as manually unread to prevent auto-marking as read
        Array.from(selectedConversations).forEach(convId => {
          markAsUnread(convId);
        });
        
        // Update local unread counts immediately for smooth UX
        const { setUnreadCount } = useChatStore.getState();
        Array.from(selectedConversations).forEach(convId => {
          // Set a placeholder count - the actual count will be updated by refresh
          setUnreadCount(convId, 1);
        });
        
        clearSelection();
        setIsSelectionMode(false);
        await refresh(true); // Skip loading state
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Bulk mark as unread error:', err);
    } finally {
      setBulkActionLoading(prev => ({ ...prev, markAsUnread: false }));
    }
  };

  // Transform database conversations to component format
  const transformedConversations = conversations.map((conv: any) => {
    // Get the other participant (not the current user)
    const { user } = useAuthStore.getState();
    
    const otherParticipant = conv.participant_1 === user?.id 
      ? conv.participant_2_profile 
      : conv.participant_1_profile;
    
    const lastMessage = conv.messages?.[0];
    const typingUsers = getTypingUsers(conv.id);
    const isOtherUserTyping = typingUsers.includes(otherParticipant?.id);
    
    // Ensure all text values are properly handled
    const safeTitle = otherParticipant 
      ? `${otherParticipant.first_name || 'User'} ${otherParticipant.last_name || ''}`.trim()
      : 'Anonymous User';
    
    const safeSubtitle = conv.listing?.title ? `About ${String(conv.listing.title)}` : 'General conversation';
    
    const safeDescription = isOtherUserTyping 
      ? 'typing...' 
      : (lastMessage?.content ? String(lastMessage.content) : 'No messages yet');
    
    return {
      id: conv.id,
      title: safeTitle,
      subtitle: safeSubtitle,
      description: safeDescription,
      timestamp: conv.last_message_at 
        ? new Date(conv.last_message_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        : '',
      unreadCount: unreadCounts[conv.id] || 0,
      avatar: {
        name: safeTitle,
        source: otherParticipant?.avatar_url,
        isOnline: isUserOnline(otherParticipant?.id),
      },
      listing: conv.listing ? {
        title: String(conv.listing.title),
        price: conv.listing.price,
        image: conv.listing.images?.[0],
      } : null,
      isTyping: isOtherUserTyping,
    };
  });

  const filteredConversations = transformedConversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.listing?.title && conv.listing.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={isSelectionMode ? `${selectedConversations.size} selected` : "Inbox"}
        subtitle={isSelectionMode ? "Tap conversations to select" : undefined}
        rightActions={isSelectionMode ? [
          // Selection mode actions
          selectedConversations.size > 0 && (
            <Button
              key="select-all"
              variant="icon"
              size="sm"
              icon={<CheckSquare size={20} color={theme.colors.primary} />}
              onPress={selectAllConversations}
              style={{
                backgroundColor: theme.colors.primary + '15',
                borderRadius: 20,
              }}
            />
          ),
          <Button
            key="cancel"
            variant="icon"
            size="sm"
            icon={<X size={20} color={theme.colors.text.primary} />}
            onPress={toggleSelectionMode}
            style={{
              backgroundColor: theme.colors.error + '15',
              borderRadius: 20,
            }}
          />,
        ].filter(Boolean) : [
          // Normal mode actions
          <Button
            key="select"
            variant="icon"
            size="sm"
            icon={<CheckSquare size={20} color={theme.colors.text.primary} />}
            onPress={toggleSelectionMode}
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 20,
            }}
          />,
          <Button
            key="new"
            variant="icon"
            size="sm"
            icon={<Plus size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // TODO: Implement new conversation
              Alert.alert('Coming Soon', 'Start new conversation feature will be available soon');
            }}
            style={{
              backgroundColor: theme.colors.primary + '15',
              borderRadius: 20,
            }}
          />,
        ]}
      />

      <View style={{ flex: 1 }}>
        {/* Search */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations..."
          showFilter={false}
        />

        {/* Bulk Action Buttons */}
        {isSelectionMode && selectedConversations.size > 0 && (
          <Animated.View style={{
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            opacity: bulkActionsOpacity,
            transform: [{ translateY: bulkActionsTranslateY }],
          }}>
            <View style={{
              flexDirection: 'row',
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
              gap: theme.spacing.xs,
            }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<MailOpen size={14} color={theme.colors.primary} />}
                onPress={handleBulkMarkAsRead}
                loading={bulkActionLoading.markAsRead}
                style={{ 
                  flex: 1,
                  backgroundColor: theme.colors.primary + '10',
                  borderColor: theme.colors.primary + '30',
                  borderWidth: 1,
                  shadowOpacity: 0,
                  elevation: 0,
                }}
              >
                Read
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Mail size={14} color={theme.colors.warning} />}
                onPress={handleBulkMarkAsUnread}
                loading={bulkActionLoading.markAsUnread}
                style={{ 
                  flex: 1,
                  backgroundColor: theme.colors.warning + '10',
                  borderColor: theme.colors.warning + '30',
                  borderWidth: 1,
                  shadowOpacity: 0,
                  elevation: 0,
                }}
              >
                Unread
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Trash2 size={14} color={theme.colors.error} />}
                onPress={handleBulkDelete}
                loading={bulkActionLoading.delete}
                style={{ 
                  flex: 1,
                  backgroundColor: theme.colors.error + '10',
                  borderColor: theme.colors.error + '30',
                  borderWidth: 1,
                  shadowOpacity: 0,
                  elevation: 0,
                }}
              >
                Delete
              </Button>
            </View>
          </Animated.View>
        )}

        {/* Conversations List */}
        {loading ? (
          <View style={{ flex: 1 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <ChatListSkeleton key={index} />
            ))}
          </View>
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={refresh}
          />
        ) : filteredConversations.length > 0 ? (
          <ScrollView 
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          >
            {filteredConversations.map((conversation) => (
              <View key={conversation.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <TouchableOpacity
                      onPress={() => toggleConversationSelection(conversation.id)}
                      onLongPress={() => handleLongPress(conversation.id)}
                      style={{
                        padding: theme.spacing.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ scale: longPressedItem === conversation.id ? 1.1 : 1 }],
                      }}
                      activeOpacity={0.7}
                    >
                      {selectedConversations.has(conversation.id) ? (
                        <CheckSquare size={24} color={theme.colors.primary} />
                      ) : (
                        <Square size={24} color={theme.colors.text.muted} />
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {/* Conversation Item */}
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (isSelectionMode) {
                          toggleConversationSelection(conversation.id);
                        } else {
                          router.push(`/(tabs)/inbox/${conversation.id}`);
                        }
                      }}
                      onLongPress={() => handleLongPress(conversation.id)}
                      delayLongPress={500}
                      activeOpacity={0.7}
                    >
                      <ListItem
                        title={String(conversation.title)}
                        subtitle={conversation.listing?.title ? String(conversation.listing.title) : undefined}
                        description={String(conversation.description)}
                        timestamp={conversation.timestamp}
                        unreadCount={conversation.unreadCount}
                        avatar={conversation.avatar}
                        showChevron={!isSelectionMode}
                        onPress={undefined} // Remove onPress from ListItem since TouchableOpacity handles it
                        style={{
                          backgroundColor: longPressedItem === conversation.id
                            ? theme.colors.primary + '15'
                            : conversation.isTyping 
                            ? theme.colors.primary + '05'
                            : selectedConversations.has(conversation.id)
                            ? theme.colors.primary + '08'
                            : theme.colors.surface,
                          borderLeftWidth: selectedConversations.has(conversation.id) ? 3 : 0,
                          borderLeftColor: selectedConversations.has(conversation.id) ? theme.colors.primary : 'transparent',
                          marginHorizontal: selectedConversations.has(conversation.id) ? theme.spacing.xs : 0,
                          borderRadius: selectedConversations.has(conversation.id) ? theme.borderRadius.md : 0,
                          shadowColor: selectedConversations.has(conversation.id) ? theme.colors.primary : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: selectedConversations.has(conversation.id) ? 2 : 0,
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Listing Context */}
                {conversation.listing && (
                  <View
                    style={{
                      backgroundColor: theme.colors.surfaceVariant,
                      marginHorizontal: theme.spacing.lg,
                      marginTop: -theme.spacing.sm,
                      marginBottom: theme.spacing.sm,
                      padding: theme.spacing.md,
                      borderRadius: theme.borderRadius.md,
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text 
                        variant="caption" 
                        color="muted"
                        numberOfLines={1}
                        style={{ flex: 1, marginRight: theme.spacing.sm }}
                      >
                        💼 {String(conversation.listing.title)}
                      </Text>
                      <Text 
                        variant="caption" 
                        style={{ 
                          color: theme.colors.primary, 
                          fontWeight: '600',
                          flexShrink: 0
                        }}
                      >
                        GHS {(conversation.listing.price || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon={<MessageCircle size={64} color={theme.colors.text.muted} />}
            title="No conversations yet"
            description="Start chatting with sellers to see your conversations here."
            action={{
              text: 'Browse Products',
              onPress: () => router.push('/(tabs)/home'),
            }}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}
