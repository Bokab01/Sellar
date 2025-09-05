import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, TouchableOpacity, Alert, Linking, Dimensions, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { dbHelpers, supabase } from '@/lib/supabase';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Button,
  Avatar,
  Badge,
  PriceDisplay,

  CompactReviewSummary,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  AppModal,
  Input,
  Toast,
  Grid,
  ProductCard,
  ImageViewer,
  ReviewsList,
} from '@/components';
import { useImageViewer } from '@/hooks/useImageViewer';
import { Heart, Share, MessageCircle, Phone, PhoneCall, DollarSign, ArrowLeft, Package } from 'lucide-react-native';

export default function ListingDetailScreen() {
  const { theme } = useTheme();
  const { id: listingId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollViewRef = React.useRef<ScrollView>(null);
  
  // Contact modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [callbackRequested, setCallbackRequested] = useState(false);
  
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
  
  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  // Related items state
  const [activeRelatedTab, setActiveRelatedTab] = useState<'seller' | 'similar' | 'reviews'>('seller');
  const [sellerListings, setSellerListings] = useState<any[]>([]);
  const [similarListings, setSimilarListings] = useState<any[]>([]);
  const [sellerListingsLoading, setSellerListingsLoading] = useState(false);
  const [similarListingsLoading, setSimilarListingsLoading] = useState(false);

  // Image viewer
  const images = listing?.images || [];
  const {
    visible: imageViewerVisible,
    currentIndex: imageViewerIndex,
    openViewer: openImageViewer,
    closeViewer: closeImageViewer,
    // shareImage,
    // downloadImage,
  } = useImageViewer({ images, initialIndex: currentImageIndex });

  useEffect(() => {
    if (listingId) {
      fetchListing();
      checkIfFavorited();
      checkCallbackStatus();
      checkPendingOffer();
      incrementViewCount();
      fetchRelatedItems();
    }
  }, [listingId]);

  useEffect(() => {
    if (listing) {
      fetchRelatedItems();
    }
  }, [listing]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, try the joined query
      let { data, error: fetchError } = await supabase
        .from('listings')
        .select(`
          *,
          profiles (
            id,
            first_name,
            last_name,
            avatar_url,
            rating,
            total_sales,
            total_reviews,
            is_verified,
            is_online,
            last_seen,
            response_time,
            location,
            phone
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
        
        // Get listing without joins
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single();

        if (listingError) {
          setError(listingError.message);
          return;
        }

        if (!listingData) {
          setError('Listing not found');
          return;
        }

        // Get profile and category data separately
        const [profileResult, categoryResult] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, avatar_url, rating, total_sales, total_reviews, is_verified, is_online, last_seen, response_time, location, phone').eq('id', (listingData as any).user_id).single(),
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
        setError(fetchError.message);
      } else {
        setListing(data);
      }
    } catch (err) {
      setError('Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

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

  const fetchRelatedItems = async () => {
    if (!listing) return;

    // Fetch seller's other items
    setSellerListingsLoading(true);
    try {
      let { data: sellerData, error: sellerError }: { data: any[] | null, error: any } = await supabase
        .from('listings')
        .select(`
          *,
          profiles (
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
        .limit(8);

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
      }

      if (sellerData) {
        const transformedSellerItems = sellerData.map((item: any) => ({
          id: item.id,
          image: item.images?.[0] || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg',
          title: item.title,
          price: item.price,
          seller: {
            name: `${item.profiles?.first_name} ${item.profiles?.last_name}`,
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

    // Fetch similar items (same category, different seller)
    setSimilarListingsLoading(true);
    try {
      let { data: similarData, error: similarError }: { data: any[] | null, error: any } = await supabase
        .from('listings')
        .select(`
          *,
          profiles (
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
        .limit(8);

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
      }

      if (similarData) {
        const transformedSimilarItems = similarData.map((item: any) => ({
          id: item.id,
          image: item.images?.[0] || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg',
          title: item.title,
          price: item.price,
          seller: {
            name: `${item.profiles?.first_name} ${item.profiles?.last_name}`,
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
  };

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save favorites');
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
      }
    } catch (err) {
      showErrorToast('Failed to update favorites');
    }
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

    setSendingMessage(true);
    try {
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
        router.push(`/(tabs)/inbox/${conversationId}`);
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
      Alert.alert('Error', 'Please enter your phone number');
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

      // Create offer message first
      const offerContent = `💰 Offer: GHS ${amount.toLocaleString()}${offerMessage ? `\n\n"${offerMessage}"` : ''}`;
      
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

      if (messageError) throw messageError;

      // Create offer record
      const { error: offerError } = await dbHelpers.createOffer({
        listing_id: listingId!,
        conversation_id: conversationId,
        message_id: (message as any).id,
        buyer_id: user.id,
        seller_id: listing.user_id,
        amount,
        currency: 'GHS',
        message: offerMessage.trim() || null,
      });

      if (offerError) throw offerError;

      // Update local state
      setPendingOffer({
        amount,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      setShowOfferModal(false);
      setOfferAmount('');
      setOfferMessage('');
      showSuccessToast('Offer sent successfully!');
    } catch (err: any) {
      showErrorToast('Failed to send offer');
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
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Loading..."
          showBackButton
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={300} style={{ marginBottom: theme.spacing.lg }} />
          <LoadingSkeleton width="80%" height={24} style={{ marginBottom: theme.spacing.md }} />
          <LoadingSkeleton width="40%" height={32} style={{ marginBottom: theme.spacing.lg }} />
          <LoadingSkeleton width="100%" height={100} />
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Listing"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ErrorState
          message={error || 'Listing not found'}
          onRetry={fetchListing}
        />
      </SafeAreaWrapper>
    );
  }

  const isOwnListing = user?.id === listing.user_id;
  const canMakeOffer = listing.accept_offers && !isOwnListing && !pendingOffer;
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const imageHeight = screenHeight * 0.6; // More than half of screen

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Fixed Header Overlay */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: StatusBar.currentHeight || 44,
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
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <TouchableOpacity
            onPress={toggleFavorite}
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
            <Heart 
              size={20} 
              color={isFavorited ? theme.colors.error : "white"} 
              fill={isFavorited ? theme.colors.error : 'none'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Coming Soon', 'Sharing feature will be available soon');
            }}
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
            <Share size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section */}
        <View style={{ position: 'relative', height: imageHeight }}>
          {listing.images && listing.images.length > 0 ? (
            <>
              <ScrollView
                ref={imageScrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                  setCurrentImageIndex(index);
                }}
              >
                {listing.images.map((imageUrl: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => openImageViewer(index)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={{
                        width: screenWidth,
                        height: imageHeight,
                        backgroundColor: theme.colors.surfaceVariant,
                      }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
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
                    {listing.images.map((imageUrl: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setCurrentImageIndex(index);
                          // Scroll main image to selected thumbnail
                          imageScrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
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
                          source={{ uri: imageUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Image Counter */}
              {listing.images.length > 1 && (
                <View
                  style={{
                    position: 'absolute',
                    top: StatusBar.currentHeight ? StatusBar.currentHeight + 60 : 104,
                    right: theme.spacing.lg,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.borderRadius.full,
                  }}
                >
                  <Text variant="caption" style={{ color: 'white', fontWeight: '500' }}>
                    {currentImageIndex + 1} / {listing.images.length}
                  </Text>
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
          <View style={{ 
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Avatar
                name={`${listing.profiles.first_name} ${listing.profiles.last_name}`}
                source={listing.profiles.avatar_url}
                size="lg"
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text variant="h4" style={{ fontWeight: '600' }}>
                    {listing.profiles.first_name} {listing.profiles.last_name}
                  </Text>
                  {listing.profiles.is_verified && (
                    <Badge text="Verified" variant="success" size="sm" />
                  )}
                </View>
                <View style={{ marginTop: theme.spacing.xs }}>
                  <CompactReviewSummary userId={listing.profiles.id} />
                </View>
                <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.xs }}>
                  📍 {listing.profiles.location}
                </Text>
              </View>
              
              {/* Call Seller Button */}
              {!isOwnListing && listing.profiles?.phone && (
                <TouchableOpacity
                  onPress={handleCall}
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.md,
                    borderRadius: theme.borderRadius.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                  }}
                >
                  <Phone size={16} color={theme.colors.primaryForeground} />
                  <Text variant="button" style={{ color: theme.colors.primaryForeground }}>
                    Call seller
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          {/* Title and Price */}
          <View style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
            <Text variant="h2" style={{ marginBottom: theme.spacing.md }}>
              {listing.title}
            </Text>
            
            <PriceDisplay
              amount={listing.price}
              currency={listing.currency}
              size="xl"
              style={{ marginBottom: theme.spacing.md }}
            />

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Badge text={listing.condition} variant="info" />
              <Badge text={`${listing.quantity} available`} variant="neutral" />
              {listing.accept_offers && (
                <Badge text="Accepts Offers" variant="success" />
              )}
            </View>
          </View>

          {/* Pending Offer Status */}
          {pendingOffer && (
            <View
              style={{
                backgroundColor: theme.colors.warning + '10',
                borderColor: theme.colors.warning,
                borderWidth: 1,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
              }}
            >
              <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                💰 Offer Pending
              </Text>
              <Text variant="bodySmall" color="secondary">
                Your offer of GHS {pendingOffer.amount.toLocaleString()} is waiting for the seller&apos;s response.
              </Text>
            </View>
          )}

          {/* Description */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Description
            </Text>
            <Text variant="body" style={{ lineHeight: 24 }}>
              {listing.description}
            </Text>
          </View>

          {/* Location */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Location
            </Text>
            <Text variant="body" color="secondary">
              📍 {listing.location}
            </Text>
          </View>

          {/* Stats */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.xl,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h4" style={{ fontWeight: '700' }}>
                  {listing.views_count || 0}
                </Text>
                <Text variant="caption" color="muted">
                  Views
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h4" style={{ fontWeight: '700' }}>
                  {listing.favorites_count || 0}
                </Text>
                <Text variant="caption" color="muted">
                  Favorites
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h4" style={{ fontWeight: '700' }}>
                  {new Date(listing.created_at).toLocaleDateString()}
                </Text>
                <Text variant="caption" color="muted">
                  Listed
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Related Items Tabs */}
        <View style={{ marginTop: theme.spacing.xl }}>
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
                paddingVertical: theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg,
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
                paddingVertical: theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg,
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

            <TouchableOpacity
              onPress={() => setActiveRelatedTab('reviews')}
              style={{
                flex: 1,
                paddingVertical: theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg,
                borderBottomWidth: 2,
                borderBottomColor: activeRelatedTab === 'reviews' ? theme.colors.primary : 'transparent',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text
                variant="button"
                style={{
                  color: activeRelatedTab === 'reviews' ? theme.colors.primary : theme.colors.text.secondary,
                  fontWeight: activeRelatedTab === 'reviews' ? '600' : '500',
                }}
              >
                Reviews
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={{ backgroundColor: theme.colors.surface, paddingTop: theme.spacing.lg }}>
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
                    <Grid columns={2} spacing={4}>
                      {sellerListings.slice(0, 6).map((item) => (
                        <ProductCard
                          key={item.id}
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
                      ))}
                    </Grid>
                    
                    {sellerListings.length > 6 && (
                      <Button
                        variant="tertiary"
                        onPress={() => router.push(`/profile/${listing.user_id}`)}
                        fullWidth
                        style={{ marginTop: theme.spacing.lg, marginHorizontal: theme.spacing.lg }}
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
                    <Grid columns={2} spacing={4}>
                      {similarListings.slice(0, 6).map((item) => (
                        <ProductCard
                          key={item.id}
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
                      ))}
                    </Grid>
                    
                    {similarListings.length > 6 && (
                      <Button
                        variant="tertiary"
                        onPress={() => {
                          // Navigate to category view with filters
                          router.push('/(tabs)/home');
                        }}
                        fullWidth
                        style={{ marginTop: theme.spacing.lg, marginHorizontal: theme.spacing.lg }}
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
            ) : activeRelatedTab === 'reviews' ? (
              <View style={{ paddingHorizontal: theme.spacing.lg }}>
                <ReviewsList
                  userId={listing?.profiles?.id}
                  showWriteReview={true}
                  reviewedUserName={`${listing?.profiles?.first_name} ${listing?.profiles?.last_name}`}
                  listingId={listingId}
                  listingTitle={listing?.title}
                  isVerifiedPurchase={false} // TODO: Check if user has purchased this item
                />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Tab Actions */}
      {!isOwnListing && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.lg,
            paddingBottom: theme.spacing.lg + (StatusBar.currentHeight ? 0 : 20),
            ...theme.shadows.lg,
          }}
        >
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {/* Make an Offer Button */}
            {canMakeOffer ? (
              <TouchableOpacity
                onPress={() => setShowOfferModal(true)}
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                  borderRadius: theme.borderRadius.md,
                  paddingVertical: theme.spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing.sm,
                }}
              >
                <DollarSign size={20} color={theme.colors.primary} />
                <Text variant="button" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  Make an offer
                </Text>
              </TouchableOpacity>
            ) : pendingOffer ? (
              <TouchableOpacity
                disabled
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius.md,
                  paddingVertical: theme.spacing.lg,
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
            ) : null}

            {/* Message Seller Button */}
            <TouchableOpacity
              onPress={() => setShowContactModal(true)}
              style={{
                flex: 1,
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.md,
                paddingVertical: theme.spacing.lg,
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
          </View>
        </View>
      )}

      {/* Contact Modal */}
      <AppModal
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
        <View style={{ gap: theme.spacing.lg }}>
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
        visible={showCallbackModal}
        onClose={() => setShowCallbackModal(false)}
        title="Request Callback"
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
        <View style={{ gap: theme.spacing.lg }}>
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
        <View style={{ gap: theme.spacing.lg }}>
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
              Making offer for:
            </Text>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
              {listing.title}
            </Text>
            <PriceDisplay
              amount={listing.price}
              size="md"
              style={{ marginBottom: theme.spacing.sm }}
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
            helper={`Current price: GHS ${listing.price.toLocaleString()}`}
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

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />

      {/* Image Viewer */}
      <ImageViewer
        visible={imageViewerVisible}
        images={images}
        initialIndex={imageViewerIndex}
        onClose={closeImageViewer}
      />
    </View>
  );
}