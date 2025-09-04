import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useConversations } from '@/hooks/useChat';
import { usePresence } from '@/hooks/usePresence';
import { useChatStore } from '@/store/useChatStore';
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
import { MessageCircle, Plus, Users } from 'lucide-react-native';

export default function InboxScreen() {
  const { theme } = useTheme();
  const { conversations, loading, error, refresh } = useConversations();
  const { unreadCounts } = useChatStore();
  const { isUserOnline, getTypingUsers } = usePresence();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Transform database conversations to component format
  const transformedConversations = conversations.map((conv: any) => {
    const otherParticipant = conv.participant_1_profile?.id === conv.participant_1 
      ? conv.participant_2_profile 
      : conv.participant_1_profile;
    
    const lastMessage = conv.messages?.[0];
    const typingUsers = getTypingUsers(conv.id);
    const isOtherUserTyping = typingUsers.includes(otherParticipant?.id);
    
    return {
      id: conv.id,
      title: `${otherParticipant?.first_name} ${otherParticipant?.last_name}`,
      subtitle: conv.listings?.title ? `About ${conv.listings.title}` : 'General conversation',
      description: isOtherUserTyping 
        ? 'typing...' 
        : lastMessage?.content || 'No messages yet',
      timestamp: new Date(conv.last_message_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      unreadCount: unreadCounts[conv.id] || 0,
      avatar: {
        name: `${otherParticipant?.first_name} ${otherParticipant?.last_name}`,
        source: otherParticipant?.avatar_url,
        isOnline: isUserOnline(otherParticipant?.id),
      },
      listing: conv.listings ? {
        title: conv.listings.title,
        price: conv.listings.price,
        image: conv.listings.images?.[0],
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
        title="Inbox"
        rightActions={[
          <Button
            variant="icon"
            icon={<Plus size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // TODO: Implement new conversation
              Alert.alert('Coming Soon', 'Start new conversation feature will be available soon');
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
                <ListItem
                  title={conversation.title}
                  subtitle={conversation.listing?.title}
                  description={conversation.isTyping 
                    ? conversation.description
                    : conversation.description
                  }
                  timestamp={conversation.timestamp}
                  unreadCount={conversation.unreadCount}
                  avatar={conversation.avatar}
                  showChevron
                  onPress={() => {
                    router.push(`/(tabs)/inbox/${conversation.id}`);
                  }}
                  style={{
                    backgroundColor: conversation.isTyping 
                      ? theme.colors.primary + '05'
                      : theme.colors.surface,
                  }}
                />

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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Text variant="caption" color="muted">
                        💼 {conversation.listing.title}
                      </Text>
                      <Text variant="caption" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                        GHS {conversation.listing.price.toLocaleString()}
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
              onPress: () => router.push('/(tabs)'),
            }}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}
