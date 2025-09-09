import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Alert, Animated, Modal, Share, Clipboard } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  MoreHorizontal, 
  Copy, 
  Share2, 
  Flag, 
  Trash2, 
  Edit3,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react-native';

interface PostInlineMenuProps {
  postId: string;
  postAuthorId: string;
  postContent?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  onReport?: () => void;
  onShare?: () => void;
  onHide?: () => void;
  onViewPost?: () => void;
  isHidden?: boolean;
}

export function PostInlineMenu({
  postId,
  postAuthorId,
  postContent,
  onDelete,
  onEdit,
  onReport,
  onShare,
  onHide,
  onViewPost,
  isHidden = false,
}: PostInlineMenuProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const buttonRef = useRef<TouchableOpacity>(null);

  const isOwnPost = user?.id === postAuthorId;

  const toggleMenu = () => {
    if (!showMenu) {
      // Measure button position before showing menu
      buttonRef.current?.measureInWindow((x, y, width, height) => {
        setButtonLayout({ x, y, width, height });
        setShowMenu(true);
        
        Animated.spring(menuAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      });
    } else {
      // Hide menu
      Animated.spring(menuAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start(() => {
        setShowMenu(false);
      });
    }
  };

  const handleCopyLink = async () => {
    setShowMenu(false);
    try {
      const postUrl = `https://sellar.app/community/${postId}`;
      await Clipboard.setString(postUrl);
      Alert.alert('Link Copied', 'Post link has been copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy link:', error);
      Alert.alert('Error', 'Failed to copy link to clipboard.');
    }
  };

  const handleShare = async () => {
    setShowMenu(false);
    try {
      const postUrl = `https://sellar.app/community/${postId}`;
      const shareContent = postContent 
        ? `Check out this post: "${postContent.substring(0, 100)}${postContent.length > 100 ? '...' : ''}"\n\n${postUrl}`
        : `Check out this post: ${postUrl}`;

      const result = await Share.share({
        message: shareContent,
        url: postUrl,
      });

      if (result.action === Share.sharedAction) {
        onShare?.();
      }
    } catch (error) {
      console.error('Failed to share post:', error);
      Alert.alert('Error', 'Failed to share post.');
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    Alert.alert(
      'Edit Post',
      'Do you want to edit this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            onEdit?.();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
          },
        },
      ]
    );
  };

  const handleReport = () => {
    setShowMenu(false);
    Alert.alert(
      'Report Post',
      'Why are you reporting this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () => {
            onReport?.();
            Alert.alert('Report Submitted', 'Thank you for reporting this post. We will review it shortly.');
          },
        },
        {
          text: 'Inappropriate Content',
          onPress: () => {
            onReport?.();
            Alert.alert('Report Submitted', 'Thank you for reporting this post. We will review it shortly.');
          },
        },
        {
          text: 'Harassment',
          onPress: () => {
            onReport?.();
            Alert.alert('Report Submitted', 'Thank you for reporting this post. We will review it shortly.');
          },
        },
      ]
    );
  };

  const handleHide = () => {
    setShowMenu(false);
    Alert.alert(
      isHidden ? 'Show Post' : 'Hide Post',
      isHidden 
        ? 'This post will be visible in your feed again.'
        : 'This post will be hidden from your feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isHidden ? 'Show' : 'Hide',
          onPress: () => {
            onHide?.();
            Alert.alert(
              isHidden ? 'Post Shown' : 'Post Hidden', 
              isHidden 
                ? 'The post is now visible in your feed.'
                : 'The post has been hidden from your feed.'
            );
          },
        },
      ]
    );
  };

  const handleViewPost = () => {
    setShowMenu(false);
    onViewPost?.();
  };

  const menuItems = [
    {
      icon: Copy,
      title: 'Copy Link',
      onPress: handleCopyLink,
      show: true,
    },
    {
      icon: Share2,
      title: 'Share Post',
      onPress: handleShare,
      show: true,
    },
    {
      icon: ExternalLink,
      title: 'View Post',
      onPress: handleViewPost,
      show: !!onViewPost,
    },
    {
      icon: Edit3,
      title: 'Edit Post',
      onPress: handleEdit,
      show: isOwnPost && !!onEdit,
    },
    {
      icon: isHidden ? Eye : EyeOff,
      title: isHidden ? 'Show Post' : 'Hide Post',
      onPress: handleHide,
      show: !isOwnPost && !!onHide,
    },
    {
      icon: Flag,
      title: 'Report Post',
      onPress: handleReport,
      show: !isOwnPost,
      destructive: true,
    },
    {
      icon: Trash2,
      title: 'Delete Post',
      onPress: handleDelete,
      show: isOwnPost,
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
        ref={buttonRef}
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
        <MoreHorizontal 
          size={20} 
          color={showMenu ? theme.colors.primary : theme.colors.text.secondary} 
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
              alignItems: 'flex-start',
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: buttonLayout.y + buttonLayout.height + 8, // Position below the button
                left: Math.max(16, buttonLayout.x - 200 + buttonLayout.width), // Align right edge with button, but keep margin from screen edge
                minWidth: 200,
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
                      paddingHorizontal: theme.spacing.lg,
                      paddingVertical: theme.spacing.md,
                      borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                      minHeight: 48,
                    }}
                    activeOpacity={0.7}
                  >
                    <IconComponent 
                      size={20} 
                      color={item.destructive ? theme.colors.error : theme.colors.text.primary} 
                    />
                    <Text
                      variant="body"
                      style={{
                        marginLeft: theme.spacing.md,
                        color: item.destructive ? theme.colors.error : theme.colors.text.primary,
                        fontWeight: '500',
                        fontSize: 16,
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
