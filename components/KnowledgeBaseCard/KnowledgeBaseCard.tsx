import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Badge } from '@/components';
import { 
  Eye, 
  ThumbsUp, 
  Clock,
  ArrowRight,
  BookOpen
} from 'lucide-react-native';
import { KnowledgeBaseArticle } from '@/hooks/useSupport';

interface KnowledgeBaseCardProps {
  article: KnowledgeBaseArticle;
  onPress?: () => void;
  showCategory?: boolean;
}

export function KnowledgeBaseCard({ 
  article, 
  onPress, 
  showCategory = true 
}: KnowledgeBaseCardProps) {
  const { theme } = useTheme();

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
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    });
  };

  const helpfulPercentage = article.helpful_count + article.not_helpful_count > 0
    ? Math.round((article.helpful_count / (article.helpful_count + article.not_helpful_count)) * 100)
    : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      }}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
      }}>
        <View style={{
          backgroundColor: theme.colors.primary + '15',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.sm,
          marginRight: theme.spacing.md,
        }}>
          <BookOpen size={20} color={theme.colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text 
            variant="body" 
            style={{ 
              fontWeight: '600',
              marginBottom: theme.spacing.xs,
            }}
            numberOfLines={2}
          >
            {article.title}
          </Text>
          
          {article.excerpt && (
            <Text variant="bodySmall" color="secondary" numberOfLines={3}>
              {article.excerpt}
            </Text>
          )}
        </View>

        <ArrowRight size={20} color={theme.colors.text.muted} />
      </View>

      {/* Tags */}
      {article.tags.length > 0 && (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginBottom: theme.spacing.md,
          gap: theme.spacing.xs,
        }}>
          {article.tags.slice(0, 3).map((tag, index) => (
            <Badge 
              key={index}
              text={tag} 
              variant="default" 
              size="sm"
            />
          ))}
          {article.tags.length > 3 && (
            <Badge 
              text={`+${article.tags.length - 3} more`} 
              variant="default" 
              size="sm"
            />
          )}
        </View>
      )}

      {/* Footer */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}>
          {/* Views */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Eye size={14} color={theme.colors.text.muted} />
            <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.xs }}>
              {(article.view_count || 0).toLocaleString()}
            </Text>
          </View>

          {/* Helpful percentage */}
          {helpfulPercentage > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <ThumbsUp size={14} color={theme.colors.success} />
              <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                {helpfulPercentage}%
              </Text>
            </View>
          )}

          {/* Updated date */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Clock size={14} color={theme.colors.text.muted} />
            <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.xs }}>
              {formatDate(article.updated_at)}
            </Text>
          </View>
        </View>

        {/* Category */}
        {showCategory && (
          <Badge 
            text={getCategoryLabel(article.category)} 
            variant="default" 
            size="sm"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
