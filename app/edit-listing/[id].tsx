import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, ScrollView, Alert, Pressable, BackHandler } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { dbHelpers, supabase } from '@/lib/supabase';
import { storageHelpers, STORAGE_BUCKETS } from '@/lib/storage';
import { 
  validateListingStep, 
  createDebouncedValidator, 
  sanitizeInput,
  generateSEOFriendlyTitle,
  extractKeywords,
  type ValidationResult 
} from '@/utils/listingValidation';
import { contentModerationService } from '@/lib/contentModerationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Input,
  Button,
  CustomImagePicker,
  Chip,
  PriceDisplay,
  Stepper,
  LocationPicker,
  CategoryPicker,
  CategoryAttributes,
  StepIndicator,
  Toast,
  AppModal,
  Badge,
  LoadingSkeleton,
} from '@/components';
import { SelectedImage } from '@/components/ImagePicker';
import { 
  Camera, 
  FileText, 
  Package, 
  DollarSign, 
  CheckCircle, 
  ArrowLeft,
  ArrowRight,
  Save
} from 'lucide-react-native';
import { router } from 'expo-router';
import { findCategoryById, COMPREHENSIVE_CATEGORIES } from '@/constants/categories';
import { getCategoryAttributes, hasCategoryAttributes } from '@/constants/categoryAttributes';
import { networkUtils } from '@/utils/networkUtils';

interface ListingFormData {
  // Images (Step 1)
  images: SelectedImage[]
  
  // Basic Info (Step 2)
  title: string;
  description: string;
  
  // Category (Step 3)
  categoryId: string;
  categoryAttributes: Record<string, string | string[]>;
  
  // Details (Step 4)
  condition: string;
  price: string;
  quantity: number;
  acceptOffers: boolean;
  
  // Location (Step 5)
  location: string;
}

const STEPS = [
  {
    id: 'photos',
    title: 'Photos',
    description: 'Update your listing photos',
    icon: <Camera size={20} />,
    color: 'primary',
  },
  {
    id: 'basic',
    title: 'Basic Info',
    description: 'Edit title and description',
    icon: <FileText size={20} />,
    color: 'primary',
  },
  {
    id: 'category',
    title: 'Category',
    description: 'Update category and attributes',
    icon: <Package size={20} />,
    color: 'primary',
  },
  {
    id: 'details',
    title: 'Details',
    description: 'Edit price and condition',
    icon: <DollarSign size={20} />,
    color: 'primary',
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Update location',
    icon: <Package size={20} />,
    color: 'success',
  },
] as const;

const CONDITIONS = [
  { value: 'new', label: 'New', description: 'Brand new, never used' },
  { value: 'like_new', label: 'Like New', description: 'Excellent condition, barely used' },
  { value: 'good', label: 'Good', description: 'Minor signs of wear' },
  { value: 'fair', label: 'Fair', description: 'Noticeable wear but functional' },
  { value: 'poor', label: 'Poor', description: 'Significant wear, may need repairs' },
];

