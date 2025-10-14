import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { contentModerationService } from '@/lib/contentModerationService';
import { networkUtils } from '@/utils/networkUtils';
import { reputationService } from '@/lib/reputationService';
import {
  sanitizeInput,
  generateSEOFriendlyTitle,
  extractKeywords,
} from '@/utils/listingValidation';
import { uploadListingImages, deleteListingImages } from '@/utils/listingImageUpload';
import { ListingFormData, SelectedFeature } from './useListingForm';

interface SubmissionOptions {
  userId: string;
  formData: ListingFormData;
  selectedFeatures: SelectedFeature[];
  selectedCategory: any;
  onProgressUpdate?: (progress: number) => void;
}

interface SubmissionResult {
  success: boolean;
  listingId?: string;
  error?: Error;
}

export function useListingSubmission() {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const isMountedRef = useRef(true);

  const submitListing = useCallback(async (
    options: SubmissionOptions
  ): Promise<SubmissionResult> => {
    const { userId, formData, selectedFeatures, selectedCategory, onProgressUpdate } = options;

    setLoading(true);
    setUploadProgress(0);

    try {
      // Validate user is authenticated
      if (!userId) {
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

      // Check network connectivity
      try {
        const networkStatus = await networkUtils.checkNetworkStatus();

        if (!networkStatus.isConnected) {
          throw new Error('No internet connection. Please check your network and try again.');
        }

        if (!networkStatus.canReachSupabase) {
          console.warn('Supabase connectivity check failed, but proceeding anyway');
        }
      } catch (networkError) {
        console.warn('Network check failed, proceeding anyway:', networkError);
      }

      // Upload images
      let imageUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        const uploadResult = await uploadListingImages(
          formData.images,
          userId,
          (progress) => {
            setUploadProgress(progress.percentage);
            onProgressUpdate?.(progress.percentage);
          }
        );

        if (uploadResult.error) {
          throw uploadResult.error;
        }

        imageUrls = uploadResult.urls;
      }

      // Sanitize and optimize data
      const sanitizedTitle = sanitizeInput(formData.title || '');
      const sanitizedDescription = sanitizeInput(formData.description || '');
      const seoTitle = generateSEOFriendlyTitle(sanitizedTitle, selectedCategory?.name || 'Uncategorized');
      const keywords = extractKeywords(sanitizedTitle, sanitizedDescription);

      // Map condition attribute
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

      const conditionRaw = formData.categoryAttributes.condition;
      const conditionValue = Array.isArray(conditionRaw) ? conditionRaw[0] : (conditionRaw as string) || 'good';
      const mappedCondition = conditionMapping[conditionValue] || 'good';

      // Prepare listing data
      const listingData = {
        user_id: userId,
        title: sanitizedTitle,
        description: sanitizedDescription,
        price: Number(formData.price) || 0,
        currency: 'GHS',
        category_id: formData.categoryId,
        condition: mappedCondition,
        quantity: formData.quantity || 1,
        location: formData.location || '',
        images: imageUrls,
        accept_offers: formData.acceptOffers ?? true,
        attributes: formData.categoryAttributes || {},
        seo_title: seoTitle,
        keywords: keywords,
        status: 'active'
      };

      // Content moderation check
      let moderationResult;
      try {
        moderationResult = await contentModerationService.moderateContent({
          id: 'temp-listing-id',
          type: 'listing',
          content: `${listingData.title}\n\n${listingData.description}`,
          images: imageUrls,
          userId: userId,
          metadata: {
            category: formData.categoryId,
            price: listingData.price,
            location: listingData.location,
          },
        });
      } catch (moderationError) {
        console.error('Content moderation failed:', moderationError);
        setLoading(false);
        Alert.alert(
          'Moderation Error',
          'Unable to verify content at this time. Please try again or contact support if the issue persists.',
          [{ text: 'OK' }]
        );
        return { success: false, error: moderationError as Error };
      }

      // Handle moderation results
      if (!moderationResult.isApproved) {
        setLoading(false);

        const flagReasons = moderationResult.flags
          .map(flag => {
            if (flag.type === 'profanity') return 'Inappropriate language detected';
            if (flag.type === 'personal_info') return 'Too much personal information';
            if (flag.type === 'spam') return 'Spam-like content detected';
            if (flag.type === 'inappropriate') return 'Inappropriate content detected';
            if (flag.type === 'suspicious_links') return 'Suspicious or shortened links detected';
            return flag.details || 'Content policy violation';
          })
          .filter(Boolean);

        Alert.alert(
          'Content Not Approved',
          `Your listing cannot be published:\n\n${flagReasons.join('\n')}\n\nPlease review and modify your content.`,
          [{ text: 'OK' }]
        );
        return { success: false, error: new Error('Content moderation failed') };
      }

      // Create listing in database
      const { data: newListing, error: createError } = await supabase
        .from('listings')
        .insert([listingData])
        .select()
        .single();

      if (createError) {
        console.error('Database insertion error:', createError);
        
        // Cleanup uploaded images
        if (imageUrls.length > 0) {
          await deleteListingImages(imageUrls);
        }
        
        throw new Error(`Failed to create listing: ${createError.message}`);
      }

      // Apply features if any were selected
      if (selectedFeatures.length > 0 && newListing) {
        for (const feature of selectedFeatures) {
          try {
            const { error: featureError } = await supabase.rpc('apply_listing_feature', {
              p_listing_id: newListing.id,
              p_user_id: userId,
              p_feature_type: feature.key,
            });

            if (featureError) {
              console.error(`Failed to apply feature ${feature.name}:`, featureError);
            }
          } catch (featureError) {
            console.error(`Error applying feature ${feature.name}:`, featureError);
          }
        }
      }

      // Award reputation points
      try {
        await reputationService.awardPoints(userId, 'listing_created', newListing!.id);
      } catch (reputationError) {
        console.warn('Failed to award reputation points:', reputationError);
      }

      setLoading(false);
      setUploadProgress(0);

      return { success: true, listingId: newListing!.id };
    } catch (error) {
      console.error('Listing creation error:', error);
      setLoading(false);
      setUploadProgress(0);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create listing'),
      };
    }
  }, []);

  return {
    loading,
    uploadProgress,
    submitListing,
    setLoading,
    setUploadProgress,
    isMountedRef,
  };
}

