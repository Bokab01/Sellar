import React, { useEffect, useRef } from 'react';
import { View, Animated, Image, useColorScheme } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Grid } from '@/components/Grid/Grid';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  count?: number;
  style?: any;
}

export function LoadingSkeleton({
  width = 200,
  height = 20,
  borderRadius,
  count = 1,
  style,
}: LoadingSkeletonProps) {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // Convert string width to number for Animated.View
  const numericWidth = typeof width === 'string' ? 200 : width;

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

  if (count === 1) {
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

  return (
    <View style={style}>
      {Array.from({ length: count }, (_, index) => (
        <Animated.View
          key={index}
          style={[
            {
              width: numericWidth,
              height,
              backgroundColor,
              borderRadius: borderRadius ?? theme.borderRadius.sm,
              marginBottom: index < count - 1 ? theme.spacing.sm : 0,
            },
          ]}
        />
      ))}
    </View>
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
        height: 280, // Match the current card height
        marginBottom: theme.spacing.md,
      }}
    >
      {/* Image skeleton - 65% of card height */}
      <LoadingSkeleton
        width="100%"
        height={182} // 65% of 280
        style={{ marginBottom: 0 }}
      />

      {/* Content area - 35% of card height */}
      <View style={{ padding: theme.spacing.md, flex: 1, justifyContent: 'space-between' }}>
        <View>
          {/* Title skeleton - 2 lines */}
          <LoadingSkeleton
            width="90%"
            height={14}
            style={{ marginBottom: theme.spacing.xs }}
          />
          <LoadingSkeleton
            width="70%"
            height={14}
            style={{ marginBottom: theme.spacing.sm }}
          />

          {/* Price skeleton */}
          <LoadingSkeleton
            width="50%"
            height={16}
            style={{ marginBottom: theme.spacing.sm }}
          />

          {/* Location skeleton */}
          <LoadingSkeleton
            width="40%"
            height={12}
            style={{ marginBottom: theme.spacing.sm }}
          />
        </View>

        {/* Bottom row with seller and badges */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {/* Seller info skeleton */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <LoadingSkeleton
              width={24}
              height={24}
              borderRadius={12}
              style={{ marginRight: theme.spacing.xs }}
            />
            <LoadingSkeleton width="60%" height={12} />
          </View>

          {/* Action buttons skeleton */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            <LoadingSkeleton width={24} height={24} borderRadius={12} />
            <LoadingSkeleton width={24} height={24} borderRadius={12} />
          </View>
        </View>
      </View>
    </View>
  );
}

// Home screen specific skeleton that matches the current UI
export function HomeScreenSkeleton() {
  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.05],
  });

  // Use the appropriate icon based on color scheme
  const iconSource = colorScheme === 'dark' 
    ? require('@/assets/icon/icon-dark.png')
    : require('@/assets/icon/icon-light.png');

  return (
    <View style={{ 
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 100, // Center it better accounting for bottom tabs
    }}>
      <Animated.View style={{ 
        opacity,
        transform: [{ scale }],
        alignItems: 'center',
      }}>
        {/* App Icon */}
        <Animated.Image
          source={iconSource}
          style={{
            width: 120,
            height: 120,
            borderRadius: 30,
            marginBottom: theme.spacing.xl,
          }}
          resizeMode="contain"
        />
        
        <Animated.Text style={{
          fontSize: 28,
          fontWeight: '700',
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.sm,
          opacity,
        }}>
          Sellar
        </Animated.Text>
        
        <Animated.Text style={{
          fontSize: 14,
          color: theme.colors.text.secondary,
          opacity,
        }}>
          Loading your marketplace...
        </Animated.Text>
      </Animated.View>
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
