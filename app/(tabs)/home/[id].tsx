import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, TouchableOpacity, Alert, Linking, Dimensions } from 'react-native';
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
  UserProfile,
  ReviewCard,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  AppModal,
  Input,
  Toast,
} from '@/components';
import { Heart, Share, MessageCircle, Phone, Flag, Eye, PhoneCall, DollarSign } from 'lucide-react-native';
import { Package } from 'lucide-react-native';

export default function ListingDetailScreen() {
  const { theme } = useTheme();
  const { id: listingId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  
  // Contact modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  
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
  const [callbackRequested, setCallbackRequested] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<any>(null);
  
  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  // Related items state
  const [activeRelatedTab, setActiveRelatedTab] = useState<'seller' | 'similar'>('seller');
  const [sellerListings, setSellerListings] = useState<any[]>([]);
  const [similarListings, setSimilarListings] = useState<any[]>([]);
  const [sellerListingsLoading, setSellerListingsLoading] = useState(false);
  const [similarListingsLoading, setSimilarListingsLoading] = useState(false);

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

      const { data, error: fetchError } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:user_id (
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

      if (fetchError) {
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
        });

      // Increment counter
      await supabase.rpc('increment_listing_views', { listing_id: listingId });
    } catch (err) {
      // Silent fail for analytics
    }
  };

  const fetchRelatedItems = async () => {
    if (!listing) return;

    // Fetch seller's other items
    setSellerListingsLoading(true);
    try {
      const { data: sellerData } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:user_id (
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
          badge: item.boost_expires_at && new Date(item.boost_expires_at) > new Date() 
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
      const { data: similarData } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:user_id (
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
          badge: item.boost_expires_at && new Date(item.boost_expires_at) > new Date() 
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
          });
        
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

      let conversationId = existingConv?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            listing_id: listingId!,
            participant_1: user.id,
            participant_2: listing.user_id,
          })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Send message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageText.trim(),
        });

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

      let conversationId = existingConv?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            listing_id: listingId!,
            participant_1: user.id,
            participant_2: listing.user_id,
          })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
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
        })
        .select('id')
        .single();

      if (messageError) throw messageError;

      // Create offer record
      const { error: offerError } = await dbHelpers.createOffer({
        listing_id: listingId!,
        conversation_id: conversationId,
        message_id: message.id,
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

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Product Details"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            variant="icon"
            icon={<Heart size={20} color={isFavorited ? theme.colors.error : theme.colors.text.primary} fill={isFavorited ? theme.colors.error : 'none'} />}
            onPress={toggleFavorite}
          />,
          <Button
            variant="icon"
            icon={<Share size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // TODO: Implement sharing
              Alert.alert('Coming Soon', 'Sharing feature will be available soon');
            }}
          />,
        ]}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        {/* Images */}
        <View style={{ marginBottom: theme.spacing.lg }}>
          {listing.images && listing.images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {listing.images.map((imageUrl: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri: imageUrl }}
                  style={{
                    width: Dimensions.get('window').width,
                    height: 300,
                    backgroundColor: theme.colors.surfaceVariant,
                  }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View
              style={{
                width: '100%',
                height: 300,
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
                Seller's Items
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
          </View>

          {/* Tab Content */}
          <View style={{ backgroundColor: theme.colors.surface, paddingTop: theme.spacing.lg }}>
            {activeRelatedTab === 'seller' ? (
              <View>
                {sellerListingsLoading ? (
                  <View style={{ paddingHorizontal: theme.spacing.lg }}>
                    <Grid columns={2}>
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
                  <View style={{ paddingHorizontal: theme.spacing.lg }}>
                    <Grid columns={2}>
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
                          onPress={() => router.push(`/(tabs)/home/${item.id}`)}
                        />
                      ))}
                    </Grid>
                    
                    {sellerListings.length > 6 && (
                      <Button
                        variant="tertiary"
                        onPress={() => router.push(`/(tabs)/profile/${listing.user_id}`)}
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
            ) : (
              <View>
                {similarListingsLoading ? (
                  <View style={{ paddingHorizontal: theme.spacing.lg }}>
                    <Grid columns={2}>
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
                  <View style={{ paddingHorizontal: theme.spacing.lg }}>
                    <Grid columns={2}>
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
                          onPress={() => router.push(`/(tabs)/home/${item.id}`)}
                        />
                      ))}
                    </Grid>
                    
                    {similarListings.length > 6 && (
                      <Button
                        variant="tertiary"
                        onPress={() => {
                          // Navigate to category view with filters
                          router.push('/(tabs)');
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
            )}
          </View>
        </View>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          {/* Title and Price */}
          <View style={{ marginBottom: theme.spacing.lg }}>
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
                Your offer of GHS {pendingOffer.amount.toLocaleString()} is waiting for the seller's response.
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

          {/* Seller Profile */}
          {listing.profiles && (
            <View style={{ marginBottom: theme.spacing.xl }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Seller Information
              </Text>
              <UserProfile
                user={{
                  id: listing.profiles.id,
                  name: `${listing.profiles.first_name} ${listing.profiles.last_name}`,
                  avatar: listing.profiles.avatar_url,
                  rating: listing.profiles.rating,
                  reviewCount: listing.profiles.total_reviews,
                  location: listing.profiles.location,
                  isVerified: listing.profiles.is_verified,
                  isOnline: listing.profiles.is_online,
                  responseTime: listing.profiles.response_time,
                  totalSales: listing.profiles.total_sales,
                }}
                variant="full"
                showActions={!isOwnListing}
                onMessage={() => setShowContactModal(true)}
                onCall={handleCall}
                onViewProfile={() => router.push(`/(tabs)/profile/${listing.profiles.id}`)}
              />
            </View>
          )}

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
      </ScrollView>

      {/* Bottom Actions */}
      {!isOwnListing && (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            padding: theme.spacing.lg,
            ...theme.shadows.lg,
          }}
        >
          <View style={{ gap: theme.spacing.md }}>
            {/* Primary Actions Row */}
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Button
                variant="primary"
                icon={<MessageCircle size={18} color={theme.colors.primaryForeground} />}
                onPress={() => setShowContactModal(true)}
                style={{ flex: 1 }}
              >
                Message
              </Button>
              
              {canMakeOffer && (
                <Button
                  variant="secondary"
                  icon={<DollarSign size={18} color={theme.colors.primary} />}
                  onPress={() => setShowOfferModal(true)}
                  style={{ flex: 1 }}
                >
                  Make Offer
                </Button>
              )}

              {!canMakeOffer && listing.accept_offers && pendingOffer && (
                <Button
                  variant="tertiary"
                  disabled
                  style={{ flex: 1 }}
                >
                  Offer Pending
                </Button>
              )}
            </View>

            {/* Secondary Actions Row */}
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              {listing.profiles?.phone && (
                <Button
                  variant="tertiary"
                  icon={<Phone size={18} color={theme.colors.primary} />}
                  onPress={handleCall}
                  style={{ flex: 1 }}
                >
                  Call Now
                </Button>
              )}

              <Button
                variant={callbackRequested ? "tertiary" : "ghost"}
                icon={<PhoneCall size={18} color={callbackRequested ? theme.colors.text.muted : theme.colors.primary} />}
                onPress={callbackRequested ? undefined : () => setShowCallbackModal(true)}
                disabled={callbackRequested}
                style={{ flex: 1 }}
              >
                {callbackRequested ? 'Callback Requested' : 'Request Callback'}
              </Button>
            </View>
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
            style={{ minHeight: 100 }}
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
    </SafeAreaWrapper>
  );
}