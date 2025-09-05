import React from 'react';
import { TouchableOpacity, Linking } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { ExternalLink, ChevronRight } from 'lucide-react-native';

type LinkVariant = 'default' | 'primary' | 'secondary' | 'muted' | 'underline';
type LinkSize = 'sm' | 'md' | 'lg';

interface LinkButtonProps {
  href?: string;
  external?: boolean;
  variant?: LinkVariant;
  size?: LinkSize;
  children: React.ReactNode;
  showIcon?: boolean;
  showChevron?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: any;
}

export function LinkButton({
  href,
  external = false,
  variant = 'default',
  size = 'md',
  children,
  showIcon = false,
  showChevron = false,
  disabled = false,
  onPress,
  style,
}: LinkButtonProps) {
  const { theme } = useTheme();

  const getLinkColors = () => {
    if (disabled) {
      return {
        textColor: theme.colors.text.muted,
        underlineColor: 'transparent',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          textColor: theme.colors.primary,
          underlineColor: theme.colors.primary,
        };
      case 'secondary':
        return {
          textColor: theme.colors.text.secondary,
          underlineColor: theme.colors.text.secondary,
        };
      case 'muted':
        return {
          textColor: theme.colors.text.muted,
          underlineColor: theme.colors.text.muted,
        };
      case 'underline':
        return {
          textColor: theme.colors.primary,
          underlineColor: theme.colors.primary,
        };
      case 'default':
      default:
        return {
          textColor: theme.colors.text.primary,
          underlineColor: 'transparent',
        };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return 14;
      case 'lg': return 18;
      case 'md':
      default: return 16;
    }
  };

  const getTextVariant = () => {
    switch (size) {
      case 'sm': return 'bodySmall' as const;
      case 'lg': return 'body' as const;
      case 'md':
      default: return 'body' as const;
    }
  };

  const colors = getLinkColors();
  const fontSize = getFontSize();
  const textVariant = getTextVariant();

  const handlePress = async () => {
    if (disabled) return;

    if (onPress) {
      onPress();
      return;
    }

    if (href) {
      if (external) {
        try {
          const supported = await Linking.canOpenURL(href);
          if (supported) {
            await Linking.openURL(href);
          } else {
            console.warn(`Cannot open URL: ${href}`);
          }
        } catch (error) {
          console.error('Error opening external link:', error);
        }
      }
      // Internal navigation is handled by the Link component wrapper
    }
  };

  const linkContent = (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <Text
        variant={textVariant}
        style={{
          color: colors.textColor,
          fontSize,
          fontWeight: variant === 'primary' || variant === 'underline' ? '600' : '400',
          textDecorationLine: variant === 'underline' ? 'underline' : 'none',
          textDecorationColor: colors.underlineColor,
        }}
      >
        {children}
      </Text>

      {showIcon && external && (
        <ExternalLink
          size={fontSize * 0.8}
          color={colors.textColor}
          style={{ marginLeft: theme.spacing.sm }}
        />
      )}

      {showChevron && !external && (
        <ChevronRight
          size={fontSize * 0.8}
          color={colors.textColor}
          style={{ marginLeft: theme.spacing.sm }}
        />
      )}
    </TouchableOpacity>
  );

  // For internal navigation, wrap with Link component
  if (href && !external && !onPress) {
    return (
      <Link href={href as any} asChild>
        {linkContent}
      </Link>
    );
  }

  // For external links or custom onPress, use TouchableOpacity directly
  return linkContent;
}
