import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

interface LinearProgressProps {
  progress: number; // 0 to 1
  height?: number;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
  style?: any;
}

export function LinearProgress({
  progress,
  height = 8,
  showPercentage = false,
  color,
  backgroundColor,
  animated = true,
  style,
}: LinearProgressProps) {
  const { theme } = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(progress);
    }
  }, [progress, animated]);

  const progressColor = color || theme.colors.primary;
  const trackColor = backgroundColor || theme.colors.surfaceVariant;

  return (
    <View style={style}>
      {showPercentage && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
          }}
        >
          <Text variant="bodySmall" color="secondary">
            Progress
          </Text>
          <Text variant="bodySmall" color="secondary">
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}

      <View
        style={{
          height,
          backgroundColor: trackColor,
          borderRadius: height / 2,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: progressColor,
            borderRadius: height / 2,
            width: animatedWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
          }}
        />
      </View>
    </View>
  );
}

interface CircularProgressProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  style?: any;
}

export function CircularProgress({
  progress,
  size = 48,
  strokeWidth = 4,
  color,
  backgroundColor,
  showPercentage = false,
  style,
}: CircularProgressProps) {
  const { theme } = useTheme();

  const progressColor = color || theme.colors.primary;
  const trackColor = backgroundColor || theme.colors.surfaceVariant;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        },
        style,
      ]}
    >
      {/* Background Circle */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: trackColor,
        }}
      />

      {/* Progress Circle - Simplified approach */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: progressColor,
          transform: [{ rotate: `${progress * 360}deg` }],
        }}
      />

      {/* Percentage Text */}
      {showPercentage && (
        <Text
          variant="caption"
          style={{
            fontSize: size > 60 ? 14 : 11,
            fontWeight: '600',
            color: theme.colors.text.primary,
          }}
        >
          {Math.round(progress * 100)}%
        </Text>
      )}
    </View>
  );
}
