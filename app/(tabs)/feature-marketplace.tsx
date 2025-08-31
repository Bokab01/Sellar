import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useListings } from '@/hooks/useListings';
import { FEATURE_CATALOG, FEATURE_CATEGORIES, getFeatureByKey } from '@/constants/monetization';
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
} from '@/components';
import { Zap, Package, ShoppingCart, Eye, Target, Settings, Building } from 'lucide-react-native';

export default function FeatureMarketplaceScreen() {
  const { theme } = useTheme();
  const { 
    balance, 
    loading, 
    refreshCredits, 
    purchaseFeature,
    hasFeatureAccess,
  } = useMonetizationStore();
  
  const { listings: userListings } = useListings({ userId: 'current' }); // TODO: Pass actual user ID
  
  const [selectedCategory, setSelectedCategory] = useState<string>('visibility');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  useEffect(() => {
    refreshCredits();
  }, []);

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'visibility': return <Eye size={24} color={theme.colors.primary} />;
      case 'management': return <Settings size={24} color={theme.colors.primary} />;
      case 'business': return <Building size={24} color={theme.colors.primary} />;
      default: return <Package size={24} color={theme.colors.text.muted} />;
    }
  };

  const getFeatureIcon = (featureKey: string) => {
    if (featureKey.includes('boost')) return '⚡';
    if (featureKey.includes('spotlight')) return '🎯';
    if (featureKey.includes('refresh')) return '🔄';
    if (featureKey.includes('whatsapp')) return '💬';
    if (featureKey.includes('business')) return '🏢';
    if (featureKey.includes('analytics')) return '📊';
    if (featureKey.includes('support')) return '🎧';
    return '✨';
  };

  const handleFeaturePurchase = (featureKey: string) => {
    const feature = getFeatureByKey(featureKey);
    if (!feature) return;

    setSelectedFeature({ key: featureKey, ...feature });
    
    // For listing-specific features, show listing picker
    if (['pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh'].includes(featureKey)) {
      if (userListings.length === 0) {
        Alert.alert('No Listings', 'You need to create a listing first to use this feature.');
        return;
      }
    }
    
    setShowPurchaseModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedFeature) return;

    if (balance < selectedFeature.credits) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${selectedFeature.credits} credits but only have ${balance}. Would you like to buy more credits?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => router.push('/(tabs)/buy-credits') },
        ]
      );
      return;
    }

    setPurchasing(true);
    try {
      const metadata: any = {};
      
      if (selectedListing) {
        metadata.listing_id = selectedListing;
      }

      const result = await purchaseFeature(selectedFeature.key, selectedFeature.credits, metadata);
      
      if (result.success) {
        setShowPurchaseModal(false);
        setSelectedFeature(null);
        setSelectedListing(null);
        setToastMessage(`${selectedFeature.name} activated successfully!`);
        setToastVariant('success');
        setShowToast(true);
      } else {
        setToastMessage(result.error || 'Failed to purchase feature');
        setToastVariant('error');
        setShowToast(true);
      }
    } catch (error: any) {
      setToastMessage('Failed to purchase feature');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setPurchasing(false);
    }
  };

  const selectedCategoryData = FEATURE_CATEGORIES.find(cat => cat.id === selectedCategory);
  const categoryFeatures = selectedCategoryData?.features || [];

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Feature Marketplace"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={80} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.xl }} />
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} width="100%" height={120} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
          ))}
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Feature Marketplace"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <View
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
              {balance} Credits
            </Text>
          </View>,
        ]}
      />

      <View style={{ flex: 1 }}>
        {/* Category Tabs */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              gap: theme.spacing.sm,
            }}
          >
            {FEATURE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={{
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.lg,
                  borderBottomWidth: 2,
                  borderBottomColor: selectedCategory === category.id ? theme.colors.primary : 'transparent',
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text style={{ fontSize: 16 }}>{category.icon}</Text>
                  <Text
                    variant="button"
                    style={{
                      color: selectedCategory === category.id ? theme.colors.primary : theme.colors.text.secondary,
                      fontWeight: selectedCategory === category.id ? '600' : '500',
                    }}
                  >
                    {category.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
          <Container>
            {/* Category Description */}
            {selectedCategoryData && (
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
                {getCategoryIcon(selectedCategory)}
                <View style={{ flex: 1 }}>
                  <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
                    {selectedCategoryData.name}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {selectedCategoryData.description}
                  </Text>
                </View>
              </View>
            )}

            {/* Features Grid */}
            <View style={{ gap: theme.spacing.lg }}>
              {categoryFeatures.map((featureKey) => {
                const feature = getFeatureByKey(featureKey);
                if (!feature) return null;

                const canAfford = balance >= feature.credits;
                const hasAccess = hasFeatureAccess(featureKey);

                return (
                  <TouchableOpacity
                    key={featureKey}
                    onPress={() => handleFeaturePurchase(featureKey)}
                    disabled={!canAfford || hasAccess}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.lg,
                      borderWidth: 1,
                      borderColor: canAfford ? theme.colors.primary + '30' : theme.colors.border,
                      opacity: !canAfford || hasAccess ? 0.6 : 1,
                      ...theme.shadows.sm,
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
                      <View
                        style={{
                          backgroundColor: theme.colors.primary + '15',
                          borderRadius: theme.borderRadius.lg,
                          width: 60,
                          height: 60,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 28 }}>{getFeatureIcon(featureKey)}</Text>
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <Text variant="h4" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                          {feature.name}
                        </Text>
                        <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                          {feature.description}
                        </Text>
                        <Text variant="caption" color="muted">
                          Duration: {feature.duration}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                        <Badge
                          text={`${feature.credits} Credits`}
                          variant={canAfford ? 'success' : 'error'}
                        />
                        
                        <Text variant="caption" color="muted">
                          ≈ GHS {(feature.credits * 0.167).toFixed(2)}
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
                );
              })}
            </View>

            {/* Low Credits Warning */}
            {balance < 15 && (
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
                  You're running low on credits. Buy more to unlock powerful features for your listings.
                </Text>
                <Button
                  variant="primary"
                  onPress={() => router.push('/(tabs)/buy-credits')}
                  icon={<ShoppingCart size={18} color={theme.colors.primaryForeground} />}
                >
                  Buy Credits
                </Button>
              </View>
            )}
          </Container>
        </ScrollView>
      </View>

      {/* Purchase Modal */}
      <AppModal
        visible={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        title={`Purchase ${selectedFeature?.name}`}
        primaryAction={{
          text: `Unlock with ${selectedFeature?.credits} credits`,
          onPress: handleConfirmPurchase,
          loading: purchasing,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowPurchaseModal(false),
        }}
      >
        {selectedFeature && (
          <View style={{ gap: theme.spacing.lg }}>
            <View
              style={{
                backgroundColor: theme.colors.primary + '10',
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: theme.spacing.md }}>
                {getFeatureIcon(selectedFeature.key)}
              </Text>
              <Text variant="h3" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                {selectedFeature.name}
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                {selectedFeature.description}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
                <Text variant="body">Cost:</Text>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {selectedFeature.credits} credits
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
                <Text variant="body">Duration:</Text>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {selectedFeature.duration}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
                <Text variant="body">Your Balance:</Text>
                <Text 
                  variant="body" 
                  style={{ 
                    fontWeight: '600',
                    color: balance >= selectedFeature.credits ? theme.colors.success : theme.colors.error,
                  }}
                >
                  {balance} credits
                </Text>
              </View>
              
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                  paddingTop: theme.spacing.md,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="body" style={{ fontWeight: '600' }}>
                  After Purchase:
                </Text>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {balance - selectedFeature.credits} credits
                </Text>
              </View>
            </View>

            {/* Listing Selection for applicable features */}
            {['pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh'].includes(selectedFeature.key) && (
              <View>
                <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                  Select Listing to Boost
                </Text>
                
                {userListings.length > 0 ? (
                  <View style={{ gap: theme.spacing.sm }}>
                    {userListings.slice(0, 5).map((listing: any) => (
                      <TouchableOpacity
                        key={listing.id}
                        onPress={() => setSelectedListing(listing.id)}
                        style={{
                          backgroundColor: selectedListing === listing.id 
                            ? theme.colors.primary + '10' 
                            : theme.colors.surfaceVariant,
                          borderColor: selectedListing === listing.id 
                            ? theme.colors.primary 
                            : theme.colors.border,
                          borderWidth: 1,
                          borderRadius: theme.borderRadius.md,
                          padding: theme.spacing.md,
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          variant="body"
                          style={{
                            fontWeight: selectedListing === listing.id ? '600' : '400',
                            color: selectedListing === listing.id 
                              ? theme.colors.primary 
                              : theme.colors.text.primary,
                          }}
                        >
                          {listing.title}
                        </Text>
                        <Text variant="caption" color="muted">
                          GHS {listing.price.toLocaleString()} • {listing.views_count || 0} views
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    title="No listings found"
                    description="Create a listing first to use boost features"
                    action={{
                      text: 'Create Listing',
                      onPress: () => router.push('/(tabs)/create'),
                    }}
                  />
                )}
              </View>
            )}

            {balance < selectedFeature.credits && (
              <View
                style={{
                  backgroundColor: theme.colors.error + '10',
                  borderColor: theme.colors.error,
                  borderWidth: 1,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                }}
              >
                <Text variant="bodySmall" style={{ color: theme.colors.error, textAlign: 'center' }}>
                  ⚠️ Insufficient credits. You need {selectedFeature.credits - balance} more credits.
                </Text>
              </View>
            )}
          </View>
        )}
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