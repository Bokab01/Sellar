import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Avatar, FullUserBadges } from '@/components';
import { Button } from '@/components/Button/Button';
import { Star, MessageCircle, Phone, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';

interface BusinessProfileProps {
  business: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    location?: string;
    phone?: string;
    isBusinessUser: boolean;
    isVerified?: boolean; // ID verification status
    isBusinessVerified?: boolean; // Business verification status
  };
  onMessagePress?: () => void;
  onCallPress?: () => void;
}

export function BusinessProfile({
  business,
  onMessagePress,
  onCallPress,
}: BusinessProfileProps) {
  const { theme } = useTheme();

  const handleMessagePress = () => {
    if (onMessagePress) {
      onMessagePress();
    } else {
      // Default behavior - navigate to profile or start conversation
      router.push(`/profile/${business.id}`);
    }
  };

  const handleCallPress = () => {
    if (onCallPress) {
      onCallPress();
    } else if (business.phone) {
      // Default behavior - initiate call
      Alert.alert(
        'Call Business',
        `Would you like to call ${business.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => {
              // Implement actual calling functionality
              console.log('Calling:', business.phone);
            }
          }
        ]
      );
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          color={theme.colors.warning}
          fill={theme.colors.warning}
        />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star
          key="half"
          size={14}
          color={theme.colors.warning}
          fill={theme.colors.warning}
        />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          size={14}
          color={theme.colors.border}
          fill="transparent"
        />
      );
    }

    return stars;
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
     
      marginVertical: theme.spacing.sm,
      marginHorizontal: theme.spacing.sm,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    }}>
      {/* Avatar */}
      <View style={{
        marginRight: theme.spacing.sm,
        position: 'relative',
      }}>
        <Avatar
          source={business.avatar ? { uri: business.avatar } : undefined}
          name={business.name}
          size="lg"
        />
        {/* Business Badge */}
       {/*  {business.isBusinessUser && (
          <View style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            backgroundColor: theme.colors.primary,
            borderRadius: theme.borderRadius.full,
            padding: 2,
            borderWidth: 2,
            width: 25,
            height: 25,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: theme.colors.surface,
          }}>
            <Text style={{ 
              color: theme.colors.primaryForeground,
              fontSize: 10,
              fontWeight: '700',
            }}>
              ⭐
            </Text>
          </View>
        )} */}
      </View>

      {/* Business Info */}
      <View style={{ flex: 1 }}>
        {/* Business Name */}
        <Text 
          variant="bodySmall" 
          style={{ 
            fontWeight: '600',
            fontSize: 13,
            marginBottom: 0,
            color: theme.colors.text.primary,
          }}
          numberOfLines={1}
        >
          {business.name}
        </Text>

        {/* Rating */}
        {business.rating && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.xs,
            backgroundColor: theme.colors.primary + '10',
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
            borderRadius: theme.borderRadius.sm,
            alignSelf: 'flex-start',
          }}>
            <View style={{ flexDirection: 'row', marginRight: theme.spacing.xs }}>
              {renderStars(business.rating)}
            </View>
            <Text 
              variant="caption" 
              style={{ 
                color: theme.colors.primary,
                fontWeight: '600',
              }}
            >
              {business.rating.toFixed(1)}
            </Text>
          </View>
        )}

        {/* Location */}
        {business.location && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.xs,
          }}>
            <Text 
              variant="caption" 
              color="secondary"
              style={{ 
                marginLeft: theme.spacing.xs,
                fontSize: 11,
              }}
              numberOfLines={1}
            >
              {business.location}
            </Text>
          </View>
        )}

        {/* Badges - Pro, Verified, and Business Verified */}
        <View style={{ marginTop: theme.spacing.xs }}>
          <FullUserBadges
            isBusinessUser={business.isBusinessUser}
            isVerified={business.isVerified}
            isBusinessVerified={business.isBusinessVerified}
          />
        </View>
      </View>

      {/* Action Buttons - Only show if callbacks are provided */}
      {(onMessagePress || onCallPress) && (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {business.phone && onCallPress ? (
            <TouchableOpacity
              onPress={handleCallPress}
              style={{
                backgroundColor: theme.colors.primary,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Phone size={16} color={theme.colors.primaryForeground} />
              <Text 
                variant="caption" 
                style={{ 
                  color: theme.colors.primaryForeground,
                  fontWeight: '600',
                }}
              >
                Call Seller
              </Text>
            </TouchableOpacity>
          ) : onMessagePress ? (
            <TouchableOpacity
              onPress={handleMessagePress}
              style={{
                backgroundColor: theme.colors.primary,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <MessageCircle size={16} color={theme.colors.primaryForeground} />
              <Text 
                variant="caption" 
                style={{ 
                  color: theme.colors.primaryForeground,
                  fontWeight: '600',
                }}
              >
                Message
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}
