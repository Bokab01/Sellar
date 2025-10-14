import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, Image, TouchableOpacity, Alert, Linking, Dimensions, StatusBar, FlatList, Share, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useBottomTabBarSpacing } from '@/hooks/useBottomTabBarSpacing';
import { dbHelpers, supabase } from '@/lib/supabase';
import { checkOfferLimit, type OfferLimitResult } from '@/utils/offerLimits';
import { useRecommendations } from '@/hooks/useRecommendations';
import { ListingRecommendations } from '@/components/Recommendations';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Button,
  Avatar,
  Badge,
  CompactUserBadges,
  PriceDisplay,
  ItemDetailsTable,
  ListingStatsTable,
  CompactReviewSummary,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  AppModal,
  Input,
  Toast,
  Grid,
  ProductCard,
  SimpleCallbackRequestButton,
  QuickEditModal,
} from '@/components';

// Lazy load heavy MediaViewer component (supports images and videos)
const MediaViewer = lazy(() => import('@/components/MediaViewer/MediaViewer').then(module => ({ default: module.MediaViewer })));
import { useMediaViewer } from '@/hooks/useMediaViewer';
import { useListingStats } from '@/hooks/useListingStats';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useProfile } from '@/hooks/useProfile';
import { Heart, Share as ShareIcon, MessageCircle, Phone, PhoneCall, DollarSign, ArrowLeft, Package, MoreVertical, Edit, Trash2, Flag, BadgeCent, RefreshCw, Play } from 'lucide-react-native';
import { getDisplayName } from '@/hooks/useDisplayName';
import { ReportButton } from '@/components/ReportButton/ReportButton';
import { VideoView, useVideoPlayer } from 'expo-video';

// Helper function to detect if URL is a video
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.mov', '.m4v', '.avi', '.wmv', '.flv', '.webm'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

// Video player component for carousel
interface MediaItemVideoProps {
  videoUrl: string;
  isActive: boolean;
  width: number;
  height: number;
  theme: any;
}

