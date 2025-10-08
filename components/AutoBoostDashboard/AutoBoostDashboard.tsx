import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Alert, FlatList, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { DashboardSkeleton } from '@/components/LoadingSkeleton/DashboardSkeleton';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { ListItem } from '@/components/ListItem/ListItem';
import { 
  Zap, 
  Clock, 
  Play, 
  Pause, 
  Settings, 
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw,
  BarChart3
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface UserListing {
  id: string;
  title: string;
  status: string;
  boost_until?: string;
  updated_at: string;
}

interface AutoRefreshSettings {
  enabled: boolean;
  autoRefreshEnabled: boolean;
  activeListings: Array<{
    listingId: string;
    listingTitle: string;
    lastRefresh: string;
    nextRefresh: string;
    boostUntil?: string;
    isBoosted: boolean;
    hasAutoRefresh: boolean;
  }>;
}

// ListingItem component defined outside to avoid hooks issues
const ListingItem = React.memo(({ 
  listing, 
  index, 
  theme, 
  settings, 
  userListings, 
  toggleAutoRefreshForListing, 
  updating, 
  formatNextRefresh, 
  formatTimeRemaining 
}: { 
  listing: UserListing; 
  index: number;
  theme: any;
  settings: AutoRefreshSettings;
  userListings: UserListing[];
  toggleAutoRefreshForListing: (id: string) => void;
  updating: boolean;
  formatNextRefresh: (date: string) => string;
  formatTimeRemaining: (date: string) => string;
}) => {
  const isBoosted = !!listing.boost_until && new Date(listing.boost_until) > new Date();
  const autoRefreshItem = settings.activeListings.find(item => item.listingId === listing.id);
  const hasAutoRefresh = autoRefreshItem?.hasAutoRefresh || false;
  const nextRefresh = autoRefreshItem?.nextRefresh;
  
  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: hasAutoRefresh ? theme.colors.success + '20' : theme.colors.border,
        marginBottom: index < userListings.length - 1 ? theme.spacing.md : 0,
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
      }}>
        <View style={{
          backgroundColor: hasAutoRefresh ? theme.colors.success + '15' : theme.colors.border + '15',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          marginRight: theme.spacing.md,
          borderWidth: 1,
          borderColor: hasAutoRefresh ? theme.colors.success + '30' : theme.colors.border,
        }}>
          <RefreshCw size={20} color={hasAutoRefresh ? theme.colors.success : theme.colors.border} />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
            {listing.title}
          </Text>
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.lg,
            marginBottom: theme.spacing.sm,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.md,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
            }}>
              <Clock size={14} color={theme.colors.primary} />
              <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing.xs }}>
                {hasAutoRefresh ? `Next: ${formatNextRefresh(nextRefresh || '')}` : 'Disabled'}
              </Text>
            </View>
            
            {isBoosted && listing.boost_until && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.warning + '10',
                borderRadius: theme.borderRadius.md,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderWidth: 1,
                borderColor: theme.colors.warning + '20',
              }}>
                <Zap size={14} color={theme.colors.warning} />
                <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing.xs }}>
                  {formatTimeRemaining(listing.boost_until)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: hasAutoRefresh ? theme.colors.success + '10' : theme.colors.border + '10',
            borderRadius: theme.borderRadius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderWidth: 1,
            borderColor: hasAutoRefresh ? theme.colors.success + '20' : theme.colors.border,
          }}>
            <Text variant="caption" style={{
              color: hasAutoRefresh ? theme.colors.success : theme.colors.border,
              fontWeight: '600',
            }}>
              {hasAutoRefresh ? '✓ Auto-Refreshing' : '○ Disabled'}
            </Text>
          </View>
        </View>
        
        <Button
          variant={hasAutoRefresh ? 'tertiary' : 'primary'}
          size="sm"
          onPress={() => toggleAutoRefreshForListing(listing.id)}
          style={{
            minWidth: 80,
          }}
          disabled={updating}
        >
          <Text variant="caption" style={{
            color: hasAutoRefresh ? theme.colors.primary : theme.colors.surface,
            fontWeight: '600',
          }}>
            {hasAutoRefresh ? 'Disable' : 'Enable'}
          </Text>
        </Button>
      </View>
    </View>
  );
});

