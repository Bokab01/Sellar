import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { BadgeCheck, ShieldCheck } from 'lucide-react-native';

interface OfficialBadgeProps {
  variant?: 'default' | 'compact' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
}

export function OfficialBadge({ variant = 'default', size = 'md' }: OfficialBadgeProps) {
  const { theme } = useTheme();

  const sizeConfig = {
    sm: {
      iconSize: 12,
      fontSize: 9,
      padding: 2,
      gap: 2,
    },
    md: {
      iconSize: 14,
      fontSize: 10,
      padding: 3,
      gap: 3,
    },
    lg: {
      iconSize: 16,
      fontSize: 11,
      padding: 4,
      gap: 4,
    },
  };

  const config = sizeConfig[size];

  if (variant === 'icon-only') {
    return (
      <View
        style={[
          styles.iconOnly,
          {
            backgroundColor: theme.colors.primary,
            width: config.iconSize + 4,
            height: config.iconSize + 4,
            borderRadius: (config.iconSize + 4) / 2,
          },
        ]}
      >
        <BadgeCheck size={config.iconSize} color="#FFFFFF" strokeWidth={2.5} />
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View
        style={[
          styles.compact,
          {
            backgroundColor: theme.colors.primary + '15',
            paddingHorizontal: config.padding * 2,
            paddingVertical: config.padding,
            borderRadius: config.iconSize,
            gap: config.gap,
          },
        ]}
      >
        <ShieldCheck size={config.iconSize} color={theme.colors.primary} strokeWidth={2.5} />
        <Text
          style={{
            fontSize: config.fontSize,
            fontWeight: '700',
            color: theme.colors.primary,
            letterSpacing: 0.5,
          }}
        >
          OFFICIAL
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.default,
        {
          backgroundColor: theme.colors.primary,
          paddingHorizontal: config.padding * 2,
          paddingVertical: config.padding,
          borderRadius: config.iconSize,
          gap: config.gap,
        },
      ]}
    >
      <BadgeCheck size={config.iconSize} color="#FFFFFF" strokeWidth={2.5} />
      <Text
        style={{
          fontSize: config.fontSize,
          fontWeight: '700',
          color: '#FFFFFF',
          letterSpacing: 0.5,
        }}
      >
        OFFICIAL
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  default: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconOnly: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