function MediaItemVideo({ videoUrl, isActive, width, height, theme }: MediaItemVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    player.muted = true;
  });

  // Track playing state
  useEffect(() => {
    if (!player) return;
    
    const interval = setInterval(() => {
      const playing = player.playing;
      setIsPlaying(playing);
      
      // If video ended (not playing and at end), show play icon
      if (!playing && player.currentTime >= player.duration - 0.1) {
        setIsPlaying(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player]);

  useEffect(() => {
    if (isActive) {
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  }, [isActive, player]);

  return (
    <View 
      style={{ 
        width, 
        height, 
        backgroundColor: theme.colors.surfaceVariant,
        position: 'relative',
      }}
      pointerEvents="box-none"
    >
      {/* Video layer - positioned absolutely to not block touches */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
        }}
        pointerEvents="none"
      >
        <VideoView
          player={player}
          style={{ width, height }}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />
      </View>
      
      {/* Play indicator overlay - only show when not playing */}
      {!isPlaying && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Play size={30} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>
      )}
    </View>
  );
}

export default function ListingDetailScreen() {
  const { theme } = useTheme();
  const { id: listingId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const { trackInteraction } = useRecommendations();
  const { contentBottomPadding } = useBottomTabBarSpacing();
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollViewRef = React.useRef<FlatList<string>>(null);
  
  // Contact modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [callbackRequested, setCallbackRequested] = useState(false);
  
  // Quick edit modal
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  
  // Form states
  const [messageText, setMessageText] = useState('');
  const [callbackPhone, setCallbackPhone] = useState('');
  const [callbackTime, setCallbackTime] = useState('anytime');
  const [callbackMessage, setCallbackMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  
  // Loading states
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingCallback, setSendingCallback] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  
  // Status states
  // const [callbackRequested, setCallbackRequested] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<any>(null);
  const [offerLimitStatus, setOfferLimitStatus] = useState<OfferLimitResult>({
    canMakeOffer: true,
    totalOffers: 0,
    remainingOffers: 3,
    limitReached: false
  });
  
  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  
  // Moderation modal
  const [moderationError, setModerationError] = useState('');
  const [showModerationModal, setShowModerationModal] = useState(false);
  
  // Popup menu
  const [showMenu, setShowMenu] = useState(false);

  // Related items state
  const [activeRelatedTab, setActiveRelatedTab] = useState<'seller' | 'similar'>('seller');
  const [sellerListings, setSellerListings] = useState<any[]>([]);
  const [similarListings, setSimilarListings] = useState<any[]>([]);
  const [sellerListingsLoading, setSellerListingsLoading] = useState(false);
  const [similarListingsLoading, setSimilarListingsLoading] = useState(false);

  // Media viewer (supports images and videos)
  const media = listing?.images || [];
  const {
    visible: mediaViewerVisible,
    currentIndex: mediaViewerIndex,
    openViewer: openMediaViewer,
    closeViewer: closeMediaViewer,
  } = useMediaViewer({ media, initialIndex: currentImageIndex });

  useEffect(() => {
    if (listingId) {
      // Fetch all data in parallel for better performance
      Promise.all([
        fetchListing(),
        checkIfFavorited(),
        checkCallbackStatus(),
        checkPendingOffer(),
      ]).then(() => {
        // fetchRelatedItems will be called after listing is set
      });
      
      // Track view interaction
      if (user) {
        trackInteraction(listingId, 'view', {
          source: 'listing_detail',
          timeSpent: 0
        });
      }
    }
  }, [listingId]);

  // Fetch related items only once after listing is loaded
  useEffect(() => {
    if (listing) {
      fetchRelatedItems();
    }
  }, [listing?.id]); // Only re-run if listing ID changes, not on every listing update

  // Pre-fill callback phone with user's profile phone when modal opens
  useEffect(() => {
    if (showCallbackModal && profile?.phone && !callbackPhone) {
      setCallbackPhone(profile.phone);
    }
  }, [showCallbackModal, profile?.phone]);

  // Track listing stats (favorites and views) with proper logic
  const { 
    isFavorited: statsIsFavorited, 
    viewCount, 
    toggleFavoriteStatus,
    refreshStats 
  } = useListingStats({ 
    listingId: listingId || '', 
    sellerId: listing?.user_id,
    autoTrackView: true 
  });

  // Get real-time favorites count from global store
  const { listingFavoriteCounts } = useFavoritesStore();
  const favoritesCount = listingFavoriteCounts[listingId || ''] ?? listing?.favorites_count ?? 0;

  // Cache for smart refresh - only refresh if needed
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds

  // Refresh data when screen comes into focus (e.g., returning from edit screen)
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      // Only refresh if it's been more than 30 seconds since last fetch
      if (listingId && (timeSinceLastFetch > FETCH_COOLDOWN || lastFetchTime.current === 0)) {
        console.log('🔄 Listing detail: Refreshing data on focus');
        lastFetchTime.current = now;
        
        Promise.all([
          fetchListing(),
          checkIfFavorited(),
          checkCallbackStatus(),
          checkPendingOffer(),
        ]);
        // Don't increment view count on focus refresh
      } else {
        console.log('⏭️ Listing detail: Using cached data on focus');
      }
    }, [listingId])
  );

  const fetchListing = useCallback(async () => {
    const startTime = performance.now();
    try {
      setLoading(true);
      setError(null);

      // First, try the joined query with explicit relationship naming
      // ✅ Use listings_with_pro_status view for optimized Sellar Pro badge
      let { data, error: fetchError } = await supabase
        .from('listings_with_pro_status')
        .select(`
          *,
          profiles!listings_seller_fkey (
            id,
            first_name,
            last_name,
            full_name,
            avatar_url,
            rating,
            total_sales,
            total_reviews,
            is_verified,
            is_online,
            last_seen,
            response_time,
            location,
            phone,
            is_business,
            business_name,
            display_business_name,
            business_name_priority
          ),
          categories (
            name,
            icon
          )
        `)
        .eq('id', listingId)
        .single();

      // If the joined query fails due to schema cache issues, fall back to separate queries
      if (fetchError && fetchError.message.includes('schema cache')) {
        console.log('🔄 Falling back to separate queries for listing detail');
        
        // Get listing without joins - ✅ Use view for PRO status
        const { data: listingData, error: listingError } = await supabase
          .from('listings_with_pro_status')
          .select('*')
          .eq('id', listingId)
          .single();

        if (listingError) {
          // Handle specific error cases in fallback query
          if (listingError.code === 'PGRST116' || listingError.message.includes('0 rows')) {
            setError('Listing not found or has been removed');
          } else {
          setError(listingError.message);
          }
          return;
        }

        if (!listingData) {
          setError('Listing not found or has been removed');
          return;
        }

        // Get profile and category data separately
        const [profileResult, categoryResult] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, full_name, avatar_url, rating, total_sales, total_reviews, is_verified, is_online, last_seen, response_time, location, phone, is_business, business_name, display_business_name, business_name_priority').eq('id', (listingData as any).user_id).single(),
          supabase.from('categories').select('name, icon').eq('id', (listingData as any).category_id).single()
        ]);

        // Combine the data
        const combinedData = {
          ...(listingData as any),
          profiles: profileResult.data || null,
          categories: categoryResult.data || null
        };


        setListing(combinedData);
      } else if (fetchError) {
        // Handle specific error cases
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('0 rows')) {
          setError('Listing not found or has been removed');
        } else {
        setError(fetchError.message);
        }
      } else {
        setListing(data);
      }
    } catch (err) {
      setError('Failed to load listing');
    } finally {
      const endTime = performance.now();
      console.log(`Listing detail loaded in ${(endTime - startTime).toFixed(2)}ms`);
      setLoading(false);
    }
  }, [listingId]);

  const checkIfFavorited = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .single();

      setIsFavorited(!!data);
    } catch (err) {
      // Not favorited
    }
  };

  const checkCallbackStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('callback_requests')
        .select('id, status')
        .eq('listing_id', listingId)
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .single();

      setCallbackRequested(!!data);
    } catch (err) {
      // No pending callback
    }
  };

  const checkPendingOffer = async () => {
    if (!user) return;

    try {
      // Check offer limits first
      const limitResult = await checkOfferLimit(user.id, listingId!);
      setOfferLimitStatus(limitResult);

      // Check for pending offers
      const { data } = await supabase
        .from('offers')
        .select('*')
        .eq('listing_id', listingId)
        .eq('buyer_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setPendingOffer(data);
    } catch (err) {
      // No pending offer
    }
  };

  const incrementViewCount = async () => {
    try {
      // Record view
      await supabase
        .from('listing_views')
        .insert({
          listing_id: listingId!,
          user_id: user?.id,
        } as any);

      // Increment counter
      await supabase.rpc('increment_listing_views', { listing_id: listingId } as any);
    } catch (err) {
      // Silent fail for analytics
    }
  };

  // Memoize fetchRelatedItems to prevent unnecessary calls
  const fetchRelatedItems = useCallback(async () => {
    if (!listing) return;

    // Fetch both seller and similar items in parallel for better performance
    setSellerListingsLoading(true);
    setSimilarListingsLoading(true);
    
    const [sellerResult, similarResult] = await Promise.allSettled([
      // Fetch seller's other items
      supabase
        .from('listings')
        .select(`
          *,
          profiles!listings_seller_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            rating,
            is_verified,
            account_type
          )
        `)
        .eq('user_id', listing.user_id)
        .eq('status', 'active')
        .neq('id', listingId)
        .order('created_at', { ascending: false })
        .limit(8),
      
      // Fetch similar items (same category, different seller)
      supabase
        .from('listings')
        .select(`
          *,
          profiles!listings_seller_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            rating,
            is_verified,
            account_type
          )
        `)
        .eq('category_id', listing.category_id)
        .eq('status', 'active')
        .neq('user_id', listing.user_id)
        .neq('id', listingId)
        .order('created_at', { ascending: false })
        .limit(8)
    ]);

    // Process seller listings
    try {
      let sellerData = null;
      if (sellerResult.status === 'fulfilled') {
        let { data, error: sellerError } = sellerResult.value;
        
        // Fallback for schema cache issues
        if (sellerError && sellerError.message.includes('schema cache')) {
          const { data: basicSellerData } = await supabase
            .from('listings')
            .select('*')
            .eq('user_id', listing.user_id)
            .eq('status', 'active')
            .neq('id', listingId)
            .order('created_at', { ascending: false })
            .limit(8);
          
          sellerData = (basicSellerData as any[] || []).map(item => ({
            ...item,
            profiles: listing.profiles // Use the main listing's profile data
          })) || [];
        } else {
          sellerData = data;
        }
      }

      if (sellerData) {
        const transformedSellerItems = sellerData.map((item: any) => ({
          id: item.id,
          image: item.images?.[0] || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg',
          title: item.title,
          price: item.price,
          seller: {
            name: getDisplayName(item.profiles, false).displayName,
            avatar: item.profiles?.avatar_url,
            rating: item.profiles?.rating || 0,
          },
          badge: item.boost_until && new Date(item.boost_until) > new Date() 
            ? { text: 'Boosted', variant: 'featured' as const }
            : undefined,
          location: item.location,
        }));
        setSellerListings(transformedSellerItems);
      }
    } catch (error) {
      console.error('Failed to fetch seller listings:', error);
    } finally {
      setSellerListingsLoading(false);
    }

    // Process similar listings
    try {
      let similarData = null;
      if (similarResult.status === 'fulfilled') {
        let { data, error: similarError } = similarResult.value;
        
        // Fallback for schema cache issues
        if (similarError && similarError.message.includes('schema cache')) {
          const { data: basicSimilarData } = await supabase
            .from('listings')
            .select('*')
            .eq('category_id', listing.category_id)
            .eq('status', 'active')
            .neq('user_id', listing.user_id)
            .neq('id', listingId)
            .order('created_at', { ascending: false })
            .limit(8);
          
          similarData = (basicSimilarData as any[] || []).map(item => ({
            ...item,
            profiles: null // We don't have profile data for similar items in fallback
          })) || [];
        } else {
          similarData = data;
        }
      }

      if (similarData) {
        const transformedSimilarItems = similarData.map((item: any) => ({
          id: item.id,
          image: item.images?.[0] || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg',
          title: item.title,
          price: item.price,
          seller: {
            name: getDisplayName(item.profiles, false).displayName,
            avatar: item.profiles?.avatar_url,
            rating: item.profiles?.rating || 0,
          },
          badge: item.boost_until && new Date(item.boost_until) > new Date() 
            ? { text: 'Boosted', variant: 'featured' as const }
            : undefined,
          location: item.location,
        }));
        setSimilarListings(transformedSimilarItems);
      }
    } catch (error) {
      console.error('Failed to fetch similar listings:', error);
    } finally {
      setSimilarListingsLoading(false);
    }
  }, [listing, listingId]);

  const toggleFavorite = useCallback(async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save favorites');
      return;
    }

    // Prevent users from favoriting their own listings
    if (listing && listing.user_id === user.id) {
      Alert.alert('Cannot Favorite', 'You cannot favorite your own listing');
      return;
    }

    try {
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        
        setIsFavorited(false);
        showSuccessToast('Removed from favorites');
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            listing_id: listingId!,
          } as any);
        
        setIsFavorited(true);
        showSuccessToast('Added to favorites');
        
        // Track favorite interaction
        if (listingId) {
          await trackInteraction(listingId, 'favorite', {
            source: 'listing_detail'
          });
        }
      }
    } catch (err) {
      showErrorToast('Failed to update favorites');
    }
  }, [user, listing, isFavorited, listingId, trackInteraction]);

  // Wrapper for toggleFavoriteStatus with interaction tracking
  const handleToggleFavorite = async () => {
    await toggleFavoriteStatus();
    
    // Track favorite interaction
    if (listingId && user) {
      await trackInteraction(listingId, 'favorite', {
        source: 'listing_detail'
      });
    }
  };

  // Menu action handlers
  const handleEditListing = () => {
    setShowMenu(false);
    router.push(`/edit-listing/${listingId}`);
  };

  const handleDeleteListing = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', listingId)
                .eq('user_id', user?.id);

              if (error) throw error;
              
              setToastMessage('Listing deleted successfully');
              setToastVariant('success');
              setShowToast(true);
              
              // Navigate back after a short delay
              setTimeout(() => {
                router.back();
              }, 1000);
            } catch (error) {
              console.error('Error deleting listing:', error);
              setToastMessage('Failed to delete listing');
              setToastVariant('error');
              setShowToast(true);
            }
          }
        }
      ]
    );
  };

  const handleShareListing = async () => {
    setShowMenu(false);
    try {
      const shareUrl = `https://sellar.app/listing/${listingId}`;
      const shareMessage = `Check out this listing: "${listing?.title}" - ${listing?.price ? `GHS ${listing.price.toLocaleString()}` : 'Price on request'}\n\n${shareUrl}`;
      
      const result = await Share.share({
        message: shareMessage,
        url: shareUrl,
        title: listing?.title || 'Sellar Listing',
      });

      if (result.action === Share.sharedAction) {
        // Track share interaction - error handling is done in trackInteraction
        if (listingId && user) {
          await trackInteraction(listingId, 'share', {
            source: 'listing_detail_menu'
          });
        }
        
        setToastMessage('Listing shared successfully');
        setToastVariant('success');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error sharing listing:', error);
      setToastMessage('Failed to share listing');
      setToastVariant('error');
      setShowToast(true);
    }
  };

  const handleReportListing = () => {
    setShowMenu(false);
    if (listing && listingId) {
      router.push({
        pathname: '/report',
        params: {
          targetType: 'listing',
          targetId: listingId,
          targetTitle: listing.title || '',
          targetUser: listing.profiles ? JSON.stringify({
            id: listing.profiles.id,
            name: `${listing.profiles.first_name || ''} ${listing.profiles.last_name || ''}`.trim() || 'Unknown User',
            avatar: listing.profiles.avatar_url
          }) : undefined,
        },
      });
    } else {
      setToastMessage('Cannot report listing - listing not found');
      setToastVariant('error');
      setShowToast(true);
    }
  };

  const handleRelistListing = async () => {
    setShowMenu(false);
    
    Alert.alert(
      'Relist Item',
      'This will make your listing active again and visible to buyers. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Relist',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('listings')
                .update({ 
                  status: 'active',
                  updated_at: new Date().toISOString()
                })
                .eq('id', listingId);

              if (error) throw error;

              setToastMessage('Listing relisted successfully');
              setToastVariant('success');
              setShowToast(true);

              // Refresh listing data
              await fetchListing();
            } catch (error) {
              console.error('Error relisting:', error);
              setToastMessage('Failed to relist item');
              setToastVariant('error');
              setShowToast(true);
            }
          },
        },
      ]
    );
  };

  const handleContactSeller = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to contact sellers');
      return;
    }

    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    // Track contact interaction
    if (listingId) {
      await trackInteraction(listingId, 'contact', {
        source: 'listing_detail',
        contactType: 'message'
      });
    }

    setSendingMessage(true);
    try {
      // Moderate message content before sending
      const { contentModerationService } = await import('@/lib/contentModerationService');
      
      const moderationResult = await contentModerationService.moderateContent({
        id: 'temp-contact-message-id',
        type: 'comment',
        userId: user.id,
        content: messageText.trim(),
      });

      // Check if content is approved
      if (!moderationResult.isApproved) {
        setSendingMessage(false);
        
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
        
        setModerationError(`Your message cannot be sent:\n\n• ${flagReasons}\n\nPlease review and modify your content, then try again.`);
        setShowModerationModal(true);
        return;
      }

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${listing.user_id}),and(participant_1.eq.${listing.user_id},participant_2.eq.${user.id})`)
        .maybeSingle();

      let conversationId = (existingConv as any)?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            listing_id: listingId!,
            participant_1: user.id,
            participant_2: listing.user_id,
          } as any)
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = (newConv as any).id;
      }

      // Send message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageText.trim(),
        } as any);

      if (messageError) throw messageError;

      setShowContactModal(false);
      setMessageText('');
      showSuccessToast('Message sent successfully!');

      // Navigate to chat after a brief delay
      setTimeout(() => {
        router.push(`/chat-detail/${conversationId}` as any);
      }, 1000);
    } catch (err: any) {
      showErrorToast('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRequestCallback = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to request callbacks');
      return;
    }

    if (!callbackPhone.trim()) {
      Alert.alert(
        'Phone Number Required', 
        'Please add your phone number in your profile settings to request callbacks.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Profile', 
            onPress: () => {
              setShowCallbackModal(false);
              router.push('/edit-profile');
            }
          }
        ]
      );
      return;
    }

    setSendingCallback(true);
    try {
      const { error } = await dbHelpers.createCallbackRequest({
        listing_id: listingId!,
        requester_id: user.id,
        seller_id: listing.user_id,
        phone_number: callbackPhone.trim(),
        preferred_time: callbackTime,
        message: callbackMessage.trim() || undefined,
      });

      if (error) throw error;

      setCallbackRequested(true);
      setShowCallbackModal(false);
      setCallbackPhone('');
      setCallbackTime('anytime');
      setCallbackMessage('');
      showSuccessToast('Callback requested successfully!');
    } catch (err: any) {
      showErrorToast('Failed to request callback');
    } finally {
      setSendingCallback(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to make offers');
      return;
    }

    // Ensure user is authenticated with Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      Alert.alert('Authentication Error', 'Please sign in again to make offers');
      return;
    }

    // Check offer limits
    if (!offerLimitStatus.canMakeOffer) {
      Alert.alert('Offer Limit Reached', offerLimitStatus.reason || 'You cannot make more offers for this listing.');
      return;
    }

    if (!offerAmount.trim()) {
      Alert.alert('Error', 'Please enter an offer amount');
      return;
    }

    const amount = Number(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount >= listing.price) {
      Alert.alert('Invalid Offer', 'Your offer should be less than the asking price');
      return;
    }

    setSendingOffer(true);
    try {
      // Create or find conversation
      const { data: existingConv, error: existingConvError } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${listing.user_id}),and(participant_1.eq.${listing.user_id},participant_2.eq.${user.id})`)
        .maybeSingle();

      if (existingConvError) {
        console.error('Error finding existing conversation:', existingConvError);
        throw new Error(`Failed to find conversation: ${existingConvError.message}`);
      }

      let conversationId = (existingConv as any)?.id;

      if (!conversationId) {
        // Create new conversation
        console.log('Creating new conversation with:', {
          listing_id: listingId,
          participant_1: user.id,
          participant_2: listing.user_id,
          current_user: user.id
        });

        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            listing_id: listingId!,
            participant_1: user.id,
            participant_2: listing.user_id,
          } as any)
          .select('id')
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          console.error('User ID:', user.id);
          console.error('Listing user ID:', listing.user_id);
          throw new Error(`Failed to create conversation: ${convError.message}`);
        }
        conversationId = (newConv as any).id;
        console.log('Conversation created successfully:', conversationId);
      }

      // Create offer message first
      const offerContent = `💰 Offer: GHS ${(amount || 0).toLocaleString()}${offerMessage ? `\n\n"${offerMessage}"` : ''}`;
      
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: offerContent,
          message_type: 'offer',
        } as any)
        .select('id')
        .single();

      if (messageError) {
        console.error('Error creating offer message:', messageError);
        throw new Error(`Failed to create offer message: ${messageError.message}`);
      }

      // Create offer record
      const { data: offerData, error: offerError } = await dbHelpers.createOffer({
        listing_id: listingId!,
        conversation_id: conversationId,
        message_id: (message as any).id,
        buyer_id: user.id,
        seller_id: listing.user_id,
        amount,
        currency: 'GHS',
        message: offerMessage.trim() || null,
      });

      if (offerError) {
        console.error('Error creating offer record:', offerError);
        throw new Error(`Failed to create offer record: ${offerError.message}`);
      }

      // Update local state
      setPendingOffer({
        amount,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      // Refresh offer limit status
      await checkPendingOffer();

      setShowOfferModal(false);
      setOfferAmount('');
      setOfferMessage('');
      showSuccessToast('Offer sent successfully!');
    } catch (err: any) {
      console.error('Offer creation error:', err);
      const errorMessage = err?.message || 'Failed to send offer';
      showErrorToast(`Failed to send offer: ${errorMessage}`);
    } finally {
      setSendingOffer(false);
    }
  };

  const handleCall = () => {
    if (!listing?.profiles?.phone) {
      Alert.alert('No Phone Number', 'This seller has not provided a phone number');
      return;
    }

    Alert.alert(
      'Call Seller',
      `Call ${listing.profiles.first_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${listing.profiles.phone}`);
          },
        },
      ]
    );
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastVariant('success');
    setShowToast(true);
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastVariant('error');
    setShowToast(true);
  };

  if (loading) {
    const screenHeight = Dimensions.get('window').height;
    const imageHeight = screenHeight * 0.7;
    
    return (
      <SafeAreaWrapper>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Fixed Header Overlay Skeleton */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: (StatusBar.currentHeight || 44) + theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <LoadingSkeleton width={40} height={40} borderRadius={20} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <LoadingSkeleton width={40} height={40} borderRadius={20} />
            <LoadingSkeleton width={40} height={40} borderRadius={20} />
          </View>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Hero Image Skeleton */}
          <LoadingSkeleton width="100%" height={imageHeight} borderRadius={0} />
          
          {/* Content Section */}
          <View style={{ 
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.borderRadius.xl,
            borderTopRightRadius: theme.borderRadius.xl,
            marginTop: -20,
            padding: theme.spacing.lg,
          }}>
            {/* Badges Row Skeleton */}
            <View style={{ flexDirection: 'row', gap: theme.spacing.xs, marginBottom: theme.spacing.md }}>
              <LoadingSkeleton width={80} height={24} borderRadius={theme.borderRadius.full} />
              <LoadingSkeleton width={100} height={24} borderRadius={theme.borderRadius.full} />
            </View>

            {/* Title Skeleton */}
            <LoadingSkeleton width="90%" height={28} style={{ marginBottom: theme.spacing.sm }} />
            <LoadingSkeleton width="70%" height={28} style={{ marginBottom: theme.spacing.lg }} />

            {/* Price Skeleton */}
            <LoadingSkeleton width="40%" height={36} style={{ marginBottom: theme.spacing.lg }} />

            {/* Stats Row Skeleton */}
            <View style={{ flexDirection: 'row', gap: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
              <LoadingSkeleton width={60} height={20} />
              <LoadingSkeleton width={60} height={20} />
            </View>

            {/* Description Section Skeleton */}
            <LoadingSkeleton width={120} height={20} style={{ marginBottom: theme.spacing.md }} />
            <LoadingSkeleton width="100%" height={16} style={{ marginBottom: theme.spacing.xs }} />
            <LoadingSkeleton width="100%" height={16} style={{ marginBottom: theme.spacing.xs }} />
            <LoadingSkeleton width="80%" height={16} style={{ marginBottom: theme.spacing.xl }} />

            {/* Item Details Table Skeleton */}
            <LoadingSkeleton width={120} height={20} style={{ marginBottom: theme.spacing.md }} />
            <View style={{ 
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.xl,
            }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <LoadingSkeleton width="40%" height={16} />
                  <LoadingSkeleton width="50%" height={16} />
                </View>
              ))}
            </View>

            {/* Seller Section Skeleton */}
            <LoadingSkeleton width={100} height={20} style={{ marginBottom: theme.spacing.md }} />
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.xl,
            }}>
              <LoadingSkeleton width={48} height={48} borderRadius={24} style={{ marginRight: theme.spacing.md }} />
              <View style={{ flex: 1 }}>
                <LoadingSkeleton width="60%" height={18} style={{ marginBottom: theme.spacing.xs }} />
                <LoadingSkeleton width="40%" height={14} />
              </View>
            </View>

            {/* Action Buttons Skeleton */}
            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
              <LoadingSkeleton width="48%" height={48} borderRadius={theme.borderRadius.lg} style={{ flex: 1 }} />
              <LoadingSkeleton width="48%" height={48} borderRadius={theme.borderRadius.lg} style={{ flex: 1 }} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  if (error || !listing) {
    const isListingNotFound = error?.includes('not found') || error?.includes('removed');
    
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Listing"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ErrorState
          title={isListingNotFound ? 'Listing Unavailable' : 'Something went wrong'}
          message={isListingNotFound 
            ? 'This listing has been removed or is no longer available. Browse other listings to find similar items.'
            : error || 'Unable to load listing details'}
          onRetry={!isListingNotFound ? fetchListing : undefined}
          retryText="Refresh"
        />
      </SafeAreaWrapper>
    );
  }

  const isOwnListing = user?.id === listing.user_id;
  const canMakeOffer = listing.accept_offers && !isOwnListing && !pendingOffer;
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const imageHeight = screenHeight * 0.7; // 70% of screen height for better image display

  return (
    <SafeAreaWrapper>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Fixed Header Overlay */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: (StatusBar.currentHeight || 44) + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <ArrowLeft size={20} color="white" strokeWidth={2} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {/* Only show favorite button if user doesn't own the listing */}
          {listing && listing.user_id !== user?.id && (
            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Heart 
                size={20} 
                color={statsIsFavorited ? theme.colors.error : "white"} 
                fill={statsIsFavorited ? theme.colors.error : 'none'} 
                strokeWidth={2}
              />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MoreVertical size={20} color="white" strokeWidth={2} />
          </TouchableOpacity>

        </View>
      </View>

      {/* Popup Menu */}
      {showMenu && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          
            zIndex: 2000,
          }}
        >
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />
          <View
            style={{
              position: 'absolute',
              top: (StatusBar.currentHeight || 44) + theme.spacing.md + 40 + theme.spacing.sm,
              right: theme.spacing.lg,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              paddingVertical: theme.spacing.sm,
              minWidth: 180,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
            }}
          >
            {/* Edit Button - Only for own listings (not sold) */}
            {isOwnListing && listing.status !== 'sold' && (
              <TouchableOpacity
                onPress={handleEditListing}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                }}
              >
                <Edit size={18} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
                <Text variant="body" style={{ color: theme.colors.text.primary, fontSize: 14 }}>
                  Edit Listing
                </Text>
          </TouchableOpacity>
            )}

            {/* Relist Button - Only for own sold listings */}
            {isOwnListing && listing.status === 'sold' && (
              <TouchableOpacity
                onPress={handleRelistListing}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                }}
              >
                <RefreshCw size={18} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
                <Text variant="body" style={{ color: theme.colors.primary, fontSize: 14 }}>
                  Relist Item
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete Button - Only for own listings */}
            {isOwnListing && (
              <TouchableOpacity
                onPress={handleDeleteListing}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                }}
              >
                <Trash2 size={18} color={theme.colors.error} style={{ marginRight: theme.spacing.sm }} />
                <Text variant="body" style={{ color: theme.colors.error, fontSize: 14 }}>
                  Delete Listing
                </Text>
              </TouchableOpacity>
            )}

            {/* Share Button - Always available */}
            <TouchableOpacity
              onPress={handleShareListing}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
              }}
            >
              <ShareIcon size={18} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
              <Text variant="body" style={{ color: theme.colors.text.primary, fontSize: 14 }}>
                Share Listing
              </Text>
            </TouchableOpacity>

            {/* Report Button - Only for other users' listings */}
            {!isOwnListing && (
              <TouchableOpacity
                onPress={handleReportListing}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                }}
              >
                <Flag size={18} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
                <Text variant="body" style={{ color: theme.colors.warning, fontSize: 14 }}>
                  Report Listing
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
      )}

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {/* Hero Image Section */}
        <View style={{ position: 'relative', height: imageHeight }}>
          {listing.images && listing.images.length > 0 ? (
            <>
              <FlatList
                ref={imageScrollViewRef}
                data={listing.images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={true}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                  setCurrentImageIndex(index);
                }}
                keyExtractor={(item, index) => `${index}`}
                renderItem={({ item: mediaUrl, index }) => {
                  const isVideo = isVideoUrl(mediaUrl);
                  
                  return (
                    <TouchableOpacity
                      onPress={() => openMediaViewer(index)}
                      activeOpacity={0.9}
                      style={{ width: screenWidth }}
                    >
                      {isVideo ? (
                        <MediaItemVideo 
                          videoUrl={mediaUrl} 
                          isActive={index === currentImageIndex}
                          width={screenWidth}
                          height={imageHeight}
                          theme={theme}
                        />
                      ) : (
                        <Image
                          source={{ uri: mediaUrl }}
                          style={{
                            width: screenWidth,
                            height: imageHeight,
                            backgroundColor: theme.colors.surfaceVariant,
                          }}
                          resizeMode="cover"
                          // Performance optimizations
                          loadingIndicatorSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
                          onLoadStart={() => console.log(`Loading media ${index}`)}
                          onLoadEnd={() => console.log(`Loaded media ${index}`)}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                // Performance optimizations
                removeClippedSubviews={true}
                maxToRenderPerBatch={2}
                updateCellsBatchingPeriod={100}
                initialNumToRender={1}
                windowSize={3}
                getItemLayout={(data, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
              />
              
              {/* Image Thumbnails */}
              {listing.images.length > 1 && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: theme.spacing.lg,
                    left: theme.spacing.lg,
                    right: theme.spacing.lg,
                    flexDirection: 'row',
                    gap: theme.spacing.sm,
                  }}
                >
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {listing.images.map((mediaUrl: string, index: number) => {
                      const isVideo = isVideoUrl(mediaUrl);
                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            setCurrentImageIndex(index);
                            // Scroll main image to selected thumbnail
                            imageScrollViewRef.current?.scrollToIndex({ index, animated: true });
                          }}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: theme.borderRadius.md,
                            overflow: 'hidden',
                            borderWidth: currentImageIndex === index ? 2 : 0,
                            borderColor: theme.colors.primary,
                            opacity: currentImageIndex === index ? 1 : 0.7,
                          }}
                        >
                          <Image
                            source={{ uri: mediaUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                          {isVideo && (
                            <View
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              }}
                            >
                              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

            </>
          ) : (
            <View
              style={{
                width: '100%',
                height: imageHeight,
                backgroundColor: theme.colors.surfaceVariant,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text variant="body" color="muted">
                No images available
              </Text>
            </View>
          )}
        </View>
        {/* Seller Profile - Moved to top */}
        {listing.profiles && (
          <TouchableOpacity
            onPress={() => {
              // Only navigate to profile if it's not the user's own listing
              if (!isOwnListing) {
                router.push(`/profile/${listing.profiles.id}`);
              }
            }}
            disabled={isOwnListing}
            activeOpacity={isOwnListing ? 1 : 0.7}
            style={{ 
              backgroundColor: theme.colors.surface,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderColor: theme.colors.border, padding: theme.spacing.sm, borderRadius: theme.borderRadius.xl, borderWidth: 1 }}>
              <Avatar
                name={getDisplayName(listing.profiles, false).displayName}
                source={listing.profiles.avatar_url}
                size="md"
              />
              <View style={{ flex: 1}}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                  <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                    {getDisplayName(listing.profiles, false).displayName}
                  </Text>
                  {/* ✅ PRO Badge after name using Badge component */}
                  {listing.is_sellar_pro && (
                    <Badge text="⭐ PRO" variant="primary" size="sm" />
                  )}
                  <CompactUserBadges
                    isBusinessUser={listing.profiles.is_business_user}
                    isVerified={listing.profiles.is_verified}
                    isBusinessVerified={listing.profiles.is_business_verified}
                  />
                </View>
                <View style={{ marginTop: theme.spacing.xs }}>
                  <CompactReviewSummary userId={listing.profiles.id} />
                </View>
                <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.xs }}>
                  {listing.profiles.location}
                </Text>
               {/*  {!isOwnListing && (
                  <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
                    Tap to view profile
                  </Text>
                )} */}
              </View>
              
              {/* Call Seller Button */}
              {!isOwnListing && listing.profiles?.phone && (
                <TouchableOpacity
                  onPress={handleCall}
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.borderRadius.xl,
                    marginRight: theme.spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Phone size={14} color={theme.colors.primaryForeground} />
                  <Text variant="caption" style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>
                    Call seller
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}


        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          {/* Title and Price */}
          <View style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
              {listing.title}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <PriceDisplay
                amount={listing.price}
                currency={listing.currency}
                previousPrice={listing.previous_price}
                priceChangedAt={listing.price_changed_at}
                size="lg"
                style={{ fontWeight: '600', color: theme.colors.primary }}
              />
              
              {/* Quick Edit Button - Only for sellers' own listings */}
              {isOwnListing && listing.status !== 'sold' && (
                <TouchableOpacity
                  onPress={() => setShowQuickEditModal(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary + '10',
                    borderRadius: theme.borderRadius.md,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                    borderWidth: 1,
                    borderColor: theme.colors.primary + '30',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Edit size={14} color={theme.colors.primary} />
                  <Text variant="caption" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                    Quick Edit
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Professional Badge Section */}
            <View style={{ 
              flexDirection: 'row', 
              gap: theme.spacing.sm, 
              flexWrap: 'wrap',
              marginTop: theme.spacing.sm,
            }}>
              {/* Sold Badge */}
              {listing.status === 'sold' && (
                <View style={{
                  backgroundColor: theme.colors.text.muted + '15',
                  borderWidth: 1,
                  borderColor: theme.colors.text.muted + '30',
                  borderRadius: theme.borderRadius.full,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}>
                  <Text style={{ fontSize: 14, color: theme.colors.text.secondary }}>✅</Text>
                  <Text 
                    variant="caption" 
                    style={{ 
                      color: theme.colors.text.secondary,
                      fontWeight: '600',
                    }}
                  >
                    Sold
                  </Text>
                </View>
              )}

              {/* Condition Badge */}
              <View style={{
                backgroundColor: theme.colors.primary + '15',
                borderWidth: 1,
                borderColor: theme.colors.primary + '30',
                borderRadius: theme.borderRadius.full,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}>
                <Text style={{ fontSize: 14, color: theme.colors.primary }}>🔍</Text>
                <Text 
                  variant="caption" 
                  style={{ 
                    color: theme.colors.primary,
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}
                >
                  {listing.condition?.replace('_', ' ') || 'Unknown'}
                </Text>
              </View>

              {/* Accepts Offers Badge */}
              {listing.accept_offers && (
                <View style={{
                  backgroundColor: theme.colors.success + '15',
                  borderWidth: 1,
                  borderColor: theme.colors.success + '30',
                  borderRadius: theme.borderRadius.full,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}>
                  <Text style={{ fontSize: 14, color: theme.colors.success }}>💰</Text>
                  <Text 
                    variant="caption" 
                    style={{ 
                      color: theme.colors.success,
                      fontWeight: '500',
                    }}
                  >
                    Accepts Offers
                  </Text>
                </View>
              )}

              {/* Boost Badges - Show all active boosts */}
              
              {/* Urgent Sale Badge */}
              {listing.urgent_until && new Date(listing.urgent_until) > new Date() && (
                <Badge 
                  text="Urgent Sale" 
                  variant="urgent"
                />
              )}

              {/* Spotlight Badge */}
              {listing.spotlight_until && new Date(listing.spotlight_until) > new Date() && (
                <Badge 
                  text="Spotlight" 
                  variant="spotlight"
                />
              )}

              {/* Boosted Badge */}
              {listing.boost_until && new Date(listing.boost_until) > new Date() && (
                <Badge 
                  text="Boosted" 
                  variant="featured"
                />
              )}

              {/* Verification Badge */}
              {listing.profiles?.is_verified && (
                <View style={{
                  backgroundColor: theme.colors.success + '15',
                  borderWidth: 1,
                  borderColor: theme.colors.success + '30',
                  borderRadius: theme.borderRadius.full,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}>
                  <Text style={{ fontSize: 14, color: theme.colors.success }}>✅</Text>
                  <Text 
                    variant="bodySmall" 
                    style={{ 
                      color: theme.colors.success,
                      fontWeight: '600'
                    }}
                  >
                    Verified Seller
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Urgent Sale Banner */}
          {listing.urgent_until && new Date(listing.urgent_until) > new Date() && (
            <View
              style={{
                backgroundColor: theme.colors.destructive + '15',
                borderColor: theme.colors.destructive + '40',
                borderWidth: 2,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.sm,
                marginBottom: theme.spacing.md,
                overflow: 'hidden',
              }}
            >
              {/* Animated gradient background effect */}
                <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: theme.colors.destructive + '08',
              }} />

              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                gap: theme.spacing.md,
                position: 'relative',
              }}>
                {/* Icon */}
                <View style={{
                  backgroundColor: theme.colors.destructive,
                  borderRadius: theme.borderRadius.full,
                  padding: theme.spacing.sm,
                  elevation: 1,
                }}>
                  <Text style={{ fontSize: 20 }}>🔥</Text>
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text variant="h4" style={{ 
                    fontWeight: '700', 
                    color: theme.colors.destructive,
                    marginBottom: theme.spacing.xs,
                  }}>
                    Urgent Sale!
                  </Text>
                  <Text variant="body" style={{ 
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.xs,
                    lineHeight: 20,
                  }}>
                    Seller needs to sell fast. Don't miss this opportunity!
                  </Text>
                  
                  {/* Time remaining */}
                  {/* <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                    backgroundColor: theme.colors.surface,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.borderRadius.md,
                    alignSelf: 'flex-start',
                  }}>
                    <Text style={{ fontSize: 14 }}>⏰</Text>
                    <Text variant="caption" style={{ 
                      fontWeight: '600',
                      color: theme.colors.destructive,
                    }}>
                      Urgent until {new Date(listing.urgent_until).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View> */}
                </View>
              </View>

              {/* Bottom tip */}
              <View style={{
                marginTop: theme.spacing.md,
                paddingTop: theme.spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.colors.destructive + '20',
              }}>
                <Text variant="caption" style={{ 
                  color: theme.colors.text.secondary,
                  fontStyle: 'italic',
                }}>
                  💡 Tip: Make an offer or contact the seller quickly to secure this deal
                </Text>
              </View>
            </View>
          )}

          {/* Reserved for You Banner (when your offer was accepted) */}
          {listing.status === 'reserved' && listing.reserved_for === user?.id && (
            <View
                    style={{ 
                backgroundColor: theme.colors.success + '15',
                borderColor: theme.colors.success + '30',
                borderWidth: 1,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}
            >
              <View style={{
                backgroundColor: theme.colors.success + '20',
                borderRadius: theme.borderRadius.full,
                padding: theme.spacing.sm,
              }}>
                <Text style={{ fontSize: 20 }}>🎉</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ 
                  fontWeight: '600', 
                      color: theme.colors.success,
                  marginBottom: theme.spacing.xs,
                }}>
                  Your Offer Was Accepted!
                </Text>
                <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                  This item is reserved for you. Complete the transaction within 48 hours to secure your purchase.
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    // Navigate to existing conversation
                    if (!user) return;
                    
                    try {
                      const { data: existingConv } = await supabase
                        .from('conversations')
                        .select('id')
                        .eq('listing_id', listingId)
                        .or(`and(participant_1.eq.${user.id},participant_2.eq.${listing.user_id}),and(participant_1.eq.${listing.user_id},participant_2.eq.${user.id})`)
                        .maybeSingle();

                      if (existingConv) {
                        router.push(`/chat-detail/${existingConv.id}` as any);
                      } else {
                        // Fallback to contact modal if no conversation exists
                        setShowContactModal(true);
                      }
                    } catch (err) {
                      console.error('Error navigating to chat:', err);
                      setShowContactModal(true);
                    }
                  }}
                  style={{
                    backgroundColor: theme.colors.success,
                    borderRadius: theme.borderRadius.md,
                    paddingVertical: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text variant="bodySmall" style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>
                    Go to Chat →
                  </Text>
                </TouchableOpacity>
                </View>
            </View>
          )}

          {/* Pending Offer Status */}
          {pendingOffer && (
            <View
              style={{
                backgroundColor: theme.colors.warning + '15',
                borderColor: theme.colors.warning + '30',
                borderWidth: 1,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}
            >
              <View style={{
                backgroundColor: theme.colors.warning + '20',
                borderRadius: theme.borderRadius.full,
                padding: theme.spacing.sm,
              }}>
                <Text style={{ fontSize: 20 }}>💰</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ 
                  fontWeight: '600', 
                  color: theme.colors.warning,
                  marginBottom: theme.spacing.xs 
                }}>
                  Offer Pending
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.text.secondary }}>
                  Your offer of GHS {(pendingOffer.amount || 0).toLocaleString()} is waiting for the seller&apos;s response.
                </Text>
              </View>
            </View>
          )}

          {/* Sold Item Banner */}
          {listing.status === 'sold' && (
            <View
              style={{
                backgroundColor: theme.colors.text.muted + '15',
                borderWidth: 1,
                borderColor: theme.colors.text.muted + '30',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}
            >
              <View style={{
                backgroundColor: theme.colors.text.muted + '20',
                borderRadius: theme.borderRadius.full,
                padding: theme.spacing.sm,
              }}>
                <Text style={{ fontSize: 20 }}>✅</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ 
                  fontWeight: '600', 
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.xs 
                }}>
                  This item has been sold
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.text.secondary }}>
                  {isOwnListing 
                    ? 'You can relist this item from your listings page.'
                    : 'Check out similar items below or browse other listings.'}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
              Description
            </Text>
            <Text variant="body" style={{ lineHeight: 22 }}>
              {listing.description?.split('\n\n📋')[0] || listing.description}
            </Text>
          </View>

          {/* Action Buttons - Moved from bottom */}
          {!isOwnListing && listing.status !== 'sold' && listing.status !== 'reserved' && (
            <View style={{ marginBottom: theme.spacing.lg }}>
              <View style={{ gap: theme.spacing.md }}>
                {/* Make an Offer Button */}
                {canMakeOffer && offerLimitStatus.canMakeOffer && !pendingOffer ? (
                  <TouchableOpacity
                    onPress={() => setShowOfferModal(true)}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.primary,
                      borderRadius: theme.borderRadius.md,
                      paddingVertical: theme.spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: theme.spacing.sm,
                    }}
                  >
                    <BadgeCent size={21} color={theme.colors.primary} />
                    <Text variant="button" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      Make an offer
                    </Text>
                  </TouchableOpacity>
                ) : pendingOffer ? (
                  <TouchableOpacity
                    disabled
                    style={{
                      backgroundColor: theme.colors.surfaceVariant,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.md,
                      paddingVertical: theme.spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: theme.spacing.sm,
                      opacity: 0.6,
                    }}
                  >
                    <DollarSign size={20} color={theme.colors.text.muted} />
                    <Text variant="button" style={{ color: theme.colors.text.muted, fontWeight: '600' }}>
                      Offer Pending
                    </Text>
                  </TouchableOpacity>
                ) : offerLimitStatus.limitReached ? (
                  <TouchableOpacity
                    disabled
                    style={{
                      backgroundColor: theme.colors.error + '10',
                      borderWidth: 1,
                      borderColor: theme.colors.error + '30',
                      borderRadius: theme.borderRadius.md,
                      paddingVertical: theme.spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: theme.spacing.sm,
                      opacity: 0.8,
                    }}
                  >
                    <DollarSign size={20} color={theme.colors.error} />
                    <Text variant="button" style={{ color: theme.colors.error, fontWeight: '600' }}>
                      Offer Limit Reached
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Message Seller Button */}
                <TouchableOpacity
                  onPress={() => setShowContactModal(true)}
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.borderRadius.md,
                    paddingVertical: theme.spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.sm,
                  }}
                >
                  <MessageCircle size={20} color={theme.colors.primaryForeground} />
                  <Text variant="button" style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>
                    Message seller
                  </Text>
                </TouchableOpacity>

                {/* Callback Request Button */}
                {listing.profiles?.phone && (
                  <SimpleCallbackRequestButton
                    listingId={listingId!}
                    sellerId={listing.user_id}
                    sellerName={getDisplayName(listing.profiles, false).displayName}
                    sellerPhone={listing.profiles.phone}
                    listingTitle={listing.title}
                    listingImage={listing.images?.[0]}
                    listingPrice={listing.price}
                    listingCurrency={listing.currency || 'GHS'}
                    variant="secondary"
                    size="md"
                  />
                )}
              </View>
            </View>
          )}

          {/* Item Details Table */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <ItemDetailsTable listing={listing} />
          </View>

          {/* Location */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
              Location
            </Text>
            <Text variant="body" color="secondary">
              📍 {listing.location}
            </Text>
          </View>

          {/* Listing Statistics Table */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <ListingStatsTable 
              listing={listing} 
              viewCount={viewCount}
              favoritesCount={favoritesCount}
            />
          </View>
        </View>

        {/* Related Items Tabs */}
        <View style={{ marginTop: theme.spacing.lg }}>
          {/* Tab Headers */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: theme.colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveRelatedTab('seller')}
              style={{
                flex: 1,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
                borderBottomWidth: 2,
                borderBottomColor: activeRelatedTab === 'seller' ? theme.colors.primary : 'transparent',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text
                variant="button"
                style={{
                  color: activeRelatedTab === 'seller' ? theme.colors.primary : theme.colors.text.secondary,
                  fontWeight: activeRelatedTab === 'seller' ? '600' : '500',
                }}
              >
                Seller&apos;s Items
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveRelatedTab('similar')}
              style={{
                flex: 1,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
                borderBottomWidth: 2,
                borderBottomColor: activeRelatedTab === 'similar' ? theme.colors.primary : 'transparent',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text
                variant="button"
                style={{
                  color: activeRelatedTab === 'similar' ? theme.colors.primary : theme.colors.text.secondary,
                  fontWeight: activeRelatedTab === 'similar' ? '600' : '500',
                }}
              >
                Similar Items
              </Text>
            </TouchableOpacity>

          </View>

          {/* Tab Content with Lazy Loading */}
          <View style={{ backgroundColor: theme.colors.surface, paddingTop: theme.spacing.md }}>
            {activeRelatedTab === 'seller' ? (
              <View>
                {sellerListingsLoading ? (
                  <View>
                    <Grid columns={2} spacing={4}>
                      {Array.from({ length: 4 }).map((_, index) => (
                        <LoadingSkeleton
                          key={index}
                          width="100%"
                          height={200}
                          borderRadius={theme.borderRadius.lg}
                        />
                      ))}
                    </Grid>
                  </View>
                ) : sellerListings.length > 0 ? (
                  <View>
                    <FlatList
                      data={sellerListings.slice(0, 6)}
                      numColumns={2}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <View style={{ flex: 1, margin: 2 }}>
                        <ProductCard
                          image={item.image}
                          title={item.title}
                          price={item.price}
                          seller={item.seller}
                          badge={item.badge}
                          location={item.location}
                          layout="grid"
                          fullWidth={true}
                          onPress={() => router.push(`/(tabs)/home/${item.id}`)}
                        />
                        </View>
                      )}
                      // Performance optimizations
                      removeClippedSubviews={true}
                      maxToRenderPerBatch={4}
                      updateCellsBatchingPeriod={100}
                      initialNumToRender={4}
                      windowSize={10}
                      getItemLayout={(data, index) => ({
                        length: 200,
                        offset: 200 * Math.floor(index / 2),
                        index,
                      })}
                      scrollEnabled={false}
                    />
                    
                    {sellerListings.length > 6 && (
                      <Button
                        variant="tertiary"
                        onPress={() => router.push(`/profile/${listing.user_id}`)}
                        fullWidth
                        style={{ marginTop: theme.spacing.md, marginHorizontal: theme.spacing.lg }}
                      >
                        View All {sellerListings.length} Items
                      </Button>
                    )}
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: theme.spacing.lg }}>
                    <EmptyState
                      icon={<Package size={48} color={theme.colors.text.muted} />}
                      title="No other items"
                      description={`${listing.profiles?.first_name} doesn't have any other active listings`}
                    />
                  </View>
                )}
              </View>
            ) : activeRelatedTab === 'similar' ? (
              <View>
                {similarListingsLoading ? (
                  <View>
                    <Grid columns={2} spacing={4}>
                      {Array.from({ length: 4 }).map((_, index) => (
                        <LoadingSkeleton
                          key={index}
                          width="100%"
                          height={200}
                          borderRadius={theme.borderRadius.lg}
                        />
                      ))}
                    </Grid>
                  </View>
                ) : similarListings.length > 0 ? (
                  <View>
                    <FlatList
                      data={similarListings.slice(0, 6)}
                      numColumns={2}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <View style={{ flex: 1, margin: 2 }}>
                        <ProductCard
                          image={item.image}
                          title={item.title}
                          price={item.price}
                          seller={item.seller}
                          badge={item.badge}
                          location={item.location}
                          layout="grid"
                          fullWidth={true}
                          onPress={() => router.push(`/(tabs)/home/${item.id}`)}
                        />
                        </View>
                      )}
                      // Performance optimizations
                      removeClippedSubviews={true}
                      maxToRenderPerBatch={4}
                      updateCellsBatchingPeriod={100}
                      initialNumToRender={4}
                      windowSize={10}
                      getItemLayout={(data, index) => ({
                        length: 200,
                        offset: 200 * Math.floor(index / 2),
                        index,
                      })}
                      scrollEnabled={false}
                    />
                    
                    {similarListings.length > 6 && (
                      <Button
                        variant="tertiary"
                        onPress={() => {
                          // Navigate to category view with filters
                          router.push('/(tabs)/home');
                        }}
                        fullWidth
                        style={{ marginTop: theme.spacing.md, marginHorizontal: theme.spacing.lg }}
                      >
                        View All Similar Items
                      </Button>
                    )}
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: theme.spacing.lg }}>
                    <EmptyState
                      icon={<Package size={48} color={theme.colors.text.muted} />}
                      title="No similar items"
                      description="We couldn't find similar items in this category"
                    />
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </View>

        {/* Recommendation System */}
        {listingId && (
          <ListingRecommendations
            listingId={listingId}
            onListingPress={(id) => router.push(`/(tabs)/home/${id}`)}
            onViewAllCategory={() => router.push('/(recommendations)/personalized' as any)}
            onViewAllCollaborative={() => router.push('/(recommendations)/personalized' as any)}
          />
        )}
      </ScrollView>

      {/* Contact Modal */}
      <AppModal
        position="bottom"
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact Seller"
        primaryAction={{
          text: 'Send Message',
          onPress: handleContactSeller,
          loading: sendingMessage,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowContactModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="body" color="secondary">
            Send a message to {listing.profiles?.first_name} about this listing
          </Text>

          <Input
            variant="multiline"
            placeholder="Hi! I'm interested in your listing..."
            value={messageText}
            onChangeText={setMessageText}
          />
        </View>
      </AppModal>

      {/* Callback Request Modal */}
      <AppModal
        position="bottom"
        visible={showCallbackModal}
        onClose={() => setShowCallbackModal(false)}
        title="Request Callback"
        size="lg"
        primaryAction={{
          text: 'Request Callback',
          onPress: handleRequestCallback,
          loading: sendingCallback,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowCallbackModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="body" color="secondary">
            Request a callback from {listing.profiles?.first_name} about this listing
          </Text>

          <Input
            label="Your Phone Number"
            placeholder="Enter your phone number"
            value={callbackPhone}
            onChangeText={setCallbackPhone}
            keyboardType="phone-pad"
          />

          <View>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
              Preferred Time
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {['anytime', 'morning', 'afternoon', 'evening'].map((time) => (
                <TouchableOpacity
                  key={time}
                  onPress={() => setCallbackTime(time)}
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: callbackTime === time ? theme.colors.primary : theme.colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: callbackTime === time ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Text
                    variant="bodySmall"
                    style={{
                      color: callbackTime === time ? theme.colors.primaryForeground : theme.colors.text.primary,
                      fontWeight: '500',
                      textTransform: 'capitalize',
                    }}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            variant="multiline"
            label="Message (Optional)"
            placeholder="Any specific details about when to call..."
            value={callbackMessage}
            onChangeText={setCallbackMessage}
          />
        </View>
      </AppModal>

      {/* Make Offer Modal */}
      <AppModal
      size='lg'
        position="bottom"
        visible={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        title="Make an Offer"
        primaryAction={{
          text: 'Send Offer',
          onPress: handleMakeOffer,
          loading: sendingOffer,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowOfferModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.md }}>
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
            }}
          >
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
              Making offer for:
            </Text>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              {listing.title}
            </Text>
            <PriceDisplay
              amount={listing.price}
              size="md"
              style={{ marginBottom: theme.spacing.xs }}
            />
            <Text variant="caption" color="muted">
              Seller accepts offers
            </Text>
          </View>

          <Input
            label="Your Offer (GHS)"
            placeholder="Enter your offer amount"
            value={offerAmount}
            onChangeText={setOfferAmount}
            keyboardType="numeric"
            helper={`Current price: GHS ${(listing.price || 0).toLocaleString()}`}
          />

          <Input
            variant="multiline"
            label="Message (Optional)"
            placeholder="Add a message with your offer..."
            value={offerMessage}
            onChangeText={setOfferMessage}
            helper="Explain why this is a fair offer"
          />
        </View>
      </AppModal>

      {/* Quick Edit Modal */}
      {listing && (
        <QuickEditModal
          visible={showQuickEditModal}
          onClose={() => setShowQuickEditModal(false)}
          listing={{
            id: listing.id,
            title: listing.title,
            price: listing.price,
            description: listing.description,
            previous_price: listing.previous_price,
          }}
          onSuccess={async (updatedListing) => {
            // Debug: Log what we received from quick edit
            console.log('📥 Received from quick edit:', updatedListing);
            
            // Refetch the listing to get the trigger-updated fields (previous_price, price_changed_at)
            try {
              const { data: refreshedListing, error: refreshError } = await supabase
                .from('listings_with_pro_status')
                .select('*')
                .eq('id', listing.id)
                .single();

              if (!refreshError && refreshedListing) {
                console.log('📥 Refetched listing:', {
                  price: refreshedListing.price,
                  previous_price: refreshedListing.previous_price,
                  price_changed_at: refreshedListing.price_changed_at
                });
                setListing((prev: any) => ({
                  ...prev,
                  ...refreshedListing,
                }));
              } else {
                console.log('⚠️ Refetch failed, using manual update');
                // Fallback to manual update if refetch fails
                setListing((prev: any) => ({
                  ...prev,
                  price: updatedListing.price,
                  description: updatedListing.description,
                  previous_price: updatedListing.previous_price,
                  price_changed_at: updatedListing.price_changed_at,
                }));
              }
            } catch (err) {
              console.error('Error refetching listing:', err);
            }
            
            // Show success toast
            setToastMessage('Listing updated successfully!');
            setToastVariant('success');
            setShowToast(true);
          }}
        />
      )}

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />

      {/* Moderation Error Modal */}
      <AppModal
        visible={showModerationModal}
        onClose={() => setShowModerationModal(false)}
        title="Cannot Send Message"
        size="sm"
        primaryAction={{
          text: 'OK',
          onPress: () => setShowModerationModal(false),
        }}
      >
        <Text style={{ color: theme.colors.text.secondary, lineHeight: 22 }}>
          {moderationError}
        </Text>
      </AppModal>

      {/* Media Viewer (Images & Videos) */}
      <Suspense fallback={null}>
        <MediaViewer
          visible={mediaViewerVisible}
          media={media}
          initialIndex={mediaViewerIndex}
          onClose={closeMediaViewer}
        />
      </Suspense>

    </SafeAreaWrapper>
  );
}