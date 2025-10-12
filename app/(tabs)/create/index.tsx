import React, { useState, useEffect, useMemo, useCallback, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { View, ScrollView, Alert, Pressable, BackHandler, Image, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  StepIndicator,
  Toast,
  AppModal,
  Badge,
} from '@/components';
import { CategoryAttributesForm } from '@/components/CategoryAttributesForm';
import { ListingFeatureSelector } from '@/components/ListingFeatureSelector/ListingFeatureSelector';
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
import { findCategoryById as findCategoryByIdUtil, DbCategory } from '@/utils/categoryUtils';
import { networkUtils } from '@/utils/networkUtils';
import { reputationService } from '@/lib/reputationService';



interface ListingFormData {
  // Images (Step 1)
  images: SelectedImage[];
  
  // Basic Info (Step 2)
  title: string;
  description: string;
  
  // Category & Details (Step 2)
  categoryId: string;
  categoryAttributes: Record<string, string | string[]>;
  price: string;
  quantity: number;
  acceptOffers: boolean;
  location: string;
}

interface SelectedFeature {
  key: string;
  name: string;
  credits: number;
  duration: string;
  description: string;
}

const STEPS = [
  {
    id: 'basic-info',
    title: 'Info',
    description: 'Photos, title & description',
    icon: FileText,
    color: 'primary',
  },
  {
    id: 'details',
    title: 'Details',
    description: 'Category, location, price & more',
    icon: Package,
    color: 'warning',
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review and publish',
    icon: CheckCircle,
    color: 'success',
  },
] as const;

function CreateListingScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { balance, getMaxListings, spendCredits, hasUnlimitedListings, refreshCredits, hasBusinessPlan } = useMonetizationStore();
  
  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ListingFormData>({
    images: [],
    title: '',
    description: '',
    categoryId: '',
    categoryAttributes: {},
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
  const [showListingTipsModal, setShowListingTipsModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [draftData, setDraftData] = useState<ListingFormData | null>(null);
  const [showFeatureConfirmModal, setShowFeatureConfirmModal] = useState(false);
  
  // Feature selector state
  const [showFeatureSelector, setShowFeatureSelector] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>([]);
  
  // Validation state
  const [validationResults, setValidationResults] = useState<Record<number, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [categoryAttributes, setCategoryAttributes] = useState<any[]>([]); // Store DB attributes for validation
  
  // Performance optimization refs
  const isMountedRef = useRef(true); // Track if component is mounted
  const debouncedValidator = useRef(createDebouncedValidator(300));
  const formDataRef = useRef(formData);
  const lastSavedDataRef = useRef<string>(''); // Track last saved data to avoid redundant saves
  
  // Autosave state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [hasShownDraftAlert, setHasShownDraftAlert] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutosaveTimeRef = useRef<number>(0); // Track last autosave time for throttling
  const AUTOSAVE_KEY = useMemo(() => `listing_draft_${user?.id || 'anonymous'}`, [user?.id]);
  const [selectedCategory, setSelectedCategory] = useState<DbCategory | null>(null);
  
  // Animation for autosave indicator
  const autosaveOpacity = useRef(new Animated.Value(0)).current;
  const fadeOutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Autosave configuration
  const AUTOSAVE_DEBOUNCE_MS = 3000; // Wait 3 seconds after user stops typing
  const AUTOSAVE_THROTTLE_MS = 15000; // Minimum 15 seconds between database saves
  
  // Cleanup on unmount to prevent memory leaks and state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear autosave timeout on unmount
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
      // Clear fade out timeout on unmount
      if (fadeOutTimeoutRef.current) {
        clearTimeout(fadeOutTimeoutRef.current);
        fadeOutTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle autosave indicator animation - only show when saved
  useEffect(() => {
    try {
      // Only show indicator when content is saved (not saving, not unsaved)
      if (!isAutoSaving && !hasUnsavedChanges && (formData.title || formData.description || formData.images.length > 0)) {
        // Clear any existing fade-out timeout
        if (fadeOutTimeoutRef.current) {
          clearTimeout(fadeOutTimeoutRef.current);
          fadeOutTimeoutRef.current = null;
        }
        
        // Fade in
        Animated.timing(autosaveOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        // Show for 2 seconds then fade out
        fadeOutTimeoutRef.current = setTimeout(() => {
          try {
            Animated.timing(autosaveOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start();
          } catch (animError) {
            console.warn('Animation fade-out error:', animError);
          }
        }, 2000) as any;
      } else {
        // Hide immediately if saving or unsaved
        autosaveOpacity.setValue(0);
      }
    } catch (error) {
      console.warn('Autosave animation error:', error);
    }
  }, [isAutoSaving, hasUnsavedChanges, formData.title, formData.description, formData.images.length, autosaveOpacity]);

  // Feature selection handler
  const handleFeaturesSelected = useCallback((features: SelectedFeature[]) => {
    setSelectedFeatures(features);
    setHasUnsavedChanges(true);
  }, []);

  // Load saved draft on component mount
  const loadDraft = useCallback(async () => {
    try {
      const savedDraft = await AsyncStorage.getItem(AUTOSAVE_KEY);
      if (savedDraft && !hasShownDraftAlert) {
        const parsedDraft = JSON.parse(savedDraft);
        // Only load if it's not empty and we haven't shown the alert yet
        if (parsedDraft.title || parsedDraft.description || parsedDraft.images?.length > 0) {
          setHasShownDraftAlert(true);
          setDraftData(parsedDraft);
          setShowDraftModal(true);
        }
      }
      
      // Check if there's an existing draft in the database
      if (user?.id) {
        const { data: existingDraft } = await supabase
          .from('listings')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (existingDraft) {
          console.log('📄 Found existing draft:', existingDraft.id);
          setCurrentDraftId(existingDraft.id);
        } else {
          console.log('📄 No existing draft found');
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [AUTOSAVE_KEY, user, hasShownDraftAlert]);

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

  useEffect(() => {
    checkListingLimits();
    loadDraft();
  }, [checkListingLimits, loadDraft]);

  // Save draft to AsyncStorage and database
  // showAlert: whether to show "Draft Saved" alert (only for explicit manual saves)
  // bypassThrottle: whether to bypass the throttle timer (for step changes)
  const saveDraft = useCallback(async (data: ListingFormData, showAlert = false, bypassThrottle = false) => {
    // Don't save if component is unmounted
    if (!isMountedRef.current) return;
    
    try {
      // Check if data actually changed to avoid redundant saves
      const currentDataString = JSON.stringify(data);
      if (!showAlert && !bypassThrottle && currentDataString === lastSavedDataRef.current) {
        return; // Skip save if nothing changed
      }
      
      if (!isMountedRef.current) return; // Double check before state update
      setIsAutoSaving(true);
      
      // Always save to AsyncStorage for instant local persistence (fast, no cost)
      await AsyncStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      lastSavedDataRef.current = currentDataString;
      
      // Throttle database saves to reduce costs and network requests
      const now = Date.now();
      const timeSinceLastSave = now - lastAutosaveTimeRef.current;
      const shouldSaveToDatabase = bypassThrottle || timeSinceLastSave >= AUTOSAVE_THROTTLE_MS;
      
      // Only save to database if:
      // 1. Manual save OR throttle period has passed
      // 2. Has meaningful content AND category is selected
      if (shouldSaveToDatabase && (data.title?.trim() || data.description?.trim() || data.images?.length > 0) && data.categoryId) {
        lastAutosaveTimeRef.current = now; // Update last save time
        // CategoryId from CategoryPicker is already a valid UUID
        const categoryUUID = data.categoryId;

        const draftData: any = {
          user_id: user!.id,
          title: data.title?.trim() || 'Untitled Draft',
          description: data.description?.trim() || '',
          price: data.price ? Number(data.price) : 0,
          currency: 'GHS',
          category_id: categoryUUID,
          condition: 'good', // Default condition to satisfy NOT NULL constraint
          quantity: data.quantity || 1,
          location: data.location || '',
          images: data.images?.map(img => img.uri) || [],
          accept_offers: data.acceptOffers || true,
          attributes: data.categoryAttributes || {},
          status: 'draft'
        };
        
        // Only add attributes if they exist
        if (data.categoryAttributes && Object.keys(data.categoryAttributes).length > 0) {
          draftData.attributes = data.categoryAttributes;
        }

        // Check if we already have a draft for this session
        if (currentDraftId) {
          // Update existing draft with minimal fields
          const updateData = {
            title: draftData.title,
            description: draftData.description,
            price: draftData.price,
            location: draftData.location,
            images: draftData.images,
            attributes: draftData.attributes,
            updated_at: new Date().toISOString()
          };
          
          const { error } = await supabase
            .from('listings')
            .update(updateData)
            .eq('id', currentDraftId);

          if (error) {
            // If update fails, create new draft
            const { data: newDraft, error: insertError } = await supabase
              .from('listings')
              .insert(draftData)
              .select('id')
              .single();

            if (!insertError && newDraft) {
              setCurrentDraftId(newDraft.id);
            }
          }
        } else {
          // Create new draft
          const { data: newDraft, error } = await supabase
            .from('listings')
            .insert(draftData)
            .select('id')
            .single();

          if (!error && newDraft) {
            setCurrentDraftId(newDraft.id);
          }
        }
      }
      
      if (!isMountedRef.current) return; // Check before state updates
      setHasUnsavedChanges(false);
      
      // Show success message only for explicit manual saves (not step transitions)
      if (showAlert && isMountedRef.current) {
        Alert.alert('Draft Saved', 'Your listing has been saved as a draft. You can continue editing it later from My Listings.');
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      if (isMountedRef.current) {
        setIsAutoSaving(false);
      }
    }
  }, [AUTOSAVE_KEY, user, currentDraftId]);

  // Clear draft from AsyncStorage and database
  const clearDraft = useCallback(async () => {
    try {
      // Clear from AsyncStorage
      await AsyncStorage.removeItem(AUTOSAVE_KEY);
      
      // Clear current draft from database if it exists
      if (currentDraftId) {
        const { error } = await supabase
          .from('listings')
          .delete()
          .eq('id', currentDraftId);
        
        if (error) {
          console.error('Failed to delete draft:', error);
        }
        setCurrentDraftId(null);
      }
      
      // Reset form data to initial state
      setFormData({
        title: '',
        description: '',
        price: '',
        categoryId: '',
        categoryAttributes: {},
        quantity: 1,
        location: '',
        images: [],
        acceptOffers: true,
      });
      
      // Reset stepper to first step
      setCurrentStep(0);
      
      // Reset selected features
      setSelectedFeatures([]);
      
      // Reset validation results
      setValidationResults({});
      
      // Reset draft alert flag
      setHasShownDraftAlert(false);
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [AUTOSAVE_KEY, currentDraftId]);



  // Handle back button and navigation - only on create screen
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Show alert if there's any content (saved or unsaved)
        const hasContent = formData.title?.trim() || formData.description?.trim() || formData.images.length > 0;
        if (hasContent) {
          setShowExitModal(true);
          return true;
        }
        // If no content, just navigate back
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [formData])
  );

  // Update form data with validation and autosave
  const updateFormData = useCallback((updates: Partial<ListingFormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      formDataRef.current = newData;
      return newData;
    });
    
    // Use React's automatic batching for state updates
    React.startTransition(() => {
      setHasUnsavedChanges(true);
      
      // Clear existing timeout
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      
      // Set new timeout for autosave (debounced)
      autosaveTimeoutRef.current = setTimeout(() => {
        const currentData = formDataRef.current;
        saveDraft(currentData, false); // false = autosave, not manual save
      }, AUTOSAVE_DEBOUNCE_MS) as any;
      
      // Debounced validation with proper async handling
      setIsValidating(true);
      debouncedValidator.current(currentStep, formDataRef.current, (result) => {
        // Use startTransition to avoid scheduling updates during render
        React.startTransition(() => {
          setValidationResults(prev => ({ ...prev, [currentStep]: result }));
          setIsValidating(false);
        });
      }, categoryAttributes);
    });
  }, [currentStep, saveDraft, categoryAttributes]);

  const validateStep = useCallback((step: number): boolean => {
    const validation = validationResults[step] || validateListingStep(step, formData, categoryAttributes);
    return validation.isValid;
  }, [formData, validationResults, categoryAttributes]);

  const canProceed = useMemo(() => validateStep(currentStep), [currentStep, validateStep]);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1 && canProceed) {
      // Save draft silently when moving to next step (important milestone, but no alert needed)
      saveDraft(formDataRef.current, false, true); // false = no alert, true = bypass throttle
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, canProceed, saveDraft]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      // Save draft silently when going back (no need to annoy user with alert)
      saveDraft(formDataRef.current, false, true); // false = no alert, true = bypass throttle
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, saveDraft]);

  const handleSubmit = async () => {
    // Check if payment is needed for additional listings first
    const maxListings = getMaxListings();
    const needsCredits = !hasUnlimitedListings() && userListingsCount >= maxListings;
    
    // If needs credits AND has features, show combined confirmation
    if (needsCredits && selectedFeatures.length > 0) {
      setShowFeatureConfirmModal(true);
      return;
    }
    
    // If only needs credits (no features), show payment modal
    if (needsCredits) {
      setShowPaymentModal(true);
      return;
    }
    
    // If only has features (no credits needed), show feature confirmation
    if (selectedFeatures.length > 0) {
      setShowFeatureConfirmModal(true);
      return;
    }
    
    // No features and no credits needed, proceed directly
    await proceedWithPublish();
  };

  const proceedWithPublish = async () => {
    // Process credits (listing fee + features) and create listing
    // Note: Payment modal check is now handled in handleSubmit to avoid double confirmation
    try {
      // Calculate total credits needed
      const maxListings = getMaxListings();
      const needsListingFee = !hasUnlimitedListings() && userListingsCount >= maxListings;
      const listingFee = needsListingFee ? 5 : 0;
      const featureCredits = selectedFeatures.reduce((sum, feature) => sum + (feature.credits || 0), 0);
      const totalCredits = listingFee + featureCredits;
      
      // If any credits are needed, deduct them
      if (totalCredits > 0) {
        console.log(`💳 Deducting ${totalCredits} credits (${listingFee} listing fee + ${featureCredits} features)...`);
        
        // Check if user has enough credits
        if (balance < totalCredits) {
          Alert.alert(
            'Insufficient Credits',
            `You need ${totalCredits} credits (${listingFee} for listing + ${featureCredits} for features) but only have ${balance}. Would you like to buy more credits?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Buy Credits', onPress: () => {
                try {
                  router.push('/buy-credits');
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }},
            ]
          );
          return;
        }
        
        // Deduct credits for listing fee if needed
        if (listingFee > 0) {
          const listingFeeResult = await spendCredits(listingFee, 'Additional listing slot', {
            referenceType: 'listing_creation',
          });
          
          if (!listingFeeResult.success) {
            Alert.alert('Error', listingFeeResult.error || 'Failed to process listing fee payment');
            return;
          }
          
          console.log(`✅ Successfully deducted ${listingFee} credits for additional listing slot`);
        }
        
        // Deduct credits for features if any were selected
        if (featureCredits > 0) {
          const featureResult = await spendCredits(featureCredits, 'Listing features', {
            referenceType: 'listing_creation',
            features: selectedFeatures.map(f => ({ key: f.key, name: f.name, credits: f.credits })),
          });
          
          if (!featureResult.success) {
            // Refund listing fee if feature payment fails
            if (listingFee > 0) {
              console.log('💰 Refunding listing fee due to feature payment failure...');
              // TODO: Implement refund logic
            }
            Alert.alert('Error', featureResult.error || 'Failed to process feature payment');
            return;
          }
          
          console.log(`✅ Successfully deducted ${featureCredits} credits for features`);
        }
      }
      
      // Now create the listing
      await createListing();
    } catch (listingError) {
      console.log('🔄 Listing creation failed, checking for refunds...');
      console.log(`Selected features: ${selectedFeatures.length}`);
      
      // If features were selected, refund them
      if (selectedFeatures.length > 0) {
        console.log('💰 Refunding features...');
        await refundAllCredits(0, 'listing_creation_failed', listingError);
      } else {
        console.log('ℹ️ No features to refund');
      }
      // Error already logged and shown to user in createListing
    }
  };

  const createListing = async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    
    try {
      // Validate user is authenticated
      if (!user?.id) {
        throw new Error('You must be signed in to create a listing');
      }
      
      // Validate form data
      if (!formData.title?.trim()) {
        throw new Error('Please enter a title for your listing');
      }
      
      if (!formData.categoryId) {
        throw new Error('Please select a category');
      }
      
      if (!formData.price || Number(formData.price) <= 0) {
        throw new Error('Please enter a valid price');
      }
      
      // Check network connectivity first (with lenient timeout handling)
      console.log('Checking network connectivity...');
      try {
        const networkStatus = await networkUtils.checkNetworkStatus();
        
        if (!networkStatus.isConnected) {
          throw new Error('No internet connection. Please check your network and try again.');
        }
        
        // Don't fail if Supabase check times out - we'll try the actual operation anyway
        if (!networkStatus.canReachSupabase) {
          console.warn('Supabase connectivity check failed, but proceeding anyway:', networkStatus.error);
        }
        
        console.log('Network connectivity check passed');
      } catch (networkError) {
        // If network check itself fails, log but continue
        console.warn('Network check failed, proceeding anyway:', networkError);
      }
      
      // Skip detailed storage checks - they're too slow and cause timeouts
      // Just proceed with upload - if it fails, we'll get a proper error
      console.log('Proceeding with image upload...');
      
      // Upload images first with progress tracking
      let imageUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        console.log(`Starting upload of ${formData.images.length} images`);
        if (isMountedRef.current) setUploadProgress(0);
        
        try {
          // Validate images before upload
          const validImages = formData.images.filter(img => img && img.uri);
          if (validImages.length === 0) {
            throw new Error('No valid images to upload');
          }
          
          // Use the updated storage helper with proper bucket
          const imageUris = validImages.map(img => img.uri);
          const uploadResults = await storageHelpers.uploadMultipleImages(
            imageUris,
            STORAGE_BUCKETS.LISTINGS,
            'listing', // folder name
            user!.id,
            (progress) => {
              if (isMountedRef.current) setUploadProgress(progress);
            }
          );
          
          // Validate upload results
          if (!uploadResults || uploadResults.length === 0) {
            throw new Error('Image upload failed - no results returned');
          }
          
          imageUrls = uploadResults.map(result => result.url).filter(url => url);
          if (imageUrls.length === 0) {
            throw new Error('Image upload failed - no valid URLs returned');
          }
          
          console.log('All images uploaded successfully');
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          throw new Error(`Failed to upload images: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }

      // Sanitize and optimize data with safe guards
      const sanitizedTitle = sanitizeInput(formData.title || '');
      const sanitizedDescription = sanitizeInput(formData.description || '');
      const seoTitle = generateSEOFriendlyTitle(sanitizedTitle, selectedCategory?.name || 'Uncategorized');
      const keywords = extractKeywords(sanitizedTitle, sanitizedDescription);

      // Create listing with optimized data including category attributes
      // CategoryId from CategoryPicker is already a valid UUID, no mapping needed
      const categoryUUID = formData.categoryId;
      
      const listingData = {
        user_id: user!.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        price: Number(formData.price) || 0,
        currency: 'GHS',
        category_id: categoryUUID, // Use mapped category UUID
        condition: 'good', // Will be set properly below after mapping
        quantity: formData.quantity || 1,
        location: formData.location || '',
        images: imageUrls,
        accept_offers: formData.acceptOffers ?? true,
        attributes: formData.categoryAttributes || {},
        seo_title: seoTitle,
        keywords: keywords,
        status: 'active'
      };

      // Condition is now handled via category attributes
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
      
      // Handle condition safely (could be string or string[])
      const conditionRaw = formData.categoryAttributes.condition;
      const conditionValue = Array.isArray(conditionRaw) ? conditionRaw[0] : (conditionRaw as string) || 'good';
      listingData.condition = conditionMapping[conditionValue] || 'good';



      // Category information is now displayed in the ItemDetailsTable
      // No need to append it to the description
      listingData.description = sanitizedDescription;

      // Content moderation check
      console.log('Running content moderation...');
      let moderationResult;
      try {
        moderationResult = await contentModerationService.moderateContent({
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
      } catch (moderationError) {
        console.error('Content moderation failed:', moderationError);
        // If moderation fails due to a system error, reject the content to be safe
        setLoading(false);
        Alert.alert(
          'Moderation Error',
          'Unable to verify content at this time. Please try again or contact support if the issue persists.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Handle moderation results
      if (!moderationResult.isApproved) {
        setLoading(false);
        
        // Extract specific violations with user-friendly messages
        const flagReasons = moderationResult.flags
          .map(flag => {
            if (flag.type === 'profanity') {
              return 'Inappropriate language detected';
            } else if (flag.type === 'personal_info') {
              return 'Too much personal information (multiple phone numbers/emails)';
            } else if (flag.type === 'spam') {
              return 'Spam-like content detected';
            } else if (flag.type === 'inappropriate') {
              return 'Inappropriate content detected';
            } else if (flag.type === 'suspicious_links') {
              return 'Suspicious or shortened links detected';
            }
            return flag.details;
          })
          .join('\n• ');
        
        Alert.alert(
          'Cannot Publish Listing',
          `Your listing cannot be published:\n\n• ${flagReasons}\n\nPlease review and modify your content, then try again.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const { data: listing, error: listingError } = await dbHelpers.createListing(listingData);

      if (listingError) {
        console.error('Database error creating listing:', listingError);
        throw new Error(listingError.message || 'Failed to create listing in database');
      }
      
      if (!listing || !listing.id) {
        throw new Error('Listing was created but no data was returned');
      }

      // Apply selected features to the newly created listing
      // NOTE: Credits for features have already been deducted in handlePayForListing
      // We just need to apply the features to the listing directly
      if (selectedFeatures.length > 0 && listing) {
        console.log(`Applying ${selectedFeatures.length} features to listing ${listing.id}`);
        
        const failedFeatures: Array<{ feature: SelectedFeature; error: string }> = [];
        
        try {
          for (const feature of selectedFeatures) {
            try {
              // Apply the feature directly to the listing by updating the appropriate timestamp column
              // Credits have already been deducted, so we just need to set the expiry dates
              const now = new Date();
              let updateData: Record<string, any> = {};
              
              // Map feature keys to listing columns and durations
              switch (feature.key) {
                case 'pulse_boost_24h':
                  updateData.boost_until = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
                  break;
                case 'mega_pulse_7d':
                  updateData.boost_until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
                  break;
                case 'category_spotlight_3d':
                  updateData.spotlight_until = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
                  break;
                case 'listing_highlight':
                  updateData.highlight_until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
                  break;
                case 'urgent_badge':
                  updateData.urgent_until = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
                  break;
                case 'ad_refresh':
                  // Ad refresh just updates the updated_at timestamp
                  updateData.updated_at = now.toISOString();
                  break;
                default:
                  console.warn(`Unknown feature key: ${feature.key}`);
                  failedFeatures.push({ 
                    feature, 
                    error: 'Unknown feature type' 
                  });
                  continue;
              }
              
              // Update the listing with the feature
              const { error: updateError } = await supabase
                .from('listings')
                .update(updateData)
                .eq('id', listing.id);

              if (updateError) {
                console.error(`Failed to apply feature ${feature.key}:`, updateError);
                failedFeatures.push({ 
                  feature, 
                  error: updateError.message || 'Unknown error' 
                });
              } else {
                console.log(`Successfully applied feature ${feature.key} to listing`);
                
                // Create feature purchase record for tracking
                await supabase
                  .from('feature_purchases')
                  .insert({
                    user_id: user!.id,
                    listing_id: listing.id,
                    feature_key: feature.key,
                    credits_spent: feature.credits,
                    status: 'active',
                  });
              }
            } catch (featureError) {
              console.error(`Exception applying feature ${feature.key}:`, featureError);
              failedFeatures.push({ 
                feature, 
                error: featureError instanceof Error ? featureError.message : 'Unknown error' 
              });
            }
          }
          
          // If any features failed, refund them
          if (failedFeatures.length > 0) {
            console.log(`Refunding ${failedFeatures.length} failed features`);
            
            for (const { feature, error } of failedFeatures) {
              try {
                // Get current balance for transaction record
                const { data: userCredits } = await supabase
                  .from('user_credits')
                  .select('balance')
                  .eq('user_id', user!.id)
                  .single();
                
                const currentBalance = userCredits?.balance || 0;
                
                // Create refund transaction for each failed feature
                await supabase
                  .from('credit_transactions')
                  .insert({
                    user_id: user!.id,
                    amount: feature.credits,
                    type: 'refunded',
                    balance_before: currentBalance,
                    balance_after: currentBalance + feature.credits,
                    reference_id: listing.id,
                    reference_type: 'feature_purchase',
                    metadata: {
                      description: `Refund for failed feature: ${feature.name}`,
                      reason: 'feature_purchase_failed',
                      feature_key: feature.key,
                      feature_name: feature.name,
                      listing_id: listing.id,
                      error: error,
                      timestamp: new Date().toISOString(),
                    },
                  });
                
                // Increment balance
                await supabase.rpc('increment_field', {
                  table_name: 'user_credits',
                  field_name: 'balance',
                  increment_by: feature.credits,
                  match_column: 'user_id',
                  match_value: user!.id,
                });
                
                console.log(`Refunded ${feature.credits} credits for failed feature: ${feature.name}`);
              } catch (refundError) {
                console.error(`Failed to refund feature ${feature.name}:`, refundError);
              }
            }
            
            // Show alert about failed features
            const failedFeaturesList = failedFeatures
              .map(f => `• ${f.feature.name} (${f.feature.credits} credits refunded)`)
              .join('\n');
            
            Alert.alert(
              'Some Features Failed',
              `Your listing was created successfully, but some features could not be applied:\n\n${failedFeaturesList}\n\nCredits have been refunded.`,
              [{ text: 'OK' }]
            );
          }
          
          // Refresh credits after feature application
          await refreshCredits();
        } catch (featureError) {
          console.error('Error applying features:', featureError);
          // Don't fail the entire listing creation if features fail
          // The listing is already created, so we just log the error
        }
      }
      
      // Award reputation points for listing creation
      try {
        await reputationService.awardPoints(user!.id, 'listing_created', listing.id);
        console.log('Reputation points awarded for listing creation');
      } catch (repError) {
        console.error('Failed to award reputation points:', repError);
        // Don't fail listing creation if reputation update fails
      }
      
      // Clear draft after successful creation
      await clearDraft();
      
      if (!isMountedRef.current) return;
      setShowSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        if (!isMountedRef.current) return; // Don't navigate if unmounted
        
        try {
          // Check if router is available before navigating
          if (router && typeof router.replace === 'function') {
            router.replace('/(tabs)/home');
          } else {
            console.log('Router not available, just resetting form');
            if (isMountedRef.current) {
              setFormData({
                images: [],
                title: '',
                description: '',
                categoryId: '',
                categoryAttributes: {},
                price: '',
                quantity: 1,
                acceptOffers: true,
                location: '',
              });
              setSelectedFeatures([]);
              setCurrentStep(0);
            }
          }
        } catch (navError) {
          console.log('Navigation error (safe to ignore):', navError);
          // Fallback: just reset the form without navigation
          if (isMountedRef.current) {
            setFormData({
              images: [],
              title: '',
              description: '',
              categoryId: '',
              categoryAttributes: {},
              price: '',
              quantity: 1,
              acceptOffers: true,
              location: '',
            });
            setCurrentStep(0);
          }
        }
      }, 2000);
    } catch (error: any) {
      console.error('Listing creation error:', error);
      console.error('Error stack:', error?.stack);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      if (!isMountedRef.current) return; // Don't show alerts if unmounted
      
      let errorMessage = 'Failed to create listing. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('Upload failed') || error.message.includes('Image upload failed')) {
          errorMessage = 'Failed to upload images. Please check your internet connection and try again.';
        } else if (error.message.includes('No authenticated session') || error.message.includes('signed in')) {
          errorMessage = 'Your session has expired. Please sign in again.';
        } else if (error.message.includes('title') || error.message.includes('category') || error.message.includes('price')) {
          errorMessage = error.message; // Show validation errors directly
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
              if (!isMountedRef.current) return;
              // Reset progress and retry
              setUploadProgress(0);
              createListing();
            }
          }
        ]
      );
      
      // Re-throw error so it can be caught by handleSubmit/handlePayForListing for refund
      throw error;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setUploadProgress(0);
      }
    }
  };

  const handlePayForListing = async () => {
    const requiredCredits = 10;
    
    // Calculate total credits needed (listing fee + selected features)
    const featureCredits = selectedFeatures.reduce((sum, feature) => sum + (feature.credits || 0), 0);
    const totalCreditsNeeded = requiredCredits + featureCredits;
    
    if (balance < totalCreditsNeeded) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${totalCreditsNeeded} credits (${requiredCredits} for listing + ${featureCredits} for features) but only have ${balance}. Would you like to buy more credits?`,
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
      // First, deduct ALL credits (listing fee + features)
      const result = await spendCredits(totalCreditsNeeded, `Listing fee (${requiredCredits}) + Features (${featureCredits})`, {
        referenceType: 'listing_creation',
        features: selectedFeatures.map(f => ({ key: f.key, name: f.name, credits: f.credits })),
      });
      
      if (result.success) {
        setShowPaymentModal(false);
        
        // Try to create the listing
        try {
          await createListing();
          // Success! Credits were spent and listing was created with features applied
        } catch (listingError) {
          // Listing creation failed - refund ALL the credits
          console.log('🔄 Listing creation failed after payment, refunding credits...');
          console.log(`Listing fee: ${requiredCredits} credits`);
          console.log(`Feature credits: ${featureCredits} credits`);
          console.log(`Total refunding: ${totalCreditsNeeded} credits`);
          
          await refundAllCredits(requiredCredits, 'listing_creation_failed', listingError);
          
          // Re-throw the error to prevent further processing
          throw listingError;
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Payment/listing error:', error);
      // Error already handled above, just log it
    }
  };

  // Comprehensive refund function for any listing creation failure
  const refundAllCredits = async (
    listingFeeCredits: number,
    reason: string,
    error: any
  ) => {
    try {
      // Calculate total credits to refund (listing fee + selected features)
      const featureCredits = selectedFeatures.reduce((sum, feature) => sum + (feature.credits || 0), 0);
      const totalCreditsToRefund = listingFeeCredits + featureCredits;
      
      console.log(`Refunding ${totalCreditsToRefund} credits (${listingFeeCredits} listing fee + ${featureCredits} features)`);
      
      // Get current balance for transaction record
      const { data: userCredits } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user!.id)
        .single();
      
      const currentBalance = userCredits?.balance || 0;
      
      // Create refund transaction
      const { error: refundError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: user!.id,
          amount: totalCreditsToRefund,
          type: 'refunded',
          balance_before: currentBalance,
          balance_after: currentBalance + totalCreditsToRefund,
          reference_type: 'listing_creation',
          metadata: {
            description: `Refund for failed listing creation (${listingFeeCredits} listing fee + ${featureCredits} features)`,
            reason,
            listing_fee: listingFeeCredits,
            features: selectedFeatures.map(f => ({ key: f.key, name: f.name, credits: f.credits })),
            total_refunded: totalCreditsToRefund,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        });
      
      if (refundError) {
        console.error('Failed to create refund transaction:', refundError);
        Alert.alert(
          'Error',
          'Listing creation failed and we could not automatically refund your credits. Please contact support with this error.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Use RPC to increment the balance atomically
      const { error: updateError } = await supabase.rpc('increment_field', {
        table_name: 'user_credits',
        field_name: 'balance',
        increment_by: totalCreditsToRefund,
        match_column: 'user_id',
        match_value: user!.id,
      });
      
      if (updateError) {
        console.error('Failed to update balance:', updateError);
      }
      
      // Refresh the balance to show the refunded credits
      await refreshCredits();
      
      // Show user-friendly alert
      const featuresList = selectedFeatures.length > 0 
        ? `\n\nFeatures refunded:\n${selectedFeatures.map(f => `• ${f.name} (${f.credits} credits)`).join('\n')}`
        : '';
      
      Alert.alert(
        'Listing Failed',
        `We couldn't create your listing. Your ${totalCreditsToRefund} credits have been refunded.${featuresList}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
    } catch (refundError) {
      console.error('Refund process error:', refundError);
      Alert.alert(
        'Error',
        'Listing creation failed. Please contact support to restore your credits.',
        [{ text: 'OK' }]
      );
    }
  };

  // Fetch selected category details
  useEffect(() => {
    if (formData.categoryId) {
      findCategoryByIdUtil(formData.categoryId).then(setSelectedCategory);
    } else {
      setSelectedCategory(null);
    }
  }, [formData.categoryId]);

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



  const handleCategorySelect = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      console.warn('handleCategorySelect called with empty categoryId');
      return;
    }
    
    // Clear category attributes when category changes
    updateFormData({ categoryId, categoryAttributes: {} });
    
    // Fetch category attributes from database for validation
    try {
      const { data, error } = await supabase
        .rpc('get_category_attributes', { p_category_id: categoryId });
      
      if (!error && data) {
        setCategoryAttributes(Array.isArray(data) ? data : []);
      } else {
        console.warn('No category attributes found or error:', error);
        setCategoryAttributes([]);
      }
    } catch (error) {
      console.error('Error fetching category attributes:', error);
      setCategoryAttributes([]);
    }
  }, [updateFormData]);

  const handleCategoryAttributeChange = useCallback((slug: string, value: any) => {
    updateFormData({ 
      categoryAttributes: { 
        ...(formData.categoryAttributes || {}), 
        [slug]: value 
      } 
    });
  }, [updateFormData, formData.categoryAttributes]);

  const handleLocationSelect = useCallback((location: string) => {
    updateFormData({ location });
  }, [updateFormData]);

  // Condition is now handled via category attributes, not separately

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
  // PhotosStep merged into BasicInfoStep

  const BasicInfoStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{
            backgroundColor: theme.colors.success + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.sm,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, padding: theme.spacing.sm }}>
              <Text variant="bodySmall" style={{ color: theme.colors.text.secondary }}>
                Great photos & details get 5x more views!
              </Text>
              <TouchableOpacity
                onPress={() => setShowListingTipsModal(true)}
                style={{
                  paddingHorizontal: theme.spacing.xs,
                  paddingVertical: 2,
                  borderWidth: 2,
                  borderColor: theme.colors.success + '30',
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.success + '10',
                }}
              >
                <Text 
                  variant="caption" 
                  style={{ color: theme.colors.success, fontWeight: '600' }}>
                  Learn More
                </Text>
              </TouchableOpacity>
            </View>
          </View>
      {/* Photos & Videos Section */}
      <View>
        <CustomImagePicker
          limit={8}
          value={formData.images}
          onChange={handleImagesChange}
          disabled={loading}
          title={hasBusinessPlan() ? "Upload Photos & Video *" : "Upload Photo(s) *"}
          allowVideos={true}
          maxVideoDuration={30}
          isSellarPro={hasBusinessPlan()}
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
              {hasBusinessPlan() ? "📸 At least one photo or video is required" : "📸 At least one photo is required"}
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
            label="Title *"
            placeholder="e.g. Samsung Galaxy Note 20"
            value={formData.title}
            onChangeText={handleTitleChange}
            helper={validationResults[0]?.warnings.title || "Be descriptive and specific (min. 10 characters)"}
            error={validationResults[0]?.errors.title}
          />

          <Input
            variant="multiline"
            label="Describe your item *"
            placeholder="Describe your item in detail..."
            value={formData.description}
            onChangeText={handleDescriptionChange}
            helper={validationResults[0]?.warnings.description || "Include condition, age, reason for selling, etc. (min. 20 characters)"}
            containerStyle={{ minHeight: 120 }}
            error={validationResults[0]?.errors.description}
          />

        </View>
      </View>
    </View>
  ), [formData.images, formData.title, formData.description, loading, uploadProgress, validationResults, theme, handleImagesChange, handleTitleChange, handleDescriptionChange]);

  const CategoryStep = useMemo(() => {
    return (
      <View style={{ gap: theme.spacing.lg }}>
        <View>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Category *
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
            errors={validationResults[1]?.errors || {}}
          />
        )}

        <View>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Location *
          </Text>
          <LocationPicker
            value={formData.location}
            onLocationSelect={handleLocationSelect}
            placeholder="Select your location"
            showAllOptions={false}
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
              label="Price (GH₵) *"
              placeholder="0.00"
              value={formData.price}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
              helper={validationResults[2]?.warnings.price || "Set a competitive price"}
              error={validationResults[2]?.errors.price}
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

  // DetailsStep merged into CategoryStep above



  // Helper function to format condition for display
  const formatCondition = (condition: string | string[]): string => {
    const conditionValue = Array.isArray(condition) ? condition[0] : condition;
    const conditionLabels: Record<string, string> = {
      'new': 'New',
      'brand_new': 'Brand New',
      'like_new': 'Like New',
      'good': 'Good',
      'fair': 'Fair',
      'poor': 'Poor',
      'foreign_used': 'Foreign Used',
      'locally_used': 'Locally Used',
    };
    return conditionLabels[conditionValue] || conditionValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const ReviewStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>

      {/* Preview Header */}
      <View style={{ marginBottom: theme.spacing.md }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
          Preview your listing
        </Text>
        <Text variant="body" color="secondary">
          This is how your listing will appear to buyers
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
              Condition: {formatCondition(formData.categoryAttributes.condition)}
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

      {/* Smart Feature Boost Section */}
      {hasBusinessPlan() ? (
        // Sellar Pro Users - Auto-refresh benefits
        <View style={{
          backgroundColor: theme.colors.success + '10',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.success + '30',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.success,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: theme.spacing.md,
            }}>
              <Text style={{ fontSize: 20 }}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.xs, color: theme.colors.success }}>
                Sellar Pro Auto-Boost
              </Text>
              <Text variant="body" color="secondary">
                Your listing will automatically stay at the top
              </Text>
            </View>
          </View>

          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <Text style={{ fontSize: 16, marginRight: theme.spacing.sm }}>🔄</Text>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Auto-Refresh Every 2 Hours
              </Text>
            </View>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
              • Your listing automatically moves to the top every 2 hours
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
              • Maximum visibility without manual intervention
            </Text>
            <Text variant="bodySmall" color="secondary">
              • Works 24/7 to keep your listing prominent
            </Text>
          </View>

          <View style={{
            backgroundColor: theme.colors.success + '20',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.success + '40',
          }}>
            <Text variant="bodySmall" style={{ color: theme.colors.success, textAlign: 'center', fontWeight: '600' }}>
              🎉 Your listing will automatically stay at the top - no manual boosting needed!
            </Text>
          </View>
        </View>
      ) : (
        // Free Users - Manual feature selection
        <View style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.primary + '30',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: theme.spacing.md,
            }}>
              <Text style={{ fontSize: 20 }}>🚀</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.xs }}>
                Boost Your Listing
              </Text>
              <Text variant="body" color="secondary">
                Get more views and sell faster with premium features
              </Text>
            </View>
          </View>

          {selectedFeatures.length > 0 ? (
            <View>
              {/* Summary Header */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: theme.spacing.md,
              }}>
                <Text variant="body" style={{ color: theme.colors.success, fontWeight: '600' }}>
                  ✅ {selectedFeatures.length} Feature{selectedFeatures.length > 1 ? 's' : ''} Applied
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  {selectedFeatures.reduce((sum, f) => sum + f.credits, 0)} Credits
                </Text>
              </View>

              {/* Feature Cards */}
              <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
                {selectedFeatures.map((feature) => (
                  <View
                    key={feature.key}
                    style={{
                      backgroundColor: theme.colors.primary + '10',
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                      borderWidth: 1,
                      borderColor: theme.colors.primary + '30',
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                          {feature.name}
                        </Text>
                        <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
                          {feature.description}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                          <Badge text={feature.duration} variant="neutral" size="xs" />
                          <Badge text={`${feature.credits} credits`} variant="primary" size="xs" />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => setShowFeatureSelector(true)}
                  style={{ flex: 1 }}
                >
                  Modify Features
                </Button>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => setSelectedFeatures([])}
                  style={{ flex: 1 }}
                >
                  Remove All
                </Button>
              </View>
            </View>
          ) : (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <Text variant="body" color="secondary" style={{ flex: 1 }}>
                  Available Credits: 
                </Text>
                <Text variant="h4" color="primary">
                  {balance.toLocaleString()}
                </Text>
              </View>
              
              <View style={{
                backgroundColor: theme.colors.warning + '10',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.sm,
                marginBottom: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.warning + '30',
              }}>
                <Text variant="bodySmall" style={{ color: theme.colors.warning, textAlign: 'center' }}>
                  💡 Upgrade to Sellar Pro for automatic listing refresh every 2 hours!
                </Text>
              </View>
              
              <Button
                variant="primary"
                onPress={() => setShowFeatureSelector(true)}
                leftIcon={<Text style={{ fontSize: 16 }}>⚡</Text>}
              >
                Add Features to Boost Visibility
              </Button>
            </View>
          )}
        </View>
      )}

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
          <Text variant="bodySmall" style={{ color: theme.colors.warning, marginBottom: theme.spacing.sm }}>
            Your balance: {balance} credits
          </Text>
          <View style={{
            backgroundColor: theme.colors.primary + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.primary + '30',
          }}>
            <Text variant="bodySmall" style={{ color: theme.colors.primary, textAlign: 'center', fontWeight: '600' }}>
              💡 Upgrade to Sellar Pro for unlimited listings + auto-refresh every 2 hours!
            </Text>
          </View>
        </View>
      )}
    </View>
  ), [formData, selectedCategory, theme, hasUnlimitedListings, userListingsCount, getMaxListings, balance]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return BasicInfoStep; // Photos + Title + Description
      case 1: return CategoryStep; // Category + Location + Price + Quantity
      case 2: return ReviewStep;
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
          const hasContent = formData.title?.trim() || formData.description?.trim() || formData.images.length > 0;
          if (hasContent) {
            setShowExitModal(true);
          } else {
            router.back();
          }
        }}
        rightActions={[
          // Autosave Indicator - Only shows "Saved"
          <Animated.View
            key="autosave-indicator"
            style={{
              opacity: autosaveOpacity,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.success,
              marginRight: theme.spacing.sm,
            }}
          >
            <CheckCircle size={12} color="#555" style={{ marginRight: theme.spacing.xs }} />
            <Text variant="caption" style={{ color: '#555', fontWeight: '600', fontSize: 11 }}>
              Saved
            </Text>
          </Animated.View>,
          // Step Indicator
          <View
            key="step-indicator"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            <View style={{
              backgroundColor: theme.colors.primary + '15',
              borderRadius: theme.borderRadius.full,
              gap: theme.spacing.sm,
              width: 32,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                {currentStep + 1}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>
              {STEPS[currentStep].title}
            </Text>
          </View>
        ]}
      />


      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >



        {/* Step Content */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: theme.spacing.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={{ flex: 1, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm }}>
            {renderStepContent()}
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.surface }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            gap: theme.spacing.md,
          }}>
            <Button
              variant="outline"
              onPress={currentStep === 0 ? () => router.back() : previousStep}
              disabled={loading}
              icon={currentStep === 0 ? undefined : <ArrowLeft size={18} color={theme.colors.text.primary} />}
              style={{ flex: 1, borderColor: theme.colors.error}}
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
        </SafeAreaView>
      </KeyboardAvoidingView>

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
          text: 'Upgrade to Sellar Pro',
          onPress: () => {
            setShowPaymentModal(false);
            try {
              router.push('/subscription-plans');
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
              <Text variant="bodySmall" style={{ color: theme.colors.error, textAlign: 'center', marginBottom: theme.spacing.sm }}>
                ⚠️ You need {10 - balance} more credits to create this listing
              </Text>
              <View style={{
                backgroundColor: theme.colors.primary + '10',
                borderRadius: theme.borderRadius.sm,
                padding: theme.spacing.sm,
                borderWidth: 1,
                borderColor: theme.colors.primary + '30',
              }}>
                <Text variant="bodySmall" style={{ color: theme.colors.primary, textAlign: 'center', fontWeight: '600' }}>
                  💡 Or upgrade to Sellar Pro for unlimited listings + auto-refresh every 2 hours!
                </Text>
              </View>
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

      {/* Feature Selector Modal */}
      <ListingFeatureSelector
        visible={showFeatureSelector}
        onClose={() => setShowFeatureSelector(false)}
        onFeaturesSelected={handleFeaturesSelected}
        listingTitle={formData.title || 'your listing'}
      />

      {/* Listing Tips Modal */}
      <AppModal
        visible={showListingTipsModal}
        onClose={() => setShowListingTipsModal(false)}
        title="Get 5x More Views"
        size="lg"
        position='bottom'
      >
        <ScrollView 
          style={{ maxHeight: 500 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: theme.spacing.md }}>
            {/* Introduction */}
            <Text variant="bodySmall" color="secondary" style={{ lineHeight: 20 }}>
              Follow these proven tips to make your listing stand out and attract more buyers
            </Text>

            {/* Photos Section */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.primary + '15',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: theme.spacing.sm,
                }}>
                  <Text style={{ fontSize: 20 }}>📸</Text>
                </View>
                <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>
                  High-Quality Photos
                </Text>
              </View>
              <View style={{ gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.primary,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Use natural lighting - take photos near windows or outdoors
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.primary,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Show multiple angles - front, back, sides, and close-ups
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.primary,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Clean background - remove clutter to make item stand out
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.primary,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Include defects - show any scratches or wear honestly
                  </Text>
                </View>
              </View>
            </View>

            {/* Title Section */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.success + '15',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: theme.spacing.sm,
                }}>
                  <Text style={{ fontSize: 20 }}>✍️</Text>
                </View>
                <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>
                  Clear, Descriptive Title
                </Text>
              </View>
              <View style={{ gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.success,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Include brand, model, and key features
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.success,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Mention condition (e.g., "Like New", "Gently Used")
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.success,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Add size, color, or year if relevant
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.success,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Keep it concise - 50-70 characters is ideal
                  </Text>
                </View>
              </View>
            </View>

            {/* Description Section */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.info + '15',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: theme.spacing.sm,
                }}>
                  <Text style={{ fontSize: 20 }}>📝</Text>
                </View>
                <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>
                  Detailed Description
                </Text>
              </View>
              <View style={{ gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.info,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Explain why you're selling and how long you've owned it
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.info,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    List what's included (accessories, box, warranty)
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.info,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Mention any issues or repairs honestly
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.info,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Add your location and delivery options
                  </Text>
                </View>
              </View>
            </View>

            {/* Pricing Section */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.warning + '15',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: theme.spacing.sm,
                }}>
                  <Text style={{ fontSize: 20 }}>💰</Text>
                </View>
                  <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>
                  Competitive Pricing
                </Text>
              </View>
              <View style={{ gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.warning,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Research similar items on Sellar to price competitively
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.warning,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Consider condition, age, and market demand
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.warning,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Enable "Accept Offers" to attract more buyers
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.warning,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Price slightly higher if you're open to negotiation
                  </Text>
                </View>
              </View>
            </View>

            {/* Response Time Section */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.error + '15',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: theme.spacing.sm,
                }}>
                  <Text style={{ fontSize: 20 }}>⚡</Text>
                </View>
                <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>
                  Quick Responses
                </Text>
              </View>
              <View style={{ gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.error,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Reply to messages within 24 hours
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.error,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Be polite and professional in all communications
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.error,
                    marginTop: 6,
                    marginRight: theme.spacing.sm,
                  }} />
                  <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 20 }}>
                    Answer questions honestly and thoroughly
                  </Text>
                </View>
              </View>
            </View>

            {/* Success Banner */}
            <View style={{
              backgroundColor: theme.colors.success + '10',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.success + '30',
             
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.success + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: theme.spacing.sm,
                }}>
                  <Text style={{ fontSize: 16 }}>🎯</Text>
                </View>
                <Text variant="body" style={{ color: theme.colors.success, fontWeight: '700' }}>
                  Pro Tip
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.success, lineHeight: 20 }}>
                Listings with 5+ photos, detailed descriptions, and competitive pricing get <Text style={{ fontWeight: '700' }}>5x more views</Text> and sell <Text style={{ fontWeight: '700' }}>3x faster</Text>!
              </Text>
            </View>
          </View>
        </ScrollView>
      </AppModal>

      {/* Draft Found Modal */}
      <AppModal
        visible={showDraftModal}
        onClose={() => {
          setShowDraftModal(false);
          setDraftData(null);
          setHasShownDraftAlert(false);
        }}
        title="Draft Found"
        size="sm"
      >
        <View style={{ padding: theme.spacing.lg }}>
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.xl }}>
            You have an unsaved draft. Would you like to continue where you left off?
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            <Button
              variant="primary"
              onPress={() => {
                if (draftData) {
                  setFormData(draftData);
                }
                setShowDraftModal(false);
                setDraftData(null);
              }}
            >
              Continue Editing
            </Button>
            
            <Button
              variant="outline"
              style={{
                borderColor: theme.colors.primary,
              }}
              onPress={() => {
                clearDraft();
                setShowDraftModal(false);
                setDraftData(null);
                setHasShownDraftAlert(false);
              }}
            >
              Start Fresh
            </Button>
          </View>
        </View>
      </AppModal>

      {/* Exit Confirmation Modal */}
      <AppModal
        visible={showExitModal}
        onClose={() => setShowExitModal(false)}
        title={hasUnsavedChanges ? 'Unsaved Changes' : 'Draft Saved'}
        size="sm"
      >
        <View style={{ padding: theme.spacing.lg }}>
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.xl }}>
            {hasUnsavedChanges 
              ? 'You have unsaved changes. Would you like to save them as a draft before leaving?'
              : 'Your draft has been saved. Would you like to keep it or discard it?'}
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            <Button
              variant="primary"
              onPress={() => {
                if (hasUnsavedChanges) {
                  saveDraft(formData, true);
                }
                setShowExitModal(false);
                router.back();
              }}
            >
              {hasUnsavedChanges ? 'Save Draft' : 'Keep Draft'}
            </Button>
            
            <Button
              variant="outline"
              style={{
                borderColor: theme.colors.error,
              }}
              onPress={() => {
                clearDraft();
                setShowExitModal(false);
                router.back();
              }}
            >
              Discard
            </Button>
            
            <Button
                variant="outline"
              style={{
                borderColor: theme.colors.primary,
              }}
              onPress={() => setShowExitModal(false)}
            >
              Cancel
            </Button>
          </View>
        </View>
      </AppModal>

      {/* Feature Confirmation Modal */}
      <AppModal
        visible={showFeatureConfirmModal}
        onClose={() => setShowFeatureConfirmModal(false)}
        title="Confirm Features & Payment"
        size="lg"
      >
        <ScrollView 
          style={{ maxHeight: '80%' }}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ padding: theme.spacing.lg }}
        >
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
            {(() => {
              const maxListings = getMaxListings();
              const needsCredits = !hasUnlimitedListings() && userListingsCount >= maxListings;
              
              if (needsCredits && selectedFeatures.length > 0) {
                return "You've reached your listing limit and are applying features. Here's the breakdown:";
              } else if (selectedFeatures.length > 0) {
                return "You're about to apply the following features to your listing:";
              }
              return "";
            })()}
          </Text>
          
          {/* Cost Breakdown */}
          <View style={{ 
            backgroundColor: theme.colors.surface, 
            borderRadius: theme.borderRadius.md, 
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            gap: theme.spacing.sm,
          }}>
            {/* Additional Listing Fee (if needed) */}
            {(() => {
              const maxListings = getMaxListings();
              const needsCredits = !hasUnlimitedListings() && userListingsCount >= maxListings;
              
              if (needsCredits) {
                return (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: theme.spacing.sm,
                      borderBottomWidth: selectedFeatures.length > 0 ? 1 : 0,
                      borderBottomColor: theme.colors.border + '30',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="body" style={{ fontWeight: '600', marginBottom: 2 }}>
                        Additional Listing Fee
                      </Text>
                      <Text variant="caption" color="secondary">
                        You've reached your {maxListings} listing limit
                      </Text>
                    </View>
                    <Badge text="5 credits" variant="warning" size="sm" />
                  </View>
                );
              }
              return null;
            })()}
            
            {/* Feature List */}
            {selectedFeatures.map((feature, index) => (
              <View
                key={feature.key}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  borderBottomWidth: index < selectedFeatures.length - 1 ? 1 : 0,
                  borderBottomColor: theme.colors.border + '30',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600', marginBottom: 2 }}>
                    {feature.name}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {feature.duration}
                  </Text>
                </View>
                <Badge text={`${feature.credits} credits`} variant="primary" size="sm" />
              </View>
            ))}
          </View>
          
          {/* Total Cost */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: theme.spacing.md,
            borderTopWidth: 2,
            borderTopColor: theme.colors.border,
            marginBottom: theme.spacing.xl,
          }}>
            <Text variant="h4">Total Cost</Text>
            <Text variant="h3" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {(() => {
                const maxListings = getMaxListings();
                const needsCredits = !hasUnlimitedListings() && userListingsCount >= maxListings;
                const featureCredits = selectedFeatures.reduce((sum, f) => sum + f.credits, 0);
                const listingFee = needsCredits ? 5 : 0;
                return featureCredits + listingFee;
              })()} Credits
            </Text>
          </View>
          
          <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.xl, lineHeight: 18 }}>
            💡 {(() => {
              const maxListings = getMaxListings();
              const needsCredits = !hasUnlimitedListings() && userListingsCount >= maxListings;
              
              if (needsCredits) {
                return "Credits will be deducted for both the additional listing slot and selected features after publishing.";
              }
              return "These features will be applied immediately after your listing is published. Credits will be deducted from your account.";
            })()}
          </Text>
          
          {/* Action Buttons */}
          <View style={{ gap: theme.spacing.md }}>
            <Button
              variant="primary"
              onPress={() => {
                setShowFeatureConfirmModal(false);
                proceedWithPublish();
              }}
            >
              Confirm & Publish
            </Button>
            
            <Button
              variant="outline"
              style={{
                borderColor: theme.colors.primary,
              }}
              onPress={() => setShowFeatureConfirmModal(false)}
            >
              Cancel
            </Button>
          </View>
        </ScrollView>
      </AppModal>

    </SafeAreaWrapper>
  );
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CreateListingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CreateListing Error Boundary caught an error:', error);
    console.error('Error info:', errorInfo);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaWrapper>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text variant="h3" style={{ marginBottom: 16, textAlign: 'center' }}>
              Something went wrong
            </Text>
            <Text variant="body" color="secondary" style={{ marginBottom: 24, textAlign: 'center' }}>
              We encountered an error while creating your listing. Please try again.
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: 24, textAlign: 'center', fontFamily: 'monospace' }}>
              {this.state.error?.message}
            </Text>
            <Button
              variant="primary"
              onPress={() => {
                this.setState({ hasError: false, error: null });
                router.replace('/(tabs)/create');
              }}
            >
              Try Again
            </Button>
            <Button
              variant="secondary"
              onPress={() => router.replace('/(tabs)/home')}
              style={{ marginTop: 12 }}
            >
              Go to Home
            </Button>
          </View>
        </SafeAreaWrapper>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component
export default function CreateListingScreenWithErrorBoundary() {
  return (
    <CreateListingErrorBoundary>
      <CreateListingScreen />
    </CreateListingErrorBoundary>
  );
}
