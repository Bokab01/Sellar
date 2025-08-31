import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase, dbHelpers } from '@/lib/supabase';
import { useListings } from '@/hooks/useListings';
import { useCommunityPosts } from '@/hooks/useCommunity';
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
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Toast,
  Grid,
  Chip,
} from '@/components';
import { 
  MessageCircle, 
  Phone, 
  UserPlus, 
  UserMinus, 
  MapPin, 
  Calendar, 
  Star,
  Package,
  Users,
  MessageSquare,
  Info
} from 'lucide-react-native';

type TabType = 'listings' | 'reviews' | 'about' | 'posts';

export default function UserProfileScreen() {
  const { theme } = useTheme();
  const { id: profileId } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (profileId) {
      fetchProfile();
      checkFollowStatus();
      fetchReviews();
    }
  }, [profileId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProfile(data);
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

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          listings (
            title
          )
        `)
        .eq('reviewed_id', profileId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setReviews(data);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      checkFollowStatus(),
      fetchReviews(),
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

        if (error) throw error;
        
        setIsFollowing(true);
        setToastMessage('Following successfully');
      }
      
      setShowToast(true);
    } catch (err: any) {
      Alert.alert('Error', `Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to send messages');
      return;
    }

    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${currentUser.id},participant_2.eq.${profileId}),and(participant_1.eq.${profileId},participant_2.eq.${currentUser.id})`)
        .maybeSingle();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant_1: currentUser.id,
            participant_2: profileId!,
          })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Navigate to chat
      router.push(`/(tabs)/inbox/${conversationId}`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleCall = () => {
    if (!profile?.phone) {
      Alert.alert('No Phone Number', 'This user has not provided a phone number');
      return;
    }

    Alert.alert(
      'Call User',
      `Call ${profile.first_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${profile.phone}`);
          },
        },
      ]
    );
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

  const isOwnProfile = currentUser?.id === profileId;
  const fullName = `${profile.first_name} ${profile.last_name}`;

  // Filter user's listings and posts
  const filteredListings = userListings.filter((listing: any) => listing.user_id === profileId);
  const filteredPosts = userPosts.filter((post: any) => post.user_id === profileId);

  const transformedListings = filteredListings.map((listing: any) => ({
    id: listing.id,
    image: listing.images?.[0] || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg',
    title: listing.title,
    price: listing.price,
    seller: {
      name: fullName,
      avatar: profile.avatar_url,
      rating: profile.rating || 0,
    },
    location: listing.location,
  }));

  const transformedReviews = reviews.map((review: any) => ({
    reviewer: {
      name: `${review.reviewer?.first_name} ${review.reviewer?.last_name}`,
      avatar: review.reviewer?.avatar_url,
    },
    rating: review.rating,
    comment: review.comment,
    timestamp: new Date(review.created_at).toLocaleDateString(),
    verified: review.is_verified_purchase,
    helpful: review.helpful_count,
  }));

  const tabs = [
    { id: 'listings', label: 'Listings', count: filteredListings.length },
    { id: 'reviews', label: 'Reviews', count: reviews.length },
    { id: 'about', label: 'About', count: null },
    { id: 'posts', label: 'Posts', count: filteredPosts.length },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'listings':
        return filteredListings.length > 0 ? (
          <Grid columns={2}>
            {transformedListings.map((listing) => (
              <ProductCard
                key={listing.id}
                image={listing.image}
                title={listing.title}
                price={listing.price}
                seller={listing.seller}
                location={listing.location}
                layout="grid"
                onPress={() => router.push(`/(tabs)/home/${listing.id}`)}
              />
            ))}
          </Grid>
        ) : (
          <EmptyState
            icon={<Package size={48} color={theme.colors.text.muted} />}
            title="No listings yet"
            description={isOwnProfile ? "You haven't created any listings yet" : `${profile.first_name} hasn't listed anything yet`}
          />
        );

      case 'reviews':
        return reviewsLoading ? (
          <View style={{ gap: theme.spacing.md }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <LoadingSkeleton key={index} width="100%" height={120} borderRadius={theme.borderRadius.lg} />
            ))}
          </View>
        ) : transformedReviews.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {transformedReviews.map((review, index) => (
              <ReviewCard key={index} {...review} />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<Star size={48} color={theme.colors.text.muted} />}
            title="No reviews yet"
            description={isOwnProfile ? "You haven't received any reviews yet" : `${profile.first_name} hasn't received any reviews yet`}
          />
        );

      case 'about':
        return (
          <View style={{ gap: theme.spacing.lg }}>
            {profile.bio && (
              <View>
                <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                  About
                </Text>
                <Text variant="body" style={{ lineHeight: 24 }}>
                  {profile.bio}
                </Text>
              </View>
            )}

            <View>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Details
              </Text>
              <View style={{ gap: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <MapPin size={16} color={theme.colors.text.muted} />
                  <Text variant="body" color="secondary">
                    {profile.location}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Calendar size={16} color={theme.colors.text.muted} />
                  <Text variant="body" color="secondary">
                    Member since {new Date(profile.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Star size={16} color={theme.colors.warning} />
                  <Text variant="body" color="secondary">
                    {profile.rating?.toFixed(1) || '0.0'} rating • {profile.total_reviews || 0} reviews
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Package size={16} color={theme.colors.text.muted} />
                  <Text variant="body" color="secondary">
                    {profile.total_sales || 0} successful sales
                  </Text>
                </View>

                {profile.response_time && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <MessageCircle size={16} color={theme.colors.text.muted} />
                    <Text variant="body" color="secondary">
                      Usually responds {profile.response_time}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {!profile.bio && (
              <EmptyState
                icon={<Info size={48} color={theme.colors.text.muted} />}
                title="No bio available"
                description={isOwnProfile ? "Add a bio to tell others about yourself" : `${profile.first_name} hasn't added a bio yet`}
              />
            )}
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
            padding: theme.spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          {/* Avatar and Basic Info */}
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
            <Avatar
              source={profile.avatar_url}
              name={fullName}
              size="xl"
              isOnline={profile.is_online}
              showBorder
              style={{ marginBottom: theme.spacing.lg }}
            />

            <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                <Text variant="h2" style={{ fontWeight: '600' }}>
                  {fullName}
                </Text>
                {profile.is_verified && (
                  <Badge text="Verified" variant="success" />
                )}
              </View>

              <Rating
                rating={profile.rating || 0}
                size="md"
                showValue
                showCount
                reviewCount={profile.total_reviews || 0}
              />

              {profile.last_seen && !profile.is_online && (
                <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.sm }}>
                  Last seen {new Date(profile.last_seen).toLocaleString()}
                </Text>
              )}
            </View>

            {/* Stats */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                width: '100%',
                paddingVertical: theme.spacing.lg,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.colors.border,
                marginBottom: theme.spacing.lg,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text variant="h3" style={{ fontWeight: '700' }}>
                  {profile.total_sales || 0}
                </Text>
                <Text variant="caption" color="muted">
                  Sales
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h3" style={{ fontWeight: '700' }}>
                  {profile.total_reviews || 0}
                </Text>
                <Text variant="caption" color="muted">
                  Reviews
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h3" style={{ fontWeight: '700' }}>
                  {filteredPosts.length}
                </Text>
                <Text variant="caption" color="muted">
                  Posts
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <View style={{ flexDirection: 'row', gap: theme.spacing.md, width: '100%' }}>
                <Button
                  variant={isFollowing ? 'tertiary' : 'primary'}
                  icon={isFollowing ? 
                    <UserMinus size={18} color={theme.colors.primary} /> : 
                    <UserPlus size={18} color={theme.colors.primaryForeground} />
                  }
                  onPress={handleFollow}
                  loading={followLoading}
                  style={{ flex: 1 }}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>

                <Button
                  variant="secondary"
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
        <View style={{ padding: theme.spacing.lg }}>
          {renderTabContent()}
        </View>
      </ScrollView>

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