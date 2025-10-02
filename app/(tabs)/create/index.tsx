import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, ScrollView, Alert, Pressable, BackHandler, Image, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
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

const CONDITIONS = [
  { value: 'new', label: 'Brand New', description: 'Never used, in original packaging' },
  { value: 'like_new', label: 'Like New', description: 'Barely used, excellent condition' },
  { value: 'good', label: 'Good', description: 'Used but well maintained' },
  { value: 'fair', label: 'Fair', description: 'Shows wear but fully functional' },
  { value: 'poor', label: 'Poor', description: 'Significant wear, may need repairs' },
];

export default function CreateListingScreen() {
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
  
  // Feature selector state
  const [showFeatureSelector, setShowFeatureSelector] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>([]);
  
  // Validation state
  const [validationResults, setValidationResults] = useState<Record<number, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);
  
  // Performance optimization refs
  const debouncedValidator = useRef(createDebouncedValidator(300));
  const formDataRef = useRef(formData);
  
  // Autosave state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [hasShownDraftAlert, setHasShownDraftAlert] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AUTOSAVE_KEY = useMemo(() => `listing_draft_${user?.id || 'anonymous'}`, [user?.id]);

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
        const draftData = JSON.parse(savedDraft);
        // Only load if it's not empty and we haven't shown the alert yet
        if (draftData.title || draftData.description || draftData.images?.length > 0) {
          setHasShownDraftAlert(true);
          Alert.alert(
            'Draft Found',
            'You have an unsaved draft. Would you like to continue where you left off?',
            [
              { text: 'Start Fresh', onPress: () => {
                clearDraft();
                setHasShownDraftAlert(false);
              }, style: 'destructive' },
              { text: 'Continue', onPress: () => setFormData(draftData) },
            ]
          );
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
  const saveDraft = useCallback(async (data: ListingFormData, isManualSave = false) => {
    try {
      setIsAutoSaving(true);
      
      console.log('💾 Saving draft - currentDraftId:', currentDraftId, 'isManualSave:', isManualSave);
      
      // Save to AsyncStorage for local persistence
      await AsyncStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      
      // Only save to database if we have meaningful content
      if (data.title?.trim() || data.description?.trim() || data.images?.length > 0) {
        // CategoryId from CategoryPicker is already a valid UUID
        const categoryUUID = data.categoryId || null;

        const draftData: any = {
          user_id: user!.id,
          title: data.title?.trim() || 'Untitled Draft',
          description: data.description?.trim() || '',
          price: data.price ? Number(data.price) : 0,
          currency: 'GHS',
          category_id: categoryUUID,
          condition: data.condition || 'good',
          quantity: data.quantity || 1,
          location: data.location || '',
          images: data.images?.map(img => img.uri) || [],
          accept_offers: data.acceptOffers || true,
          status: 'draft'
        };
        
        // Only add attributes if they exist
        if (data.categoryAttributes && Object.keys(data.categoryAttributes).length > 0) {
          draftData.attributes = data.categoryAttributes;
        }

        // Check if we already have a draft for this session
        if (currentDraftId) {
          console.log('Attempting to update existing draft with minimal fields to avoid trigger issues');
          
          // Try updating only the essential fields that shouldn't trigger the problematic function
          const minimalUpdateData = {
            title: draftData.title,
            description: draftData.description,
            price: draftData.price,
            location: draftData.location,
            images: draftData.images,
            updated_at: new Date().toISOString()
          };
          
          const { error: updateError } = await supabase
            .from('listings')
            .update(minimalUpdateData)
            .eq('id', currentDraftId);

          if (updateError) {
            console.log('Minimal update failed, trying alternative approach:', updateError.message);
            
            // If minimal update fails, try updating without the problematic fields
            const { error: simpleUpdateError } = await supabase
              .from('listings')
              .update({
                title: draftData.title,
                description: draftData.description,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentDraftId);
              
            if (simpleUpdateError) {
              console.log('Simple update also failed, creating new draft:', simpleUpdateError.message);
              
              // Last resort: create new draft and let the old one exist
              const { data: newDraft, error: insertError } = await supabase
                .from('listings')
                .insert(draftData)
                .select('id')
                .single();

              if (insertError) {
                console.error('Failed to create new draft:', insertError);
              } else if (newDraft) {
                console.log('Created new draft with ID:', newDraft.id, '(keeping old:', currentDraftId, ')');
                setCurrentDraftId(newDraft.id);
              }
            } else {
              console.log('Simple update succeeded, keeping same draft ID:', currentDraftId);
            }
          } else {
            console.log('Minimal update succeeded, keeping same draft ID:', currentDraftId);
          }
        } else {
          // Create new draft only if none exists
          console.log('Creating new draft (no existing draft found)');
          const { data: newDraft, error } = await supabase
            .from('listings')
            .insert(draftData)
            .select('id')
            .single();

          if (error) {
            console.error('Failed to create draft:', error);
          } else if (newDraft) {
            console.log('Created new draft with ID:', newDraft.id);
            setCurrentDraftId(newDraft.id);
          }
        }
      }
      
      setHasUnsavedChanges(false);
      
      // Show success message only for manual saves
      if (isManualSave) {
        Alert.alert('Draft Saved', 'Your listing has been saved as a draft. You can continue editing it later from My Listings.');
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsAutoSaving(false);
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
        condition: '',
        quantity: 1,
        location: '',
        images: [],
        acceptOffers: true,
        categoryAttributes: {},
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
          const message = hasUnsavedChanges 
            ? 'You have unsaved changes. Would you like to save them as a draft before leaving?'
            : 'Your draft has been saved. Would you like to keep it or discard it?';
            
          Alert.alert(
            hasUnsavedChanges ? 'Unsaved Changes' : 'Draft Found',
            message,
            [
              { text: 'Discard', onPress: () => { 
                clearDraft(); 
                router.back(); 
              }, style: 'destructive' },
              { text: hasUnsavedChanges ? 'Save Draft' : 'Keep Draft', onPress: () => { 
                if (hasUnsavedChanges) {
                  saveDraft(formData, true);
                }
                router.back(); 
              }},
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          return true;
        }
        // If no content, just navigate back
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [hasUnsavedChanges, formData, saveDraft, clearDraft])
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
      
      // Set new timeout for autosave
      autosaveTimeoutRef.current = setTimeout(() => {
        const currentData = formDataRef.current;
        saveDraft(currentData, false); // false = autosave, not manual save
      }, 2000) as any;
      
      // Debounced validation with proper async handling
      setIsValidating(true);
      debouncedValidator.current(currentStep, formDataRef.current, (result) => {
        // Use startTransition to avoid scheduling updates during render
        React.startTransition(() => {
          setValidationResults(prev => ({ ...prev, [currentStep]: result }));
          setIsValidating(false);
        });
      });
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
      // CategoryId from CategoryPicker is already a valid UUID, no mapping needed
      const categoryUUID = formData.categoryId;
      
      /* OLD HARDCODED MAPPING - NO LONGER NEEDED
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
        
        // Electronics detailed subcategories
        'phones-tablets': '00000000-0000-4000-8000-000000000001',
        'feature-phones': '00000000-0000-4000-8000-000000000001',
        'tablets': '00000000-0000-4000-8000-000000000001',
        'phone-accessories': '00000000-0000-4000-8000-000000000001',
        'smartwatches': '00000000-0000-4000-8000-000000000001',
        'desktops': '00000000-0000-4000-8000-000000000001',
        'computer-accessories': '00000000-0000-4000-8000-000000000001',
        'software': '00000000-0000-4000-8000-000000000001',
        'headphones-earphones': '00000000-0000-4000-8000-000000000001',
        'speakers': '00000000-0000-4000-8000-000000000001',
        'tv-monitors': '00000000-0000-4000-8000-000000000001',
        'video-games': '00000000-0000-4000-8000-000000000001',
        'gaming-accessories': '00000000-0000-4000-8000-000000000001',
        'kitchen-appliances': '00000000-0000-4000-8000-000000000001',
        'cleaning-appliances': '00000000-0000-4000-8000-000000000001',
        'air-conditioning': '00000000-0000-4000-8000-000000000001',
        
        // Fashion subcategories
        'clothing': '00000000-0000-4000-8000-000000000002',
        'shoes': '00000000-0000-4000-8000-000000000002',
        'bags': '00000000-0000-4000-8000-000000000002',
        'jewelry': '00000000-0000-4000-8000-000000000002',
        'watches': '00000000-0000-4000-8000-000000000002',
        
        // Fashion detailed subcategories
        'mens-fashion': '00000000-0000-4000-8000-000000000002',
        'womens-fashion': '00000000-0000-4000-8000-000000000002',
        'kids-fashion': '00000000-0000-4000-8000-000000000002',
        'mens-clothing': '00000000-0000-4000-8000-000000000002',
        'womens-clothing': '00000000-0000-4000-8000-000000000002',
        'boys-clothing': '00000000-0000-4000-8000-000000000002',
        'girls-clothing': '00000000-0000-4000-8000-000000000002',
        'mens-shoes': '00000000-0000-4000-8000-000000000002',
        'womens-shoes': '00000000-0000-4000-8000-000000000002',
        'kids-shoes': '00000000-0000-4000-8000-000000000002',
        'mens-accessories': '00000000-0000-4000-8000-000000000002',
        'womens-accessories': '00000000-0000-4000-8000-000000000002',
        'bags-handbags': '00000000-0000-4000-8000-000000000002',
        
        // Vehicles subcategories
        'cars': '00000000-0000-4000-8000-000000000003',
        'motorcycles': '00000000-0000-4000-8000-000000000003',
        'bicycles': '00000000-0000-4000-8000-000000000003',
        'parts': '00000000-0000-4000-8000-000000000003',
        
        // Vehicles detailed subcategories
        'sedans': '00000000-0000-4000-8000-000000000003',
        'suvs': '00000000-0000-4000-8000-000000000003',
        'hatchbacks': '00000000-0000-4000-8000-000000000003',
        'luxury-cars': '00000000-0000-4000-8000-000000000003',
        'sport-bikes': '00000000-0000-4000-8000-000000000003',
        'cruiser-bikes': '00000000-0000-4000-8000-000000000003',
        'scooters': '00000000-0000-4000-8000-000000000003',
        'auto-parts': '00000000-0000-4000-8000-000000000003',
        'car-parts': '00000000-0000-4000-8000-000000000003',
        'car-accessories': '00000000-0000-4000-8000-000000000003',
        'tires-wheels': '00000000-0000-4000-8000-000000000003',
        
        // Home & Garden subcategories
        'furniture': '00000000-0000-4000-8000-000000000004',
        'appliances': '00000000-0000-4000-8000-000000000004',
        'decor': '00000000-0000-4000-8000-000000000004',
        'garden': '00000000-0000-4000-8000-000000000004',
        'tools': '00000000-0000-4000-8000-000000000004',
        
        // Home & Garden detailed subcategories
        'home-decor': '00000000-0000-4000-8000-000000000004',
        'wall-art': '00000000-0000-4000-8000-000000000004',
        'lighting': '00000000-0000-4000-8000-000000000004',
        'rugs-carpets': '00000000-0000-4000-8000-000000000004',
        'plants': '00000000-0000-4000-8000-000000000004',
        'garden-tools': '00000000-0000-4000-8000-000000000004',
        'outdoor-furniture': '00000000-0000-4000-8000-000000000004',
        
        // Furniture subcategories (missing ones that were causing the error)
        'living-room': '00000000-0000-4000-8000-000000000004',
        'bedroom': '00000000-0000-4000-8000-000000000004',
        'dining-room': '00000000-0000-4000-8000-000000000004',
        'office-furniture': '00000000-0000-4000-8000-000000000004',
        'kitchen-furniture': '00000000-0000-4000-8000-000000000004',
        
        // Health & Sports subcategories
        'fitness': '00000000-0000-4000-8000-000000000005',
        'sports': '00000000-0000-4000-8000-000000000005',
        'health': '00000000-0000-4000-8000-000000000005',
        'outdoor': '00000000-0000-4000-8000-000000000005',
        
        // Sports & Fitness detailed subcategories
        'sports-fitness': '00000000-0000-4000-8000-000000000005',
        'fitness-equipment': '00000000-0000-4000-8000-000000000005',
        'sports-equipment': '00000000-0000-4000-8000-000000000005',
        'weights': '00000000-0000-4000-8000-000000000005',
        'cardio-equipment': '00000000-0000-4000-8000-000000000005',
        'yoga-pilates': '00000000-0000-4000-8000-000000000005',
        'football': '00000000-0000-4000-8000-000000000005',
        'basketball': '00000000-0000-4000-8000-000000000005',
        'tennis': '00000000-0000-4000-8000-000000000005',
        
        // Business subcategories
        'office': '00000000-0000-4000-8000-000000000006',
        'industrial': '00000000-0000-4000-8000-000000000006',
        'agriculture': '00000000-0000-4000-8000-000000000006',
        
        // Business & Industrial detailed subcategories
        'business-industrial': '00000000-0000-4000-8000-000000000006',
        'office-equipment': '00000000-0000-4000-8000-000000000006',
        'industrial-equipment': '00000000-0000-4000-8000-000000000006',
        'restaurant-equipment': '00000000-0000-4000-8000-000000000006',
        'printers-scanners': '00000000-0000-4000-8000-000000000006',
        'office-supplies': '00000000-0000-4000-8000-000000000006',
        
        // Education subcategories
        'books': '00000000-0000-4000-8000-000000000007',
        'supplies': '00000000-0000-4000-8000-000000000007',
        'instruments': '00000000-0000-4000-8000-000000000007',
        
        // Books & Media detailed subcategories
        'books-media': '00000000-0000-4000-8000-000000000007',
        'textbooks': '00000000-0000-4000-8000-000000000007',
        'fiction': '00000000-0000-4000-8000-000000000007',
        'non-fiction': '00000000-0000-4000-8000-000000000007',
        'media': '00000000-0000-4000-8000-000000000007',
        'movies': '00000000-0000-4000-8000-000000000007',
        'music': '00000000-0000-4000-8000-000000000007',
        
        // Entertainment subcategories
        'games': '00000000-0000-4000-8000-000000000008',
        
        // Art & Crafts detailed subcategories
        'art-crafts': '00000000-0000-4000-8000-000000000008',
        'artwork': '00000000-0000-4000-8000-000000000008',
        'craft-supplies': '00000000-0000-4000-8000-000000000008',
        'handmade-items': '00000000-0000-4000-8000-000000000008',
        
        // Tickets & Events detailed subcategories
        'tickets-events': '00000000-0000-4000-8000-000000000008',
        'event-tickets': '00000000-0000-4000-8000-000000000008',
        'gift-vouchers': '00000000-0000-4000-8000-000000000008',
        'concerts': '00000000-0000-4000-8000-000000000008',
        'sports-tickets': '00000000-0000-4000-8000-000000000008',
        'theater-shows': '00000000-0000-4000-8000-000000000008',
        
        // Food subcategories
        'groceries': '00000000-0000-4000-8000-000000000009',
        'restaurant': '00000000-0000-4000-8000-000000000009',
        'catering': '00000000-0000-4000-8000-000000000009',
        
        // Food & Beverages detailed subcategories
        'food-beverages': '00000000-0000-4000-8000-000000000009',
        'local-food': '00000000-0000-4000-8000-000000000009',
        'beverages': '00000000-0000-4000-8000-000000000009',
        'specialty-foods': '00000000-0000-4000-8000-000000000009',
        
        // Services subcategories
        'professional': '00000000-0000-4000-8000-000000000010',
        'personal': '00000000-0000-4000-8000-000000000010',
        'maintenance': '00000000-0000-4000-8000-000000000010',
        'transport': '00000000-0000-4000-8000-000000000010',
        
        // Services detailed subcategories
        'professional-services': '00000000-0000-4000-8000-000000000010',
        'home-services': '00000000-0000-4000-8000-000000000010',
        'consulting': '00000000-0000-4000-8000-000000000010',
        'legal': '00000000-0000-4000-8000-000000000010',
        'accounting': '00000000-0000-4000-8000-000000000010',
        'cleaning': '00000000-0000-4000-8000-000000000010',
        'repairs': '00000000-0000-4000-8000-000000000010',
        'gardening-services': '00000000-0000-4000-8000-000000000010',
        
        // Baby & Kids detailed subcategories
        'baby-kids': '00000000-0000-4000-8000-000000000010',
        'baby-gear': '00000000-0000-4000-8000-000000000010',
        'toys-games': '00000000-0000-4000-8000-000000000010',
        'strollers': '00000000-0000-4000-8000-000000000010',
        'baby-furniture': '00000000-0000-4000-8000-000000000010',
        'feeding': '00000000-0000-4000-8000-000000000010',
        'educational-toys': '00000000-0000-4000-8000-000000000010',
        'outdoor-toys': '00000000-0000-4000-8000-000000000010',
        'board-games': '00000000-0000-4000-8000-000000000010',
        
        // Beauty & Health detailed subcategories
        'beauty-health': '00000000-0000-4000-8000-000000000010',
        'skincare': '00000000-0000-4000-8000-000000000010',
        'health-wellness': '00000000-0000-4000-8000-000000000010',
        'makeup': '00000000-0000-4000-8000-000000000010',
        'skincare-products': '00000000-0000-4000-8000-000000000010',
        'fragrances': '00000000-0000-4000-8000-000000000010',
        'supplements': '00000000-0000-4000-8000-000000000010',
        'medical-devices': '00000000-0000-4000-8000-000000000010',
        
        // Pets & Animals detailed subcategories
        'pets-animals': '00000000-0000-4000-8000-000000000010',
        'pet-supplies': '00000000-0000-4000-8000-000000000010',
        'pets-for-sale': '00000000-0000-4000-8000-000000000010',
        'dog-supplies': '00000000-0000-4000-8000-000000000010',
        'cat-supplies': '00000000-0000-4000-8000-000000000010',
        'pet-food': '00000000-0000-4000-8000-000000000010',
        'dogs': '00000000-0000-4000-8000-000000000010',
        'cats': '00000000-0000-4000-8000-000000000010',
        'birds': '00000000-0000-4000-8000-000000000010',
        'fish-aquarium': '00000000-0000-4000-8000-000000000010',
        
        // Other detailed subcategories
        'other': '00000000-0000-4000-8000-000000000000',
        'lost-found': '00000000-0000-4000-8000-000000000000',
        'miscellaneous': '00000000-0000-4000-8000-000000000000',
        'coins-stamps': '00000000-0000-4000-8000-000000000000',
        'vintage-items': '00000000-0000-4000-8000-000000000000',
        'memorabilia': '00000000-0000-4000-8000-000000000000',
      };
      */
      
      const listingData = {
        user_id: user!.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        price: Number(formData.price),
        currency: 'GHS',
        category_id: categoryUUID, // Use mapped category UUID
        condition: formData.categoryAttributes.condition || 'good', // Get from attributes or default to 'good'
        quantity: formData.quantity,
        location: formData.location,
        images: imageUrls,
        accept_offers: formData.acceptOffers,
        attributes: formData.categoryAttributes,
        seo_title: seoTitle,
        keywords: keywords,
        status: 'active'
      };

      // Condition is now handled via category attributes
      // Ensure we have a valid condition value for database
      const validConditions = ['new', 'like_new', 'good', 'fair', 'poor', 'brand_new', 'foreign_used', 'locally_used', 'excellent', 'for_parts', 'acceptable'];
      const conditionValue = formData.categoryAttributes.condition || 'good';
      listingData.condition = validConditions.includes(conditionValue as string) ? conditionValue : 'good';



      // Category information is now displayed in the ItemDetailsTable
      // No need to append it to the description
      listingData.description = sanitizedDescription;

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

      // Apply selected features to the newly created listing
      if (selectedFeatures.length > 0 && listing) {
        console.log(`Applying ${selectedFeatures.length} features to listing ${listing.id}`);
        
        try {
          for (const feature of selectedFeatures) {
            const { data, error: featureError } = await supabase.rpc('purchase_feature', {
              p_user_id: user!.id,
              p_feature_key: feature.key,
              p_credits: feature.credits,
              p_metadata: { listing_id: listing.id },
            });

            if (featureError) {
              console.error(`Failed to apply feature ${feature.key}:`, featureError);
              // Continue with other features even if one fails
            } else if (data?.success) {
              console.log(`Successfully applied feature ${feature.key} to listing`);
            }
          }
          
          // Refresh credits after feature application
          await refreshCredits();
        } catch (featureError) {
          console.error('Error applying features:', featureError);
          // Don't fail the entire listing creation if features fail
        }
      }
      
      // Clear draft after successful creation
      await clearDraft();
      
      setShowSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        try {
          // Check if router is available before navigating
          if (router && typeof router.replace === 'function') {
            router.replace('/(tabs)/home');
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
            setSelectedFeatures([]);
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

  const [selectedCategory, setSelectedCategory] = useState<DbCategory | null>(null);

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



  const handleCategorySelect = useCallback((categoryId: string) => {
    // Clear category attributes when category changes
    updateFormData({ categoryId, categoryAttributes: {} });
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
              helper={validationResults[2]?.warnings.price || "Set a competitive price"}
              error={validationResults[2]?.errors.price}
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
              showLabel={true}
              label="How many are you selling?"
            />

            <View>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                How do you want to sell your item?
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
        </View>
      </View>
    );
  }, [formData.categoryId, formData.location, formData.categoryAttributes, formData.price, formData.quantity, formData.acceptOffers, selectedCategory, validationResults, theme, handleCategorySelect, handleLocationSelect, handleCategoryAttributeChange, handlePriceChange, handleQuantityChange, handleAcceptOffersChange]);

  // DetailsStep merged into CategoryStep above



  const ReviewStep = useMemo(() => (
    <View style={{ gap: theme.spacing.lg }}>

      {/* Preview Header */}
      <View style={{ marginBottom: theme.spacing.md }}>
        <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
          📋 Listing Preview
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
              <Text variant="body" style={{ marginBottom: theme.spacing.sm, color: theme.colors.success }}>
                ✅ {selectedFeatures.length} feature{selectedFeatures.length > 1 ? 's' : ''} selected
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.md }}>
                {selectedFeatures.map((feature) => (
                  <Badge 
                    key={feature.key}
                    text={`${feature.name} (${feature.credits} credits)`}
                    variant="primary"
                    size="sm"
                  />
                ))}
              </View>
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
            const message = hasUnsavedChanges 
              ? 'You have unsaved changes. Would you like to save them as a draft before leaving?'
              : 'You have a saved draft. Would you like to keep it or discard it?';
              
            Alert.alert(
              hasUnsavedChanges ? 'Unsaved Changes' : 'Draft Found',
              message,
              [
                { text: 'Discard', onPress: () => { clearDraft(); router.back(); }, style: 'destructive' },
                { text: hasUnsavedChanges ? 'Save Draft' : 'Keep Draft', onPress: () => { 
                  if (hasUnsavedChanges) {
                    saveDraft(formData, true);
                  }
                  router.back(); 
                }},
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          } else {
            router.back();
          }
        }}
        rightActions={
          (isAutoSaving || hasUnsavedChanges || (formData.title || formData.description || formData.images.length > 0))
          ? [
              <View
                key="autosave-status"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: isAutoSaving 
                    ? theme.colors.primary + '10'
                    : hasUnsavedChanges 
                      ? theme.colors.warning + '10'
                      : theme.colors.success + '10',
                }}
              >
                {isAutoSaving ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: theme.spacing.xs }} />
                    <Text variant="caption" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      Saving...
                    </Text>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: theme.colors.warning,
                      marginRight: theme.spacing.xs,
                    }} />
                    <Text variant="caption" style={{ color: theme.colors.warning, fontWeight: '600' }}>
                      Unsaved
                    </Text>
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} color={theme.colors.success} style={{ marginRight: theme.spacing.xs }} />
                    <Text variant="caption" style={{ color: theme.colors.success, fontWeight: '600' }}>
                      Saved
                    </Text>
                  </>
                )}
              </View>
            ]
          : []
        }
      />


      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Progress Indicator */}
        <View style={{
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <StepIndicator
            steps={STEPS.map((step, index) => ({
              title: step.title,
              completed: index < currentStep,
              active: index === currentStep,
            }))}
            currentStep={currentStep}
            showLabels={true}
          />
        </View>



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

    </SafeAreaWrapper>
  );
}
