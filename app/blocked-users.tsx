import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useBlockUser } from '@/hooks/useBlockUser';
import { useBlockStore } from '@/store/useBlockStore';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Badge,
  Toast,
} from '@/components';
import { UserMinus, ShieldAlert, Clock } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

interface BlockedUser {
  id: string;
  blocked_id: string;
  reason?: string;
  created_at: string;
  profiles: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

export default function BlockedUsersScreen() {
  const { theme } = useTheme();
  const { getBlockedUsers, unblockUser, loading: actionLoading } = useBlockUser();
  const { removeBlockedUser } = useBlockStore();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchBlockedUsers = async () => {
    const { data, error: fetchError } = await getBlockedUsers();
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }
    setBlockedUsers((data as unknown as BlockedUser[]) || []);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBlockedUsers();
    setRefreshing(false);
  };

  const handleUnblock = (userId: string, userName: string) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${userName}? They will be able to interact with you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            const result = await unblockUser(userId);
            if (result.success) {
              removeBlockedUser(userId);
              setBlockedUsers(prev => prev.filter(u => u.blocked_id !== userId));
              setToastMessage('User unblocked successfully');
              setShowToast(true);
            } else {
              Alert.alert('Error', result.error || 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  const getReasonLabel = (reason?: string) => {
    const reasonMap: Record<string, string> = {
      spam: 'Spam/Scam',
      harassment: 'Harassment',
      inappropriate: 'Inappropriate',
      other: 'Other',
    };
    return reason ? reasonMap[reason] || reason : undefined;
  };

  const getUserName = (user: BlockedUser['profiles']) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.username || 'Unknown User';
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => {
    const userName = getUserName(item.profiles);
    const reasonLabel = getReasonLabel(item.reason);
    const blockedDate = new Date(item.created_at);
    const timeAgo = formatDistanceToNow(blockedDate, { addSuffix: true });

    return (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <TouchableOpacity onPress={() => router.push(`/profile/${item.blocked_id}`)}>
            <Avatar
              name={userName}
              source={item.profiles.avatar_url}
              size="md"
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => router.push(`/profile/${item.blocked_id}`)}>
              <Text variant="body" style={{ fontWeight: '600', marginBottom: 2 }}>
                {userName}
              </Text>
            </TouchableOpacity>

            {reasonLabel && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: 2 }}>
                <ShieldAlert size={14} color={theme.colors.destructive} />
                <Text variant="bodySmall" style={{ color: theme.colors.destructive }}>
                  {reasonLabel}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: 4 }}>
              <Clock size={12} color={theme.colors.textMuted} />
              <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                Blocked {timeAgo}
              </Text>
            </View>
          </View>

          <Button
            variant="outline"
            size="small"
            onPress={() => handleUnblock(item.blocked_id, userName)}
            disabled={actionLoading}
          >
            Unblock
          </Button>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      icon={<UserMinus size={48} color={theme.colors.textMuted} />}
      title="No Blocked Users"
      message="You haven't blocked anyone yet"
    />
  );

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Blocked Users"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={{ padding: theme.spacing.lg }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.md,
              }}
            >
              <LoadingSkeleton width={56} height={56} borderRadius={28} />
              <View style={{ flex: 1 }}>
                <LoadingSkeleton width="60%" height={16} style={{ marginBottom: 8 }} />
                <LoadingSkeleton width="40%" height={12} />
              </View>
              <LoadingSkeleton width={80} height={32} borderRadius={theme.borderRadius.md} />
            </View>
          ))}
        </View>
      </SafeAreaWrapper>
    );
  }

  if (error) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Blocked Users"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ErrorState
          message={error}
          onRetry={fetchBlockedUsers}
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Blocked Users"
        showBackButton
        onBackPress={() => router.back()}
        subtitle={blockedUsers.length > 0 ? `${blockedUsers.length} blocked` : undefined}
      />

      <FlatList
        data={blockedUsers}
        renderItem={renderBlockedUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 2,
        }}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />

      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}

