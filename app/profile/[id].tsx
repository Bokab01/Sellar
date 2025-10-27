import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase, dbHelpers } from '@/lib/supabase';
import { useListings } from '@/hooks/useListings';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { getDisplayName } from '@/hooks/useDisplayName';
import { useReviewStats } from '@/hooks/useReviews';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Avatar,
  Badge,
  Button,
  Rating,
  ProductCard,
  ReviewCard,
  ReviewsList,
  ReviewSummary,
  CompactReviewSummary,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Toast,
  Grid,
  Chip,
  UserDisplayName,
  EnhancedReviewCard,
  AppModal,
} from '@/components';
import { UserBadgeSystem } from '@/components/UserBadgeSystem';
import { ReputationDisplay } from '@/components/ReputationDisplay/ReputationDisplay';
import { 
  MessageCircle, 
  Phone, 
  UserPlus2, 
  UserMinus, 
  MapPin, 
  Calendar, 
  Star,
  Package,
  Users,
  MessageSquare,
  Info,
  MoreVertical,
  X,
  Briefcase,
  Mail,
  Globe,
  Flag
} from 'lucide-react-native';
import { ReportButton } from '@/components/ReportButton/ReportButton';

// Helper function to format response time expectation
const formatResponseTime = (responseTime: string): string => {
  const timeMap: Record<string, string> = {
    'within_minutes': 'within minutes',
    'within_hours': 'within hours', 
    'within_day': 'within a day',
    'within_week': 'within a week'
  };
  return timeMap[responseTime] || responseTime;
};

type TabType = 'listings' | 'reviews' | 'about' | 'posts';

