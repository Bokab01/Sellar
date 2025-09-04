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
// import { validateListingTitle, validateListingDescription } from '@/utils/validation';
import { contentModerationService } from '@/lib/contentModerationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
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
} from '@/components';
import { SelectedImage } from '@/components/ImagePicker';
import { 
  Camera, 
  FileText, 
  Package, 
  DollarSign, 
  CheckCircle, 
  ArrowLeft,
  ArrowRight
} from 'lucide-react-native';
import { router } from 'expo-router';
import { findCategoryById, COMPREHENSIVE_CATEGORIES } from '@/constants/categories';
import { getCategoryAttributes, hasCategoryAttributes } from '@/constants/categoryAttributes';
import { networkUtils } from '@/utils/networkUtils';



interface ListingFormData {
  // Images (Step 1)
  images: SelectedImage[];
  
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
    description: 'Add photos of your item',
    icon: Camera,
    color: 'primary',
  },
  {
    id: 'basic-info',
    title: 'Basic Info',
    description: 'Title and description',
    icon: FileText,
    color: 'success',
  },
  {
    id: 'category',
    title: 'Category & Location',
    description: 'What and where are you selling?',
    icon: Package,
    color: 'warning',
  },
  {
    id: 'details',
    title: 'Details',
    description: 'Price and condition',
    icon: DollarSign,
    color: 'error',
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review and publish',
    icon: CheckCircle,
    color: 'success',
  },
] as const;

const CONDITIONS = [
  { value: 'new', label: 'Brand New', description: 'Never used, in original packaging' },
  { value: 'like-new', label: 'Like New', description: 'Barely used, excellent condition' },
  { value: 'good', label: 'Good', description: 'Used but well maintained' },
  { value: 'fair', label: 'Fair', description: 'Shows wear but fully functional' },
  { value: 'poor', label: 'Poor', description: 'Significant wear, may need repairs' },
];

