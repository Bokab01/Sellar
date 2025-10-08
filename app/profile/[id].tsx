import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase, dbHelpers } from '@/lib/supabase';
import { useListings } from '@/hooks/useListings';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { getDisplayName } from '@/hooks/useDisplayName';
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
} from '@/components';
import { FullUserBadges } from '@/components/UserBadges/UserBadges';
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
  MoreVertical
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

  // Reviews are now handled by ReviewsList component

  useEffect(() => {
    if (profileId) {
      fetchProfile();
      checkFollowStatus();
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

  // Reviews fetching is now handled by useReviews hook in ReviewsList component

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      checkFollowStatus(),
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
            console.log('User already being followed, updating state');
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
  const displayName = profile ? getDisplayName(profile, false).displayName : 'User';

  // Filter user's listings and posts
  const filteredListings = userListings.filter((listing: any) => listing.user_id === profileId);
  const filteredPosts = userPosts.filter((post: any) => post.user_id === profileId);

  const transformedListings = filteredListings.map((listing: any) => ({
    id: listing.id,
    image: listing.images || ['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
    title: listing.title,
    price: listing.price,
    seller: {
      name: displayName,
      avatar: profile.avatar_url,
      rating: profile.rating || 0,
    },
    location: listing.location,
  }));

  // Reviews transformation is now handled by ReviewsList component

  const tabs = [
    { id: 'listings', label: 'Listings', count: filteredListings.length },
    { id: 'reviews', label: 'Reviews', count: null }, // Count will be handled by ReviewsList
    { id: 'about', label: 'About', count: null },
    { id: 'posts', label: 'Posts', count: filteredPosts.length },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'listings':
        return filteredListings.length > 0 ? (
          <Grid columns={2} spacing={4}>
            {transformedListings.map((listing) => (
              <ProductCard
                key={listing.id}
                image={listing.image}
                title={listing.title}
                price={listing.price}
                seller={listing.seller}
                location={listing.location}
                layout="grid"
                fullWidth={true}
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
        return (
          <View>
            {/* Review Summary */}
            <ReviewSummary 
              userId={profileId!} 
              style={{ marginBottom: theme.spacing.lg }} 
            />
            
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
            <ReputationDisplay
              userId={profileId!}
              variant="full"
              style={{ marginBottom: theme.spacing.md }}
            />

            {/* Professional About Section */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              ...theme.shadows.sm,
            }}>
              {profile.bio ? (
                <View>
                  <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                    About
                  </Text>
                  <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.primary }}>
                    {profile.bio}
                  </Text>
                </View>
              ) : (
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
              )}
            </View>

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
                  showBadge={true}
                  textVariant="h2"
                  style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}
                />
                
                {/* Rating */}
                <CompactReviewSummary userId={profileId!} />
              </View>

              {/* User Badges */}
              <View style={{ marginBottom: theme.spacing.xs }}>
                <FullUserBadges userId={profileId} />
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

                {/* Report button - only show if not own profile */}
                {!isOwnProfile && (
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: theme.borderRadius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <ReportButton
                      targetType="user"
                      targetId={profileId!}
                      targetUser={{
                        id: profileId!,
                        name: displayName,
                        avatar: profile.avatar_url
                      }}
                      variant="icon"
                      size="md"
                      style={{ padding: 0 }}
                    />
                  </View>
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