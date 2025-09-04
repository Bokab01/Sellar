import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { ArrowLeft } from 'lucide-react-native';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode[];
  backgroundColor?: string;
  style?: any;
}

export function AppHeader({
  title,
  showBackButton = false,
  onBackPress,
  leftAction,
  rightActions,
  backgroundColor,
  style,
}: AppHeaderProps) {
  const { theme } = useTheme();

  const headerHeight = Platform.OS === 'ios' ? 44 : 56;
  const statusBarHeight = Platform.OS === 'ios' ? 44 : 24;

  return (
    <View
      style={[
        {
          backgroundColor: backgroundColor || theme.colors.surface,
          paddingTop: statusBarHeight,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      <View
        style={{
          height: headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {/* Left Side */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {showBackButton && (
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
            <View style={{ marginRight: theme.spacing.md }}>
              {leftAction}
            </View>
          )}

          {title && (
            <Text
              variant="h3"
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: showBackButton || leftAction ? 'left' : 'center',
              }}
            >
              {title}
            </Text>
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
