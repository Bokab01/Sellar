import React, { useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { router } from 'expo-router';
import { 
  EllipsisVertical, 
  User, 
  Flag, 
  Trash2, 
  Archive, 
  Bell, 
  BellOff,
  Shield,
  MessageSquareOff,
  Eye
} from 'lucide-react-native';

interface ChatMenuProps {
  conversationId: string;
  otherUser: any;
  onBlock?: () => void;
  onReport?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
  isMuted?: boolean;
  isBlocked?: boolean;
}

export function ChatMenu({
  conversationId,
  otherUser,
  onBlock,
  onReport,
  onDelete,
  onArchive,
  onMute,
  onUnmute,
  isMuted = false,
  isBlocked = false,
}: ChatMenuProps) {
  const { theme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const handleViewProfile = () => {
    setShowMenu(false);
    if (otherUser?.id) {
      router.push(`/profile/${otherUser.id}`);
    }
  };

  const handleBlock = () => {
    setShowMenu(false);
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${otherUser?.first_name || 'this user'}? They won't be able to message you anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            onBlock?.();
            Alert.alert('User Blocked', 'This user has been blocked successfully.');
          },
        },
      ]
    );
  };

  const handleReport = () => {
    setShowMenu(false);
    Alert.alert(
      'Report User',
      `Report ${otherUser?.first_name || 'this user'} for inappropriate behavior?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            onReport?.();
            Alert.alert('User Reported', 'Thank you for your report. We will review it shortly.');
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            router.back();
          },
        },
      ]
    );
  };

  const handleArchive = () => {
    setShowMenu(false);
    Alert.alert(
      'Archive Conversation',
      'This conversation will be moved to your archived chats.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: () => {
            onArchive?.();
            Alert.alert('Conversation Archived', 'The conversation has been archived.');
          },
        },
      ]
    );
  };

  const handleMuteToggle = () => {
    setShowMenu(false);
    if (isMuted) {
      onUnmute?.();
      Alert.alert('Notifications Enabled', 'You will now receive notifications for this chat.');
    } else {
      onMute?.();
      Alert.alert('Notifications Muted', 'You will no longer receive notifications for this chat.');
    }
  };

  const menuItems = [
    {
      icon: <User size={20} color={theme.colors.text.primary} />,
      title: 'View Profile',
      onPress: handleViewProfile,
      destructive: false,
    },
    {
      icon: isMuted ? <Bell size={20} color={theme.colors.text.primary} /> : <BellOff size={20} color={theme.colors.text.primary} />,
      title: isMuted ? 'Unmute Notifications' : 'Mute Notifications',
      onPress: handleMuteToggle,
      destructive: false,
    },
    {
      icon: <Archive size={20} color={theme.colors.text.primary} />,
      title: 'Archive Chat',
      onPress: handleArchive,
      destructive: false,
    },
    {
      icon: <Flag size={20} color={theme.colors.warning} />,
      title: 'Report User',
      onPress: handleReport,
      destructive: true,
    },
    {
      icon: <Shield size={20} color={theme.colors.error} />,
      title: isBlocked ? 'Unblock User' : 'Block User',
      onPress: handleBlock,
      destructive: true,
    },
    {
      icon: <Trash2 size={20} color={theme.colors.error} />,
      title: 'Delete Chat',
      onPress: handleDelete,
      destructive: true,
    },
  ];

  return (
    <>
      <Button
        variant="icon"
        icon={<EllipsisVertical size={20} color={theme.colors.text.primary} />}
        onPress={() => setShowMenu(true)}
        style={{ width: 36, height: 36 }}
      />

      <AppModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        title="Chat Options"
        size="md"
        position="bottom"
      >
        <View style={{ gap: theme.spacing.xs }}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.lg,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                backgroundColor: 'transparent',
              }}
              activeOpacity={0.7}
            >
              <View style={{ marginRight: theme.spacing.md }}>
                {item.icon}
              </View>
              <Text
                variant="body"
                style={{
                  flex: 1,
                  color: item.destructive ? theme.colors.error : theme.colors.text.primary,
                  fontWeight: '500',
                }}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ 
          marginTop: theme.spacing.lg, 
          paddingTop: theme.spacing.lg,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}>
          <Button
            variant="secondary"
            onPress={() => setShowMenu(false)}
            fullWidth
          >
            Cancel
          </Button>
        </View>
      </AppModal>
    </>
  );
}