export default function CreateListingScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { balance, getMaxListings, spendCredits, hasUnlimitedListings } = useMonetizationStore();
  
  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ListingFormData>({
    images: [],
    title: '',
    description: '',
    categoryId: '',
    categoryAttributes: {},
    condition: 'good', // Default to valid condition
    price: '',
    quantity: 1,
    acceptOffers: true,
    location: '',
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userListingsCount, setUserListingsCount] = useState(0);
  const [showPhotoTips, setShowPhotoTips] = useState(false);
  
  // Validation state
  const [validationResults, setValidationResults] = useState<Record<number, ValidationResult>>({});
  // const [isValidating, setIsValidating] = useState(false);
  
  // Performance optimization refs
  const debouncedValidator = useRef(createDebouncedValidator(300));
  const formDataRef = useRef(formData);
  
  // Autosave state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AUTOSAVE_KEY = useMemo(() => `listing_draft_${user?.id || 'anonymous'}`, [user?.id]);

  useEffect(() => {
    checkListingLimits();
    loadDraft();
  }, [checkListingLimits, loadDraft]);

  // Load saved draft on component mount
  const loadDraft = useCallback(async () => {
    try {
      const savedDraft = await AsyncStorage.getItem(AUTOSAVE_KEY);
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        // Only load if it's not empty
        if (draftData.title || draftData.description || draftData.images?.length > 0) {
          Alert.alert(
            'Draft Found',
            'You have an unsaved draft. Would you like to continue where you left off?',
            [
              { text: 'Start Fresh', onPress: () => clearDraft(), style: 'destructive' },
              { text: 'Continue', onPress: () => setFormData(draftData) },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [AUTOSAVE_KEY]);

  // Save draft to AsyncStorage
  const saveDraft = useCallback(async (data: ListingFormData) => {
    try {
      setIsAutoSaving(true);
      await AsyncStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [AUTOSAVE_KEY]);

  // Clear draft from AsyncStorage
  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTOSAVE_KEY);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [AUTOSAVE_KEY]);



  // Handle back button and navigation
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (hasUnsavedChanges) {
          Alert.alert(
            'Unsaved Changes',
            'You have unsaved changes. What would you like to do?',
            [
              { text: 'Discard', onPress: () => { clearDraft(); router.back(); }, style: 'destructive' },
              { text: 'Save Draft', onPress: () => { saveDraft(formData); router.back(); } },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [hasUnsavedChanges, formData, saveDraft, clearDraft])
  );

  const checkListingLimits = useCallback(async () => {
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
  }, [user]);

  // Update form data with validation and autosave
  const updateFormData = useCallback((updates: Partial<ListingFormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      formDataRef.current = newData;
      return newData;
    });
    
    // Trigger validation and autosave separately to avoid re-render issues
    setHasUnsavedChanges(true);
    
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(() => {
      const currentData = formDataRef.current;
      saveDraft(currentData);
    }, 2000) as any;
    
    // Debounced validation
    setIsValidating(true);
    debouncedValidator.current(currentStep, formDataRef.current, (result) => {
      setValidationResults(prev => ({ ...prev, [currentStep]: result }));
      setIsValidating(false);
    });
  }, [currentStep, saveDraft]);

  const validateStep = useCallback((step: number): boolean => {
    const validation = validationResults[step] || validateListingStep(step, formData);
    return validation.isValid;
  }, [formData, validationResults]);

  const canProceed = useMemo(() => validateStep(currentStep), [currentStep, validateStep]);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1 && canProceed) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, canProceed]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    // Check if payment is needed for additional listings
    const maxListings = getMaxListings();
    const needsCredits = !hasUnlimitedListings() && userListingsCount >= maxListings;
    
    if (needsCredits) {
      setShowPaymentModal(true);
      return;
    }

    await createListing();
  };

  const createListing = async () => {
    setLoading(true);
    try {
      // All connectivity and storage tests passed

      
      // Check network connectivity first
      console.log('Checking network connectivity...');
      const networkStatus = await networkUtils.checkNetworkStatus();
      
      if (!networkStatus.isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      if (!networkStatus.canReachSupabase) {
        throw new Error(networkStatus.error || 'Cannot connect to server. Please try again.');
      }
      
      // Test storage connection
      const storageConnected = await networkUtils.testStorageConnection();
      if (!storageConnected) {
        throw new Error('Cannot connect to image storage. Please try again.');
      }
      
      const bucketAccessible = await networkUtils.checkStorageBucket('listing-images');
      if (!bucketAccessible) {
        throw new Error('Image storage is not accessible. Please try again later.');
      }
      
      // Skip bucket testing - just try to upload directly
      // The RLS policies are set up, so authenticated users should be able to upload
      console.log('Proceeding with image upload (RLS policies should allow authenticated users)...');

      // Storage connectivity verified
      
      console.log('All connectivity and storage tests passed');
      
      // Upload images first with progress tracking
      let imageUrls: string[] = [];
      if (formData.images.length > 0) {
        console.log(`Starting upload of ${formData.images.length} images`);
        setUploadProgress(0);
        
        try {
          // Use the updated storage helper with proper bucket
          const imageUris = formData.images.map(img => img.uri);
          const uploadResults = await storageHelpers.uploadMultipleImages(
            imageUris,
            STORAGE_BUCKETS.LISTINGS,
            'listing', // folder name
            user!.id,
            (progress) => setUploadProgress(progress)
          );
          
          imageUrls = uploadResults.map(result => result.url);
          console.log('All images uploaded successfully using simple method');
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          throw new Error(`Failed to upload images: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }

      // Sanitize and optimize data
      const sanitizedTitle = sanitizeInput(formData.title);
      const sanitizedDescription = sanitizeInput(formData.description);
      const seoTitle = generateSEOFriendlyTitle(sanitizedTitle, selectedCategory?.name || '');
      const keywords = extractKeywords(sanitizedTitle, sanitizedDescription);

      // Create listing with optimized data including category attributes
      // Map category IDs to proper UUIDs or use default
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
      };
      
      const DEFAULT_CATEGORY_UUID = '00000000-0000-4000-8000-000000000000'; // General/Other
      const categoryUUID = categoryMapping[formData.categoryId] || DEFAULT_CATEGORY_UUID;
      
      const listingData = {
        user_id: user!.id,
        title: seoTitle,
        description: sanitizedDescription,
        price: Number(formData.price),
        currency: 'GHS',
        category_id: categoryUUID, // Use mapped category UUID
        condition: formData.condition,
        quantity: formData.quantity,
        location: formData.location,
        images: imageUrls,
        accept_offers: formData.acceptOffers,
        status: 'active'
      };

      // Ensure condition is valid, fallback to 'good' if empty or invalid
      const validConditions = ['new', 'like-new', 'good', 'fair', 'poor'];
      const finalCondition = validConditions.includes(formData.condition) ? formData.condition : 'good';
      
      // Update the listing data with the validated condition
      listingData.condition = finalCondition;



      // Enhance description with category attributes for better searchability
      const attributeText = Object.entries(formData.categoryAttributes || {})
        .filter(([_, value]) => value && (Array.isArray(value) ? value.length > 0 : value.toString().trim()))
        .map(([key, value]) => {
          const attr = getCategoryAttributes(formData.categoryId).find(a => a.id === key);
          if (!attr) return '';
          
          if (Array.isArray(value)) {
            return `${attr.name}: ${value.join(', ')}`;
          }
          return `${attr.name}: ${value}`;
        })
        .filter(Boolean)
        .join(' • ');

      // Add category and attribute information to description
      const categoryInfo = selectedCategory ? `Category: ${selectedCategory.name}` : '';
      const additionalInfo = [categoryInfo, attributeText].filter(Boolean).join(' • ');
      
      if (additionalInfo) {
        listingData.description = `${sanitizedDescription}\n\n📋 ${additionalInfo}`;
      }

      // Content moderation check
      console.log('Running content moderation...');
      const moderationResult = await contentModerationService.moderateContent({
        id: 'temp-listing-id', // Temporary ID for moderation
        type: 'listing',
        content: `${listingData.title}\n\n${listingData.description}`,
        images: imageUrls,
        userId: user!.id,
        metadata: {
          category: formData.categoryId,
          price: listingData.price,
          location: listingData.location,
        },
      });

      // Handle moderation results
      if (!moderationResult.isApproved) {
        if (moderationResult.requiresManualReview) {
          Alert.alert(
            'Content Under Review',
            'Your listing has been submitted for review due to our content policies. You will be notified once the review is complete.',
            [{ text: 'OK' }]
          );
          // Set status to pending for manual review
          listingData.status = 'pending';
        } else {
          // Content was rejected
          const flagReasons = moderationResult.flags.map(flag => flag.details).join(', ');
          Alert.alert(
            'Content Policy Violation',
            `Your listing cannot be published due to: ${flagReasons}. Please review and modify your content.`,
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
      }

      const { data: listing, error: listingError } = await dbHelpers.createListing(listingData);

      if (listingError) throw listingError;
      
      // Clear draft after successful creation
      await clearDraft();
      
      setShowSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        try {
          // Check if router is available before navigating
          if (router && typeof router.replace === 'function') {
            router.replace('/(tabs)');
          } else {
            console.log('Router not available, just resetting form');
            setFormData({
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
            setCurrentStep(0);
          }
        } catch (navError) {
          console.log('Navigation error (safe to ignore):', navError);
          // Fallback: just reset the form without navigation
          setFormData({
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
          setCurrentStep(0);
        }
      }, 2000);
    } catch (error: any) {
      console.error('Listing creation error:', error);
      
      let errorMessage = 'Failed to create listing. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('Upload failed')) {
          errorMessage = 'Failed to upload images. Please check your internet connection and try again.';
        } else if (error.message.includes('No authenticated session')) {
          errorMessage = 'Your session has expired. Please sign in again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Upload Failed',
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Retry', 
            onPress: () => {
              // Reset progress and retry
              setUploadProgress(0);
              createListing();
            }
          }
        ]
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handlePayForListing = async () => {
    const requiredCredits = 10;
    if (balance < requiredCredits) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${requiredCredits} credits but only have ${balance}. Would you like to buy more credits?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => {
            try {
              router.push('/buy-credits');
            } catch (e) {
              console.log('Navigation error:', e);
            }
          }},
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
        await createListing();
      } else {
        Alert.alert('Error', result.error || 'Failed to process payment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment');
    }
  };

  const selectedCategory = formData.categoryId ? findCategoryById(COMPREHENSIVE_CATEGORIES, formData.categoryId) : null;
  const selectedCondition = CONDITIONS.find(c => c.value === formData.condition);

  // Stable input handlers to prevent keyboard dismissal
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
    // Clear category attributes when category changes
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

  const getStepColor = (colorName: string) => {
    switch (colorName) {
      case 'primary': return theme.colors.primary;
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      default: return theme.colors.primary;
    }
  };

  // Step Components - Memoized to prevent re-renders
  const PhotosStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>
      
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
          padding: theme.spacing.lg,
          alignItems: 'center',
        }}>
          <Text variant="body" style={{ color: theme.colors.warning, textAlign: 'center' }}>
            📸 At least one photo is required to continue
          </Text>
        </View>
      )}
      
      <View style={{
        backgroundColor: theme.colors.primary + '10',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Camera size={20} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
        <Text variant="bodySmall" style={{ color: theme.colors.primary, flex: 1 }}>
          Great photos can increase your sales by up to 300%!
        </Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => setShowPhotoTips(true)}
        >
          Tips
        </Button>
      </View>
    </View>
  ), [formData.images, loading, uploadProgress, theme, handleImagesChange]);

  const BasicInfoStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>

      <Input
        label="Title"
        placeholder="e.g. White COS Jumper"
        value={formData.title}
        onChangeText={handleTitleChange}
        helper={validationResults[1]?.warnings.title || "Be descriptive and specific (min. 10 characters)"}
        error={validationResults[1]?.errors.title}
      />

      <Input
        variant="multiline"
        label="Describe your item"
        placeholder="e.g. only worn a few times, true to size"
        value={formData.description}
        onChangeText={handleDescriptionChange}
        helper={validationResults[1]?.warnings.description || "Include condition, age, reason for selling, etc. (min. 20 characters)"}
        containerStyle={{ minHeight: 120 }}
        error={validationResults[1]?.errors.description}
      />

      <View style={{
        backgroundColor: theme.colors.success + '10',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
      }}>
        <Text variant="bodySmall" style={{ color: theme.colors.success, textAlign: 'center' }}>
          💡 Detailed listings get 5x more views!
        </Text>
      </View>
    </View>
  ), [formData.title, formData.description, validationResults, theme, handleTitleChange, handleDescriptionChange]);

  const CategoryStep = useMemo(() => {
    const categoryAttributes = formData.categoryId ? getCategoryAttributes(formData.categoryId) : [];
    const showAttributes = hasCategoryAttributes(formData.categoryId);

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

        {/* Category-specific attributes */}
        {showAttributes && (
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Product Details
            </Text>
            <CategoryAttributes
              attributes={categoryAttributes}
              values={formData.categoryAttributes}
              onChange={handleCategoryAttributeChange}
            />
          </View>
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
      </View>
    );
  }, [formData.categoryId, formData.location, formData.categoryAttributes, selectedCategory, theme, handleCategorySelect, handleLocationSelect, handleCategoryAttributeChange]);

  const DetailsStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>

      <View>
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Condition
        </Text>
        <View style={{ gap: theme.spacing.sm }}>
          {CONDITIONS.map((condition) => (
            <Pressable
              key={condition.value}
              onPress={() => handleConditionSelect(condition.value)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: formData.condition === condition.value 
                  ? theme.colors.primary 
                  : theme.colors.border,
                backgroundColor: pressed 
                  ? theme.colors.surfaceVariant 
                  : formData.condition === condition.value 
                    ? theme.colors.primary + '10' 
                    : theme.colors.surface,
              })}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: formData.condition === condition.value 
                  ? theme.colors.primary 
                  : theme.colors.border,
                backgroundColor: formData.condition === condition.value 
                  ? theme.colors.primary 
                  : 'transparent',
                marginRight: theme.spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {formData.condition === condition.value && (
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.colors.surface,
                  }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ 
                  fontWeight: '500',
                  color: formData.condition === condition.value 
                    ? theme.colors.primary 
                    : theme.colors.text.primary,
                  marginBottom: theme.spacing.xs,
                }}>
                  {condition.label}
                </Text>
                <Text variant="caption" color="muted">
                  {condition.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <Input
        label="Price (GHS)"
        placeholder="25.00"
        value={formData.price}
        onChangeText={handlePriceChange}
        keyboardType="numeric"
        helper={validationResults[3]?.warnings.price || "Set a competitive price"}
        error={validationResults[3]?.errors.price}
      />

      {formData.price && !isNaN(Number(formData.price)) && Number(formData.price) > 0 && (
        <View style={{ alignItems: 'center', marginVertical: theme.spacing.md }}>
          <PriceDisplay amount={Number(formData.price)} size="xl" />
        </View>
      )}

      <Stepper
        value={formData.quantity}
        onValueChange={handleQuantityChange}
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
          <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.sm }}>
            Buyers can negotiate the price with you
          </Text>
        )}
      </View>
    </View>
  ), [formData.condition, formData.price, formData.quantity, formData.acceptOffers, validationResults, theme, handleConditionSelect, handlePriceChange, handleQuantityChange, handleAcceptOffersChange]);



  const ReviewStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>

      {/* Preview Card */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        {/* Images Preview */}
        {formData.images.length > 0 && (
          <View style={{ marginBottom: theme.spacing.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                {formData.images.map((image, index) => (
                  <View
                    key={index}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: theme.borderRadius.md,
                      overflow: 'hidden',
                      backgroundColor: theme.colors.surfaceVariant,
                    }}
                  >
                    {/* Image would be rendered here */}
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text variant="caption">Photo {index + 1}</Text>
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
          <Text variant="caption" color="muted">
            Condition: {selectedCondition?.label}
          </Text>
          <Text variant="caption" color="muted">
            Quantity: {formData.quantity}
          </Text>
          <Text variant="caption" color="muted">
            Location: {formData.location}
          </Text>
        </View>
      </View>

      {/* Listing Limit Warning */}
      {!hasUnlimitedListings() && userListingsCount >= getMaxListings() && (
        <View style={{
          backgroundColor: theme.colors.warning + '10',
          borderColor: theme.colors.warning,
          borderWidth: 1,
          padding: theme.spacing.lg,
          borderRadius: theme.borderRadius.lg,
        }}>
          <Text variant="h4" style={{ color: theme.colors.warning, marginBottom: theme.spacing.sm }}>
            📋 Additional Listing Fee
          </Text>
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.md }}>
            You&apos;ve reached your limit of {getMaxListings()} active listings. Additional listings cost 10 credits each.
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.warning }}>
            Your balance: {balance} credits
          </Text>
        </View>
      )}
    </View>
  ), [formData, selectedCategory, selectedCondition, theme, hasUnlimitedListings, userListingsCount, getMaxListings, balance]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return PhotosStep;
      case 1: return BasicInfoStep;
      case 2: return CategoryStep;
      case 3: return DetailsStep;
      case 4: return ReviewStep;
      default: return null;
    }
  };

  const currentStepData = STEPS[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Sell an item"
        showBackButton
        onBackPress={() => {
          if (hasUnsavedChanges) {
            Alert.alert(
              'Unsaved Changes',
              'You have unsaved changes. What would you like to do?',
              [
                { text: 'Discard', onPress: () => { clearDraft(); router.back(); }, style: 'destructive' },
                { text: 'Save Draft', onPress: () => { saveDraft(formData); router.back(); } },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          } else {
            router.back();
          }
        }}

      />

      {/* Autosave Status */}
      {(isAutoSaving || hasUnsavedChanges || (formData.title || formData.description || formData.images.length > 0)) && (
        <View style={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          backgroundColor: theme.colors.surfaceVariant,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {isAutoSaving && (
              <>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.colors.warning,
                  marginRight: theme.spacing.xs,
                }} />
                <Text variant="caption" color="muted">Saving draft...</Text>
              </>
            )}
            {!isAutoSaving && hasUnsavedChanges && (
              <>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.colors.error,
                  marginRight: theme.spacing.xs,
                }} />
                <Text variant="caption" color="muted">Unsaved changes</Text>
              </>
            )}
            {!isAutoSaving && !hasUnsavedChanges && (formData.title || formData.description || formData.images.length > 0) && (
              <>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.colors.success,
                  marginRight: theme.spacing.xs,
                }} />
                <Text variant="caption" color="muted">Draft saved</Text>
              </>
            )}
          </View>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {/* Progress Indicator */}
        <View style={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <StepIndicator
            steps={STEPS.map((step, index) => ({
              title: '', // Remove labels
              completed: index < currentStep,
              active: index === currentStep,
            }))}
            currentStep={currentStep}
            showLabels={false}
          />
        </View>



        {/* Step Content */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, padding: theme.spacing.lg }}>
            {renderStepContent()}
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          gap: theme.spacing.md,
        }}>
          <Button
            variant="secondary"
            onPress={currentStep === 0 ? () => router.back() : previousStep}
            disabled={loading}
            icon={currentStep === 0 ? undefined : <ArrowLeft size={18} color={theme.colors.text.primary} />}
            style={{ flex: 1 }}
          >
            {currentStep === 0 ? 'Cancel' : 'Previous'}
          </Button>

          <Button
            variant="primary"
            onPress={currentStep === STEPS.length - 1 ? handleSubmit : nextStep}
            disabled={!canProceed || loading}
            loading={loading && currentStep === STEPS.length - 1}
            icon={currentStep === STEPS.length - 1 ? undefined : <ArrowRight size={18} color={theme.colors.primaryForeground} />}
            style={{ flex: 1 }}
          >
            {currentStep === STEPS.length - 1 ? 'Publish Listing' : 'Next'}
          </Button>
        </View>
      </View>

      {/* Payment Modal */}
      <AppModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Additional Listing Fee"
        primaryAction={{
          text: `Pay 10 Credits`,
          onPress: handlePayForListing,
          loading: false,
        }}
        secondaryAction={{
          text: 'Buy Credits',
                  onPress: () => {
          setShowPaymentModal(false);
          try {
            router.push('/buy-credits');
          } catch (e) {
            console.log('Navigation error:', e);
          }
        },
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{
            backgroundColor: theme.colors.primary + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.lg,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 48, marginBottom: theme.spacing.md }}>📋</Text>
            <Text variant="h4" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
              Listing Limit Reached
            </Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              You&apos;ve reached your free listing limit of {getMaxListings()} active listings
            </Text>
          </View>

          <View style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.lg,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
              <Text variant="body">Additional listing fee:</Text>
              <Text variant="body" style={{ fontWeight: '600' }}>10 credits</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
              <Text variant="body">Your balance:</Text>
              <Text variant="body" style={{ 
                fontWeight: '600',
                color: balance >= 10 ? theme.colors.success : theme.colors.error,
              }}>
                {balance} credits
              </Text>
            </View>
            
            {balance >= 10 && (
              <View style={{
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                paddingTop: theme.spacing.md,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}>
                <Text variant="body" style={{ fontWeight: '600' }}>After payment:</Text>
                <Text variant="body" style={{ fontWeight: '600' }}>{balance - 10} credits</Text>
              </View>
            )}
          </View>

          {balance < 10 && (
            <View style={{
              backgroundColor: theme.colors.error + '10',
              borderColor: theme.colors.error,
              borderWidth: 1,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}>
              <Text variant="bodySmall" style={{ color: theme.colors.error, textAlign: 'center' }}>
                ⚠️ You need {10 - balance} more credits to create this listing
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

          <View style={{
            backgroundColor: theme.colors.success + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
          }}>
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
