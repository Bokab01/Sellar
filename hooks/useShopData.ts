/**
 * useShopData Hook
 * Fetches and caches physical shop data with business hours
 * Optimized with caching and memoization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { BusinessHoursSchedule } from '@/components/PhysicalShop/types';

export interface ShopData {
  user_id: string;
  business_name: string;
  business_type?: string;
  business_description?: string;
  business_phone?: string;
  business_email?: string;
  business_website?: string;
  business_address: string;
  business_address_line_2?: string;
  business_city?: string;
  business_state?: string;
  business_postal_code?: string;
  business_latitude: number;
  business_longitude: number;
  business_directions_note?: string;
  business_map_verified: boolean;
  accepts_pickup: boolean;
  accepts_walkin: boolean;
  business_hours?: BusinessHoursSchedule;
  business_photos?: Array<{
    photo_url: string;
    photo_type: string;
    caption?: string;
    is_primary: boolean;
  }>;
}

interface UseShopDataReturn {
  shopData: ShopData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isOpen: boolean;
  todayHours: string | null;
}

// In-memory cache to avoid redundant fetches
const shopCache = new Map<string, { data: ShopData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useShopData(userId: string): UseShopDataReturn {
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShopData = useCallback(async () => {
    if (!userId) return;

    // Check cache first
    const cached = shopCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setShopData(cached.data);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch profile with shop data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          business_name,
          business_type,
          business_description,
          business_phone,
          business_email,
          business_website,
          business_address,
          business_address_line_2,
          business_city,
          business_state,
          business_postal_code,
          business_latitude,
          business_longitude,
          business_directions_note,
          business_map_verified,
          accepts_pickup,
          accepts_walkin,
          has_physical_shop
        `)
        .eq('id', userId)
        .eq('has_physical_shop', true)
        .single();

      if (profileError) throw profileError;
      if (!profile) {
        setShopData(null);
        return;
      }

      // Fetch business hours
      const { data: hours } = await supabase
        .from('business_hours')
        .select('schedule')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      // Fetch shop photos
      const { data: photos } = await supabase
        .from('business_photos')
        .select('photo_url, photo_type, caption, is_primary')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      const shop: ShopData = {
        user_id: profile.id,
        business_name: profile.business_name || '',
        business_type: profile.business_type,
        business_description: profile.business_description,
        business_phone: profile.business_phone,
        business_email: profile.business_email,
        business_website: profile.business_website,
        business_address: profile.business_address || '',
        business_address_line_2: profile.business_address_line_2,
        business_city: profile.business_city,
        business_state: profile.business_state,
        business_postal_code: profile.business_postal_code,
        business_latitude: profile.business_latitude || 0,
        business_longitude: profile.business_longitude || 0,
        business_directions_note: profile.business_directions_note,
        business_map_verified: profile.business_map_verified || false,
        accepts_pickup: profile.accepts_pickup ?? false,
        accepts_walkin: profile.accepts_walkin ?? false,
        business_hours: hours?.schedule,
        business_photos: photos || [],
      };

      // Cache the data
      shopCache.set(userId, { data: shop, timestamp: Date.now() });
      setShopData(shop);
    } catch (err: any) {
      console.error('Error fetching shop data:', err);
      setError(err.message || 'Failed to fetch shop data');
      setShopData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  // Calculate if shop is currently open
  const isOpen = useMemo(() => {
    if (!shopData?.business_hours) return false;

    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const todaySchedule = shopData.business_hours[currentDay];
    if (!todaySchedule?.is_open) return false;

    const [openHour, openMinute] = todaySchedule.open.split(':').map(Number);
    const [closeHour, closeMinute] = todaySchedule.close.split(':').map(Number);

    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;

    return currentTime >= openTime && currentTime < closeTime;
  }, [shopData]);

  // Get today's hours
  const todayHours = useMemo(() => {
    if (!shopData?.business_hours) return null;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[new Date().getDay()];
    const todaySchedule = shopData.business_hours[currentDay];

    if (!todaySchedule?.is_open) return 'Closed';

    const formatTime = (time: string) => {
      const [hour, minute] = time.split(':').map(Number);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    return `${formatTime(todaySchedule.open)} - ${formatTime(todaySchedule.close)}`;
  }, [shopData]);

  return {
    shopData,
    loading,
    error,
    refetch: fetchShopData,
    isOpen,
    todayHours,
  };
}

