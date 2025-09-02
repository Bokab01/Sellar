import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Badge, BusinessBadge } from '@/components';
import { useDisplayName } from '@/hooks/useDisplayName';
import { UserProfile } from '@/hooks/useProfile';

interface UserDisplayNameProps {
  profile: UserProfile | null;
  variant?: 'full' | 'short' | 'primary';
  showBadge?: boolean;
  textVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption';
  color?: 'primary' | 'secondary' | 'muted';
  style?: any;
  numberOfLines?: number;
}

export function UserDisplayName({
  profile,
  variant = 'full',
  showBadge = true,
  textVariant = 'body',
  color = 'primary',
  style,
  numberOfLines,
}: UserDisplayNameProps) {
  const { theme } = useTheme();
  const displayInfo = useDisplayName(profile);

  const getDisplayText = () => {
    switch (variant) {
      case 'short':
        return displayInfo.shortDisplayName;
      case 'primary':
        return displayInfo.displayName;
      case 'full':
      default:
        return displayInfo.fullDisplayName;
    }
  };

  const displayText = getDisplayText();

  if (!profile) {
    return (
      <Text 
        variant={textVariant} 
        color="muted" 
        style={style}
        numberOfLines={numberOfLines}
      >
        Unknown User
      </Text>
    );
  }

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    }}>
      <Text 
        variant={textVariant} 
        color={color} 
        style={[
          displayInfo.isBusinessDisplay && {
            fontWeight: '600',
          },
          style
        ]}
        numberOfLines={numberOfLines}
      >
        {displayText}
      </Text>
      
      {showBadge && displayInfo.showBusinessBadge && (
        <BusinessBadge 
          size="small"
          variant={profile.verification_level === 'business' ? 'verified' : 'standard'}
        />
      )}
    </View>
  );
}

// Simplified version for just the text
export function useUserDisplayText(profile: UserProfile | null, variant: 'full' | 'short' | 'primary' = 'full'): string {
  const displayInfo = useDisplayName(profile);
  
  switch (variant) {
    case 'short':
      return displayInfo.shortDisplayName;
    case 'primary':
      return displayInfo.displayName;
    case 'full':
    default:
      return displayInfo.fullDisplayName;
  }
}
