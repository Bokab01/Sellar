import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Alert, Animated, Modal } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
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
  Phone,
  Eye,
  UserMinus
} from 'lucide-react-native';

interface ChatInlineMenuProps {
  conversationId: string;
  otherUser: any;
  conversation?: any;
  onBlock?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
  isMuted?: boolean;
  isBlocked?: boolean;
}

export function ChatInlineMenu({
  conversationId,
  otherUser,
  conversation,
  onBlock,
  onDelete,
  onArchive,
  onMute,
  onUnmute,
  isMuted = false,
  isBlocked = false,
}: ChatInlineMenuProps) {
  const { theme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = showMenu ? 0 : 1;
    setShowMenu(!showMenu);
    
    Animated.spring(menuAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleViewProfile = () => {
    setShowMenu(false);
    if (otherUser?.id) {
      router.push(`/profile/${otherUser.id}`);
    }
  };

  const handleViewListing = () => {
    setShowMenu(false);
    if (conversation?.listing_id && conversation?.listing?.status === 'active') {
      router.push(`/home/${conversation.listing_id}`);
    }
  };

  const handleCall = () => {
    setShowMenu(false);
    if (otherUser?.phone) {
      Alert.alert(
        'Call User',
        `Call ${otherUser.first_name || 'User'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {
            // Handle call functionality
            console.log('Calling user:', otherUser.phone);
          }},
        ]
      );
    }
  };

  const handleBlock = () => {
    setShowMenu(false);
    onBlock?.();
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

  const handleReport = () => {
    setShowMenu(false);
    router.push({
      pathname: '/report',
      params: {
        targetType: 'user',
        targetId: otherUser?.id,
        targetTitle: `${otherUser?.first_name || 'User'} ${otherUser?.last_name || ''}`.trim(),
      },
    });
  };

  const menuItems = [
    {
      icon: User,
      title: 'Profile',
      onPress: handleViewProfile,
      show: !!otherUser?.id,
    },
    {
      icon: Eye,
      title: 'Listing',
      onPress: handleViewListing,
      show: !!conversation?.listing_id && conversation?.listing?.status === 'active',
    },
    {
      icon: Phone,
      title: 'Call',
      onPress: handleCall,
      show: !!otherUser?.phone,
    },
    {
      icon: isMuted ? Bell : BellOff,
      title: isMuted ? 'Unmute' : 'Mute',
      onPress: handleMuteToggle,
      show: true,
    },
    {
      icon: Archive,
      title: 'Archive',
      onPress: handleArchive,
      show: true,
    },
    {
      icon: Flag,
      title: 'Report',
      onPress: handleReport,
      show: true,
      destructive: true,
    },
    {
      icon: UserMinus,
      title: 'Block User',
      onPress: handleBlock,
      show: true,
      destructive: true,
    },
    {
      icon: Trash2,
      title: 'Delete',
      onPress: handleDelete,
      show: true,
      destructive: true,
    },
  ].filter(item => item.show);

  const menuScale = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const menuOpacity = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {/* Menu Toggle Button */}
      <TouchableOpacity
        onPress={toggleMenu}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: showMenu ? theme.colors.primary + '20' : 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={0.7}
      >
        <EllipsisVertical 
          size={20} 
          color={showMenu ? theme.colors.primary : theme.colors.text.primary} 
        />
      </TouchableOpacity>

      {/* Modal-based Menu */}
      <Modal
        visible={showMenu}
        transparent
        animationType="none"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          }}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-start',
              alignItems: 'flex-end',
              paddingTop: 80, // Position menu higher
              paddingRight: 16,
            }}
          >
            <Animated.View
              style={{
                minWidth: 160,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.lg,
                transform: [{ scale: menuScale }],
                opacity: menuOpacity,
              }}
            >
              {menuItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={item.onPress}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                    }}
                    activeOpacity={0.7}
                  >
                    <IconComponent 
                      size={16} 
                      color={item.destructive ? theme.colors.error : theme.colors.text.primary} 
                    />
                    <Text
                      variant="bodySmall"
                      style={{
                        marginLeft: theme.spacing.sm,
                        color: item.destructive ? theme.colors.error : theme.colors.text.primary,
                        fontWeight: '500',
                      }}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
