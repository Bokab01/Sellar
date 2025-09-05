import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useMonetizationStore } from '@/store/useMonetizationStore';

// Types for profile management
export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  created_at?: string;
  updated_at?: string;
  
  // Professional Information
  professional_title?: string;
  years_of_experience?: number;
  specializations?: string[];
  
  // Business Profile
  is_business: boolean;
  business_name?: string;
  business_type?: string;
  business_category_id?: string;
  business_description?: string;
  business_registration_number?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  business_website?: string;
  business_established_year?: number;
  business_employee_count?: string;
  business_services?: string[];
  business_coverage_areas?: string[];
  
  // Contact Preferences
  preferred_contact_method?: 'app' | 'phone' | 'email' | 'whatsapp';
  response_time_expectation?: 'within_minutes' | 'within_hours' | 'within_day' | 'within_week';
  
  // Privacy Settings
  phone_visibility?: 'public' | 'contacts' | 'private';
  email_visibility?: 'public' | 'contacts' | 'private';
  show_online_status?: boolean;
  show_last_seen?: boolean;
  
  // Verification
  is_verified?: boolean;
  verification_level?: 'none' | 'phone' | 'email' | 'identity' | 'business';
  verification_documents?: any[];
  
  // Status
  is_active?: boolean;
  is_suspended?: boolean;
  profile_completion_percentage?: number;
  last_profile_update?: string;
  
  // Business Display Settings
  display_business_name?: boolean;
  business_name_priority?: 'primary' | 'secondary' | 'hidden';
  
  // Timestamps are already declared above
}

export interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SocialMediaLink {
  id: string;
  user_id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'whatsapp' | 'telegram' | 'website' | 'other';
  url: string;
  display_name?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  id: string;
  user_id: string;
  schedule: {
    [key: string]: {
      open: string;
      close: string;
      is_open: boolean;
    };
  };
  special_hours: any[];
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Hook for managing user profile
export function useProfile(userId?: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchProfile = async () => {
    if (!targetUserId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (fetchError) throw fetchError;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetUserId]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  };
}

// Hook for updating profile
export function useUpdateProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('User must be authenticated to update profile');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return data as UserProfile;
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    updateProfile,
    loading,
    error,
  };
}

