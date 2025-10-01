import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Flag } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { router } from 'expo-router';

export type ReportTargetType = 'listing' | 'post' | 'comment' | 'message' | 'user';

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  targetUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  variant?: 'icon' | 'text' | 'full';
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}

export function ReportButton({
  targetType,
  targetId,
  targetTitle,
  targetUser,
  variant = 'icon',
  size = 'md',
  style
}: ReportButtonProps) {
  const { theme } = useTheme();

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 16;
      case 'lg':
        return 24;
      default:
        return 20;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return theme.spacing.xs;
      case 'lg':
        return theme.spacing.md;
      default:
        return theme.spacing.sm;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 12;
      case 'lg':
        return 16;
      default:
        return 14;
    }
  };

  const handlePress = () => {
    router.push({
      pathname: '/report',
      params: {
        targetType,
        targetId,
        targetTitle: targetTitle || '',
        targetUser: targetUser ? JSON.stringify(targetUser) : undefined,
      },
    });
  };

  const renderContent = () => {
    switch (variant) {
      case 'text':
        return (
          <Text 
            variant="body" 
            style={{ 
              color: theme.colors.textSecondary, 
              fontSize: getFontSize() 
            }}
          >
            Report
          </Text>
        );
      case 'full':
        return (
          <>
            <Flag size={getIconSize()} color={theme.colors.textSecondary} />
            <Text 
              variant="body" 
              style={{ 
                color: theme.colors.textSecondary, 
                marginLeft: theme.spacing.xs,
                fontSize: getFontSize()
              }}
            >
              Report
            </Text>
          </>
        );
      default: // icon
        return <Flag size={getIconSize()} color={theme.colors.textSecondary} />;
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        {
          flexDirection: variant === 'full' ? 'row' : undefined,
          alignItems: 'center',
          justifyContent: 'center',
          padding: getPadding(),
          borderRadius: theme.borderRadius.sm,
        },
        style
      ]}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}