export default function UserProfileScreen() {
  const { theme } = useTheme();
  const { id: profileId, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { user: currentUser } = useAuthStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) || 'listings');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [totalListingsCount, setTotalListingsCount] = useState(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Get user's listings
  const { 
    listings: userListings, 
    loading: listingsLoading,
    refresh: refreshListings 
  } = useListings({
    // TODO: Add user filter to useListings hook
  });

  // Get user's posts
  const { 
    posts: userPosts, 
    loading: postsLoading,
    refresh: refreshPosts 
  } = useCommunityPosts({
    // TODO: Add user filter to useCommunityPosts hook
  });

  // Get review stats to conditionally show review summary
  const { stats: reviewStats } = useReviewStats(profileId || '');

  // Get favorites store
  const { 
    favorites, 
    toggleFavorite,
    incrementListingFavoriteCount,
    decrementListingFavoriteCount 
  } = useFavoritesStore();

  // Check if viewing own profile
  const isOwnProfile = currentUser?.id === profileId;

  useEffect(() => {
    if (profileId) {
      fetchProfile();
      checkFollowStatus();
      fetchTotalListingsCount();
    }
  }, [profileId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Fetch profile with Sellar Pro subscription status
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        // Check if user has active Sellar Pro subscription
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('status, current_period_end, plan_id, subscription_plans(name)')
          .eq('user_id', profileId)
          .in('status', ['active', 'trialing', 'cancelled'])
          .single();

        const isSellarPro = subscription && 
          (subscription as any).subscription_plans?.name === 'Sellar Pro' &&
          (subscription.current_period_end ? new Date(subscription.current_period_end) > new Date() : true);

        setProfile({ ...data, is_sellar_pro: isSellarPro });
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };


  const checkFollowStatus = async () => {
    if (!currentUser || currentUser.id === profileId) return;

    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileId)
        .single();

      setIsFollowing(!!data);
    } catch (err) {
      // Not following
    }
  };

  const fetchTotalListingsCount = async () => {
    if (!profileId) return;
    
    try {
      const { count, error } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('status', 'active');

      if (error) throw error;
      setTotalListingsCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching total listings count:', err);
    }
  };

  // Reviews fetching is now handled by useReviews hook in ReviewsList component

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      checkFollowStatus(),
      fetchTotalListingsCount(), // Already parallel
      refreshListings(),
      refreshPosts(),
    ]);
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!currentUser || currentUser.id === profileId) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileId);

        if (error) throw error;
        
        setIsFollowing(false);
        setToastMessage('Unfollowed successfully');
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: profileId!,
          });

        if (error) {
          if (error.code === '23505') {
            // Already following, just update state - this is not an error
            setIsFollowing(true);
            setToastMessage('Following successfully');
          } else {
            throw error;
          }
        } else {
          setIsFollowing(true);
          setToastMessage('Following successfully');
        }
      }
      
      setShowToast(true);
    } catch (err: any) {
      Alert.alert('Error', `Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle favorite toggle (with database save)
  const handleFavoriteToggle = useCallback(async (listingId: string) => {
    const isFavorited = favorites[listingId] || false;
    
    // Optimistic update
    toggleFavorite(listingId);
    if (isFavorited) {
      decrementListingFavoriteCount(listingId);
    } else {
      incrementListingFavoriteCount(listingId);
    }

    // Save to database
    try {
      const { toggleFavorite: toggleFavoriteDB } = await import('@/lib/favoritesAndViews');
      const result = await toggleFavoriteDB(listingId);
      
      if (result.error) {
        // Revert on error
        toggleFavorite(listingId);
        if (isFavorited) {
          incrementListingFavoriteCount(listingId);
        } else {
          decrementListingFavoriteCount(listingId);
        }
      }
    } catch (error) {
      // Revert on error
      toggleFavorite(listingId);
      if (isFavorited) {
        incrementListingFavoriteCount(listingId);
      } else {
        decrementListingFavoriteCount(listingId);
      }
    }
  }, [favorites, toggleFavorite, incrementListingFavoriteCount, decrementListingFavoriteCount]);

  const handleMessage = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to send messages');
      return;
    }

    try {
      // Check if conversation already exists (including those without listing_id)
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .is('listing_id', null) // Only get direct conversations (not listing-specific)
        .or(`and(participant_1.eq.${currentUser.id},participant_2.eq.${profileId}),and(participant_1.eq.${profileId},participant_2.eq.${currentUser.id})`)
        .maybeSingle();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        // Create new conversation without listing_id (direct message)
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant_1: currentUser.id,
            participant_2: profileId!,
            listing_id: null, // Explicitly set to null for direct messages
          })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Navigate to chat (using push to maintain back navigation)
      router.push(`/chat-detail/${conversationId}` as any);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleCall = () => {
    if (!profile?.phone) {
      setShowCallModal(true);
      return;
    }

    setShowCallModal(true);
  };

  const handleReportUser = () => {
    setShowOptionsMenu(false);
    // Navigate to report screen with user details
    router.push({
      pathname: '/report',
      params: {
        targetType: 'user',
        targetId: profileId,
        targetName: displayName,
        targetAvatar: profile?.avatar_url || ''
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Profile"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
            <LoadingSkeleton width={96} height={96} borderRadius={48} style={{ marginBottom: theme.spacing.lg }} />
            <LoadingSkeleton width="60%" height={24} style={{ marginBottom: theme.spacing.sm }} />
            <LoadingSkeleton width="40%" height={16} />
          </View>
          <LoadingSkeleton width="100%" height={200} />
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Profile"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ErrorState
          message={error || 'Profile not found'}
          onRetry={fetchProfile}
        />
      </SafeAreaWrapper>
    );
  }

  const displayName = profile ? getDisplayName(profile, false).displayName : 'User';

  // Filter user's listings and posts
  const filteredListings = userListings.filter((listing: any) => listing.user_id === profileId);
  const filteredPosts = userPosts.filter((post: any) => post.user_id === profileId);

  const transformedListings = filteredListings.map((listing: any) => ({
    id: listing.id,
    image: listing.images || ['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
    title: listing.title,
    price: listing.price,
    previous_price: listing.previous_price || null,
    price_changed_at: listing.price_changed_at || null,
    seller: {
      name: displayName,
      avatar: profile.avatar_url,
      rating: profile.rating || 0,
    },
    location: listing.location,
  }));

  // Reviews transformation is now handled by ReviewsList component

  const tabs = [
    { id: 'listings', label: 'Listings', count: totalListingsCount },
    { id: 'reviews', label: 'Reviews', count: null }, // Count will be handled by ReviewsList
    { id: 'about', label: 'About', count: null },
    { id: 'posts', label: 'Posts', count: filteredPosts.length },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'listings':
        return filteredListings.length > 0 ? (
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>Items</Text>
            
            <Grid columns={2} spacing={4}>
              {transformedListings.slice(0, 8).map((listing) => (
                <ProductCard
                  key={listing.id}
                  image={listing.image}
                  title={listing.title}
                  price={listing.price}
                  previousPrice={listing.previous_price}
                  priceChangedAt={listing.price_changed_at}
                  seller={listing.seller}
                  location={listing.location}
                  layout="grid"
                  fullWidth={true}
                  isFavorited={favorites[listing.id] || false}
                  onPress={() => router.push(`/(tabs)/home/${listing.id}`)}
                  onFavoritePress={isOwnProfile ? undefined : () => handleFavoriteToggle(listing.id)}
                />
              ))}
            </Grid>
            
            {totalListingsCount > 8 && (
              <Button
                variant="tertiary"
                onPress={() => router.push(`/seller-listings/${profileId}` as any)}
                fullWidth
                style={{ marginTop: theme.spacing.md }}
              >
                View All {totalListingsCount} Items
              </Button>
            )}
          </View>
        ) : (
          <EmptyState
            icon={<Package size={48} color={theme.colors.text.muted} />}
            title="No listings yet"
            description={isOwnProfile ? "You haven't created any listings yet" : `${profile.first_name} hasn't listed anything yet`}
          />
        );

      case 'reviews':
        return (
          <View>
            {/* Review Summary - Only show when there are reviews */}
            {reviewStats && reviewStats.total_reviews > 0 && (
              <ReviewSummary 
                userId={profileId!} 
                style={{ marginBottom: theme.spacing.lg }} 
              />
            )}
            
            {/* Reviews List */}
            <ReviewsList
              userId={profileId}
              showWriteReview={false}
              reviewedUserName={displayName}
            />
          </View>
        );

      case 'about':
        return (
          <View style={{ gap: theme.spacing.md }}>
            {/* Reputation Display */}
            {/* <ReputationDisplay
              userId={profileId!}
              variant="full"
              style={{ marginBottom: theme.spacing.md }}
            /> */}

            {/* Personal Bio Section */}
            {profile.bio && (
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                ...theme.shadows.sm,
              }}>
                <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                  About {profile.first_name}
                </Text>
                <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.primary }}>
                  {profile.bio}
                </Text>
              </View>
            )}

            {/* Business Description Section */}
            {profile.is_business && profile.business_description && (
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                ...theme.shadows.sm,
              }}>
                <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                  About {profile.business_name || 'Business'}
                </Text>
                <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.primary }}>
                  {profile.business_description}
                </Text>
              </View>
            )}

            {/* Empty State - when neither bio nor business description exists */}
            {!profile.bio && !profile.business_description && (
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                ...theme.shadows.sm,
              }}>
                <View style={{ alignItems: 'center', paddingVertical: theme.spacing.lg }}>
                  <Info size={32} color={theme.colors.text.muted} />
                  <Text variant="h4" style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                    {isOwnProfile ? "Tell others about yourself" : "No bio available"}
                  </Text>
                  <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                    {isOwnProfile 
                      ? "Add a bio to help others get to know you better" 
                      : `${profile.first_name} hasn't added a bio yet`
                    }
                  </Text>
                </View>
              </View>
            )}

            {/* Professional Details Card */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              ...theme.shadows.sm,
            }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
                Profile Details
              </Text>
              
              <View style={{ gap: theme.spacing.lg }}>
                {/* Location */}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.primary + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MapPin size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmall" color="secondary" style={{ marginBottom: 2 }}>
                      Location
                    </Text>
                    <Text variant="body" style={{ fontWeight: '500' }}>
                      {profile.location}
                    </Text>
                  </View>
                </View>

                {/* Member Since */}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.success + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Calendar size={18} color={theme.colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmall" color="secondary" style={{ marginBottom: 2 }}>
                      Member Since
                    </Text>
                    <Text variant="body" style={{ fontWeight: '500' }}>
                      {new Date(profile.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                </View>


                {/* Sales */}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.info + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Package size={18} color={theme.colors.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmall" color="secondary" style={{ marginBottom: 2 }}>
                      Successful Sales
                    </Text>
                    <Text variant="body" style={{ fontWeight: '500' }}>
                      {profile.total_sales || 0} completed transactions
                    </Text>
                  </View>
                </View>

                {/* Response Time */}
                {profile.response_time_expectation && (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: theme.colors.secondary + '15',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MessageCircle size={18} color={theme.colors.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySmall" color="secondary" style={{ marginBottom: 2 }}>
                        Response Time
                      </Text>
                      <Text variant="body" style={{ fontWeight: '500' }}>
                        Usually responds {formatResponseTime(profile.response_time_expectation)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Business Type */}
                {profile.is_business && profile.business_type && (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: theme.colors.primary + '15',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Briefcase size={18} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySmall" color="secondary" style={{ marginBottom: 2 }}>
                        Business Type
                      </Text>
                      <Text variant="body" style={{ fontWeight: '500' }}>
                        {profile.business_type}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Business Phone */}
                {profile.is_business && profile.business_phone && (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: theme.colors.success + '15',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Phone size={18} color={theme.colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySmall" color="secondary" style={{ marginBottom: 2 }}>
                        Business Phone
                      </Text>
                      <Text variant="body" style={{ fontWeight: '500' }}>
                        {profile.business_phone}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Business Email */}
                {profile.is_business && profile.business_email && (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: theme.colors.info + '15',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Mail size={18} color={theme.colors.info} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySmall" color="secondary" style={{ marginBottom: 2 }}>
                        Business Email
                      </Text>
                      <Text variant="body" style={{ fontWeight: '500' }}>
                        {profile.business_email}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Business Website */}
                {profile.is_business && profile.business_website && (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: theme.colors.secondary + '15',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Globe size={18} color={theme.colors.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySmall" color="secondary" style={{ marginBottom: 2 }}>
                        Website
                      </Text>
                      <Text variant="body" style={{ fontWeight: '500' }}>
                        {profile.business_website}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        );

      case 'posts':
        return postsLoading ? (
          <View style={{ gap: theme.spacing.md }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <LoadingSkeleton key={index} width="100%" height={150} borderRadius={theme.borderRadius.lg} />
            ))}
          </View>
        ) : filteredPosts.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {filteredPosts.map((post: any) => (
              <View
                key={post.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                  <Text variant="caption" color="muted">
                    {new Date(post.created_at).toLocaleDateString()}
                  </Text>
                  {post.location && (
                    <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.md }}>
                      📍 {post.location}
                    </Text>
                  )}
                </View>
                
                <Text variant="body" style={{ lineHeight: 22, marginBottom: theme.spacing.md }}>
                  {post.content}
                </Text>

                <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
                  <Text variant="caption" color="muted">
                    ❤️ {post.likes_count || 0}
                  </Text>
                  <Text variant="caption" color="muted">
                    💬 {post.comments_count || 0}
                  </Text>
                  <Text variant="caption" color="muted">
                    📤 {post.shares_count || 0}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<MessageSquare size={48} color={theme.colors.text.muted} />}
            title="No posts yet"
            description={isOwnProfile ? "You haven't shared any posts yet" : `${profile.first_name} hasn't shared any posts yet`}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Profile"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={
          currentUser && currentUser.id !== profileId ? [
            <TouchableOpacity
              key="options"
              onPress={() => setShowOptionsMenu(true)}
              style={{ padding: 8 }}
            >
              <MoreVertical size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          ] : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Profile Header */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            ...theme.shadows.sm,
          }}
        >
          {/* Avatar and Basic Info */}
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <Avatar
              source={profile.avatar_url}
              name={displayName}
              size="xl"
              isOnline={profile.is_online}
              showBorder
              style={{ marginBottom: theme.spacing.md }}
            />

            <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
              {/* Name and Rating */}
              <View style={{ alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <UserDisplayName
                  profile={profile}
                  variant="full"
                  showBadge={false}
                  textVariant="h2"
                  style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}
                />
                
                {/* Unified Badge System */}
                <UserBadgeSystem
                  isSellarPro={profile.is_sellar_pro}
                  isBusinessUser={profile.is_business}
                  isVerified={profile.is_verified}
                  isBusinessVerified={profile.verification_status === 'business_verified' || profile.verification_status === 'verified'}
                  size="medium"
                  variant="default"
                  style={{ marginBottom: theme.spacing.sm }}
                />
                
                {/* Rating */}
                <CompactReviewSummary userId={profileId!} />
              </View>


              {/* Location */}
              {profile.location && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: theme.spacing.xs,
                  marginBottom: theme.spacing.xs,
                }}>
                  <MapPin size={14} color={theme.colors.text.muted} />
                  <Text variant="caption" color="muted">
                    {profile.location}
                  </Text>
                </View>
              )}

              {/* Last Seen */}
              {profile.last_seen && !profile.is_online && (
                <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
                  Last seen {new Date(profile.last_seen).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              )}
            </View>


            {/* Action Buttons */}
            {!isOwnProfile && (
              <View style={{ 
                flexDirection: 'row', 
                gap: theme.spacing.sm, 
                width: '100%',
                paddingTop: theme.spacing.xs,
              }}>
                <Button
                  variant={isFollowing ? 'tertiary' : 'primary'}
                  size="md"
                  icon={isFollowing ? 
                    <UserMinus size={18} color={theme.colors.primary} /> : 
                    <UserPlus2 size={18} color={theme.colors.primaryForeground} />
                  }
                  onPress={handleFollow}
                  loading={followLoading}
                  style={{ flex: 1 }}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  icon={<MessageCircle size={18} color={theme.colors.primary} />}
                  onPress={handleMessage}
                  style={{ flex: 1 }}
                >
                  Message
                </Button>

                {profile.phone && (
                  <Button
                    variant="icon"
                    icon={<Phone size={20} color={theme.colors.primary} />}
                    onPress={handleCall}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: theme.borderRadius.lg,
                      borderWidth: 1,
                      borderColor: theme.colors.primary,
                    }}
                  />
                )}

              </View>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              gap: theme.spacing.sm,
            }}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as TabType)}
                style={{
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.lg,
                  borderBottomWidth: 2,
                  borderBottomColor: activeTab === tab.id ? theme.colors.primary : 'transparent',
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text
                    variant="button"
                    style={{
                      color: activeTab === tab.id ? theme.colors.primary : theme.colors.text.secondary,
                      fontWeight: activeTab === tab.id ? '600' : '500',
                    }}
                  >
                    {tab.label}
                  </Text>
                  {tab.count !== null && (
                    <View
                      style={{
                        backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.full,
                        paddingHorizontal: theme.spacing.sm,
                        paddingVertical: 2,
                        minWidth: 20,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color: activeTab === tab.id ? theme.colors.primaryForeground : theme.colors.text.muted,
                          fontSize: 10,
                          fontWeight: '600',
                        }}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={{ paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md }}>
          {renderTabContent()}
        </View>
      </ScrollView>

      {/* Call User Modal */}
      <AppModal
        position="center"
        visible={showCallModal}
        onClose={() => setShowCallModal(false)}
        title={!profile?.phone ? "No Phone Number" : ``}
        showCloseButton={true}
      >
        <View style={{ gap: theme.spacing.md, padding: theme.spacing.lg }}>
          <Text variant="h4" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
            {!profile?.phone 
              ? 'This user has not provided a phone number'
              : `You are about to call ${getDisplayName(profile, false).displayName}`
            }
          </Text>
          
          <View style={{ gap: theme.spacing.sm }}>
            {profile?.phone && (
              <Button
                variant="primary"
                fullWidth
                icon={<Phone size={18} color={theme.colors.primaryForeground} />}
                onPress={() => {
                  setShowCallModal(false);
                  Linking.openURL(`tel:${profile.phone}`);
                }}
              >
                Call
              </Button>
            )}
            
            <Button
              variant="icon"
              fullWidth
              onPress={() => setShowCallModal(false)}
              icon={<X size={18} color={theme.colors.error} />}
              style={{ borderColor: theme.colors.error, borderWidth: 1 }}
            >
              Cancel
            </Button>
          </View>
        </View>
      </AppModal>

      {/* Popup Menu */}
      {showOptionsMenu && (
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
            onPress={() => setShowOptionsMenu(false)}
            activeOpacity={1}
          />
          <View
            style={{
              position: 'absolute',
              top: 60,
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
            {/* Report Button */}
            <TouchableOpacity
              onPress={handleReportUser}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
              }}
            >
              <Flag size={18} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
              <Text variant="body" style={{ color: theme.colors.warning, fontSize: 14 }}>
                Report User
              </Text>
            </TouchableOpacity>

            {/* Block User Button */}
            <TouchableOpacity
              onPress={() => {
                setShowOptionsMenu(false);
                router.push({
                  pathname: '/block-user',
                  params: {
                    userId: profileId,
                    userName: displayName,
                    userAvatar: profile?.avatar_url || ''
                  }
                });
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
              }}
            >
              <UserMinus size={18} color={theme.colors.destructive} style={{ marginRight: theme.spacing.sm }} />
              <Text variant="body" style={{ color: theme.colors.destructive, fontSize: 14 }}>
                Block User
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}