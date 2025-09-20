import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export type ReportTargetType = 'listing' | 'post' | 'comment' | 'message' | 'user';

interface ReportData {
  targetType: ReportTargetType;
  targetId: string;
  category: string;
  reason: string;
  description?: string;
  evidenceUrls?: string[];
}

interface UseReportingReturn {
  submitReport: (data: ReportData) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useReporting(): UseReportingReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReport = async (data: ReportData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: result, error: submitError } = await supabase.rpc('submit_report', {
        p_reporter_id: user.id,
        p_target_type: data.targetType,
        p_target_id: data.targetId,
        p_category: data.category,
        p_reason: data.reason,
        p_description: data.description || null,
        p_evidence_urls: data.evidenceUrls ? JSON.stringify(data.evidenceUrls) : '[]'
      });

      if (submitError) {
        throw submitError;
      }

      if (result && result.length > 0) {
        const reportResult = result[0];
        if (reportResult.success) {
          return true;
        } else {
          throw new Error(reportResult.error || 'Failed to submit report');
        }
      } else {
        throw new Error('No result returned from report submission');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Report submission failed';
      setError(errorMessage);
      console.error('Report submission error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitReport,
    loading,
    error
  };
}

// Helper function to show report confirmation
export function showReportConfirmation(
  targetType: ReportTargetType,
  targetName: string,
  onConfirm: () => void
) {
  const targetDisplayName = targetType === 'user' ? 'user' : `${targetType} content`;
  
  Alert.alert(
    'Report Content',
    `Are you sure you want to report this ${targetDisplayName}? This action will be reviewed by our moderation team.`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Report',
        style: 'destructive',
        onPress: onConfirm,
      },
    ]
  );
}

// Helper function to get report categories
export async function getReportCategories() {
  try {
    const { data, error } = await supabase.rpc('get_moderation_categories');
    
    if (error) {
      console.error('Error fetching report categories:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching report categories:', error);
    return [];
  }
}
