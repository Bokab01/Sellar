import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
// import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  EmptyState,
  LoadingSkeleton,
  Avatar,
  Button,
} from '@/components';
import { TrendingUp, Hash, MessageCircle, Heart, Eye, Flame } from 'lucide-react-native';

interface TrendingTopic {
  id: string;
  tag: string;
  posts_count: number;
  engagement_count: number;
  growth_percentage: number;
  category: 'electronics' | 'fashion' | 'home' | 'automotive' | 'general' | 'food' | 'beauty' | 'sports' | 'education' | 'business';
  sample_posts: string[];
}

interface TrendingPost {
  id: string;
  content: string;
  author_name: string;
  author_avatar?: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  hashtags: string[];
}

export default function TrendingTopicsScreen() {
  const { theme } = useTheme();
  // const { user } = useAuthStore();
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'topics' | 'posts'>('topics');
  const [error, setError] = useState<string | null>(null);

  const fetchTrendingData = async () => {
    try {
      setError(null);
      
      if (activeTab === 'topics') {
        await fetchTrendingTopics();
      } else {
        await fetchTrendingPosts();
      }
    } catch (err: any) {
      console.error('Error fetching trending data:', err);
      if (err.message.includes('relation "hashtags" does not exist')) {
        setError('Trending features not yet enabled. Please apply the trending system migration.');
      } else {
        setError(err.message || 'Failed to load trending data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrendingData();
  }, [activeTab, fetchTrendingData]);

  const fetchTrendingTopics = async () => {
    try {
      // Try to use RPC function first
      const { data, error } = await supabase.rpc('get_trending_hashtags', {
        time_period: '7 days',
        limit_count: 20
      });

      if (error) {
        throw error;
      }

      setTopics(data || []);
    } catch (rpcError: any) {
      if (rpcError.message.includes('Could not find the function')) {
        // Fallback to direct query
        const { data, error } = await supabase
          .from('hashtags')
          .select('*')
          .order('posts_count', { ascending: false })
          .limit(20);

        if (error) throw error;

        const transformedData = (data || []).map((hashtag: any) => ({
          id: hashtag.id,
          tag: hashtag.tag,
          posts_count: hashtag.posts_count || 0,
          engagement_count: hashtag.total_engagement || 0,
          growth_percentage: hashtag.posts_count > 0 ? 
            Math.round((hashtag.total_engagement / hashtag.posts_count) * 10) / 10 : 0,
          category: hashtag.category || 'general',
          sample_posts: ['Sample post content...'], // TODO: Fetch sample posts
        }));

        setTopics(transformedData);
      } else {
        throw rpcError;
      }
    }
  };

  const fetchTrendingPosts = async () => {
    try {
      // Try to use RPC function first
      const { data, error } = await supabase.rpc('get_trending_posts', {
        time_period: '7 days',
        limit_count: 20
      });

      if (error) {
        throw error;
      }

      setPosts(data || []);
    } catch (rpcError: any) {
      if (rpcError.message.includes('Could not find the function')) {
        // Fallback to direct query
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            likes_count,
            comments_count,
            views_count,
            created_at,
            profiles:user_id (
              first_name,
              last_name,
              avatar_url
            )
          `)
          .order('likes_count', { ascending: false })
          .limit(20);

        if (error) throw error;

        const transformedData = (data || []).map((post: any) => ({
          id: post.id,
          content: post.content,
          author_name: `${post.profiles?.first_name || 'User'} ${post.profiles?.last_name || ''}`.trim(),
          author_avatar: post.profiles?.avatar_url,
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          views_count: post.views_count || 0,
          created_at: post.created_at,
          hashtags: [], // TODO: Extract hashtags from content
        }));

        setPosts(transformedData);
      } else {
        throw rpcError;
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrendingData();
  };

  const handleTopicPress = (topic: TrendingTopic) => {
    // Navigate to hashtag posts screen
    Alert.alert(
      `#${topic.tag}`,
      `${topic.posts_count} posts • ${topic.engagement_count} engagements`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Posts', 
          onPress: () => {
            // TODO: Navigate to hashtag posts screen
            console.log(`Navigate to hashtag: ${topic.tag}`);
          }
        }
      ]
    );
  };

  const handlePostPress = (post: TrendingPost) => {
    // Navigate to post detail
    router.push(`/(tabs)/community/${post.id}`);
  };

  // const extractHashtagsFromContent = (content: string): string[] => {
  //   const hashtags = content.match(/#[a-zA-Z0-9_]+/g);
  //   return hashtags ? hashtags.map(tag => tag.substring(1).toLowerCase()) : [];
  // };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'electronics': return theme.colors.primary;
      case 'fashion': return '#E91E63';
      case 'home': return theme.colors.success;
      case 'automotive': return '#FF9800';
      default: return theme.colors.text.muted;
    }
  };

  const getGrowthColor = (percentage: number) => {
    if (percentage > 30) return theme.colors.success;
    if (percentage > 15) return theme.colors.warning;
    return theme.colors.text.muted;
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Trending"
        showBackButton
        onBackPress={() => router.back()}
      />

      <View style={{ flex: 1 }}>
        {/* Tab Navigation */}
        <View
          style={{
            flexDirection: 'row',
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          {[
            { key: 'topics', label: 'Topics', icon: Hash },
            { key: 'posts', label: 'Posts', icon: Flame },
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: activeTab === tab.key ? theme.colors.primary : 'transparent',
                  marginHorizontal: theme.spacing.xs,
                }}
              >
                <IconComponent 
                  size={16} 
                  color={activeTab === tab.key ? '#FFF' : theme.colors.text.primary} 
                />
                <Text
                  variant="body"
                  weight="medium"
                  style={{
                    marginLeft: theme.spacing.xs,
                    color: activeTab === tab.key ? '#FFF' : theme.colors.text.primary,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.lg,
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <LoadingSkeleton
                key={index}
                width="100%"
                height={120}
                borderRadius={theme.borderRadius.lg}
                style={{ marginBottom: theme.spacing.lg }}
              />
            ))}
          </ScrollView>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg }}>
            <TrendingUp size={64} color={theme.colors.text.muted} />
            <Text variant="h4" weight="semibold" style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
              Trending Not Available
            </Text>
            <Text variant="body" color="muted" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
              {error}
            </Text>
            <Button
              variant="primary"
              size="sm"
              style={{ marginTop: theme.spacing.lg }}
              onPress={() => {
                setError(null);
                setLoading(true);
                fetchTrendingData();
              }}
            >
              Try Again
            </Button>
          </View>
        ) : ((activeTab === 'topics' && topics.length === 0) || (activeTab === 'posts' && posts.length === 0)) ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg }}>
            <EmptyState
              icon={<TrendingUp size={64} color={theme.colors.text.muted} />}
              title="No Trending Content"
              description={
                activeTab === 'topics' 
                  ? "No trending hashtags yet. Be the first to start a trending topic!"
                  : "No trending posts yet. Create engaging content to see it here!"
              }
              action={{
                text: 'Create a Post',
                onPress: () => router.push('/(tabs)/community/create-post'),
              }}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.lg,
              paddingBottom: theme.spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          >
            {activeTab === 'topics' ? (
              <>
                {/* Trending Topics */}
                {topics.map((topic, index) => (
                  <TouchableOpacity
                    key={topic.id}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.lg,
                      marginBottom: theme.spacing.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                    onPress={() => handleTopicPress(topic)}
                    activeOpacity={0.7}
                  >
                    {/* Rank Badge */}
                    <View
                      style={{
                        position: 'absolute',
                        top: theme.spacing.md,
                        right: theme.spacing.md,
                        backgroundColor: index < 3 ? theme.colors.primary : theme.colors.text.muted,
                        borderRadius: theme.borderRadius.full,
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text variant="caption" style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>
                        {index + 1}
                      </Text>
                    </View>

                    {/* Topic Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                      <Hash size={20} color={getCategoryColor(topic.category)} />
                      <Text variant="h4" weight="semibold" style={{ marginLeft: theme.spacing.xs, flex: 1, marginRight: 40 }}>
                        #{topic.tag}
                      </Text>
                    </View>

                    {/* Stats */}
                    <View style={{ flexDirection: 'row', gap: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="body" weight="semibold">
                          {(topic.posts_count || 0).toLocaleString()}
                        </Text>
                        <Text variant="caption" color="muted">Posts</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="body" weight="semibold">
                          {(topic.engagement_count || 0).toLocaleString()}
                        </Text>
                        <Text variant="caption" color="muted">Engagements</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TrendingUp size={14} color={getGrowthColor(topic.growth_percentage)} />
                          <Text 
                            variant="body" 
                            weight="semibold"
                            style={{ 
                              marginLeft: theme.spacing.xs,
                              color: getGrowthColor(topic.growth_percentage)
                            }}
                          >
                            +{topic.growth_percentage}%
                          </Text>
                        </View>
                        <Text variant="caption" color="muted">Growth</Text>
                      </View>
                    </View>

                    {/* Sample Posts Preview */}
                    <Text variant="caption" color="muted">
                      &quot;{topic.sample_posts[0]}&quot;
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                {/* Trending Posts */}
                {posts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.lg,
                      marginBottom: theme.spacing.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                    onPress={() => handlePostPress(post)}
                    activeOpacity={0.7}
                  >
                    {/* Author Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                      <Avatar
                        source={post.author_avatar}
                        name={post.author_name}
                        size="sm"
                      />
                      <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                        <Text variant="body" weight="semibold">
                          {post.author_name}
                        </Text>
                        <Text variant="caption" color="muted">
                          {new Date(post.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: theme.colors.primary + '20',
                          borderRadius: theme.borderRadius.sm,
                          paddingHorizontal: theme.spacing.sm,
                          paddingVertical: theme.spacing.xs,
                        }}
                      >
                        <Text variant="caption" color="primary" style={{ fontSize: 10 }}>
                          TRENDING
                        </Text>
                      </View>
                    </View>

                    {/* Content */}
                    <Text variant="body" style={{ marginBottom: theme.spacing.md, lineHeight: 20 }}>
                      {post.content}
                    </Text>

                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.md, gap: theme.spacing.xs }}>
                        {post.hashtags.slice(0, 3).map((hashtag, index) => (
                          <TouchableOpacity
                            key={index}
                            style={{
                              backgroundColor: theme.colors.primary + '10',
                              borderRadius: theme.borderRadius.sm,
                              paddingHorizontal: theme.spacing.sm,
                              paddingVertical: theme.spacing.xs,
                            }}
                            onPress={() => console.log(`Navigate to hashtag: ${hashtag}`)}
                          >
                            <Text variant="caption" color="primary">
                              #{hashtag}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {post.hashtags.length > 3 && (
                          <View
                            style={{
                              backgroundColor: theme.colors.text.muted + '20',
                              borderRadius: theme.borderRadius.sm,
                              paddingHorizontal: theme.spacing.sm,
                              paddingVertical: theme.spacing.xs,
                            }}
                          >
                            <Text variant="caption" color="muted">
                              +{post.hashtags.length - 3} more
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Engagement Stats */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Heart size={16} color={theme.colors.error} />
                          <Text variant="caption" style={{ marginLeft: theme.spacing.xs }}>
                            {(post.likes_count || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MessageCircle size={16} color={theme.colors.primary} />
                          <Text variant="caption" style={{ marginLeft: theme.spacing.xs }}>
                            {(post.comments_count || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Eye size={16} color={theme.colors.text.muted} />
                          <Text variant="caption" style={{ marginLeft: theme.spacing.xs }}>
                            {(post.views_count || 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                      
                      <Text variant="caption" color="muted">
                        {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaWrapper>
  );
}
