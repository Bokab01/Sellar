import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

interface UserBadgeSystemProps {
  isBusinessUser?: boolean;
  isVerified?: boolean;
  isBusinessVerified?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact' | 'full';
  theme?: 'light' | 'dark';
  style?: any;
}

export function UserBadgeSystem({
  isBusinessUser = false,
  isVerified = false,
  isBusinessVerified = false,
  size = 'small',
  variant = 'compact',
  theme: badgeTheme = 'light',
  style,
}: UserBadgeSystemProps) {
  const { theme } = useTheme();

  // Don't render anything if no badges should be shown
  if (!isBusinessUser && !isVerified && !isBusinessVerified) {
    return null;
  }

  // Size configurations
  const sizeConfig = {
    small: {
      fontSize: 8,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 1,
    },
    medium: {
      fontSize: 9,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    large: {
      fontSize: 10,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
    },
  };

  // Theme configurations
  const themeConfig = {
    light: {
      pro: {
        backgroundColor: theme.colors.primary + '15',
        borderColor: theme.colors.primary + '30',
        color: theme.colors.primary,
      },
      verified: {
        backgroundColor: theme.colors.success + '15',
        borderColor: theme.colors.success + '30',
        color: theme.colors.success,
      },
      business: {
        backgroundColor: theme.colors.info + '15',
        borderColor: theme.colors.info + '30',
        color: theme.colors.info,
      },
    },
    dark: {
      pro: {
        backgroundColor: theme.colors.primaryForeground + '15',
        borderColor: theme.colors.primaryForeground + '30',
        color: theme.colors.primaryForeground,
      },
      verified: {
        backgroundColor: theme.colors.primaryForeground + '15',
        borderColor: theme.colors.primaryForeground + '30',
        color: theme.colors.primaryForeground,
      },
      business: {
        backgroundColor: theme.colors.primaryForeground + '15',
        borderColor: theme.colors.primaryForeground + '30',
        color: theme.colors.primaryForeground,
      },
    },
  };

  // Variant configurations
  const variantConfig = {
    compact: {
      pro: 'PRO',
      verified: '✓',
      business: '✓B',
    },
    full: {
      pro: 'PRO',
      verified: '✓ VERIFIED',
      business: '✓ BUSINESS',
    },
    default: {
      pro: 'PRO',
      verified: '✓',
      business: '✓B',
    },
  };

  const currentSize = sizeConfig[size];
  const currentTheme = themeConfig[badgeTheme];
  const currentVariant = variantConfig[variant];

  const BadgeComponent = ({ 
    text, 
    config 
  }: { 
    text: string; 
    config: typeof currentTheme.pro;
  }) => (
    <View style={{
      backgroundColor: config.backgroundColor,
      paddingHorizontal: currentSize.paddingHorizontal,
      paddingVertical: currentSize.paddingVertical,
      borderRadius: theme.borderRadius.xs,
      borderWidth: 1,
      borderColor: config.borderColor,
    }}>
      <Text 
        variant="caption" 
        style={{ 
          color: config.color,
          fontWeight: '700',
          fontSize: currentSize.fontSize,
        }}
      >
        {text}
      </Text>
    </View>
  );

  return (
    <View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        flexWrap: 'wrap',
      },
      style,
    ]}>
      {/* Pro Badge */}
      {isBusinessUser && (
        <BadgeComponent 
          text={currentVariant.pro} 
          config={currentTheme.pro} 
        />
      )}
      
      {/* ID Verified Badge */}
      {isVerified && (
        <BadgeComponent 
          text={currentVariant.verified} 
          config={currentTheme.verified} 
        />
      )}
      
      {/* Business Verified Badge */}
      {isBusinessVerified && (
        <BadgeComponent 
          text={currentVariant.business} 
          config={currentTheme.business} 
        />
      )}
    </View>
  );
}

// Convenience components for common use cases
export function CompactUserBadges(props: Omit<UserBadgeSystemProps, 'size' | 'variant'>) {
  return <UserBadgeSystem {...props} size="small" variant="compact" />;
}

export function FullUserBadges(props: Omit<UserBadgeSystemProps, 'size' | 'variant'>) {
  return <UserBadgeSystem {...props} size="medium" variant="full" />;
}

export function DarkThemeUserBadges(props: Omit<UserBadgeSystemProps, 'theme'>) {
  return <UserBadgeSystem {...props} theme="dark" />;
}
