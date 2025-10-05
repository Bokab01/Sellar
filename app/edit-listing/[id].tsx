import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, ScrollView, Alert, Pressable, BackHandler, Image } from 'react-native';
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
import { CategoryAttributesForm } from '@/components/CategoryAttributesForm';
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
import { findCategoryById as findCategoryByIdUtil, getRootCategory, DbCategory } from '@/utils/categoryUtils';
import { getCategoryAttributes, hasCategoryAttributes } from '@/constants/categoryAttributes';
import { networkUtils } from '@/utils/networkUtils';

interface ListingFormData {
  // Step 1: Info (Photos + Basic Info)
  images: SelectedImage[]
  title: string;
  description: string;
  
  // Step 2: Details (Category, Location, Attributes, Price, Quantity)
  categoryId: string;
  categoryAttributes: Record<string, string | string[]>;
  location: string;
  price: string;
  quantity: number;
  acceptOffers: boolean;
  condition: string; // Fallback condition field
}

const STEPS = [
  {
    id: 'basic-info',
    title: 'Info',
    description: 'Photos, title & description',
    icon: <FileText size={20} />,
    color: 'primary',
  },
  {
    id: 'details',
    title: 'Details',
    description: 'Category, location, price & more',
    icon: <Package size={20} />,
    color: 'warning',
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review and update',
    icon: <CheckCircle size={20} />,
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
      // Populate form with existing data (use actual UUID for categoryId)
      setFormData({
        images: existingImages,
        title: data.title || '',
        description: data.description || '',
        categoryId: data.category_id || '', // Use the actual UUID from database
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
          // Main categories
          'electronics': '00000000-0000-4000-8000-000000000001',
          'fashion': '00000000-0000-4000-8000-000000000002',
          'vehicles': '00000000-0000-4000-8000-000000000003',
          'home-garden': '00000000-0000-4000-8000-000000000004',
          'health-sports': '00000000-0000-4000-8000-000000000005',
          'business': '00000000-0000-4000-8000-000000000006',
          'education': '00000000-0000-4000-8000-000000000007',
          'entertainment': '00000000-0000-4000-8000-000000000008',
          'food': '00000000-0000-4000-8000-000000000009',
          'services': '00000000-0000-4000-8000-000000000010',
          'general': '00000000-0000-4000-8000-000000000000',
          
          // Electronics subcategories
          'smartphones': '00000000-0000-4000-8000-000000000001',
          'laptops': '00000000-0000-4000-8000-000000000001',
          'gaming-consoles': '00000000-0000-4000-8000-000000000001',
          'audio-video': '00000000-0000-4000-8000-000000000001',
          'computers': '00000000-0000-4000-8000-000000000001',
          'cameras': '00000000-0000-4000-8000-000000000001',
          'accessories': '00000000-0000-4000-8000-000000000001',
          
          // Fashion subcategories
          'clothing': '00000000-0000-4000-8000-000000000002',
          'shoes': '00000000-0000-4000-8000-000000000002',
          'bags': '00000000-0000-4000-8000-000000000002',
          'jewelry': '00000000-0000-4000-8000-000000000002',
          'watches': '00000000-0000-4000-8000-000000000002',
          
          // Vehicles subcategories
          'cars': '00000000-0000-4000-8000-000000000003',
          'motorcycles': '00000000-0000-4000-8000-000000000003',
          'bicycles': '00000000-0000-4000-8000-000000000003',
          'parts': '00000000-0000-4000-8000-000000000003',
          
          // Home & Garden subcategories
          'furniture': '00000000-0000-4000-8000-000000000004',
          'appliances': '00000000-0000-4000-8000-000000000004',
          'decor': '00000000-0000-4000-8000-000000000004',
          'garden': '00000000-0000-4000-8000-000000000004',
          'tools': '00000000-0000-4000-8000-000000000004',
          
          // Furniture subcategories (missing ones that were causing the error)
          'living-room': '00000000-0000-4000-8000-000000000004',
          'bedroom': '00000000-0000-4000-8000-000000000004',
          'dining-room': '00000000-0000-4000-8000-000000000004',
          'office-furniture': '00000000-0000-4000-8000-000000000004',
          'kitchen-furniture': '00000000-0000-4000-8000-000000000004',
          'outdoor-furniture': '00000000-0000-4000-8000-000000000004',
          
          // Health & Sports subcategories
          'fitness': '00000000-0000-4000-8000-000000000005',
          'sports': '00000000-0000-4000-8000-000000000005',
          'health': '00000000-0000-4000-8000-000000000005',
          'outdoor': '00000000-0000-4000-8000-000000000005',
          
          // Business subcategories
          'office': '00000000-0000-4000-8000-000000000006',
          'industrial': '00000000-0000-4000-8000-000000000006',
          'agriculture': '00000000-0000-4000-8000-000000000006',
          
          // Education subcategories
          'books': '00000000-0000-4000-8000-000000000007',
          'supplies': '00000000-0000-4000-8000-000000000007',
          'instruments': '00000000-0000-4000-8000-000000000007',
          
          // Entertainment subcategories
          'games': '00000000-0000-4000-8000-000000000008',
          'music': '00000000-0000-4000-8000-000000000008',
          'movies': '00000000-0000-4000-8000-000000000008',
          'collectibles': '00000000-0000-4000-8000-000000000008',
          
          // Food subcategories
          'groceries': '00000000-0000-4000-8000-000000000009',
          'restaurant': '00000000-0000-4000-8000-000000000009',
          'catering': '00000000-0000-4000-8000-000000000009',
          
          // Services subcategories
          'professional': '00000000-0000-4000-8000-000000000010',
          'personal': '00000000-0000-4000-8000-000000000010',
          'maintenance': '00000000-0000-4000-8000-000000000010',
          'transport': '00000000-0000-4000-8000-000000000010',
        };
        
        // If it's already a UUID, return it
        if (categoryId.includes('-')) {
          return categoryId;
        }
        
        // Try to find parent category for subcategories using the new utility
        // Note: This is a synchronous operation, but we need async for DB calls
        // For now, if it's a UUID, assume it's valid and return it
        // The backend will handle category validation
        return categoryId;
      };

      // Map condition attribute values to valid database values
      const conditionMapping: Record<string, string> = {
        'new': 'new',
        'like_new': 'like_new',
        'good': 'good',
        'fair': 'fair',
        'poor': 'poor',
        'brand_new': 'new',
        'Brand New': 'new',
        'Like New': 'like_new',
        'Good': 'good',
        'Fair': 'fair',
        'Poor': 'poor',
        'foreign_used': 'good',
        'Foreign Used': 'good',
        'locally_used': 'fair',
        'Locally Used': 'fair',
        'excellent': 'like_new',
        'Excellent': 'like_new',
        'for_parts': 'poor',
        'For Parts': 'poor',
        'acceptable': 'fair',
        'Acceptable': 'fair',
      };
      
      // Get condition from attributes or fallback to formData.condition
      const conditionValue = (formData.categoryAttributes.condition as string) || formData.condition || 'good';
      const dbCondition = conditionMapping[conditionValue] || 'good';

      // Prepare update data
      const updateData = {
        title: sanitizeInput(formData.title),
        description: sanitizeInput(formData.description),
        category_id: getCategoryUUID(formData.categoryId),
        attributes: formData.categoryAttributes,
        condition: dbCondition,
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

  const [selectedCategory, setSelectedCategory] = useState<DbCategory | null>(null);
  const selectedCondition = CONDITIONS.find(c => c.value === formData.condition);

  // Fetch selected category details
  useEffect(() => {
    if (formData.categoryId) {
      findCategoryByIdUtil(formData.categoryId).then(setSelectedCategory);
    } else {
      setSelectedCategory(null);
    }
  }, [formData.categoryId]);

  // Step Components (3-step structure matching create screen)
  // Step 1: Info (Photos + Title + Description)
  const BasicInfoStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>
      
      {/* Photos Section */}
      <View>
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Photos
        </Text>
        
        <CustomImagePicker
          limit={8}
          value={formData.images}
          onChange={handleImagesChange}
          disabled={loading}
        />
        
        {loading && uploadProgress > 0 && (
          <View style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginTop: theme.spacing.sm,
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
                width: `${uploadProgress * 100}%`,
                backgroundColor: theme.colors.primary,
              }} />
            </View>
          </View>
        )}

        {formData.images.length === 0 && (
          <View style={{
            backgroundColor: theme.colors.warning + '10',
            borderColor: theme.colors.warning,
            borderWidth: 1,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            alignItems: 'center',
            marginTop: theme.spacing.sm,
          }}>
            <Text variant="bodySmall" style={{ color: theme.colors.warning, textAlign: 'center' }}>
              📸 At least one photo is required
            </Text>
          </View>
        )}
      </View>

      {/* Basic Info Section */}
      <View>
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Basic Information
        </Text>

        <View style={{ gap: theme.spacing.md }}>
          <Input
            label="Title"
            placeholder="e.g. Samsung Galaxy Note 20"
            value={formData.title}
            onChangeText={handleTitleChange}
            helper={validationResults[0]?.warnings.title || "Be descriptive and specific (min. 10 characters)"}
            error={validationResults[0]?.errors.title}
          />

          <Input
            variant="multiline"
            label="Describe your item"
            placeholder="Describe your item in detail..."
            value={formData.description}
            onChangeText={handleDescriptionChange}
            helper={validationResults[0]?.warnings.description || "Include condition, age, reason for selling, etc. (min. 20 characters)"}
            containerStyle={{ minHeight: 120 }}
            error={validationResults[0]?.errors.description}
          />

          <View style={{
            backgroundColor: theme.colors.success + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.sm,
          }}>
            <Text variant="bodySmall" style={{ color: theme.colors.success, textAlign: 'center' }}>
              💡 Great photos & details get 5x more views!
            </Text>
          </View>
        </View>
      </View>
    </View>
  ), [formData.images, formData.title, formData.description, loading, uploadProgress, validationResults, theme, handleImagesChange, handleTitleChange, handleDescriptionChange]);

  // Step 2: Category & Details (matching create screen exactly)
  const CategoryStep = useMemo(() => {
    return (
      <View style={{ gap: theme.spacing.lg }}>
        <View>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Category
          </Text>
          <CategoryPicker
            value={formData.categoryId}
            onCategorySelect={handleCategorySelect}
            placeholder="Select a category"
          />
          
          {selectedCategory && (
            <View style={{ 
              backgroundColor: theme.colors.success + '10',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: theme.spacing.sm,
            }}>
              <CheckCircle size={20} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
              <Text variant="body" style={{ color: theme.colors.success }}>
                Selected: {selectedCategory.name}
              </Text>
            </View>
          )}
        </View>

        {/* Dynamic Category Attributes Form */}
        {formData.categoryId && (
          <CategoryAttributesForm
            categoryId={formData.categoryId}
            values={formData.categoryAttributes}
            onChange={handleCategoryAttributeChange}
          />
        )}

        <View>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Location
          </Text>
          <LocationPicker
            value={formData.location}
            onLocationSelect={handleLocationSelect}
            placeholder="Select your location"
          />

          {formData.location && (
            <View style={{ 
              backgroundColor: theme.colors.success + '10',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: theme.spacing.sm,
            }}>
              <CheckCircle size={20} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
              <Text variant="body" style={{ color: theme.colors.success }}>
                Location: {formData.location}
              </Text>
            </View>
          )}
        </View>

        {/* Pricing & Selling Details */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Pricing & Details
          </Text>

          <View style={{ gap: theme.spacing.lg }}>
            <Input
              label="Price (GHS)"
              placeholder="0.00"
              value={formData.price}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
              helper={validationResults[1]?.warnings.price || "Set a competitive price"}
              error={validationResults[1]?.errors.price}
            />

            {formData.price && !isNaN(Number(formData.price)) && Number(formData.price) > 0 && (
              <View style={{ alignItems: 'center', marginVertical: theme.spacing.md }}>
                <PriceDisplay amount={Number(formData.price)} size="xl" />
              </View>
            )}

            <View style={{ alignItems: 'center' }}>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
                How many are you selling?
              </Text>
              <Stepper
                value={formData.quantity}
                onValueChange={handleQuantityChange}
                min={1}
                max={99}
                showLabel={false}
              />
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
                How do you want to sell your item?
              </Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'center' }}>
                <Chip
                  text="Fixed Price"
                  variant="filter"
                  selected={!formData.acceptOffers}
                  onPress={() => handleAcceptOffersChange(false)}
                />
                <Chip
                  text="Accept Offers"
                  variant="filter"
                  selected={formData.acceptOffers}
                  onPress={() => handleAcceptOffersChange(true)}
                />
              </View>
              {formData.acceptOffers && (
                <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
                  Buyers can negotiate the price with you
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }, [formData.categoryId, formData.location, formData.categoryAttributes, formData.price, formData.quantity, formData.acceptOffers, selectedCategory, validationResults, theme, handleCategorySelect, handleLocationSelect, handleCategoryAttributeChange, handlePriceChange, handleQuantityChange, handleAcceptOffersChange]);

  // Step 3: Review (matching create screen style)
  const ReviewStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>

      {/* Preview Header */}
      <View style={{ marginBottom: theme.spacing.md }}>
        <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
          📋 Listing Preview
        </Text>
        <Text variant="body" color="secondary">
          This is how your updated listing will appear to buyers
        </Text>
      </View>

      {/* Preview Card */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.md,
      }}>
        {/* Images Preview */}
        {formData.images.length > 0 && (
          <View style={{ marginBottom: theme.spacing.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                {formData.images.map((image, index) => (
                  <View
                    key={image.id || index}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: theme.borderRadius.md,
                      overflow: 'hidden',
                      backgroundColor: theme.colors.surfaceVariant,
                    }}
                  >
                    <Image
                      source={{ uri: image.uri }}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                      resizeMode="cover"
                    />
                    {/* Image counter overlay */}
                    <View style={{
                      position: 'absolute',
                      bottom: 2,
                      right: 2,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: theme.borderRadius.sm,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                    }}>
                      <Text variant="caption" style={{ color: 'white', fontSize: 10 }}>
                        {index + 1}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
          {formData.title}
        </Text>
        
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.md }}>
          {formData.description}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
          <PriceDisplay amount={Number(formData.price)} size="lg" />
          {formData.acceptOffers && (
            <Badge text="Offers accepted" variant="success" style={{ marginLeft: theme.spacing.sm }} />
          )}
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="caption" color="muted">
            Category: {selectedCategory?.name}
          </Text>
          {formData.categoryAttributes.condition && (
            <Text variant="caption" color="muted">
              Condition: {formData.categoryAttributes.condition}
            </Text>
          )}
          <Text variant="caption" color="muted">
            Quantity: {formData.quantity}
          </Text>
          <Text variant="caption" color="muted">
            Location: {formData.location}
          </Text>
          
          {/* Category Attributes */}
          {formData.categoryAttributes && Object.keys(formData.categoryAttributes).length > 0 && (
            <>
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs }} />
              {Object.entries(formData.categoryAttributes).map(([key, value]) => {
                // Format the value with proper capitalization
                const formatAttributeValue = (val: string | string[]): string => {
                  if (Array.isArray(val)) {
                    return val.map(v => formatSingleValue(v)).join(', ');
                  }
                  return formatSingleValue(String(val));
                };
                
                const formatSingleValue = (val: string): string => {
                  // Common words that should remain lowercase (except at the beginning)
                  const lowercaseWords = new Set([
                    'and', 'or', 'of', 'the', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from',
                    'up', 'down', 'out', 'off', 'over', 'under', 'above', 'below', 'between',
                    'among', 'through', 'during', 'before', 'after', 'inside', 'outside', 'upon',
                    'within', 'without', 'against', 'across', 'around', 'behind', 'beyond',
                    'except', 'including', 'regarding', 'concerning', 'considering', 'despite',
                    'throughout', 'toward', 'towards', 'via', 'versus', 'vice'
                  ]);
                  
                  return val
                    .split('_')
                    .map((word, index) => {
                      const lowerWord = word.toLowerCase();
                      // First word is always capitalized, others follow the rules
                      if (index === 0 || !lowercaseWords.has(lowerWord)) {
                        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                      }
                      return lowerWord;
                    })
                    .join(' ');
                };
                
                return (
                  <Text key={key} variant="caption" color="muted">
                    {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: {formatAttributeValue(value)}
                  </Text>
                );
              })}
            </>
          )}
        </View>
      </View>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <View style={{
          backgroundColor: theme.colors.warning + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.warning,
        }}>
          <Text variant="bodySmall" style={{ color: theme.colors.warning, fontWeight: '600' }}>
            ⚠️ You have unsaved changes
          </Text>
        </View>
      )}
    </View>
  ), [formData, selectedCategory, hasUnsavedChanges, theme]);

  const steps = [BasicInfoStep, CategoryStep, ReviewStep];
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
          justifyContent: currentStep === 0 ? 'flex-end' : 'space-between',
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
