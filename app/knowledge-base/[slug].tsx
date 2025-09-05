import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  LoadingSkeleton,
  Badge,
} from '@/components';
import { 
  ArrowLeft, 
  ThumbsUp, 
  ThumbsDown, 
  Eye, 
  Clock,
  BookOpen,
  Share,
  MessageSquare
} from 'lucide-react-native';
import { useKnowledgeBase } from '@/hooks/useSupport';
import { KnowledgeBaseArticle } from '@/hooks/useSupport';

export default function KnowledgeBaseArticleScreen() {
  const { theme } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { getArticle, submitFeedback } = useKnowledgeBase();
  
  const [article, setArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [userFeedback, setUserFeedback] = useState<'helpful' | 'not_helpful' | null>(null);

  const fetchArticle = async () => {
    if (!slug) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const articleData = await getArticle(slug);
      setArticle(articleData);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError(err instanceof Error ? err.message : 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchArticle();
    setRefreshing(false);
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (!article || feedbackLoading) return;
    
    setFeedbackLoading(true);
    try {
      await submitFeedback(article.id, isHelpful);
      setUserFeedback(isHelpful ? 'helpful' : 'not_helpful');
      Alert.alert('Thank you!', 'Your feedback has been recorded.');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      getting_started: 'Getting Started',
      buying_selling: 'Buying & Selling',
      credits_billing: 'Credits & Billing',
      account_privacy: 'Account & Privacy',
      technical_issues: 'Technical Issues',
      safety_guidelines: 'Safety Guidelines',
      features: 'Features',
      policies: 'Policies',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const helpfulPercentage = article && (article.helpful_count + article.not_helpful_count) > 0
    ? Math.round((article.helpful_count / (article.helpful_count + article.not_helpful_count)) * 100)
    : 0;

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Loading..."
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <LoadingSkeleton height={200} />
          <View style={{ marginTop: theme.spacing.lg }}>
            <LoadingSkeleton height={100} />
          </View>
          <View style={{ marginTop: theme.spacing.lg }}>
            <LoadingSkeleton height={300} />
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  if (error || !article) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Article Not Found"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
          }}>
            <BookOpen size={64} color={theme.colors.text.muted} />
            <Text variant="h3" style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}>
              Article Not Found
            </Text>
            <Text variant="body" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
              {error || 'The article you\'re looking for doesn\'t exist or has been removed.'}
            </Text>
            <Button
              variant="primary"
              onPress={() => router.back()}
              style={{ marginTop: theme.spacing.lg }}
            >
              Go Back
            </Button>
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={article.title}
        showBackButton
        onBackPress={() => router.back()}
      />
      
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Container>
          {/* Article Header */}
          <View style={{
            marginBottom: theme.spacing.xl,
          }}>
            {/* Category Badge */}
            <Badge
              text={getCategoryLabel(article.category)}
              variant="secondary"
              style={{
                alignSelf: 'flex-start',
                marginBottom: theme.spacing.md,
              }}
            />

            {/* Title */}
            <Text variant="h2" style={{ marginBottom: theme.spacing.md }}>
              {article.title}
            </Text>

            {/* Meta Information */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: theme.spacing.lg,
              }}>
                <Eye size={16} color={theme.colors.text.muted} />
                <Text variant="bodySmall" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                  {article.view_count} views
                </Text>
              </View>
              
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Clock size={16} color={theme.colors.text.muted} />
                <Text variant="bodySmall" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                  {formatDate(article.published_at || article.created_at)}
                </Text>
              </View>
            </View>

            {/* Excerpt */}
            {article.excerpt && (
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
                borderLeftWidth: 4,
                borderLeftColor: theme.colors.primary,
              }}>
                <Text variant="body" style={{ fontStyle: 'italic' }}>
                  {article.excerpt}
                </Text>
              </View>
            )}
          </View>

          {/* Article Content */}
          <View style={{
            marginBottom: theme.spacing.xl,
          }}>
            <Text variant="body" style={{
              lineHeight: 24,
              fontSize: 16,
            }}>
              {article.content}
            </Text>
          </View>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <View style={{
              marginBottom: theme.spacing.xl,
            }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Tags
              </Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.sm,
              }}>
                {article.tags.map((tag, index) => (
                  <Badge key={index} text={tag} variant="neutral" />
                ))}
              </View>
            </View>
          )}

          {/* Feedback Section */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Was this article helpful?
            </Text>
            
            {article.helpful_count + article.not_helpful_count > 0 && (
              <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.md }}>
                {helpfulPercentage}% of {article.helpful_count + article.not_helpful_count} people found this helpful
              </Text>
            )}

            <View style={{
              flexDirection: 'row',
              gap: theme.spacing.md,
            }}>
              <Button
                variant={userFeedback === 'helpful' ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => handleFeedback(true)}
                disabled={feedbackLoading}
                leftIcon={<ThumbsUp size={16} />}
              >
                Helpful
              </Button>
              
              <Button
                variant={userFeedback === 'not_helpful' ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => handleFeedback(false)}
                disabled={feedbackLoading}
                leftIcon={<ThumbsDown size={16} />}
              >
                Not Helpful
              </Button>
            </View>
          </View>

          {/* Related Actions */}
          <View style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xl,
          }}>
            <Button
              variant="secondary"
              onPress={() => router.push('/support-tickets')}
              leftIcon={<MessageSquare size={16} />}
              style={{ flex: 1 }}
            >
              Contact Support
            </Button>
            
            <Button
              variant="secondary"
              onPress={() => router.push('/knowledge-base')}
              leftIcon={<ArrowLeft size={16} />}
              style={{ flex: 1 }}
            >
              Back to Articles
            </Button>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