export default function EditListingScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { id: listingId } = useLocalSearchParams<{ id: string }>();
  
  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ListingFormData>({
    images: [],
    title: '',
    description: '',
    categoryId: '',
    categoryAttributes: {},
    condition: 'good',
    price: '',
    quantity: 1,
    acceptOffers: true,
    location: '',
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [originalListing, setOriginalListing] = useState<any>(null);
  
  // Validation state
  const [validationResults, setValidationResults] = useState<Record<number, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);
  
  // Performance optimization refs
  const debouncedValidator = useRef(createDebouncedValidator(300));
  const formDataRef = useRef(formData);
  
  // Autosave state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTOSAVE_KEY = useMemo(() => `listing_edit_${listingId}_${user?.id || 'anonymous'}`, [listingId, user?.id]);

  // Load existing listing data
  const loadListingData = useCallback(async () => {
    if (!listingId || !user) return;

    try {
      setInitialLoading(true);
      
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          categories (
            name,
            icon
          )
        `)
        .eq('id', listingId)
        .eq('user_id', user.id) // Ensure user owns the listing
        .single();

      if (error) {
        console.error('Error loading listing:', error);
        Alert.alert('Error', 'Failed to load listing data');
        router.back();
        return;
      }

      if (!data) {
        Alert.alert('Error', 'Listing not found');
        router.back();
        return;
      }

      setOriginalListing(data);
      
      // Convert existing images to SelectedImage format
      const existingImages: SelectedImage[] = (data.images || []).map((url: string, index: number) => ({
        id: `existing_${index}`,
        uri: url,
        type: 'image/jpeg',
        name: `image_${index}.jpg`,
        size: 0,
        isExisting: true, // Flag to identify existing images
      }));

      // Map UUID category_id back to string ID for frontend
      const getStringCategoryId = (categoryUUID: string): string => {
        const uuidMapping: Record<string, string> = {
          '00000000-0000-4000-8000-000000000001': 'electronics',
          '00000000-0000-4000-8000-000000000002': 'fashion',
          '00000000-0000-4000-8000-000000000003': 'home-garden',
          '00000000-0000-4000-8000-000000000004': 'vehicles',
          '00000000-0000-4000-8000-000000000005': 'health-sports',
          '00000000-0000-4000-8000-000000000006': 'business',
          '00000000-0000-4000-8000-000000000007': 'education',
          '00000000-0000-4000-8000-000000000008': 'entertainment',
          '00000000-0000-4000-8000-000000000009': 'food',
          '00000000-0000-4000-8000-000000000010': 'services',
          '00000000-0000-4000-8000-000000000000': 'general',
        };
        
        return uuidMapping[categoryUUID] || 'general';
      };

      // Populate form with existing data
      setFormData({
        images: existingImages,
        title: data.title || '',
        description: data.description || '',
        categoryId: data.category_id ? getStringCategoryId(data.category_id) : '',
        categoryAttributes: data.attributes || {},
        condition: data.condition || 'good',
        price: data.price?.toString() || '',
        quantity: data.quantity || 1,
        acceptOffers: data.accept_offers ?? true,
        location: data.location || '',
      });

    } catch (error) {
      console.error('Error loading listing:', error);
      Alert.alert('Error', 'Failed to load listing data');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  }, [listingId, user]);

  useEffect(() => {
    loadListingData();
  }, [loadListingData]);

  // Update form data with change tracking
  const updateFormData = useCallback((updates: Partial<ListingFormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      formDataRef.current = newData;
      setHasUnsavedChanges(true);
      return newData;
    });
  }, []);

  // Auto-save functionality
  const saveProgress = useCallback(async () => {
    try {
      setIsAutoSaving(true);
      await AsyncStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.error('Failed to save progress:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [AUTOSAVE_KEY, formData]);

  // Debounced auto-save
  useEffect(() => {
    if (hasUnsavedChanges && !initialLoading) {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      
      autosaveTimeoutRef.current = setTimeout(() => {
        saveProgress();
      }, 2000);
    }

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, saveProgress, initialLoading]);

  // Validate current step
  const validateCurrentStep = useCallback(async () => {
    if (isValidating) return;
    
    setIsValidating(true);
    try {
      const result = await validateListingStep(currentStep, formData);
      setValidationResults(prev => ({
        ...prev,
        [currentStep]: result
      }));
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [currentStep, formData, isValidating]);

  // Navigation handlers
  const nextStep = useCallback(async () => {
    const validation = await validateCurrentStep();
    if (validation?.isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateCurrentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    await updateListing();
  };

  const updateListing = async () => {
    setLoading(true);
    try {
      // Check network connectivity first
      console.log('Checking network connectivity...');
      const networkStatus = await networkUtils.checkNetworkStatus();
      
      if (!networkStatus.isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      if (!networkStatus.canReachSupabase) {
        throw new Error(networkStatus.error || 'Cannot connect to server. Please try again.');
      }

      // Handle image updates
      let imageUrls: string[] = [];
      
      // Separate existing and new images
      const existingImages = formData.images.filter(img => (img as any).isExisting);
      const newImages = formData.images.filter(img => !(img as any).isExisting);
      
      // Keep existing image URLs
      imageUrls = existingImages.map(img => img.uri);
      
      // Upload new images if any
      if (newImages.length > 0) {
        console.log(`Uploading ${newImages.length} new images...`);
        
        for (let i = 0; i < newImages.length; i++) {
          const image = newImages[i];
          const progress = (i + 1) / newImages.length;
          setUploadProgress(progress);
          
          try {
            const uploadResult = await storageHelpers.uploadImage(
              image.uri,
              STORAGE_BUCKETS.LISTINGS,
              `listings/${user?.id}`,
              user?.id
            );
            
            if (uploadResult.url) {
              imageUrls.push(uploadResult.url);
            } else {
              throw new Error(`Failed to upload image ${i + 1}`);
            }
          } catch (uploadError) {
            console.error(`Error uploading image ${i + 1}:`, uploadError);
            throw new Error(`Failed to upload image ${i + 1}. Please try again.`);
          }
        }
      }

      // Content moderation for updated content
      const titleContentItem = {
        id: listingId || 'temp',
        type: 'listing' as const,
        content: formData.title,
        userId: user?.id || '',
      };
      
      const descriptionContentItem = {
        id: listingId || 'temp',
        type: 'listing' as const,
        content: formData.description,
        userId: user?.id || '',
      };

      const moderationResults = await Promise.all([
        contentModerationService.moderateContent(titleContentItem),
        contentModerationService.moderateContent(descriptionContentItem),
      ]);

      const titleModeration = moderationResults[0];
      const descriptionModeration = moderationResults[1];

      if (!titleModeration.isApproved) {
        throw new Error(`Title contains inappropriate content`);
      }

      if (!descriptionModeration.isApproved) {
        throw new Error(`Description contains inappropriate content`);
      }

      // Map category string ID to UUID for database
      const getCategoryUUID = (categoryId: string): string | null => {
        const categoryMapping: Record<string, string> = {
          'electronics': '00000000-0000-4000-8000-000000000001',
          'fashion': '00000000-0000-4000-8000-000000000002',
          'home-garden': '00000000-0000-4000-8000-000000000003',
          'vehicles': '00000000-0000-4000-8000-000000000004',
          'health-sports': '00000000-0000-4000-8000-000000000005',
          'business': '00000000-0000-4000-8000-000000000006',
          'education': '00000000-0000-4000-8000-000000000007',
          'entertainment': '00000000-0000-4000-8000-000000000008',
          'food': '00000000-0000-4000-8000-000000000009',
          'services': '00000000-0000-4000-8000-000000000010',
          'general': '00000000-0000-4000-8000-000000000000',
        };
        
        // If it's already a UUID, return it
        if (categoryId.includes('-')) {
          return categoryId;
        }
        
        // Try to find parent category for subcategories
        const category = findCategoryById(COMPREHENSIVE_CATEGORIES, categoryId);
        if (category) {
          // Find the root parent category
          let rootCategory = category;
          while (rootCategory.parent_id) {
            const parent = findCategoryById(COMPREHENSIVE_CATEGORIES, rootCategory.parent_id);
            if (parent) {
              rootCategory = parent;
            } else {
              break;
            }
          }
          return categoryMapping[rootCategory.id] || categoryMapping['general'];
        }
        
        return categoryMapping[categoryId] || categoryMapping['general'];
      };

      // Prepare update data
      const updateData = {
        title: sanitizeInput(formData.title),
        description: sanitizeInput(formData.description),
        category_id: getCategoryUUID(formData.categoryId),
        attributes: formData.categoryAttributes,
        condition: formData.condition,
        price: parseFloat(formData.price),
        quantity: formData.quantity,
        accept_offers: formData.acceptOffers,
        location: formData.location,
        images: imageUrls,
        seo_title: generateSEOFriendlyTitle(formData.title, selectedCategory?.name || ''),
        keywords: extractKeywords(formData.title, formData.description),
        updated_at: new Date().toISOString(),
      };

      // Update the listing
      const { error: updateError } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listingId)
        .eq('user_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      // Clear autosave data
      await AsyncStorage.removeItem(AUTOSAVE_KEY);
      setHasUnsavedChanges(false);
      
      setShowSuccess(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 2000);

    } catch (error: any) {
      console.error('Error updating listing:', error);
      Alert.alert(
        'Update Failed',
        error.message || 'Failed to update listing. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Input handlers
  const handleTitleChange = useCallback((text: string) => {
    updateFormData({ title: text });
  }, [updateFormData]);

  const handleDescriptionChange = useCallback((text: string) => {
    updateFormData({ description: text });
  }, [updateFormData]);

  const handlePriceChange = useCallback((text: string) => {
    updateFormData({ price: text });
  }, [updateFormData]);

  const handleImagesChange = useCallback((images: SelectedImage[]) => {
    updateFormData({ images });
  }, [updateFormData]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    updateFormData({ categoryId, categoryAttributes: {} });
  }, [updateFormData]);

  const handleCategoryAttributeChange = useCallback((attributeId: string, value: string | string[]) => {
    updateFormData({ 
      categoryAttributes: { 
        ...(formData.categoryAttributes || {}), 
        [attributeId]: value 
      } 
    });
  }, [updateFormData, formData.categoryAttributes]);

  const handleLocationSelect = useCallback((location: string) => {
    updateFormData({ location });
  }, [updateFormData]);

  const handleConditionSelect = useCallback((condition: string) => {
    updateFormData({ condition });
  }, [updateFormData]);

  const handleQuantityChange = useCallback((quantity: number) => {
    updateFormData({ quantity });
  }, [updateFormData]);

  const handleAcceptOffersChange = useCallback((acceptOffers: boolean) => {
    updateFormData({ acceptOffers });
  }, [updateFormData]);

  // Back handler for unsaved changes
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (hasUnsavedChanges) {
          Alert.alert(
            'Unsaved Changes',
            'You have unsaved changes. Are you sure you want to leave?',
            [
              { text: 'Stay', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => router.back() },
            ]
          );
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [hasUnsavedChanges])
  );

  const selectedCategory = formData.categoryId ? findCategoryById(COMPREHENSIVE_CATEGORIES, formData.categoryId) : null;
  const selectedCondition = CONDITIONS.find(c => c.value === formData.condition);

  // Step Components
  const PhotosStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>
      <CustomImagePicker
        limit={8}
        value={formData.images}
        onChange={handleImagesChange}
      />
      
      {loading && uploadProgress > 0 && (
        <View style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
        }}>
          <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
            Uploading images... {Math.round(uploadProgress * 100)}%
          </Text>
          <View style={{
            height: 4,
            backgroundColor: theme.colors.border,
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <View style={{
              height: '100%',
              backgroundColor: theme.colors.primary,
              width: `${uploadProgress * 100}%`,
            }} />
          </View>
        </View>
      )}
    </View>
  ), [formData.images, handleImagesChange, loading, uploadProgress, theme]);

  const BasicInfoStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>
      <Input
        label="Title"
        placeholder="What are you selling?"
        value={formData.title}
        onChangeText={handleTitleChange}
        maxLength={100}
      />
      
      <Input
        label="Description"
        placeholder="Describe your item in detail..."
        value={formData.description}
        onChangeText={handleDescriptionChange}
        multiline
        numberOfLines={4}
        maxLength={1000}
      />
    </View>
  ), [formData.title, formData.description, handleTitleChange, handleDescriptionChange, loading, theme]);

  const CategoryStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>
      <CategoryPicker
        value={formData.categoryId}
        onCategorySelect={handleCategorySelect}
      />
      
      {selectedCategory && hasCategoryAttributes(selectedCategory.id) && (
        <CategoryAttributes
          attributes={getCategoryAttributes(selectedCategory.id)}
          values={formData.categoryAttributes}
          onChange={handleCategoryAttributeChange}
        />
      )}
    </View>
  ), [formData.categoryId, formData.categoryAttributes, selectedCategory, handleCategorySelect, handleCategoryAttributeChange, loading, theme]);

  const DetailsStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>
      <View>
        <Text variant="bodySmall" style={{ marginBottom: theme.spacing.sm, fontWeight: '600' }}>
          Price (GH₵)
        </Text>
        <Input
          placeholder="0.00"
          value={formData.price}
          onChangeText={handlePriceChange}
          keyboardType="decimal-pad"
        />
      </View>
      
      <View>
        <Text variant="bodySmall" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
          Condition
        </Text>
        <View style={{ gap: theme.spacing.sm }}>
          {CONDITIONS.map((condition) => (
            <Pressable
              key={condition.value}
              onPress={() => handleConditionSelect(condition.value)}
              style={{
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: formData.condition === condition.value ? theme.colors.primary : theme.colors.border,
                backgroundColor: formData.condition === condition.value ? theme.colors.primary + '10' : theme.colors.surface,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ 
                    fontWeight: '600',
                    color: formData.condition === condition.value ? theme.colors.primary : theme.colors.text.primary 
                  }}>
                    {condition.label}
                  </Text>
                  <Text variant="bodySmall" style={{ 
                    color: formData.condition === condition.value ? theme.colors.primary : theme.colors.text.secondary,
                    marginTop: 2 
                  }}>
                    {condition.description}
                  </Text>
                </View>
                {formData.condition === condition.value && (
                  <CheckCircle size={20} color={theme.colors.primary} />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Quantity"
            value={formData.quantity.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 1;
              handleQuantityChange(Math.max(1, num));
            }}
            keyboardType="number-pad"
          />
        </View>
        
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => handleAcceptOffersChange(!formData.acceptOffers)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              borderColor: formData.acceptOffers ? theme.colors.primary : theme.colors.border,
              backgroundColor: formData.acceptOffers ? theme.colors.primary + '10' : theme.colors.surface,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ 
                fontWeight: '600',
                color: formData.acceptOffers ? theme.colors.primary : theme.colors.text.primary 
              }}>
                Accept Offers
              </Text>
            </View>
            {formData.acceptOffers && (
              <CheckCircle size={16} color={theme.colors.primary} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  ), [formData.price, formData.condition, formData.quantity, formData.acceptOffers, handlePriceChange, handleConditionSelect, handleQuantityChange, handleAcceptOffersChange, loading, theme]);

  const LocationStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>
      <LocationPicker
        value={formData.location}
        onLocationSelect={handleLocationSelect}
      />
    </View>
  ), [formData.location, handleLocationSelect, loading, theme]);

  const steps = [PhotosStep, BasicInfoStep, CategoryStep, DetailsStep, LocationStep];
  const currentStepData = STEPS[currentStep];
  const currentValidation = validationResults[currentStep];

  if (initialLoading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Edit Listing"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={{ flex: 1, padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={200} />
          <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
            <LoadingSkeleton width="100%" height={60} />
            <LoadingSkeleton width="100%" height={60} />
            <LoadingSkeleton width="100%" height={60} />
          </View>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Edit Listing"
        showBackButton
        onBackPress={() => {
          if (hasUnsavedChanges) {
            Alert.alert(
              'Unsaved Changes',
              'You have unsaved changes. Are you sure you want to leave?',
              [
                { text: 'Stay', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => router.back() },
              ]
            );
          } else {
            router.back();
          }
        }}
        rightActions={[
          isAutoSaving && (
            <View key="autosave" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                Saving...
              </Text>
            </View>
          ),
        ].filter(Boolean)}
      />

      <View style={{ flex: 1 }}>
        {/* Step Indicator */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          paddingVertical: theme.spacing.md,
        }}>
          <StepIndicator
            steps={STEPS.map((step, index) => ({
              ...step,
              completed: index < currentStep || (index === currentStep && currentValidation?.isValid),
              active: index === currentStep,
            }))}
            currentStep={currentStep}
          />
        </View>

        {/* Step Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.xl * 2,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
              {currentStepData.title}
            </Text>
            <Text variant="body" color="secondary">
              {currentStepData.description}
            </Text>
          </View>

          {steps[currentStep]}

          {/* Validation Errors */}
          {currentValidation && !currentValidation.isValid && (
            <View style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.md,
              backgroundColor: theme.colors.error + '10',
              borderRadius: theme.borderRadius.md,
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.error,
            }}>
              {Array.isArray(currentValidation.errors) ? currentValidation.errors.map((error, index) => (
                <Text key={index} variant="bodySmall" style={{ color: theme.colors.error }}>
                  • {error}
                </Text>
              )) : null}
            </View>
          )}
        </ScrollView>

        {/* Navigation */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          padding: theme.spacing.lg,
          flexDirection: 'row',
          gap: theme.spacing.md,
        }}>
          {currentStep > 0 && (
            <Button
              variant="secondary"
              onPress={previousStep}
              leftIcon={<ArrowLeft size={16} />}
              style={{ flex: 1 }}
            >
              Previous
            </Button>
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <Button
              variant="primary"
              onPress={nextStep}
              disabled={loading || isValidating}
              icon={<ArrowRight size={16} />}
              style={{ flex: currentStep > 0 ? 1 : undefined }}
            >
              {isValidating ? 'Validating...' : 'Next'}
            </Button>
          ) : (
            <Button
              variant="primary"
              onPress={handleSubmit}
              disabled={loading || isValidating}
              loading={loading}
              icon={<Save size={16} />}
              style={{ flex: currentStep > 0 ? 1 : undefined }}
            >
              Update Listing
            </Button>
          )}
        </View>
      </View>

      {/* Success Modal */}
      <AppModal
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Listing Updated!"
      >
        <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
          <CheckCircle size={64} color={theme.colors.success} />
          <Text variant="body" style={{ textAlign: 'center' }}>
            Your listing has been successfully updated and is now live!
          </Text>
        </View>
      </AppModal>

      {/* Toast for auto-save */}
      <Toast
        visible={isAutoSaving}
        message="Saving changes..."
        variant="info"
        duration={1000}
      />
    </SafeAreaWrapper>
  );
}
