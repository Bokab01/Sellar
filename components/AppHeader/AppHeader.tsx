import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { ArrowLeft } from 'lucide-react-native';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showBack?: boolean;
  onBackPress?: () => void;
  onTitlePress?: () => void;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode[];
  backgroundColor?: string;
  style?: any;
}

export function AppHeader({
  title,
  subtitle,
  showBackButton = false,
  showBack = false,
  onBackPress,
  onTitlePress,
  leftAction,
  rightActions,
  backgroundColor,
  style,
}: AppHeaderProps) {
  const { theme } = useTheme();

  // Only control base height, safe area is handled by your wrapper
  const baseHeaderHeight = subtitle ? 60 : 44;

  return (
    <View
      style={[
        {
          backgroundColor: backgroundColor || theme.colors.surface,
          borderBottomWidth: 1,
          padding: theme.spacing.sm,
          borderBottomColor: theme.colors.border,
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      <View
        style={{
          height: baseHeaderHeight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {/* Left Side */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {(showBackButton || showBack) && (
            <TouchableOpacity
              onPress={onBackPress}
              style={{
                padding: theme.spacing.sm,
                marginLeft: -theme.spacing.sm,
                marginRight: theme.spacing.sm,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeft size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          )}

          {leftAction && (
            <View style={{ marginRight: theme.spacing.md }}>{leftAction}</View>
          )}

          {(title || subtitle) && (
            <TouchableOpacity
              onPress={onTitlePress}
              disabled={!onTitlePress}
              activeOpacity={onTitlePress ? 0.7 : 1}
              style={{
                flex: 1,
                alignItems:
                  showBackButton || leftAction ? 'flex-start' : 'center',
              }}
            >
              {title && (
                <Text
                  variant="h4"
                  numberOfLines={1}
                  style={{
                    textAlign: showBackButton || leftAction ? 'left' : 'center',
                  }}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text
                  variant="caption"
                  color="muted"
                  numberOfLines={1}
                  style={{
                    textAlign: showBackButton || leftAction ? 'left' : 'center',
                    marginTop: 2,
                  }}
                >
                  {subtitle}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Right Side */}
        {rightActions && rightActions.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            {rightActions.map((action, index) => (
              <View key={index}>{action}</View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
