import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { ChevronRight } from 'lucide-react-native';

// ✅ Animated typing dots component
function TypingDots() {
  const { theme } = useTheme();
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(dot1Opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot1Opacity, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot2Opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot2Opacity, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot3Opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot3Opacity, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    animateDots();
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  const dotStyle = {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 1,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 2 }}>
      <Animated.View style={[dotStyle, { opacity: dot1Opacity }]} />
      <Animated.View style={[dotStyle, { opacity: dot2Opacity }]} />
      <Animated.View style={[dotStyle, { opacity: dot3Opacity }]} />
    </View>
  );
}

interface ListItemProps {
  title: string;
  subtitle?: string | React.ReactNode;
  description?: string;
  avatar?: {
    source?: string;
    name: string;
    isOnline?: boolean;
  };
  timestamp?: string;
  badge?: {
    text: string;
    variant?: 'new' | 'sold' | 'featured' | 'discount' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  };
  unreadCount?: number;
  isTyping?: boolean; // ✅ New: Typing indicator flag
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showChevron?: boolean;
  toggle?: {
    value: boolean;
    onToggle: (value: boolean) => void;
  };
  onPress?: () => void;
  style?: any;
}

export function ListItem({
  title,
  subtitle,
  description,
  avatar,
  timestamp,
  badge,
  unreadCount,
  isTyping = false, // ✅ Default to false
  leftIcon,
  rightIcon,
  showChevron = false,
  toggle,
  onPress,
  style,
}: ListItemProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        style,
      ]}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Avatar */}
      {avatar && (
        <Avatar
          source={avatar.source}
          name={avatar.name}
          size="md"
          isOnline={avatar.isOnline}
          style={{ marginRight: theme.spacing.md }}
        />
      )}

      {/* Left Icon */}
      {leftIcon && !avatar && (
        <View style={{ marginRight: theme.spacing.md }}>
          {leftIcon}
        </View>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: subtitle || description ? theme.spacing.xs : 0,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginRight: unreadCount ? theme.spacing.lg : theme.spacing.sm }}>
            <Text
              variant="body"
              numberOfLines={1}
              style={{
                fontWeight: unreadCount ? '600' : '500',
              }}
            >
              {title}
            </Text>
            {/* ✅ PRO Badge inline with title */}
            {badge && (
              <Badge
                text={badge.text}
                variant={badge.variant}
                size="xs"
              />
            )}
          </View>

          {timestamp && (
            <Text
              variant="caption"
              color="muted"
              style={{ fontSize: 11 }}
            >
              {timestamp}
            </Text>
          )}
        </View>

        {subtitle && (
          typeof subtitle === 'string' ? (
            <Text
              variant="bodySmall"
              color="secondary"
              numberOfLines={1}
              style={{ marginBottom: description ? theme.spacing.xs : 0 }}
            >
              {subtitle}
            </Text>
          ) : (
            <View style={{ marginBottom: description ? theme.spacing.xs : 0 }}>
              {subtitle}
            </View>
          )
        )}

        {description && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {isTyping ? (
              <>
                <Text
                  variant="bodySmall"
                  style={{ 
                    color: theme.colors.primary,
                    fontStyle: 'italic',
                    fontWeight: '500',
                  }}
                >
                  typing
                </Text>
                <TypingDots />
              </>
            ) : (
              <Text
                variant="bodySmall"
                color="muted"
                numberOfLines={2}
                style={{ lineHeight: 18, flex: 1 }}
              >
                {description}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Right Side */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        {unreadCount && unreadCount > 0 && (
          <View
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.full,
              minWidth: 20,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.xs,
            }}
          >
            <Text
              variant="caption"
              style={{
                color: theme.colors.primaryForeground,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}

        {toggle && (
          <TouchableOpacity
            onPress={() => toggle.onToggle(!toggle.value)}
            style={{
              width: 50,
              height: 30,
              borderRadius: 15,
              backgroundColor: toggle.value ? theme.colors.primary : theme.colors.border,
              justifyContent: 'center',
              alignItems: toggle.value ? 'flex-end' : 'flex-start',
              paddingHorizontal: 2,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: theme.colors.background,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: 2,
              }}
            />
          </TouchableOpacity>
        )}

        {rightIcon && (
          <View>{rightIcon}</View>
        )}

        {showChevron && !toggle && (
          <ChevronRight
            size={16}
            color={theme.colors.text.muted}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
