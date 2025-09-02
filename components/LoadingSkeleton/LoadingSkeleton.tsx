import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius,
  style,
}: LoadingSkeletonProps) {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, []);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surfaceVariant, theme.colors.border],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor,
          borderRadius: borderRadius ?? theme.borderRadius.sm,
        },
        style,
      ]}
    />
  );
}

// Preset skeleton components for common use cases
export function ProductCardSkeleton() {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.md,
        overflow: 'hidden',
        height: 320, // Match the new card height
        marginBottom: theme.spacing.md,
      }}
    >
      {/* Image skeleton - 70% of card height */}
      <LoadingSkeleton
        width="100%"
        height={224} // 70% of 320
        style={{ marginBottom: 0 }}
      />

      {/* Content area - 30% of card height */}
      <View style={{ padding: theme.spacing.sm, flex: 1, justifyContent: 'space-between' }}>
        <View>
          {/* Title skeleton */}
          <LoadingSkeleton
            width="90%"
            height={14}
            style={{ marginBottom: theme.spacing.xs }}
          />
          <LoadingSkeleton
            width="70%"
            height={14}
            style={{ marginBottom: theme.spacing.xs }}
          />

          {/* Price skeleton */}
          <LoadingSkeleton
            width="50%"
            height={16}
            style={{ marginBottom: theme.spacing.xs }}
          />
        </View>

        {/* Seller name skeleton at bottom */}
        <LoadingSkeleton width="60%" height={12} />
      </View>
    </View>
  );
}

export function ChatListSkeleton() {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      {/* Avatar skeleton */}
      <LoadingSkeleton
        width={48}
        height={48}
        borderRadius={24}
        style={{ marginRight: theme.spacing.md }}
      />

      {/* Content skeleton */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
          }}
        >
          <LoadingSkeleton width="40%" height={16} />
          <LoadingSkeleton width="20%" height={12} />
        </View>
        <LoadingSkeleton width="70%" height={14} />
      </View>
    </View>
  );
}