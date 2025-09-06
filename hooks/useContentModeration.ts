import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ModerationResult {
  approved: boolean;
  confidence_score: number;
  flagged_categories: string[];
  reasons: string[];
  auto_action: string;
}

export interface ReportData {
  listing_id: string;
  category: string;
  reason: string;
  description?: string;
  evidence_urls?: string[];
}

export function useContentModeration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moderateContent = async (
    listingId: string,
    title: string,
    description: string,
    imageUrls?: string[]
  ): Promise<ModerationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: functionError } = await supabase.functions.invoke(
        'moderate-content',
        {
          body: {
            listing_id: listingId,
            user_id: user.id,
            title,
            description,
            image_urls: imageUrls,
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      return data as ModerationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Moderation failed';
      setError(errorMessage);
      console.error('Content moderation error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reportContent = async (reportData: ReportData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the listing to find the reported user
      const { data: listing } = await supabase
        .from('listings')
        .select('user_id')
        .eq('id', reportData.listing_id)
        .single();

      if (!listing) {
        throw new Error('Listing not found');
      }

      // Get category ID
      const { data: category } = await supabase
        .from('moderation_categories')
        .select('id')
        .eq('name', reportData.category)
        .single();

      if (!category) {
        throw new Error('Invalid category');
      }

      // Create the report
      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          listing_id: reportData.listing_id,
          reporter_id: user.id,
          reported_user_id: listing.user_id,
          category_id: category.id,
          reason: reportData.reason,
          description: reportData.description,
          evidence_urls: reportData.evidence_urls,
          priority: getPriorityFromCategory(reportData.category),
        });

      if (insertError) {
        throw insertError;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Report submission failed';
      setError(errorMessage);
      console.error('Report submission error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getUserReputation = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error fetching user reputation:', err);
      return null;
    }
  };

  const getModerationCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('moderation_categories')
        .select('*')
        .order('severity_level', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error fetching moderation categories:', err);
      return [];
    }
  };

  return {
    loading,
    error,
    moderateContent,
    reportContent,
    getUserReputation,
    getModerationCategories,
  };
}

function getPriorityFromCategory(category: string): number {
  const priorityMap: Record<string, number> = {
    illegal_items: 4,
    violence: 4,
    adult_content: 3,
    scams: 3,
    offensive_material: 3,
    spam: 2,
    copyright: 2,
    personal_info: 2,
  };

  return priorityMap[category] || 1;
}

export function getModerationErrorMessage(reasons: string[]): string {
  if (reasons.length === 0) {
    return 'This content violates our community guidelines.';
  }

  const categoryMessages: Record<string, string> = {
    illegal_items: 'This listing contains illegal items or content.',
    adult_content: 'This listing contains adult or inappropriate content.',
    scams: 'This listing appears to be fraudulent or misleading.',
    offensive_material: 'This listing contains offensive or discriminatory content.',
    spam: 'This listing appears to be spam or repetitive content.',
    violence: 'This listing contains violent or threatening content.',
    copyright: 'This listing may infringe on copyright or contain counterfeit items.',
    personal_info: 'This listing contains inappropriate personal information.',
    keyword_violation: 'This listing contains prohibited keywords or phrases.',
  };

  // Find the most severe category
  const severityOrder = [
    'illegal_items',
    'violence', 
    'adult_content',
    'scams',
    'offensive_material',
    'copyright',
    'spam',
    'personal_info',
    'keyword_violation'
  ];

  for (const category of severityOrder) {
    if (reasons.some(reason => reason.includes(category))) {
      return categoryMessages[category];
    }
  }

  return 'This content violates our community guidelines. Please review our terms of service.';
}
