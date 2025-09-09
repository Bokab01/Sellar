import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { BusinessBadge } from '@/components/BusinessBadge/BusinessBadge';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { router } from 'expo-router';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Star,
  Crown,
  Zap,
  ExternalLink,
  Eye
} from 'lucide-react-native';

interface SponsoredPostProps {
  id: string;
  content: string;
  images?: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
    isBusinessUser: boolean;
    badges?: Array<'business' | 'priority_seller' | 'premium' | 'verified'>;
  };
  listing?: {
    id: string;
    title: string;
    price: number;
    currency: string;
    image?: string;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  sponsorship: {
    budget: number;
    targetAudience: string;
    duration: string;
    impressions: number;
    clicks: number;
  };
  createdAt: string;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onViewListing?: () => void;
  isLiked?: boolean;
}

export function SponsoredPost({
  id,
  content,
  images = [],
  author,
  listing,
  engagement,
  sponsorship,
  createdAt,
  onLike,
  onComment,
  onShare,
  onViewListing,
  isLiked = false,
}: SponsoredPostProps) {
  const { theme } = useTheme();
  const businessFeatures = useBusinessFeatures();
  const [showFullContent, setShowFullContent] = useState(false);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleAuthorPress = () => {
    router.push(`/profile/${author.id}`);
  };

  const handleListingPress = () => {
    if (listing && onViewListing) {
      onViewListing();
    } else if (listing) {
      router.push(`/(tabs)/home/${listing.id}`);
    }
  };

  const renderSponsoredBadge = () => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.info + '15',
      borderColor: theme.colors.info + '30',
      borderWidth: 1,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    }}>
      <Star size={12} color={theme.colors.info} />
      <Text
        variant="caption"
        style={{
          color: theme.colors.info,
          marginLeft: theme.spacing.xs,
          fontWeight: '600',
        }}
      >
        SPONSORED
      </Text>
      <Text
        variant="caption"
        style={{
          color: theme.colors.text.muted,
          marginLeft: theme.spacing.sm,
        }}
      >
        • {formatNumber(sponsorship.impressions)} impressions
      </Text>
    </View>
  );

  const renderAuthorInfo = () => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    }}>
      <TouchableOpacity onPress={handleAuthorPress}>
        <Avatar
          name={author.name}
          source={author.avatar}
          size="md"
        />
      </TouchableOpacity>
      
      <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
        <TouchableOpacity onPress={handleAuthorPress}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              {author.name}
            </Text>
            {author.isBusinessUser && (
              <View style={{ marginLeft: theme.spacing.sm }}>
                <BusinessBadge
                  type="business"
                  size="small"
                  variant="minimal"
                  showText={false}
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text variant="caption" color="muted">
            {formatTimeAgo(createdAt)}
          </Text>
          {author.badges && author.badges.length > 0 && (
            <View style={{ marginLeft: theme.spacing.sm }}>
              <BusinessBadge
                type={author.badges[0]}
                size="small"
                variant="compact"
                showIcon={false}
              />
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={{
          padding: theme.spacing.sm,
          borderRadius: theme.borderRadius.sm,
        }}
      >
        <MoreHorizontal size={20} color={theme.colors.text.muted} />
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    const shouldTruncate = content.length > 200;
    const displayContent = shouldTruncate && !showFullContent 
      ? content.substring(0, 200) + '...' 
      : content;

    return (
      <View style={{ marginBottom: theme.spacing.md }}>
        <Text variant="body" style={{ lineHeight: 22 }}>
          {displayContent}
        </Text>
        {shouldTruncate && (
          <TouchableOpacity
            onPress={() => setShowFullContent(!showFullContent)}
            style={{ marginTop: theme.spacing.xs }}
          >
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.primary,
                fontWeight: '600',
              }}
            >
              {showFullContent ? 'Show less' : 'Show more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderImages = () => {
    if (images.length === 0) return null;

    return (
      <View style={{
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
      }}>
        {images.length === 1 ? (
          <Image
            source={{ uri: images[0] }}
            style={{
              width: '100%',
              height: 200,
              backgroundColor: theme.colors.surfaceVariant,
            }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {images.slice(0, 2).map((image, index) => (
              <View key={index} style={{ flex: 1 }}>
                <Image
                  source={{ uri: image }}
                  style={{
                    width: '100%',
                    height: 150,
                    backgroundColor: theme.colors.surfaceVariant,
                  }}
                  resizeMode="cover"
                />
                {index === 1 && images.length > 2 && (
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text
                      variant="h4"
                      style={{
                        color: 'white',
                        fontWeight: '600',
                      }}
                    >
                      +{images.length - 2}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderListingCard = () => {
    if (!listing) return null;

    return (
      <TouchableOpacity
        onPress={handleListingPress}
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.primary + '20',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
          <ExternalLink size={16} color={theme.colors.primary} />
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.primary,
              fontWeight: '600',
              marginLeft: theme.spacing.xs,
            }}
          >
            Featured Listing
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {listing.image && (
            <Image
              source={{ uri: listing.image }}
              style={{
                width: 80,
                height: 80,
                borderRadius: theme.borderRadius.sm,
                backgroundColor: theme.colors.surface,
              }}
              resizeMode="cover"
            />
          )}
          
          <View style={{ flex: 1 }}>
            <Text
              variant="body"
              style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}
              numberOfLines={2}
            >
              {listing.title}
            </Text>
            
            <PriceDisplay
              amount={listing.price}
              currency={listing.currency}
              size="md"
              style={{ marginBottom: theme.spacing.sm }}
            />
            
            <Button
              variant="primary"
              size="sm"
              onPress={handleListingPress}
              style={{ alignSelf: 'flex-start' }}
            >
              View Listing
            </Button>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEngagementBar = () => (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <TouchableOpacity
          onPress={onLike}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          <Heart
            size={20}
            color={isLiked ? theme.colors.error : theme.colors.text.muted}
            fill={isLiked ? theme.colors.error : 'transparent'}
          />
          <Text
            variant="bodySmall"
            color={isLiked ? 'error' : 'muted'}
            style={{ fontWeight: isLiked ? '600' : '400' }}
          >
            {formatNumber(engagement.likes)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onComment}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          <MessageCircle size={20} color={theme.colors.text.muted} />
          <Text variant="bodySmall" color="muted">
            {formatNumber(engagement.comments)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onShare}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          <Share2 size={20} color={theme.colors.text.muted} />
          <Text variant="bodySmall" color="muted">
            {formatNumber(engagement.shares)}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <Eye size={16} color={theme.colors.text.muted} />
        <Text variant="caption" color="muted">
          {formatNumber(engagement.views)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      // Enhanced styling for sponsored posts
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      {renderSponsoredBadge()}
      {renderAuthorInfo()}
      {renderContent()}
      {renderImages()}
      {renderListingCard()}
      {renderEngagementBar()}
    </View>
  );
}

/**
 * Sponsored post creation/management component
 */
interface SponsoredPostManagerProps {
  postId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function SponsoredPostManager({
  postId,
  onClose,
  onSuccess,
}: SponsoredPostManagerProps) {
  const { theme } = useTheme();
  const businessFeatures = useBusinessFeatures();
  const [budget, setBudget] = useState(50);
  const [duration, setDuration] = useState(7);
  const [targetAudience, setTargetAudience] = useState('all');

  const handleCreateSponsorship = async () => {
    try {
      // TODO: Implement sponsored post creation API
      Alert.alert(
        'Sponsored Post Created',
        `Your post will be promoted for ${duration} days with a budget of GHS ${budget}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess?.();
              onClose?.();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create sponsored post. Please try again.');
    }
  };

  if (!businessFeatures.isBusinessUser) {
    return (
      <View style={{
        padding: theme.spacing.lg,
        alignItems: 'center',
      }}>
        <Crown size={48} color={theme.colors.text.muted} />
        <Text variant="h4" style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
          Business Plan Required
        </Text>
        <Text variant="body" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
          Upgrade to Sellar Business to create sponsored posts and reach more customers.
        </Text>
        <Button
          variant="primary"
          onPress={() => router.push('/subscription-plans')}
          style={{ marginTop: theme.spacing.lg }}
        >
          Upgrade Now
        </Button>
      </View>
    );
  }

  return (
    <View style={{ padding: theme.spacing.lg }}>
      <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
        Promote Your Post
      </Text>

      <View style={{ gap: theme.spacing.lg }}>
        <View>
          <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
            Budget (GHS)
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {[25, 50, 100, 200].map((amount) => (
              <TouchableOpacity
                key={amount}
                onPress={() => setBudget(amount)}
                style={{
                  flex: 1,
                  padding: theme.spacing.md,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 2,
                  borderColor: budget === amount ? theme.colors.primary : theme.colors.border,
                  backgroundColor: budget === amount ? theme.colors.primary + '10' : theme.colors.surface,
                }}
              >
                <Text
                  variant="body"
                  style={{
                    textAlign: 'center',
                    fontWeight: '600',
                    color: budget === amount ? theme.colors.primary : theme.colors.text.primary,
                  }}
                >
                  {amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
            Duration (Days)
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {[3, 7, 14, 30].map((days) => (
              <TouchableOpacity
                key={days}
                onPress={() => setDuration(days)}
                style={{
                  flex: 1,
                  padding: theme.spacing.md,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 2,
                  borderColor: duration === days ? theme.colors.primary : theme.colors.border,
                  backgroundColor: duration === days ? theme.colors.primary + '10' : theme.colors.surface,
                }}
              >
                <Text
                  variant="body"
                  style={{
                    textAlign: 'center',
                    fontWeight: '600',
                    color: duration === days ? theme.colors.primary : theme.colors.text.primary,
                  }}
                >
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{
          backgroundColor: theme.colors.surfaceVariant,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
        }}>
          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
            Estimated Reach
          </Text>
          <Text variant="body" style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {Math.floor(budget * duration * 10)} - {Math.floor(budget * duration * 25)} people
          </Text>
          <Text variant="caption" color="muted">
            Based on your budget and duration
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            variant="secondary"
            onPress={onClose}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleCreateSponsorship}
            style={{ flex: 1 }}
          >
            Promote Post
          </Button>
        </View>
      </View>
    </View>
  );
}
