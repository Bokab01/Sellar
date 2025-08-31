import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { dbHelpers, supabase } from '@/lib/supabase';
import { storageHelpers } from '@/lib/storage';
import {
  Text,
  SafeAreaWrapper,
  Container,
  AppHeader,
  Input,
  Button,
  CustomImagePicker,
  Chip,
  PriceDisplay,
  Stepper,
  LocationPicker,
  Toast,
  LinearProgress,
  AppModal,
  Badge,
} from '@/components';
import { SelectedImage } from '@/components/ImagePicker';
import { Save, Eye, Zap, Camera, Info } from 'lucide-react-native';
import { router } from 'expo-router';

export default function CreateListingScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { balance, getMaxListings, spendCredits, hasUnlimitedListings } = useMonetizationStore();
  
  // Form state
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [condition, setCondition] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [acceptOffers, setAcceptOffers] = useState(true);
  
  // Categories from database
  const [categories, setCategories] = useState<any[]>([]);
  const [userListingsCount, setUserListingsCount] = useState(0);
  
  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPhotoTips, setShowPhotoTips] = useState(false);
  const [needsPayment, setNeedsPayment] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(0);

  const conditions = [
    'Brand New', 'Like New', 'Good', 'Fair', 'For Parts'
  ];

  useEffect(() => {
    fetchCategories();
    checkListingLimits();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await dbHelpers.getCategories();
      if (data) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const checkListingLimits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (data) {
        setUserListingsCount(data.length);
      }
    } catch (error) {
      console.error('Failed to check listing limits:', error);
    }
  };

  const validateForm = () => {
    if (!title.trim()) return 'Product title is required';
    if (title.trim().length < 10) return 'Title must be at least 10 characters';
    if (!description.trim()) return 'Product description is required';
    if (description.trim().length < 20) return 'Description must be at least 20 characters';
    if (!price.trim() || isNaN(Number(price))) return 'Valid price is required';
    if (Number(price) <= 0) return 'Price must be greater than 0';
    if (!selectedCategoryId) return 'Please select a category';
    if (!condition) return 'Please select condition';
    if (!location) return 'Please select location';
    if (images.length === 0) return 'At least one image is required';
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a listing');
      return;
    }

    // Check if payment is needed for additional listings
    const maxListings = getMaxListings();
    const needsCredits = !hasUnlimitedListings() && userListingsCount >= maxListings;
    
    if (needsCredits) {
      setNeedsPayment(true);
      setRequiredCredits(10);
      setShowPaymentModal(true);
      return;
    }

    await createListing();
  };

  const createListing = async () => {
    setLoading(true);
    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const uploadResults = await storageHelpers.uploadMultipleImages(
          images.map(img => img.uri),
          'images',
          'listings',
          user!.id,
          setUploadProgress
        );
        imageUrls = uploadResults.map(result => result.url);
      }

      // Create listing
      const { data: listing, error: listingError } = await dbHelpers.createListing({
        user_id: user!.id,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        currency: 'GHS',
        category_id: selectedCategoryId,
        condition,
        quantity,
        location,
        images: imageUrls,
        accept_offers: acceptOffers,
        status: 'active',
      });

      if (listingError) throw listingError;
      
      setShowSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setImages([]);
        setTitle('');
        setDescription('');
        setPrice('');
        setSelectedCategoryId('');
        setCondition('');
        setLocation('');
        setQuantity(1);
        router.replace('/(tabs)');
      }, 2000);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handlePayForListing = async () => {
    if (balance < requiredCredits) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${requiredCredits} credits but only have ${balance}. Would you like to buy more credits?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => router.push('/(tabs)/buy-credits') },
        ]
      );
      return;
    }

    try {
      const result = await spendCredits(requiredCredits, 'Additional listing fee', {
        referenceType: 'listing_creation',
      });
      
      if (result.success) {
        setShowPaymentModal(false);
        setNeedsPayment(false);
        await createListing();
      } else {
        Alert.alert('Error', result.error || 'Failed to process payment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment');
    }
  };

  const maxListings = getMaxListings();
  const isAtLimit = !hasUnlimitedListings() && userListingsCount >= maxListings;

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Create Listing"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            variant="icon"
            icon={<Eye size={20} color={theme.colors.text.primary} />}
            onPress={() => Alert.alert('Coming Soon', 'Preview feature will be available soon')}
          />,
        ]}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container>
          {/* Listing Limit Warning */}
          {isAtLimit && (
            <View
              style={{
                backgroundColor: theme.colors.warning + '10',
                borderColor: theme.colors.warning,
                borderWidth: 1,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.xl,
              }}
            >
              <Text variant="h4" style={{ color: theme.colors.warning, marginBottom: theme.spacing.sm }}>
                📋 Listing Limit Reached
              </Text>
              <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                You've reached your limit of {maxListings} active listings. Additional listings cost 10 credits each.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="bodySmall" style={{ color: theme.colors.warning }}>
                  Your balance: {balance} credits
                </Text>
                {balance < 10 && (
                  <Button
                    variant="ghost"
                    onPress={() => router.push('/(tabs)/buy-credits')}
                    size="sm"
                  >
                    Buy Credits
                  </Button>
                )}
              </View>
            </View>
          )}

          {/* Image Picker */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Text variant="h3">Product Photos</Text>
              <Button
                variant="ghost"
                icon={<Camera size={16} color={theme.colors.primary} />}
                onPress={() => setShowPhotoTips(true)}
                size="sm"
              >
                Photo Tips
              </Button>
            </View>
            
            <CustomImagePicker
              limit={8}
              value={images}
              onChange={setImages}
              disabled={loading}
            />
            
            {loading && uploadProgress > 0 && (
              <View style={{ marginTop: theme.spacing.md }}>
                <LinearProgress
                  progress={uploadProgress}
                  showPercentage
                />
                <Text
                  variant="caption"
                  color="muted"
                  style={{ textAlign: 'center', marginTop: theme.spacing.sm }}
                >
                  Uploading images... {Math.round(uploadProgress * 100)}%
                </Text>
              </View>
            )}
          </View>

          {/* Basic Information */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Basic Information
            </Text>
            
            <View style={{ gap: theme.spacing.lg }}>
              <Input
                label="Product Title"
                placeholder="e.g., iPhone 14 Pro Max - Excellent Condition"
                value={title}
                onChangeText={setTitle}
                helper="Be descriptive and specific (min. 10 characters)"
              />

              <Input
                variant="multiline"
                label="Description"
                placeholder="Describe your product's condition, features, and any important details..."
                value={description}
                onChangeText={setDescription}
                helper="Include condition, age, reason for selling, etc. (min. 20 characters)"
                style={{ minHeight: 120 }}
              />

              <Input
                label="Price (GHS)"
                placeholder="0.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                helper="Set a competitive price"
              />

              {price && !isNaN(Number(price)) && Number(price) > 0 && (
                <View style={{ marginTop: -theme.spacing.md }}>
                  <PriceDisplay amount={Number(price)} size="lg" />
                </View>
              )}
            </View>
          </View>

          {/* Category Selection */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
              Category
            </Text>
            
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: theme.spacing.md 
            }}>
              {categories.map((cat) => (
                <Chip
                  key={cat.id}
                  text={cat.name}
                  variant="category"
                  selected={selectedCategoryId === cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                />
              ))}
            </View>
          </View>

          {/* Condition Selection */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
              Condition
            </Text>
            
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: theme.spacing.md 
            }}>
              {conditions.map((cond) => (
                <Chip
                  key={cond}
                  text={cond}
                  variant="filter"
                  selected={condition === cond}
                  onPress={() => setCondition(cond)}
                />
              ))}
            </View>
          </View>

          {/* Location & Details */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
              Location & Details
            </Text>
            
            <View style={{ gap: theme.spacing.lg }}>
              <LocationPicker
                value={location}
                onLocationSelect={setLocation}
                placeholder="Select your location"
              />

              <Stepper
                value={quantity}
                onValueChange={setQuantity}
                min={1}
                max={99}
                showLabel
                label="Quantity Available"
              />

              <View>
                <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                  Pricing Options
                </Text>
                <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                  <Chip
                    text="Fixed Price"
                    variant="filter"
                    selected={!acceptOffers}
                    onPress={() => setAcceptOffers(false)}
                  />
                  <Chip
                    text="Accept Offers"
                    variant="filter"
                    selected={acceptOffers}
                    onPress={() => setAcceptOffers(true)}
                  />
                </View>
                {acceptOffers && (
                  <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.sm }}>
                    Buyers can negotiate the price with you
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Button
              variant="primary"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              fullWidth
              size="lg"
              icon={<Save size={18} color={theme.colors.primaryForeground} />}
            >
              {loading ? 'Creating Listing...' : 'Create Listing'}
            </Button>
            
            {isAtLimit && (
              <Text variant="caption" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.md }}>
                This will cost 10 credits (additional listing fee)
              </Text>
            )}
          </View>
        </Container>
      </ScrollView>

      {/* Payment Modal */}
      <AppModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Additional Listing Fee"
        primaryAction={{
          text: `Pay ${requiredCredits} Credits`,
          onPress: handlePayForListing,
          loading: false,
        }}
        secondaryAction={{
          text: 'Buy Credits',
          onPress: () => {
            setShowPaymentModal(false);
            router.push('/(tabs)/buy-credits');
          },
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: theme.spacing.md }}>📋</Text>
            <Text variant="h4" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
              Listing Limit Reached
            </Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              You've reached your free listing limit of {maxListings} active listings
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
              <Text variant="body">Additional listing fee:</Text>
              <Text variant="body" style={{ fontWeight: '600' }}>
                {requiredCredits} credits
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
              <Text variant="body">Your balance:</Text>
              <Text 
                variant="body" 
                style={{ 
                  fontWeight: '600',
                  color: balance >= requiredCredits ? theme.colors.success : theme.colors.error,
                }}
              >
                {balance} credits
              </Text>
            </View>
            
            {balance >= requiredCredits && (
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
                  After payment:
                </Text>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {balance - requiredCredits} credits
                </Text>
              </View>
            )}
          </View>

          {balance < requiredCredits && (
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
                ⚠️ You need {requiredCredits - balance} more credits to create this listing
              </Text>
            </View>
          )}
        </View>
      </AppModal>

      {/* Photo Tips Modal */}
      <AppModal
        visible={showPhotoTips}
        onClose={() => setShowPhotoTips(false)}
        title="📸 Photo Tips for Better Sales"
        size="lg"
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
            Great photos can increase your sales by up to 300%!
          </Text>

          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Text style={{ fontSize: 24 }}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                  Use Natural Lighting
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Take photos near a window or outdoors for the best lighting. Avoid using flash.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Text style={{ fontSize: 24 }}>📐</Text>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                  Show Multiple Angles
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Include front, back, sides, and any important details or flaws.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Text style={{ fontSize: 24 }}>🧹</Text>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                  Clean Background
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Use a plain background to make your product stand out.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Text style={{ fontSize: 24 }}>🔍</Text>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                  Focus on Details
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Show brand labels, serial numbers, and any unique features.
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.success + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.success, textAlign: 'center', fontWeight: '500' }}>
              💰 Listings with high-quality photos sell 3x faster!
            </Text>
          </View>
        </View>
      </AppModal>

      {/* Success Toast */}
      <Toast
        visible={showSuccess}
        message="Listing created successfully! 🎉"
        variant="success"
        onHide={() => setShowSuccess(false)}
        action={{
          text: 'View Listing',
          onPress: () => setShowSuccess(false),
        }}
      />
    </SafeAreaWrapper>
  );
}