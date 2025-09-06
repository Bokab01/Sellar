import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { Check, X, Clock, DollarSign } from 'lucide-react-native';

type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';

interface OfferCardProps {
  offer: {
    id: string;
    amount: number;
    currency?: string;
    originalPrice?: number;
    status: OfferStatus;
    timestamp: string;
    expiresAt?: string;
    buyer: {
      name: string;
      avatar?: string;
      rating?: number;
    };
    message?: string;
    isOwn?: boolean;
  };
  onAccept?: () => void;
  onReject?: () => void;
  onCounter?: () => void;
  onMessage?: () => void;
  showActions?: boolean;
  style?: any;
}

export function OfferCard({
  offer,
  onAccept,
  onReject,
  onCounter,
  onMessage,
  showActions = true,
  style,
}: OfferCardProps) {
  const { theme } = useTheme();

  const getStatusBadge = () => {
    switch (offer.status) {
      case 'pending':
        return { text: 'Pending', variant: 'warning' as const, icon: <Clock size={12} /> };
      case 'accepted':
        return { text: 'Accepted', variant: 'success' as const, icon: <Check size={12} /> };
      case 'rejected':
        return { text: 'Rejected', variant: 'error' as const, icon: <X size={12} /> };
      case 'countered':
        return { text: 'Countered', variant: 'info' as const, icon: <DollarSign size={12} /> };
      case 'expired':
        return { text: 'Expired', variant: 'neutral' as const, icon: <Clock size={12} /> };
      default:
        return { text: 'Unknown', variant: 'neutral' as const, icon: null };
    }
  };

  const statusBadge = getStatusBadge();
  const isPending = offer.status === 'pending';
  const isExpired = offer.status === 'expired' || (offer.expiresAt && new Date(offer.expiresAt) < new Date());

  // Calculate time remaining if pending
  const getTimeRemaining = () => {
    if (!offer.expiresAt || !isPending) return null;
    
    const now = new Date();
    const expires = new Date(offer.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const timeRemaining = getTimeRemaining();

  return (
    <View
      style={[
        {
          backgroundColor: offer.isOwn 
            ? theme.colors.primary + '10' 
            : theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: offer.isOwn 
            ? theme.colors.primary + '30' 
            : theme.colors.border,
          ...theme.shadows.sm,
          marginVertical: theme.spacing.sm,
        },
        style,
      ]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              💰 {offer.isOwn ? 'Your Offer' : 'Offer Received'}
            </Text>
            <Badge 
              text={statusBadge.text} 
              variant={statusBadge.variant} 
              size="sm" 
            />
          </View>
          
          <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
            {offer.timestamp}
          </Text>

          {timeRemaining && isPending && (
            <Text 
              variant="caption" 
              style={{ 
                color: isExpired ? theme.colors.error : theme.colors.warning,
                marginTop: theme.spacing.xs,
                fontWeight: '500',
              }}
            >
              ⏰ {timeRemaining}
            </Text>
          )}
        </View>
      </View>

      {/* Buyer Info - Only show if not own offer */}
      {!offer.isOwn && (
        <TouchableOpacity
          onPress={onMessage}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
          }}
          activeOpacity={0.7}
        >
          <Avatar
            source={offer.buyer.avatar}
            name={offer.buyer.name}
            size="sm"
            style={{ marginRight: theme.spacing.md }}
          />
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {offer.buyer.name}
            </Text>
            {offer.buyer.rating && (
              <Text variant="caption" color="muted">
                ⭐ {offer.buyer.rating.toFixed(1)} rating
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Offer Amount */}
      <View
        style={{
          backgroundColor: theme.colors.primary + '15',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.primary + '30',
        }}
      >
        <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
          {offer.isOwn ? 'Offered Price' : 'Buyer\'s Offer'}
        </Text>
        <PriceDisplay
          amount={offer.amount}
          currency={offer.currency}
          size="lg"
          originalPrice={offer.originalPrice}
          variant={offer.originalPrice ? 'discount' : 'default'}
        />
        
        {offer.originalPrice && (
          <Text variant="caption" style={{ 
            color: theme.colors.success, 
            marginTop: theme.spacing.sm,
            fontWeight: '600',
          }}>
            💰 Save GHS {((offer.originalPrice || 0) - (offer.amount || 0)).toLocaleString()}
          </Text>
        )}
      </View>

      {/* Message */}
      {offer.message && (
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            borderLeftWidth: 3,
            borderLeftColor: theme.colors.primary,
          }}
        >
          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
            💬 Message from {offer.isOwn ? 'you' : offer.buyer.name}:
          </Text>
          <Text variant="body" style={{ fontStyle: 'italic' }}>
            &quot;{offer.message}&quot;
          </Text>
        </View>
      )}

      {/* Actions */}
      {showActions && isPending && !isExpired && (
        <View style={{ gap: theme.spacing.md }}>
          {!offer.isOwn ? (
            // Seller actions
            <>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <Button
                  variant="primary"
                  icon={<Check size={18} color={theme.colors.primaryForeground} />}
                  onPress={onAccept}
                  style={{ flex: 1 }}
                >
                  Accept Offer
                </Button>

                <Button
                  variant="tertiary"
                  icon={<X size={18} color={theme.colors.error} />}
                  onPress={onReject}
                  style={{ flex: 1 }}
                >
                  Decline
                </Button>
              </View>

              {onCounter && (
                <Button
                  variant="secondary"
                  icon={<DollarSign size={18} color={theme.colors.primary} />}
                  onPress={onCounter}
                  fullWidth
                >
                  Make Counter Offer
                </Button>
              )}
            </>
          ) : (
            // Buyer actions (own offer)
            <View
              style={{
                backgroundColor: theme.colors.warning + '10',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.warning + '30',
              }}
            >
              <Text variant="bodySmall" style={{ 
                color: theme.colors.warning,
                textAlign: 'center',
                fontWeight: '500',
              }}>
                ⏳ Waiting for seller&apos;s response...
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Status Messages for Non-Pending Offers */}
      {!isPending && (
        <View
          style={{
            backgroundColor: offer.status === 'accepted' 
              ? theme.colors.success + '10'
              : offer.status === 'rejected'
              ? theme.colors.error + '10'
              : theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: offer.status === 'accepted' 
              ? theme.colors.success + '30'
              : offer.status === 'rejected'
              ? theme.colors.error + '30'
              : theme.colors.border,
          }}
        >
          <Text 
            variant="bodySmall" 
            style={{ 
              textAlign: 'center',
              fontWeight: '600',
              color: offer.status === 'accepted' 
                ? theme.colors.success
                : offer.status === 'rejected'
                ? theme.colors.error
                : theme.colors.text.secondary,
            }}
          >
            {offer.status === 'accepted' && '✅ Offer Accepted!'}
            {offer.status === 'rejected' && '❌ Offer Declined'}
            {offer.status === 'countered' && '🔄 Counter Offer Made'}
            {offer.status === 'expired' && '⏰ Offer Expired'}
          </Text>
          
          {offer.status === 'accepted' && onMessage && (
            <Button
              variant="primary"
              onPress={onMessage}
              size="sm"
              style={{ marginTop: theme.spacing.md }}
              fullWidth
            >
              Continue Conversation
            </Button>
          )}
        </View>
      )}

      {/* Expired State Actions */}
      {isExpired && offer.isOwn && onCounter && (
        <Button
          variant="secondary"
          icon={<DollarSign size={18} color={theme.colors.primary} />}
          onPress={onCounter}
          fullWidth
        >
          Make New Offer
        </Button>
      )}
    </View>
  );
}