export default function AutoBoostDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { hasBusinessPlan } = useMonetizationStore();
  const businessFeatures = useBusinessFeatures();
  
  const [settings, setSettings] = useState<AutoRefreshSettings>({
    enabled: false,
    autoRefreshEnabled: true,
    activeListings: [],
  });
  
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [allListings, setAllListings] = useState<UserListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const ITEMS_PER_PAGE = 10;
  
  // ✅ PERFORMANCE FIX: Add caching to prevent unnecessary refetches
  const lastFetchTime = React.useRef(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds cache

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    
    // Only fetch if cache is stale or first load
    if (timeSinceLastFetch > FETCH_COOLDOWN || lastFetchTime.current === 0) {
      lastFetchTime.current = now;
      fetchAutoRefreshSettings();
    }
  }, []);

  const fetchAutoRefreshSettings = async (page = 1, isRefresh = false) => {
    if (!user) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      // ✅ PERFORMANCE FIX: Fetch listings and auto-refresh settings in parallel
      const [listingsResult, autoRefreshResult] = await Promise.all([
        supabase
          .from('listings')
          .select('id, title, status, boost_until, updated_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .range(from, to),
        supabase
          .from('business_auto_refresh')
          .select('listing_id, is_active, last_refresh_at, next_refresh_at, created_at')
          .eq('user_id', user.id)
      ]);

      const { data: listings, error: listingsError } = listingsResult;
      const { data: autoRefreshData, error: autoRefreshError } = autoRefreshResult;

      if (listingsError) {
        console.error('Error fetching listings:', listingsError);
      } else {
        const newListings = listings || [];
        
        if (page === 1 || isRefresh) {
          setUserListings(newListings);
          setAllListings(newListings);
        } else {
          setUserListings(prev => [...prev, ...newListings]);
          setAllListings(prev => [...prev, ...newListings]);
        }
        
        setHasMoreData(newListings.length === ITEMS_PER_PAGE);
        setCurrentPage(page);
      }

      if (autoRefreshError) {
        console.error('Error fetching auto-refresh settings:', autoRefreshError);
      }

      const activeListings = (listings || []).map(listing => {
        const isBoosted = !!listing.boost_until && new Date(listing.boost_until) > new Date();
        const autoRefreshItem = autoRefreshData?.find(item => item.listing_id === listing.id);
        const hasAutoRefresh = !!autoRefreshItem && autoRefreshItem.is_active;
        
        return {
          listingId: listing.id,
          listingTitle: listing.title,
          lastRefresh: autoRefreshItem?.last_refresh_at || autoRefreshItem?.created_at || listing.updated_at,
          nextRefresh: autoRefreshItem?.next_refresh_at || (hasAutoRefresh ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : ''),
          boostUntil: listing.boost_until,
          isBoosted,
          hasAutoRefresh,
        };
      });

      const settings: AutoRefreshSettings = {
        enabled: true,
        autoRefreshEnabled: true,
        activeListings,
      };

      setSettings(settings);
    } catch (error) {
      console.error('Error fetching auto-refresh settings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadMoreListings = useCallback(() => {
    if (!loadingMore && hasMoreData) {
      fetchAutoRefreshSettings(currentPage + 1);
    }
  }, [currentPage, loadingMore, hasMoreData]);

  const onRefresh = useCallback(() => {
    // ✅ Reset cache on manual refresh
    lastFetchTime.current = Date.now();
    setCurrentPage(1);
    setHasMoreData(true);
    fetchAutoRefreshSettings(1, true);
  }, []);

  const toggleAutoRefreshForListing = useCallback(async (listingId: string) => {
    if (!user) return;
    
    setUpdating(true);
    try {
      const existingAutoRefresh = settings.activeListings.find(
        listing => listing.listingId === listingId && listing.hasAutoRefresh
      );
      
      if (existingAutoRefresh) {
        // Use direct database operation - actually delete the record
        console.log('Disabling auto-refresh for listing:', listingId);
        
        const { error: deleteError } = await supabase
          .from('business_auto_refresh')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);

        if (deleteError) {
          console.error('Error disabling auto-refresh:', deleteError);
          Alert.alert('Error', `Failed to disable auto-refresh: ${deleteError.message}`);
          return;
        }

        setSettings(prev => ({
          ...prev,
          activeListings: prev.activeListings.map(listing => 
            listing.listingId === listingId 
              ? { ...listing, hasAutoRefresh: false }
              : listing
          )
        }));
      } else {
        // Use direct database operation with upsert to handle conflicts
        console.log('Enabling auto-refresh for listing:', listingId);
        
        const { error: upsertError } = await supabase
          .from('business_auto_refresh')
          .upsert({
            user_id: user.id,
            listing_id: listingId,
            is_active: true,
            next_refresh_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            refresh_interval_hours: 2,
          }, {
            onConflict: 'user_id,listing_id'
          });

        if (upsertError) {
          console.error('Error enabling auto-refresh:', upsertError);
          Alert.alert('Error', `Failed to enable auto-refresh: ${upsertError.message}`);
          return;
        }

        setSettings(prev => ({
          ...prev,
          activeListings: prev.activeListings.map(listing => 
            listing.listingId === listingId 
              ? { ...listing, hasAutoRefresh: true }
              : listing
          )
        }));
      }
    } catch (error) {
      console.error('Error toggling auto-refresh:', error);
      Alert.alert('Error', 'Failed to update auto-refresh for this listing.');
    } finally {
      setUpdating(false);
    }
  }, [user, settings.activeListings]);

  const getActiveListingsCount = useMemo(() => {
    return settings.activeListings.filter(listing => listing.hasAutoRefresh).length;
  }, [settings.activeListings]);

  const getTotalListingsCount = useMemo(() => {
    return allListings.length;
  }, [allListings]);

  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Expired';
    if (diffHours < 24) return `${diffHours}h remaining`;
    
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays}d remaining`;
  };

  const formatNextRefresh = (nextRefreshDate: string) => {
    const now = new Date();
    const next = new Date(nextRefreshDate);
    const diffMs = next.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Due now';
    if (diffHours < 24) return `In ${diffHours}h`;
    
    const diffDays = Math.ceil(diffHours / 24);
    return `In ${diffDays}d`;
  };

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View style={{ padding: theme.spacing.md }}>
          {/* Auto-Refresh Status Card */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.sm,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.xl,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  backgroundColor: theme.colors.primary + '10',
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.md,
                  marginRight: theme.spacing.lg,
                  borderWidth: 2,
                  borderColor: theme.colors.primary + '20',
                }}>
                  <RefreshCw size={24} color={theme.colors.primary} />
                </View>
                <View>
                  <Text variant="h4" style={{ fontWeight: '700', marginBottom: theme.spacing.xs }}>
                    Auto-Refresh System
                  </Text>
                  <Text variant="body" color="secondary" style={{ lineHeight: 20 }}>
                    Your listings go top every 2 hours
                  </Text>
                </View>
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
            }}>
              <View style={{
                flex: 1,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.border,
                minWidth: 0,
              }}>
                <View style={{
                  backgroundColor: theme.colors.success + '15',
                  borderRadius: theme.borderRadius.full,
                  padding: theme.spacing.xs,
                  marginBottom: theme.spacing.xs,
                }}>
                  <CheckCircle size={16} color={theme.colors.success} />
                </View>
                <Text variant="body" style={{ fontWeight: '600', color: theme.colors.success, marginBottom: theme.spacing.xs }}>
                  Active
                </Text>
                <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 10 }}>
                  Status
                </Text>
              </View>
              
              <View style={{
                flex: 1,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.border,
                minWidth: 0,
              }}>
                <View style={{
                  backgroundColor: theme.colors.primary + '15',
                  borderRadius: theme.borderRadius.full,
                  padding: theme.spacing.xs,
                  marginBottom: theme.spacing.xs,
                }}>
                  <Clock size={16} color={theme.colors.primary} />
                </View>
                <Text variant="body" style={{ fontWeight: '600', color: theme.colors.primary, marginBottom: theme.spacing.xs }}>
                  2h
                </Text>
                <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 10 }}>
                  Interval
                </Text>
              </View>
              
              <View style={{
                flex: 1,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.border,
                minWidth: 0,
              }}>
                <View style={{
                  backgroundColor: theme.colors.warning + '15',
                  borderRadius: theme.borderRadius.full,
                  padding: theme.spacing.xs,
                  marginBottom: theme.spacing.xs,
                }}>
                  <RefreshCw size={16} color={theme.colors.warning} />
                </View>
                <Text variant="body" style={{ fontWeight: '600', color: theme.colors.warning, marginBottom: theme.spacing.xs }}>
                  {getActiveListingsCount}
                </Text>
                <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 10 }}>
                  Refreshing
                </Text>
              </View>
            </View>
          </View>

          {/* Auto-Refresh Info */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.xl,
            marginBottom: theme.spacing.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.sm,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <View style={{
                backgroundColor: theme.colors.primary + '10',
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                marginRight: theme.spacing.md,
              }}>
                <Info size={24} color={theme.colors.primary} />
              </View>
              <Text variant="h4" style={{ fontWeight: '700' }}>
                How Auto-Refresh Works
              </Text>
            </View>

            <View style={{
              backgroundColor: theme.colors.primary + '05',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.primary + '10',
            }}>
              <Text variant="body" color="secondary" style={{ 
                lineHeight: 24,
                marginBottom: theme.spacing.md,
              }}>
                Auto-refresh automatically updates your listings every 2 hours to keep them at the top of search results. 
                You can enable or disable auto-refresh for individual listings.
              </Text>
              
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0,
                }}>
                  <View style={{
                    backgroundColor: theme.colors.success + '15',
                    borderRadius: theme.borderRadius.sm,
                    padding: theme.spacing.xs,
                    marginRight: theme.spacing.xs,
                  }}>
                    <CheckCircle size={14} color={theme.colors.success} />
                  </View>
                  <Text variant="caption" color="secondary" style={{ fontSize: 11 }}>
                    Auto every 2h
                  </Text>
                </View>
                
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0,
                }}>
                  <View style={{
                    backgroundColor: theme.colors.primary + '15',
                    borderRadius: theme.borderRadius.sm,
                    padding: theme.spacing.xs,
                    marginRight: theme.spacing.xs,
                  }}>
                    <Settings size={14} color={theme.colors.primary} />
                  </View>
                  <Text variant="caption" color="secondary" style={{ fontSize: 11 }}>
                    Per-listing
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Listings Section */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.xl,
            marginBottom: theme.spacing.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.sm,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.xl,
            }}>
              <View style={{
                backgroundColor: theme.colors.warning + '10',
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                marginRight: theme.spacing.md,
              }}>
                <TrendingUp size={24} color={theme.colors.warning} />
              </View>
              <View>
                <Text variant="h4" style={{ fontWeight: '700', marginBottom: theme.spacing.xs }}>
                  Your Listings
                </Text>
                <Text variant="body" color="secondary">
                  Manage auto-refresh for each listing
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'footer') {
      return (
        <View style={{ padding: theme.spacing.md }}>
          {/* Auto-Refresh Summary */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.sm,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <View style={{
                backgroundColor: theme.colors.primary + '10',
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                marginRight: theme.spacing.md,
              }}>
                <BarChart3 size={24} color={theme.colors.primary} />
              </View>
              <Text variant="h4" style={{ 
                fontWeight: '700',
              }}>
                Performance Summary
              </Text>
            </View>
            
            <Text variant="body" color="secondary" style={{ 
              marginBottom: theme.spacing.lg,
              lineHeight: 22,
            }}>
              Your listings automatically refresh every 2 hours to stay at the top of search results.
            </Text>
            
            <View style={{ 
              flexDirection: 'row', 
              gap: theme.spacing.sm,
            }}>
              <View style={{
                flex: 1,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.border,
                minWidth: 0,
              }}>
                <View style={{
                  backgroundColor: theme.colors.primary + '15',
                  borderRadius: theme.borderRadius.full,
                  padding: theme.spacing.xs,
                  marginBottom: theme.spacing.xs,
                }}>
                  <TrendingUp size={16} color={theme.colors.primary} />
                </View>
                <Text variant="body" style={{ fontWeight: '600', color: theme.colors.primary, marginBottom: theme.spacing.xs }}>
                  {getTotalListingsCount}
                </Text>
                <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 10 }}>
                  Total
                </Text>
              </View>
              
              <View style={{
                flex: 1,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.border,
                minWidth: 0,
              }}>
                <View style={{
                  backgroundColor: theme.colors.success + '15',
                  borderRadius: theme.borderRadius.full,
                  padding: theme.spacing.xs,
                  marginBottom: theme.spacing.xs,
                }}>
                  <RefreshCw size={16} color={theme.colors.success} />
                </View>
                <Text variant="body" style={{ fontWeight: '600', color: theme.colors.success, marginBottom: theme.spacing.xs }}>
                  {getActiveListingsCount}
                </Text>
                <Text variant="caption" color="muted" style={{ textAlign: 'center', fontSize: 10 }}>
                  Refreshing
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'listing') {
      return (
        <ListingItem 
          listing={item} 
          index={item.originalIndex}
          theme={theme}
          settings={settings}
          userListings={userListings}
          toggleAutoRefreshForListing={toggleAutoRefreshForListing}
          updating={updating}
          formatNextRefresh={formatNextRefresh}
          formatTimeRemaining={formatTimeRemaining}
        />
      );
    }

    return null;
  }, [theme, getActiveListingsCount, getTotalListingsCount, settings, userListings, toggleAutoRefreshForListing, updating, formatNextRefresh, formatTimeRemaining]);

  const flatListData = useMemo(() => {
    const data = [];
    
    data.push({ id: 'header', type: 'header' });
    
    userListings.forEach((listing, index) => {
      data.push({ ...listing, type: 'listing', originalIndex: index });
    });
    
    data.push({ id: 'footer', type: 'footer' });
    
    return data;
  }, [userListings]);

  if (loading) {
    return <DashboardSkeleton type="auto-refresh" />;
  }

  return (
    <FlatList
      data={flatListData}
      keyExtractor={(item) => item.id || item.type}
      renderItem={renderItem}
      onEndReached={loadMoreListings}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
      ListFooterComponent={() => (
        loadingMore ? (
          <View style={{ 
            padding: theme.spacing.lg, 
            alignItems: 'center' 
          }}>
            <LoadingSkeleton count={1} height={120} />
          </View>
        ) : hasMoreData ? (
          <View style={{ 
            padding: theme.spacing.lg, 
            alignItems: 'center' 
          }}>
            <Button
              variant="tertiary"
              onPress={loadMoreListings}
              style={{ minWidth: 120 }}
            >
              <Text variant="body" style={{ color: theme.colors.primary }}>
                Load More
              </Text>
            </Button>
          </View>
        ) : null
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
    />
  );
}