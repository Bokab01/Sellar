import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useListings } from '@/hooks/useListings';
import { FEATURE_CATALOG, getFeatureByKey, getFeatureCost, calculateCreditValue } from '@/constants/monetization';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  Badge,
  Chip,
  AppModal,
  Input,
  ProductCard,
  EmptyState,
  LoadingSkeleton,
  Toast,
  Grid,
  FeatureActivationModal,
} from '@/components';
import { ShoppingCart, CheckCircle, Info } from 'lucide-react-native';

// Combined Feature Modal Component
function CombinedFeatureModal({
  feature,
  userListings,
  selectedListing,
  onListingSelect,
  balance,
  onActivate,
  onCancel,
  hasBusinessPlan,
}: {
  feature: any;
  userListings: any[];
  selectedListing: string | null;
  onListingSelect: (id: string) => void;
  balance: number;
  onActivate: () => void;
  onCancel: () => void;
  hasBusinessPlan: () => boolean;
}) {
  const { theme } = useTheme();
  
  if (!feature) return null;

  const requiresListing = ['pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh', 'listing_highlight', 'urgent_badge'].includes(feature.key);
  const isBusinessUser = hasBusinessPlan();
  const featureCost = getFeatureCost(feature.key, isBusinessUser);
  const canAfford = balance >= featureCost;
  
  // Check if selected listing has active boosts
  const selectedListingData = selectedListing ? userListings.find(l => l.id === selectedListing) : null;
  const hasActiveBoost = selectedListingData ? checkForActiveBoosts(selectedListingData, feature.key) : false;
  
  const canActivate = canAfford && (!requiresListing || selectedListing) && !hasActiveBoost;

  // Helper function to check for active boosts
  function checkForActiveBoosts(listing: any, featureKey: string): boolean {
    const now = new Date();
    
    // Ad refresh is always allowed as it doesn't conflict with other boosts
    if (featureKey === 'ad_refresh') {
      return false;
    }
    
    // Check for ANY active boost (listings should only have one boost at a time)
    return (
      (listing.boost_until && new Date(listing.boost_until) > now) ||
      (listing.highlight_until && new Date(listing.highlight_until) > now) ||
      (listing.urgent_until && new Date(listing.urgent_until) > now) ||
      (listing.spotlight_until && new Date(listing.spotlight_until) > now)
    );
  }

  // Helper function to get active boost message
  function getActiveBoostMessage(listing: any, featureKey: string): string {
    const now = new Date();
    
    // Check which boost is currently active and return appropriate message
    if (listing.boost_until && new Date(listing.boost_until) > now) {
      const expiresAt = new Date(listing.boost_until);
      return `Has active pulse boost until ${expiresAt.toLocaleDateString()}`;
    }
    
    if (listing.highlight_until && new Date(listing.highlight_until) > now) {
      const expiresAt = new Date(listing.highlight_until);
      return `Has active highlight until ${expiresAt.toLocaleDateString()}`;
    }
    
    if (listing.urgent_until && new Date(listing.urgent_until) > now) {
      const expiresAt = new Date(listing.urgent_until);
      return `Has active urgent badge until ${expiresAt.toLocaleDateString()}`;
    }
    
    if (listing.spotlight_until && new Date(listing.spotlight_until) > now) {
      const expiresAt = new Date(listing.spotlight_until);
      return `Has active spotlight until ${expiresAt.toLocaleDateString()}`;
    }
    
    return '';
  }

  // Helper function to get active boost details for badges
  function getActiveBoostDetails(listing: any): { type: string; icon: string; color: string; label: string; expiresAt: Date } | null {
    const now = new Date();
    
    if (listing.boost_until && new Date(listing.boost_until) > now) {
      return {
        type: 'pulse',
        icon: '⚡',
        color: '#FF6B35',
        label: 'Pulse Boost',
        expiresAt: new Date(listing.boost_until)
      };
    }
    
    if (listing.highlight_until && new Date(listing.highlight_until) > now) {
      return {
        type: 'highlight',
        icon: '✨',
        color: '#FFD700',
        label: 'Highlighted',
        expiresAt: new Date(listing.highlight_until)
      };
    }
    
    if (listing.urgent_until && new Date(listing.urgent_until) > now) {
      return {
        type: 'urgent',
        icon: '🔥',
        color: '#FF4444',
        label: 'Urgent',
        expiresAt: new Date(listing.urgent_until)
      };
    }
    
    if (listing.spotlight_until && new Date(listing.spotlight_until) > now) {
      return {
        type: 'spotlight',
        icon: '🎯',
        color: '#8B5CF6',
        label: 'Spotlight',
        expiresAt: new Date(listing.spotlight_until)
      };
    }
    
    return null;
  }

  return (
    <View style={{ height: 500, width: '100%' }}>
      {/* Compact Feature Details Header */}
      <View style={{ 
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginBottom: theme.spacing.md,
      }}>
        {/* Feature Info Row */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: theme.spacing.sm,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.primary + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 18 }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '700', lineHeight: 20 }}>
                {feature.name}
              </Text>
              <Text variant="caption" color="secondary" numberOfLines={1}>
                {feature.description}
              </Text>
            </View>
          </View>
          
          {/* Cost & Balance */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="body" color="primary" style={{ fontWeight: '700' }}>
              {featureCost} credits
            </Text>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: theme.spacing.xs,
            }}>
              <Text variant="caption" color={canAfford ? 'success' : 'error'} style={{ fontWeight: '600' }}>
                Balance: {balance}
              </Text>
              <Text style={{ 
                fontSize: 12, 
                color: canAfford ? theme.colors.success : theme.colors.error 
              }}>
                {canAfford ? '✓' : '✗'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Listing Selection (if required) */}
      {requiresListing && (
        <View style={{ flex: 1 }}>
          <Text variant="bodySmall" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
            Select Listing ({userListings.length} available)
          </Text>
          
          <ScrollView 
            style={{ height: 320 }}
            contentContainerStyle={{ 
              paddingBottom: theme.spacing.md,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={true}
            bounces={true}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {userListings.map((listing) => {
              const listingHasActiveBoost = checkForActiveBoosts(listing, feature.key);
              const activeBoostMessage = listingHasActiveBoost ? getActiveBoostMessage(listing, feature.key) : '';
              const boostDetails = getActiveBoostDetails(listing);
              
              return (
                <TouchableOpacity
                  key={listing.id}
                  onPress={() => {
                    if (!listingHasActiveBoost) {
                      onListingSelect(listing.id);
                    }
                    // Do nothing if listing has active boost, but don't disable the TouchableOpacity
                  }}
                  activeOpacity={listingHasActiveBoost ? 1 : 0.7}
                  style={{
                    backgroundColor: listingHasActiveBoost ? theme.colors.error + '05' : 
                                   selectedListing === listing.id ? theme.colors.primary + '10' : theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.lg,
                    marginBottom: theme.spacing.md,
                    borderWidth: 2,
                    borderColor: listingHasActiveBoost ? theme.colors.error + '30' :
                               selectedListing === listing.id ? theme.colors.primary + '40' : theme.colors.border,
                    opacity: listingHasActiveBoost ? 0.6 : 1,
                  }}
                >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.background,
                    overflow: 'hidden',
                  }}>
                    {listing.images && listing.images.length > 0 && listing.images[0] ? (
                      <Image
                        source={{ uri: listing.images[0] }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: theme.colors.primary + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 20 }}>📷</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                      {listing.title}
                    </Text>
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginTop: theme.spacing.xs,
                    }}>
                      <Text variant="caption" color="secondary">
                        ₵{listing.price?.toLocaleString()} • {listing.condition?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                      </Text>
                      
                      {/* Professional Boost Badge */}
                      {boostDetails && (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: boostDetails.color + '15',
                          borderWidth: 1,
                          borderColor: boostDetails.color + '40',
                          borderRadius: theme.borderRadius.sm,
                          paddingHorizontal: theme.spacing.xs,
                          paddingVertical: 2,
                          marginLeft: theme.spacing.xs,
                        }}>
                          <Text style={{ 
                            fontSize: 10, 
                            marginRight: 2,
                          }}>
                            {boostDetails.icon}
                          </Text>
                          <Text style={{ 
                            fontSize: 10, 
                            fontWeight: '600',
                            color: boostDetails.color,
                          }}>
                            {boostDetails.label.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Expiry Information for Boosted Listings */}
                    {boostDetails && (
                      <Text variant="caption" color="muted" style={{ 
                        marginTop: theme.spacing.xs,
                        fontSize: 10,
                      }}>
                        Expires {boostDetails.expiresAt.toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  
                  {selectedListing === listing.id && !listingHasActiveBoost && (
                    <CheckCircle size={24} color={theme.colors.primary} />
                  )}
                  
                  {listingHasActiveBoost && (
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: theme.colors.error + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 12, color: theme.colors.error }}>✗</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ 
        paddingTop: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: theme.spacing.md,
      }}>
        <Button
          onPress={onActivate}
          disabled={!canActivate}
          style={{ 
            opacity: canActivate ? 1 : 0.5,
          }}
        >
          {!canAfford ? `Need ${featureCost - balance} more credits` : 
           requiresListing && !selectedListing ? 'Select a listing first' :
           hasActiveBoost ? 'Listing already has an active boost' :
           `Activate for ${featureCost} credits`}
        </Button>
        
        <Button variant="tertiary" onPress={onCancel}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

export default function FeatureMarketplaceScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    balance, 
    loading, 
    refreshCredits, 
    purchaseFeature,
    hasFeatureAccess,
    hasBusinessPlan,
  } = useMonetizationStore();
  
  const { listings: userListings, loading: listingsLoading, refresh: refreshListings } = useListings({ userId: user?.id });
  
  // Removed selectedCategory state - no longer using tabs
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoFeature, setInfoFeature] = useState<any>(null);

  useEffect(() => {
    refreshCredits();
  }, []);


  // Removed getCategoryIcon function - no longer using categories

  const getFeatureIcon = (featureKey: string) => {
    // Use the icon from the feature definition, or fallback to key-based logic
    const feature = getFeatureByKey(featureKey);
    if (feature && 'icon' in feature) {
      return feature.icon;
    }
    
    // Fallback logic for any missing icons
    if (featureKey.includes('boost')) return '⚡';
    if (featureKey.includes('spotlight')) return '🎯';
    if (featureKey.includes('refresh')) return '🔄';
    if (featureKey.includes('highlight')) return '✨';
    if (featureKey.includes('urgent')) return '🔥';
    return '✨';
  };

  const handleFeaturePurchase = (featureKey: string) => {
    const feature = getFeatureByKey(featureKey);
    
    if (!feature) {
      Alert.alert('Error', `Feature "${featureKey}" not found. Please try again.`);
      return;
    }

    setSelectedFeature({ key: featureKey, ...(feature as any) });
    
    // For listing-specific features, check if user has listings
    if (['pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh', 'listing_highlight', 'urgent_badge'].includes(featureKey)) {
      if (listingsLoading) {
        Alert.alert('Loading', 'Please wait while we load your listings...');
        return;
      }
      
      if (!userListings || userListings.length === 0) {
        Alert.alert(
          'No Active Listings', 
          'You need to have at least one active listing to use this feature. Please create a listing first.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create Listing', onPress: () => router.push('/(tabs)/create') }
          ]
        );
        return;
      }
      
      // For listing features, pre-select first listing if only one exists
      if (userListings.length === 1) {
        setSelectedListing(userListings[0].id);
      } else {
        setSelectedListing(null); // User will select in the modal
      }
    } else {
      setSelectedListing(null);
    }
    
    setShowFeatureModal(true);
  };

  const handleListingSelection = (listingId: string) => {
    setSelectedListing(listingId);
  };

  const handleShowInfo = (featureKey: string, event: any) => {
    // Stop event propagation to prevent card click
    event?.stopPropagation?.();
    
    const feature = getFeatureByKey(featureKey);
    if (feature) {
      setInfoFeature({ key: featureKey, ...(feature as any) });
      setShowInfoModal(true);
    }
  };

  // Get all features directly from the catalog
  const allFeatures = Object.keys(FEATURE_CATALOG);

  // Show features immediately, don't wait for credits to load

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Boost Your Listings"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <View
            key="credits-display"
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.full,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          >
            <Text
              variant="caption"
              style={{
                color: theme.colors.primaryForeground,
                fontWeight: '600',
              }}
            >
               {loading ? 'Loading...' : `${balance} Credits`}
            </Text>
          </View>
        ]}
      />

        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
          <Container>
          {/* Header Section */}
              <View
                style={{
                  backgroundColor: theme.colors.primary + '10',
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  marginBottom: theme.spacing.xl,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                }}
              >
            <View
              style={{
                backgroundColor: theme.colors.primary + '20',
                borderRadius: theme.borderRadius.lg,
                width: 48,
                height: 48,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 24 }}>⚡</Text>
            </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
                {hasBusinessPlan() ? 'Sellar Pro Features' : 'Available Boosts'}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                {hasBusinessPlan() 
                  ? 'Your listings auto-refresh every 2 hours for maximum visibility'
                  : 'Boost your listings and increase sales with powerful features'
                }
                  </Text>
                </View>
              </View>

            {/* Features Grid */}
            <View style={{ gap: theme.spacing.lg }}>
            {hasBusinessPlan() ? (
              // Sellar Pro users see auto-refresh status instead of boost features
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.success + '30',
                  ...theme.shadows.sm,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.success + '15',
                      borderRadius: theme.borderRadius.lg,
                      width: 60,
                      height: 60,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>🔄</Text>
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text variant="h4" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                      Auto-Refresh System
                    </Text>
                    <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                      Your listings automatically refresh every 2 hours to stay at the top
                    </Text>
                    <Text variant="caption" color="muted">
                      Continuous top placement
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <Badge
                      text="Active"
                      variant="success"
                      style={{ paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
                    />
                    
                    <Text variant="caption" color="muted">
                      12 top placements daily
                    </Text>
                  </View>

                  <Badge 
                  text="Included in Pro" variant="success" style={{ paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, marginLeft: theme.spacing.sm }} />
                </View>
              </View>
            ) : (
              // Regular users see boost features
              allFeatures.map((featureKey) => {
                const feature = getFeatureByKey(featureKey);
                if (!feature) return null;

                const isBusinessUser = hasBusinessPlan();
                const featureCost = getFeatureCost(featureKey, isBusinessUser);
                const canAfford = balance >= featureCost;
                const hasAccess = hasFeatureAccess(featureKey);

                return (
                  <View
                    key={featureKey}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.borderRadius.lg,
                      borderWidth: 1,
                      borderColor: canAfford ? theme.colors.primary + '30' : theme.colors.border,
                      opacity: !canAfford || hasAccess ? 0.6 : 1,
                      ...theme.shadows.sm,
                      position: 'relative',
                    }}
                  >
                    {/* Info Icon - Top Right */}
                    <TouchableOpacity
                      onPress={(e) => handleShowInfo(featureKey, e)}
                      style={{
                        position: 'absolute',
                        top: theme.spacing.md,
                        right: theme.spacing.md,
                        backgroundColor: theme.colors.primary + '15',
                        borderRadius: theme.borderRadius.full,
                        width: 32,
                        height: 32,
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10,
                      }}
                      activeOpacity={0.7}
                    >
                      <Info size={18} color={theme.colors.primary} />
                    </TouchableOpacity>

                    {/* Clickable Card Content */}
                    <TouchableOpacity
                      onPress={() => handleFeaturePurchase(featureKey)}
                      disabled={!canAfford || hasAccess}
                      style={{
                        padding: theme.spacing.lg,
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
                      <View
                        style={{
                          backgroundColor: theme.colors.primary + '15',
                          borderRadius: theme.borderRadius.lg,
                            width: 70,
                            height: 70,
                          justifyContent: 'center',
                          alignItems: 'center',
                            overflow: 'hidden',
                        }}
                      >
                          <Text style={{ fontSize: 30, lineHeight: 36 }}>{getFeatureIcon(featureKey)}</Text>
                      </View>
                      
                        <View style={{ flex: 1, paddingRight: theme.spacing.xl }}>
                        <Text variant="h4" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                          {(feature as any).name}
                        </Text>
                        <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                          {(feature as any).description}
                        </Text>
                        <Text variant="caption" color="muted">
                          Duration: {(feature as any).duration}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                        <Badge
                          text={`${featureCost} Credits`}
                          variant={canAfford ? 'success' : 'error'}
                        />
                        
                        <Text variant="caption" color="muted">
                          ≈ GHS {calculateCreditValue(featureCost).toFixed(2)}
                        </Text>
                      </View>

                      {hasAccess ? (
                        <Badge text="Active" variant="success" />
                      ) : !canAfford ? (
                        <Badge text="Need Credits" variant="error" />
                      ) : (
                        <Text variant="button" style={{ color: theme.colors.primary }}>
                          Purchase →
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  </View>
                );
              })
            )}
            </View>

            {/* Low Credits Warning - Only show for non-Pro users */}
            {!hasBusinessPlan() && balance < 15 && (
              <View
                style={{
                  backgroundColor: theme.colors.warning + '10',
                  borderColor: theme.colors.warning,
                  borderWidth: 1,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  marginTop: theme.spacing.xl,
                  alignItems: 'center',
                }}
              >
                <Text variant="h4" style={{ color: theme.colors.warning, marginBottom: theme.spacing.md }}>
                  ⚠️ Low Credits
                </Text>
                <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
                  You&apos;re running low on credits. Buy more to unlock powerful features for your listings.
                </Text>
                <Button
                  variant="primary"
                  onPress={() => router.push('/buy-credits')}
                  icon={<ShoppingCart size={18} color={theme.colors.primaryForeground} />}
                >
                  Buy Credits
                </Button>
              </View>
            )}

            {/* Sellar Pro Success Message */}
            {hasBusinessPlan() && (
              <View
                style={{
                  backgroundColor: theme.colors.success + '10',
                  borderColor: theme.colors.success,
                  borderWidth: 1,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  marginTop: theme.spacing.xl,
                  alignItems: 'center',
                }}
              >
                <Text variant="h4" style={{ color: theme.colors.success, marginBottom: theme.spacing.md }}>
                  ✅ Sellar Pro Active
                </Text>
                <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
                  Your listings automatically refresh every 2 hours for maximum visibility. No manual boosting needed!
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => router.push('/(tabs)/more/dashboard')}
                  icon={<CheckCircle size={18} color={theme.colors.success} />}
                >
                  View Dashboard
                </Button>
              </View>
            )}
          </Container>
        </ScrollView>

       {/* Combined Feature & Listing Selection Modal */}
       <AppModal
         visible={showFeatureModal}
        onClose={() => {
           setShowFeatureModal(false);
          setSelectedFeature(null);
          setSelectedListing(null);
        }}
         title={selectedFeature?.name || 'Feature'}
         size="lg"
         position='bottom'
       >
         <CombinedFeatureModal
           feature={selectedFeature}
           userListings={userListings}
           selectedListing={selectedListing}
           onListingSelect={handleListingSelection}
           balance={balance}
           hasBusinessPlan={hasBusinessPlan}
           onActivate={async () => {
             if (!selectedFeature || !user) return;

             // Check if listing is required and selected
             const requiresListing = ['pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh', 'listing_highlight', 'urgent_badge'].includes(selectedFeature.key);
             if (requiresListing && !selectedListing) {
               Alert.alert('Select Listing', 'Please select a listing to apply this feature to.');
               return;
             }

             try {
               const isBusinessUser = hasBusinessPlan();
               const featureCost = getFeatureCost(selectedFeature.key, isBusinessUser);
               const result = await purchaseFeature(selectedFeature.key, featureCost, { listing_id: selectedListing });
               
               if (result.success) {
                 setShowFeatureModal(false);
                 setSelectedFeature(null);
                 setSelectedListing(null);
                 setToastMessage(`${selectedFeature.name} activated successfully!`);
          setToastVariant('success');
          setShowToast(true);
                 // No need to call refreshCredits() here - the purchaseFeature function handles it
               } else {
                 Alert.alert('Activation Failed', result.error || 'Failed to activate feature');
               }
             } catch (error: any) {
               console.error('Feature activation error:', error);
               Alert.alert('Error', 'Failed to activate feature. Please try again.');
             }
           }}
           onCancel={() => {
             setShowFeatureModal(false);
             setSelectedFeature(null);
             setSelectedListing(null);
           }}
         />
       </AppModal>

      {/* Enhanced Info Modal */}
      <AppModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title={infoFeature?.name || 'Feature Details'}
        size="lg"
        position="bottom"
      >
        <ScrollView style={{ maxHeight: 600 }} showsVerticalScrollIndicator={false}>
          <View style={{ padding: theme.spacing.lg }}>
            {infoFeature && (
              <>
                {/* Feature Icon & Price */}
                <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.primary + '15',
                      borderRadius: theme.borderRadius.lg,
                      width: 90,
                      height: 90,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: theme.spacing.md,
                      overflow: 'hidden',
                    }}
                  >
                    <Text style={{ fontSize: 38, lineHeight: 45 }}>{getFeatureIcon(infoFeature.key)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
                    <Badge 
                      text={`${getFeatureCost(infoFeature.key, hasBusinessPlan())} Credits`}
                      variant="primary"
                      size="md"
                    />
                    <Text variant="bodySmall" color="muted">
                      ≈ GHS {calculateCreditValue(getFeatureCost(infoFeature.key, hasBusinessPlan())).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Compelling Headline */}
                <View style={{
                  backgroundColor: theme.colors.success + '10',
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.xl,
                  borderLeftWidth: 4,
                  borderLeftColor: theme.colors.success,
                }}>
                  <Text variant="h4" style={{ color: theme.colors.success, marginBottom: theme.spacing.xs }}>
                    {infoFeature.key === 'pulse_boost_24h' && '⚡ Get 2-3x More Views in 24 Hours!'}
                    {infoFeature.key === 'mega_pulse_7d' && '🚀 Dominate Your Category for a Week!'}
                    {infoFeature.key === 'category_spotlight_3d' && '🎯 Be Featured in Your Category!'}
                    {infoFeature.key === 'ad_refresh' && '🔄 Move to Top Instantly!'}
                    {infoFeature.key === 'listing_highlight' && '✨ Stand Out with Golden Border!'}
                    {infoFeature.key === 'urgent_badge' && '🔥 Create Urgency, Sell Faster!'}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {infoFeature.key === 'pulse_boost_24h' && 'Most sellers see 2-3x more views within the first 24 hours'}
                    {infoFeature.key === 'mega_pulse_7d' && 'Stay at the top of search results for an entire week'}
                    {infoFeature.key === 'category_spotlight_3d' && 'Your listing appears in the featured section of your category'}
                    {infoFeature.key === 'ad_refresh' && 'Perfect for quick visibility boost when you need it most'}
                    {infoFeature.key === 'listing_highlight' && 'Listings with highlights get 40% more engagement'}
                    {infoFeature.key === 'urgent_badge' && 'Urgent badges increase response rates by 60%'}
                  </Text>
                </View>

                {/* What You Get */}
                <View style={{ marginBottom: theme.spacing.xl }}>
                  <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                    📦 What You Get:
                  </Text>
                  <View style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                    gap: theme.spacing.sm,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="bodySmall" color="secondary">Duration:</Text>
                      <Text variant="bodySmall" style={{ fontWeight: '600' }}>{infoFeature.duration}</Text>
                    </View>
                    {infoFeature.key === 'pulse_boost_24h' && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="bodySmall" color="secondary">Visibility Boost:</Text>
                        <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.success }}>2-3x Higher</Text>
                      </View>
                    )}
                    {infoFeature.key === 'mega_pulse_7d' && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="bodySmall" color="secondary">Visibility Boost:</Text>
                        <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.success }}>5x Higher</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Real Results - Coming Soon */}
                {/* TODO: Integrate real seller testimonials and results
                <View style={{ marginBottom: theme.spacing.xl }}>
                  <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                    📊 Real Results from Sellers:
                  </Text>
                  <View style={{ gap: theme.spacing.md }}>
                    {infoFeature.key === 'pulse_boost_24h' && (
                      <>
                        <View style={{
                          backgroundColor: theme.colors.background,
                          borderRadius: theme.borderRadius.md,
                          padding: theme.spacing.md,
                          borderLeftWidth: 3,
                          borderLeftColor: theme.colors.primary,
                        }}>
                          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs, fontStyle: 'italic' }}>
                            "Got 43 views in 24 hours vs my usual 12-15. Sold my laptop within 2 days!"
                          </Text>
                          <Text variant="caption" color="muted">- Kofi, Accra</Text>
                        </View>
                        <View style={{
                          backgroundColor: theme.colors.background,
                          borderRadius: theme.borderRadius.md,
                          padding: theme.spacing.md,
                          borderLeftWidth: 3,
                          borderLeftColor: theme.colors.primary,
                        }}>
                          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs, fontStyle: 'italic' }}>
                            "Best investment! My phone listing got 8 inquiries in the first day."
                          </Text>
                          <Text variant="caption" color="muted">- Ama, Kumasi</Text>
                        </View>
                      </>
                    )}
                    {infoFeature.key === 'mega_pulse_7d' && (
                      <>
                        <View style={{
                          backgroundColor: theme.colors.background,
                          borderRadius: theme.borderRadius.md,
                          padding: theme.spacing.md,
                          borderLeftWidth: 3,
                          borderLeftColor: theme.colors.primary,
                        }}>
                          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs, fontStyle: 'italic' }}>
                            "Stayed at the top for a full week. Got 120+ views and sold 3 items!"
                          </Text>
                          <Text variant="caption" color="muted">- Kwame, Tema</Text>
                        </View>
                        <View style={{
                          backgroundColor: theme.colors.background,
                          borderRadius: theme.borderRadius.md,
                          padding: theme.spacing.md,
                          borderLeftWidth: 3,
                          borderLeftColor: theme.colors.primary,
                        }}>
                          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs, fontStyle: 'italic' }}>
                            "Worth every credit. My car listing was seen by hundreds of buyers."
                          </Text>
                          <Text variant="caption" color="muted">- Abena, Takoradi</Text>
                        </View>
                      </>
                    )}
                    {(infoFeature.key === 'category_spotlight_3d' || infoFeature.key === 'listing_highlight' || infoFeature.key === 'urgent_badge' || infoFeature.key === 'ad_refresh') && (
                      <View style={{
                        backgroundColor: theme.colors.background,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.md,
                        borderLeftWidth: 3,
                        borderLeftColor: theme.colors.primary,
                      }}>
                        <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs, fontStyle: 'italic' }}>
                          "My listing stood out from the crowd and I got serious buyers reaching out quickly!"
                        </Text>
                        <Text variant="caption" color="muted">- Sellar Community</Text>
                      </View>
                    )}
                  </View>
                </View>
                */}

                {/* Key Benefits */}
                {infoFeature.benefits && (
                  <View style={{ marginBottom: theme.spacing.xl }}>
                    <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                      ✨ Key Benefits:
                    </Text>
                    <View style={{ gap: theme.spacing.sm }}>
                      {infoFeature.benefits.map((benefit: string, index: number) => (
                        <View
                          key={index}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            backgroundColor: theme.colors.success + '08',
                            padding: theme.spacing.md,
                            borderRadius: theme.borderRadius.md,
                          }}
                        >
                          <Text style={{ color: theme.colors.success, marginRight: theme.spacing.sm, fontSize: 16 }}>✓</Text>
                          <Text variant="bodySmall" style={{ flex: 1, lineHeight: 20 }}>
                            {benefit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* How It Works */}
                <View style={{ marginBottom: theme.spacing.xl }}>
                  <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                    ⚙️ How It Works:
                  </Text>
                  <View style={{ gap: theme.spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: theme.colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: theme.spacing.md,
                      }}>
                        <Text variant="caption" style={{ color: theme.colors.primaryForeground, fontWeight: '700' }}>1</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" style={{ fontWeight: '600', marginBottom: 4 }}>Select Your Listing</Text>
                        <Text variant="bodySmall" color="secondary">Choose which listing you want to boost</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: theme.colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: theme.spacing.md,
                      }}>
                        <Text variant="caption" style={{ color: theme.colors.primaryForeground, fontWeight: '700' }}>2</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" style={{ fontWeight: '600', marginBottom: 4 }}>Instant Activation</Text>
                        <Text variant="bodySmall" color="secondary">Feature activates immediately after purchase</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: theme.colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: theme.spacing.md,
                      }}>
                        <Text variant="caption" style={{ color: theme.colors.primaryForeground, fontWeight: '700' }}>3</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" style={{ fontWeight: '600', marginBottom: 4 }}>Watch Results Roll In</Text>
                        <Text variant="bodySmall" color="secondary">Track views and inquiries in real-time</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Value Proposition */}
                <View style={{
                  backgroundColor: theme.colors.warning + '15',
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.lg,
                  marginBottom: theme.spacing.xl,
                  borderWidth: 1,
                  borderColor: theme.colors.warning + '30',
                }}>
                  <Text variant="h4" style={{ color: theme.colors.warning, marginBottom: theme.spacing.sm }}>
                    💰 Why It's Worth It:
                  </Text>
                  <Text variant="body" color="secondary" style={{ lineHeight: 22 }}>
                    {infoFeature.key === 'pulse_boost_24h' && 'Sell faster, get your money quicker! When your listing gets more views, you find buyers faster. The small credit cost pays for itself when you sell even just one day earlier.'}
                    {infoFeature.key === 'mega_pulse_7d' && 'Stay at the top for a whole week! Your listing will be seen by more people every single day. Perfect for expensive items that take time to sell, like cars, phones, or furniture.'}
                    {infoFeature.key === 'category_spotlight_3d' && 'Get featured in your category! When people browse your category, they see your listing first. More eyes on your listing means more buyers reaching out to you.'}
                    {infoFeature.key === 'ad_refresh' && 'Your listing dropped down? Bring it back to the top instantly! No need to wait days for people to see your item again. Perfect for quick visibility.'}
                    {infoFeature.key === 'listing_highlight' && 'Make your listing shine! The special golden border makes people notice your listing among hundreds of others. It catches attention and gets more clicks.'}
                    {infoFeature.key === 'urgent_badge' && 'Make buyers act fast! The urgent badge tells buyers "don\'t wait, this might be gone soon!" People respond quicker when they think they might miss out.'}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={{ gap: theme.spacing.md }}>
                  <Button
                    variant="primary"
                    onPress={() => {
                      setShowInfoModal(false);
                      handleFeaturePurchase(infoFeature.key);
                    }}
                    fullWidth
                  >
                    Get {infoFeature.name} Now
                  </Button>
                  <Button
                    variant="tertiary"
                    onPress={() => setShowInfoModal(false)}
                    fullWidth
                  >
                    Maybe Later
                  </Button>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </AppModal>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}
