import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | ImageSourcePropType;
  name: string;
  size?: AvatarSize;
  style?: any;
  showBorder?: boolean;
  isOnline?: boolean;
}

export function Avatar({ 
  source, 
  name, 
  size = 'md',
  style,
  showBorder = false,
  isOnline = false,
}: AvatarProps) {
  const { theme } = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return { width: 24, height: 24, borderRadius: 12 };
      case 'sm':
        return { width: 32, height: 32, borderRadius: 16 };
      case 'md':
        return { width: 48, height: 48, borderRadius: 24 };
      case 'lg':
        return { width: 64, height: 64, borderRadius: 32 };
      case 'xl':
        return { width: 96, height: 96, borderRadius: 48 };
      default:
        return { width: 48, height: 48, borderRadius: 24 };
    }
  };

  const getInitialsFontSize = () => {
    switch (size) {
      case 'xs': return 10;
      case 'sm': return 12;
      case 'md': return 16;
      case 'lg': return 20;
      case 'xl': return 28;
      default: return 16;
    }
  };

  const getOnlineIndicatorSize = () => {
    switch (size) {
      case 'xs': return 6;
      case 'sm': return 8;
      case 'md': return 12;
      case 'lg': return 16;
      case 'xl': return 20;
      default: return 12;
    }
  };

  const sizeStyles = getSizeStyles();
  const imageSource = typeof source === 'string' ? { uri: source } : source;
  
  // Generate initials from name
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={[{ position: 'relative' }, style]}>
      <View
        style={[
          sizeStyles,
          {
            backgroundColor: source ? theme.colors.surfaceVariant : theme.colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          },
          showBorder && {
            borderWidth: 2,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {source ? (
          <Image
            source={imageSource}
            style={sizeStyles}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              color: theme.colors.primaryForeground,
              fontSize: getInitialsFontSize(),
              fontWeight: '600',
            }}
          >
            {getInitials(name)}
          </Text>
        )}
      </View>

      {/* Online Indicator */}
      {isOnline && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: getOnlineIndicatorSize(),
            height: getOnlineIndicatorSize(),
            borderRadius: getOnlineIndicatorSize() / 2,
            backgroundColor: theme.colors.success,
            borderWidth: 2,
            borderColor: theme.colors.surface,
          }}
        />
      )}
    </View>
  );
}