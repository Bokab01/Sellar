import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Star } from 'lucide-react-native';

interface RatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
  showCount?: boolean;
  reviewCount?: number;
  style?: any;
}

export function Rating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  showValue = false,
  showCount = false,
  reviewCount,
  style,
}: RatingProps) {
  const { theme } = useTheme();

  const getStarSize = () => {
    switch (size) {
      case 'sm': return 14;
      case 'lg': return 24;
      case 'md':
      default: return 18;
    }
  };

  const starSize = getStarSize();

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const isFilled = rating >= starValue;
    const isHalfFilled = rating >= starValue - 0.5 && rating < starValue;

    const StarComponent = () => (
      <View style={{ position: 'relative' }}>
        {/* Background star */}
        <Star
          size={starSize}
          color={theme.colors.border}
          fill={theme.colors.border}
        />
        
        {/* Filled star */}
        {(isFilled || isHalfFilled) && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              overflow: 'hidden',
              width: isHalfFilled ? starSize / 2 : starSize,
            }}
          >
            <Star
              size={starSize}
              color={theme.colors.warning}
              fill={theme.colors.warning}
            />
          </View>
        )}
      </View>
    );

    if (interactive) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => onRatingChange?.(starValue)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <StarComponent />
        </TouchableOpacity>
      );
    }

    return <StarComponent key={index} />;
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
        },
        style,
      ]}
    >
      {/* Stars */}
      <View
        style={{
          flexDirection: 'row',
          gap: 2,
        }}
      >
        {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
      </View>

      {/* Rating Value */}
      {showValue && (
        <Text
          variant={size === 'sm' ? 'caption' : 'bodySmall'}
          color="secondary"
          style={{ marginLeft: theme.spacing.sm }}
        >
          {rating.toFixed(1)}
        </Text>
      )}

      {/* Review Count */}
      {showCount && reviewCount !== undefined && (
        <Text
          variant={size === 'sm' ? 'caption' : 'bodySmall'}
          color="muted"
          style={{ marginLeft: theme.spacing.xs }}
        >
          ({reviewCount.toLocaleString()})
        </Text>
      )}
    </View>
  );
}