// Hook for business categories
export function useBusinessCategories() {
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('business_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching business categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
}

// Hook for social media links
export function useSocialMediaLinks(userId?: string) {
  const { user } = useAuth();
  const [links, setLinks] = useState<SocialMediaLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchLinks = async () => {
    if (!targetUserId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('social_media_links')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .order('sort_order');

      if (fetchError) throw fetchError;
      setLinks(data || []);
    } catch (err) {
      console.error('Error fetching social media links:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch social media links');
    } finally {
      setLoading(false);
    }
  };

  const addLink = async (linkData: {
    platform: SocialMediaLink['platform'];
    url: string;
    display_name?: string;
  }) => {
    if (!user) return;

    try {
      const { data, error: addError } = await supabase
        .from('social_media_links')
        .insert({
          user_id: user.id,
          platform: linkData.platform,
          url: linkData.url,
          display_name: linkData.display_name,
          sort_order: links.length,
        })
        .select()
        .single();

      if (addError) throw addError;

      setLinks(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding social media link:', err);
      throw err;
    }
  };

  const updateLink = async (linkId: string, updates: Partial<SocialMediaLink>) => {
    if (!user) return;

    try {
      const { data, error: updateError } = await supabase
        .from('social_media_links')
        .update(updates)
        .eq('id', linkId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setLinks(prev => prev.map(link => link.id === linkId ? data : link));
      return data;
    } catch (err) {
      console.error('Error updating social media link:', err);
      throw err;
    }
  };

  const deleteLink = async (linkId: string) => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('social_media_links')
        .delete()
        .eq('id', linkId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setLinks(prev => prev.filter(link => link.id !== linkId));
    } catch (err) {
      console.error('Error deleting social media link:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [targetUserId]);

  return {
    links,
    loading,
    error,
    addLink,
    updateLink,
    deleteLink,
    refetch: fetchLinks,
  };
}

// Hook for business hours
export function useBusinessHours(userId?: string) {
  const { user } = useAuth();
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchBusinessHours = async () => {
    if (!targetUserId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      setBusinessHours(data);
    } catch (err) {
      console.error('Error fetching business hours:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch business hours');
    } finally {
      setLoading(false);
    }
  };

  const updateBusinessHours = async (schedule: BusinessHours['schedule']) => {
    if (!user) return;

    try {
      const { data, error: upsertError } = await supabase
        .from('business_hours')
        .upsert({
          user_id: user.id,
          schedule,
          is_active: true,
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setBusinessHours(data);
      return data;
    } catch (err) {
      console.error('Error updating business hours:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchBusinessHours();
  }, [targetUserId]);

  return {
    businessHours,
    loading,
    error,
    updateBusinessHours,
    refetch: fetchBusinessHours,
  };
}

// Hook for enabling business profile (with subscription check)
export function useBusinessProfileSetup() {
  const { user } = useAuth();
  const { hasBusinessPlan, spendCredits } = useMonetizationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enableBusinessProfile = async (businessData: {
    business_name: string;
    business_type?: string;
    business_category_id?: string;
    business_description?: string;
    business_phone?: string;
    business_email?: string;
    business_website?: string;
  }) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Check if user has business plan or enough credits
      const hasPlan = hasBusinessPlan();
      
      if (!hasPlan) {
        // Charge 50 credits for business profile activation
        const success = await spendCredits(50, 'business_profile_activation', {
          business_name: businessData.business_name,
        });

        if (!success) {
          throw new Error('Insufficient credits. You need 50 credits to activate business profile.');
        }
      }

      // Update profile to business
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          is_business: true,
          ...businessData,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return data as UserProfile;
    } catch (err) {
      console.error('Error enabling business profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable business profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    enableBusinessProfile,
    loading,
    error,
  };
}

// Hook for profile completion tracking
export function useProfileCompletion(userId?: string) {
  const { user } = useAuth();
  const [completion, setCompletion] = useState<{
    percentage: number;
    missingFields: string[];
    suggestions: string[];
  }>({
    percentage: 0,
    missingFields: [],
    suggestions: [],
  });

  const targetUserId = userId || user?.id;

  const calculateCompletion = async () => {
    if (!targetUserId) return;

    try {
      const { data: completionData, error } = await supabase
        .rpc('calculate_profile_completion', { user_uuid: targetUserId });

      if (error) throw error;

      // Get profile to analyze missing fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profile) {
        const missingFields: string[] = [];
        const suggestions: string[] = [];

        // Check basic fields
        if (!profile.full_name) {
          missingFields.push('full_name');
          suggestions.push('Add your full name to help others identify you');
        }
        if (!profile.bio) {
          missingFields.push('bio');
          suggestions.push('Write a bio to tell others about yourself');
        }
        if (!profile.avatar_url) {
          missingFields.push('avatar_url');
          suggestions.push('Upload a profile picture to increase trust');
        }
        if (!profile.phone) {
          missingFields.push('phone');
          suggestions.push('Add your phone number for better communication');
        }

        // Business profile suggestions
        if (profile.is_business) {
          if (!profile.business_description) {
            missingFields.push('business_description');
            suggestions.push('Add a business description to attract customers');
          }
          if (!profile.business_category_id) {
            missingFields.push('business_category_id');
            suggestions.push('Select your business category for better discoverability');
          }
        }

        setCompletion({
          percentage: completionData || 0,
          missingFields,
          suggestions,
        });
      }
    } catch (err) {
      console.error('Error calculating profile completion:', err);
    }
  };

  useEffect(() => {
    calculateCompletion();
  }, [targetUserId]);

  return {
    completion,
    refetch: calculateCompletion,
  };
}
