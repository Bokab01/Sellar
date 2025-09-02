import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  SearchBar,
  EmptyState,
  LoadingSkeleton,
  KnowledgeBaseCard,
  Badge,
} from '@/components';
import { BookOpen, Search } from 'lucide-react-native';
import { useKnowledgeBase } from '@/hooks/useSupport';

const CATEGORIES = [
  { value: '', label: 'All Articles' },
  { value: 'getting_started', label: 'Getting Started' },
  { value: 'buying_selling', label: 'Buying & Selling' },
  { value: 'credits_billing', label: 'Credits & Billing' },
  { value: 'account_privacy', label: 'Account & Privacy' },
  { value: 'technical_issues', label: 'Technical Issues' },
  { value: 'safety_guidelines', label: 'Safety Guidelines' },
  { value: 'features', label: 'Features' },
  { value: 'policies', label: 'Policies' },
];

export default function KnowledgeBaseScreen() {
  const { theme } = useTheme();
  const { articles, loading, error, fetchArticles } = useKnowledgeBase();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchArticles(selectedCategory || undefined, searchQuery || undefined);
  }, [selectedCategory, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchArticles(selectedCategory || undefined, searchQuery || undefined);
    setRefreshing(false);
  };

  const handleArticlePress = (article: any) => {
    router.push(`/(tabs)/knowledge-base/${article.slug}`);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (loading && articles.length === 0) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Knowledge Base"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <LoadingSkeleton count={5} height={120} />
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Knowledge Base"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Container>
          {/* Header */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h2" style={{ marginBottom: theme.spacing.xs }}>
              Help Center
            </Text>
            <Text variant="body" color="secondary">
              Find answers to common questions and learn how to use Sellar
            </Text>
          </View>

          {/* Search */}
          <SearchBar
            placeholder="Search articles..."
            value={searchQuery}
            onChangeText={handleSearch}
            onClear={clearSearch}
            style={{ marginBottom: theme.spacing.lg }}
          />

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.xs,
              gap: theme.spacing.sm,
            }}
            style={{ marginBottom: theme.spacing.xl }}
          >
            {CATEGORIES.map((category) => (
              <Badge
                key={category.value}
                text={category.label}
                variant={selectedCategory === category.value ? 'primary' : 'default'}
                size="medium"
                onPress={() => setSelectedCategory(category.value)}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}
              />
            ))}
          </ScrollView>

          {/* Error State */}
          {error && (
            <View
              style={{
                backgroundColor: theme.colors.error + '10',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
              }}
            >
              <Text variant="body" style={{ color: theme.colors.error, textAlign: 'center' }}>
                {error}
              </Text>
            </View>
          )}

          {/* Articles List */}
          {articles.length > 0 ? (
            <View>
              {/* Results Count */}
              <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.lg }}>
                {articles.length} article{articles.length !== 1 ? 's' : ''} found
                {selectedCategory && ` in ${CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
                {searchQuery && ` for "${searchQuery}"`}
              </Text>

              {/* Articles */}
              {articles.map((article) => (
                <KnowledgeBaseCard
                  key={article.id}
                  article={article}
                  onPress={() => handleArticlePress(article)}
                  showCategory={!selectedCategory}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Search size={48} color={theme.colors.text.muted} />}
              title={searchQuery ? "No Articles Found" : "No Articles Available"}
              description={
                searchQuery 
                  ? `No articles match "${searchQuery}". Try different keywords or browse by category.`
                  : "No articles are available in this category at the moment."
              }
              action={searchQuery ? {
                text: 'Clear Search',
                onPress: clearSearch,
              } : undefined}
            />
          )}

          {/* Popular Articles Section */}
          {!searchQuery && !selectedCategory && articles.length > 0 && (
            <View style={{ marginTop: theme.spacing.xl }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
                Most Popular
              </Text>
              
              {articles
                .sort((a, b) => b.view_count - a.view_count)
                .slice(0, 3)
                .map((article) => (
                  <KnowledgeBaseCard
                    key={`popular-${article.id}`}
                    article={article}
                    onPress={() => handleArticlePress(article)}
                    showCategory={true}
                  />
                ))}
            </View>
          )}

          {/* Quick Actions */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginTop: theme.spacing.xl,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Still Need Help?
            </Text>
            
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                Can't find what you're looking for? We're here to help!
              </Text>
              
              <View style={{
                flexDirection: 'row',
                gap: theme.spacing.md,
              }}>
                <View style={{ flex: 1 }}>
                  <Text 
                    variant="body" 
                    style={{ 
                      color: theme.colors.primary,
                      textAlign: 'center',
                      padding: theme.spacing.md,
                      backgroundColor: theme.colors.primary + '10',
                      borderRadius: theme.borderRadius.md,
                    }}
                    onPress={() => router.push('/(tabs)/support-tickets')}
                  >
                    🎫 Create Ticket
                  </Text>
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text 
                    variant="body" 
                    style={{ 
                      color: theme.colors.primary,
                      textAlign: 'center',
                      padding: theme.spacing.md,
                      backgroundColor: theme.colors.primary + '10',
                      borderRadius: theme.borderRadius.md,
                    }}
                    onPress={() => router.push('/(tabs)/help')}
                  >
                    ❓ View FAQ
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
