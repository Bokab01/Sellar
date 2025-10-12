import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useListings } from '@/hooks/useListings';
import { dbHelpers, supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useMultipleListingStats } from '@/hooks/useListingStats';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import * as Haptics from 'expo-haptics';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  ProductCard,
  Chip,
  Button,
  Badge,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  AppModal,
  Toast,
  Grid,
} from '@/components';
import { Package, Plus, Edit, Eye, EyeOff, Trash2, TrendingUp, Clock, CircleCheck as CheckCircle, Circle as XCircle, Pause, Check, X, MoreHorizontal, SquareCheckBig, RefreshCw, LayoutGrid, List } from 'lucide-react-native';

type ListingStatus = 'all' | 'active' | 'sold' | 'draft' | 'expired' | 'suspended' | 'hidden';
type ViewMode = 'grid' | 'list';

export default function MyListingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<ListingStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // ✅ Default to list view
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHideModal, setShowHideModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  // Bulk operations state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState({
    delete: false,
    activate: false,
    deactivate: false,
    markSold: false,
    restore: false,
    relist: false,
  });
  const [longPressedItem, setLongPressedItem] = useState<string | null>(null);
  
  // Animation state
  const bulkActionsOpacity = useRef(new Animated.Value(0)).current;
  const bulkActionsTranslateY = useRef(new Animated.Value(20)).current;


  // Bulk action button styles
  const bulkActionStyles = {
    delete: {
      flex: 1, 
      minHeight: 40,
      backgroundColor: theme.colors.error + '15',
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      shadowOpacity: 0,
      elevation: 0,
    },
    activate: {
      flex: 1, 
      minHeight: 40,
      backgroundColor: theme.colors.success + '15',
      borderWidth: 1,
      borderColor: theme.colors.success + '30',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      shadowOpacity: 0,
      elevation: 0,
    },
    deactivate: {
      flex: 1, 
      minHeight: 40,
      backgroundColor: theme.colors.warning + '15',
      borderWidth: 1,
      borderColor: theme.colors.warning + '30',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      shadowOpacity: 0,
      elevation: 0,
    },
    markSold: {
      flex: 1, 
      minHeight: 40,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      shadowOpacity: 0,
      elevation: 0,
    },
    restore: {
      flex: 1, 
      minHeight: 40,
      backgroundColor: theme.colors.primary + '15',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      shadowOpacity: 0,
      elevation: 0,
    },
    relist: {
      flex: 1, 
      minHeight: 40,
      backgroundColor: theme.colors.primary + '15',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      shadowOpacity: 0,
      elevation: 0,
    },
  };

  const fetchMyListings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('listings')
        .select(`
          id,
          user_id,
          title,
          description,
          price,
          currency,
          category_id,
          condition,
          quantity,
          location,
          images,
          accept_offers,
          status,
          hidden_by_seller,
          boost_until,
          boost_score,
          highlight_until,
          urgent_until,
          spotlight_until,
          spotlight_category_id,
          seo_title,
          keywords,
          attributes,
          created_at,
          updated_at,
          views_count,
          favorites_count,
          categories (
            name,
            icon
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false});

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch listings:', error);
      } else {
        setMyListings(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      fetchMyListings();
    }
  }, [fetchMyListings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMyListings();
    setRefreshing(false);
  };

  const handleDeleteListing = async () => {
    if (!selectedListing) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', selectedListing.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setSelectedListing(null);
      setToastMessage('Listing deleted successfully');
      setShowToast(true);
      
      // Refresh listings
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete listing');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (listingId: string, currentStatus: string) => {
    // If hiding an active listing, show confirmation modal
    if (currentStatus === 'active') {
      const listing = myListings.find(l => l.id === listingId);
      setSelectedListing(listing);
      setShowHideModal(true);
      return;
    }
    
    // Otherwise, activate the listing (from draft/expired/hidden)
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('listings')
        .update({ 
          status: 'active',
          hidden_by_seller: false  // Clear the flag when activating
        })
        .eq('id', listingId);

      if (error) throw error;

      setToastMessage('Listing activated successfully');
      setShowToast(true);
      
      // Refresh listings
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to activate listing');
    } finally {
      setProcessing(false);
    }
  };

  const confirmHideListing = async () => {
    if (!selectedListing) return;
    
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('listings')
        .update({ 
          status: 'hidden',
          hidden_by_seller: true  // Flag to indicate seller hid it themselves
        })
        .eq('id', selectedListing.id);

      if (error) throw error;

      setToastMessage('Listing hidden successfully');
      setShowToast(true);
      setShowHideModal(false);
      
      // Refresh listings
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to hide listing');
    } finally {
      setProcessing(false);
      setSelectedListing(null);
    }
  };

  // Bulk operations handlers
  const toggleListingSelection = (listingId: string) => {
    const newSelected = new Set(selectedListings);
    if (newSelected.has(listingId)) {
      newSelected.delete(listingId);
    } else {
      newSelected.add(listingId);
    }
    setSelectedListings(newSelected);
  };

  const clearSelection = () => {
    setSelectedListings(new Set());
    setIsSelectionMode(false);
  };

  const handleLongPress = (listingId: string) => {
    // Provide haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptic feedback not available on this device
    }
    
    // Set visual feedback
    setLongPressedItem(listingId);
    
    // Clear visual feedback after a short delay
    setTimeout(() => {
      setLongPressedItem(null);
    }, 200);
    
    // Enter selection mode if not already in it
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
    
    // Pre-select the long-pressed item
    const newSelected = new Set(selectedListings);
    newSelected.add(listingId);
    setSelectedListings(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedListings.size === 0) return;

    Alert.alert(
      'Delete Listings',
      `Are you sure you want to delete ${selectedListings.size} listing${selectedListings.size > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBulkActionLoading(prev => ({ ...prev, delete: true }));
            try {
              const { error } = await supabase
                .from('listings')
                .delete()
                .in('id', Array.from(selectedListings));

              if (error) throw error;

              setToastMessage(`${selectedListings.size} listing${selectedListings.size > 1 ? 's' : ''} deleted successfully`);
              setShowToast(true);
              clearSelection();
              await fetchMyListings();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete listings');
            } finally {
              setBulkActionLoading(prev => ({ ...prev, delete: false }));
            }
          },
        },
      ]
    );
  };

  const handleBulkActivate = async () => {
    if (selectedListings.size === 0) return;

    setBulkActionLoading(prev => ({ ...prev, activate: true }));
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'active' })
        .in('id', Array.from(selectedListings));

      if (error) throw error;

      setToastMessage(`${selectedListings.size} listing${selectedListings.size > 1 ? 's' : ''} activated successfully`);
      setShowToast(true);
      clearSelection();
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to activate listings');
    } finally {
      setBulkActionLoading(prev => ({ ...prev, activate: false }));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedListings.size === 0) return;

    setBulkActionLoading(prev => ({ ...prev, deactivate: true }));
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'draft' })
        .in('id', Array.from(selectedListings));

      if (error) throw error;

      setToastMessage(`${selectedListings.size} listing${selectedListings.size > 1 ? 's' : ''} deactivated successfully`);
      setShowToast(true);
      clearSelection();
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to deactivate listings');
    } finally {
      setBulkActionLoading(prev => ({ ...prev, deactivate: false }));
    }
  };

  const handleBulkMarkSold = async () => {
    if (selectedListings.size === 0) return;

    setBulkActionLoading(prev => ({ ...prev, markSold: true }));
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .in('id', Array.from(selectedListings));

      if (error) throw error;

      setToastMessage(`${selectedListings.size} listing${selectedListings.size > 1 ? 's' : ''} marked as sold successfully`);
      setShowToast(true);
      clearSelection();
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark listings as sold');
    } finally {
      setBulkActionLoading(prev => ({ ...prev, markSold: false }));
    }
  };

  const handleBulkRestore = async () => {
    if (selectedListings.size === 0) return;

    setBulkActionLoading(prev => ({ ...prev, restore: true }));
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'active' })
        .in('id', Array.from(selectedListings));

      if (error) throw error;

      setToastMessage(`${selectedListings.size} listing${selectedListings.size > 1 ? 's' : ''} restored successfully`);
      setShowToast(true);
      clearSelection();
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to restore listings');
    } finally {
      setBulkActionLoading(prev => ({ ...prev, restore: false }));
    }
  };

  const handleBulkRelist = async () => {
    if (selectedListings.size === 0) return;

    setBulkActionLoading(prev => ({ ...prev, relist: true }));
    try {
      const { error } = await supabase
        .from('listings')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedListings));

      if (error) throw error;

      setToastMessage(`${selectedListings.size} listing${selectedListings.size > 1 ? 's' : ''} relisted successfully`);
      setShowToast(true);
      clearSelection();
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to relist items');
    } finally {
      setBulkActionLoading(prev => ({ ...prev, relist: false }));
    }
  };

  const handleRelistListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (error) throw error;

      setToastMessage('Listing relisted successfully');
      setShowToast(true);
      
      // Refresh listings
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to relist listing');
    }
  };

  // Animate bulk actions when selection changes
  useEffect(() => {
    if (isSelectionMode) {
      Animated.parallel([
        Animated.timing(bulkActionsOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bulkActionsTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bulkActionsOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bulkActionsTranslateY, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelectionMode, bulkActionsOpacity, bulkActionsTranslateY]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { text: 'Active', variant: 'success' as const, icon: <CheckCircle size={12} /> };
      case 'sold':
        return { text: 'Sold', variant: 'neutral' as const, icon: <CheckCircle size={12} /> };
      case 'draft':
        return { text: 'Draft', variant: 'warning' as const, icon: <Clock size={12} /> };
      case 'expired':
        return { text: 'Expired', variant: 'error' as const, icon: <XCircle size={12} /> };
      case 'suspended':
        return { text: 'Suspended', variant: 'error' as const, icon: <Pause size={12} /> };
      case 'hidden':
        return { text: 'Hidden', variant: 'error' as const, icon: <EyeOff size={12} /> };
      default:
        return { text: status, variant: 'neutral' as const, icon: null };
    }
  };

  const tabs = [
    { id: 'all', label: 'All', count: myListings.length },
    { id: 'active', label: 'Active', count: myListings.filter(l => l.status === 'active').length },
    { id: 'sold', label: 'Sold', count: myListings.filter(l => l.status === 'sold').length },
    { id: 'draft', label: 'Drafts', count: myListings.filter(l => l.status === 'draft').length },
    { id: 'hidden', label: 'Hidden', count: myListings.filter(l => l.status === 'hidden').length },
  ];

  const filteredListings = activeTab === 'all' 
    ? myListings 
    : myListings.filter(listing => listing.status === activeTab);

  // Get selected listings data for smart button logic
  const selectedListingsData = filteredListings.filter(listing => 
    selectedListings.has(listing.id)
  );

  // Smart button logic based on selected listings
  const canActivate = selectedListingsData.some(listing => 
    listing.status === 'draft' || listing.status === 'expired'
  );
  const canDeactivate = selectedListingsData.some(listing => 
    listing.status === 'active'
  );
  const canMarkSold = selectedListingsData.some(listing => 
    listing.status === 'active' || listing.status === 'draft'
  );
  const canRestore = selectedListingsData.some(listing => 
    listing.status === 'hidden' || listing.status === 'suspended'
  );
  const canRelist = selectedListingsData.some(listing => 
    listing.status === 'sold'
  );
  const canDelete = selectedListingsData.length > 0;

  // ✅ Get real-time view and favorite counts for all listings
  const listingIds = React.useMemo(() => 
    filteredListings.map((listing: any) => listing.id), 
    [filteredListings]
  );
  
  const { viewCounts, refreshStats } = useMultipleListingStats({ 
    listingIds 
  });
  
  const { listingFavoriteCounts } = useFavoritesStore();

  const transformedListings = filteredListings.map((listing: any) => ({
    id: listing.id,
    image: listing.images || ['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
    title: listing.title,
    price: listing.price,
    seller: {
      name: `${user?.user_metadata?.first_name} ${user?.user_metadata?.last_name}`,
      avatar: user?.user_metadata?.avatar_url,
      rating: 0,
    },
    badge: getStatusBadge(listing.status),
    location: listing.location,
    status: listing.status,
    hidden_by_seller: listing.hidden_by_seller || false,
    // ✅ Use real-time counts from hooks instead of stale DB columns
    views: viewCounts[listing.id] || listing.views_count || 0,
    favorites: listingFavoriteCounts[listing.id] ?? listing.favorites_count ?? 0,
  }));

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={isSelectionMode ? `${selectedListings.size} selected` : "My Listings"}
        showBackButton
        onBackPress={() => isSelectionMode ? clearSelection() : router.back()}
        rightActions={isSelectionMode ? [
          <Button
            key="cancel-selection"
            variant="icon"
            icon={<X size={20} color={theme.colors.text.primary} />}
            onPress={clearSelection}
          />,
        ] : [
          <Button
            key="view-toggle"
            variant="icon"
            icon={viewMode === 'grid' ? 
              <List size={20} color={theme.colors.text.primary} /> : 
              <LayoutGrid size={20} color={theme.colors.text.primary} />
            }
            onPress={() => {
              setViewMode(viewMode === 'grid' ? 'list' : 'grid');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />,
          <Button
            key="select-mode"
            variant="icon"
            icon={<SquareCheckBig size={20} color={theme.colors.text.primary} />}
            onPress={() => setIsSelectionMode(true)}
          />,
          <Button
            key="create-listing"
            variant="icon"
            icon={<Plus size={20} color={theme.colors.text.primary} />}
            onPress={() => router.push('/(tabs)/create')}
          />,
        ]}
      />

      <View style={{ flex: 1 }}>
        {/* Status Tabs */}
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
                onPress={() => setActiveTab(tab.id as ListingStatus)}
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
                  <Badge
                    text={tab.count.toString()}
                    variant={activeTab === tab.id ? 'info' : 'neutral'}
                    size="sm"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bulk Actions - Between tabs and content */}
        {isSelectionMode && (
          <Animated.View
            style={{
              backgroundColor: theme.colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              opacity: bulkActionsOpacity,
              transform: [{ translateY: bulkActionsTranslateY }]
            }}
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
              {/* Delete Button - Always available */}
              {canDelete && (
                <Button
                  variant="secondary"
                  icon={<Trash2 size={14} color={theme.colors.error} />}
                  onPress={handleBulkDelete}
                  loading={bulkActionLoading.delete}
                  disabled={bulkActionLoading.delete}
                  style={bulkActionStyles.delete}
                  size="sm"
                >
                  <Text variant="caption" numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: theme.colors.error, margin: 0, padding: 0 }}>
                    Delete
                  </Text>
                </Button>
              )}
              
              {/* Activate Button - Only for draft/expired listings */}
              {canActivate && (
                <Button
                  variant="secondary"
                  icon={<Eye size={14} color={theme.colors.success} />}
                  onPress={handleBulkActivate}
                  loading={bulkActionLoading.activate}
                  disabled={bulkActionLoading.activate}
                  style={bulkActionStyles.activate}
                  size="sm"
                >
                  <Text variant="caption" numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: theme.colors.success, margin: 0, padding: 0 }}>
                    Activate
                  </Text>
                </Button>
              )}
              
              {/* Deactivate Button - Only for active listings */}
              {canDeactivate && (
                <Button
                  variant="secondary"
                  icon={<EyeOff size={14} color={theme.colors.warning} />}
                  onPress={handleBulkDeactivate}
                  loading={bulkActionLoading.deactivate}
                  disabled={bulkActionLoading.deactivate}
                  style={bulkActionStyles.deactivate}
                  size="sm"
                >
                  <Text variant="caption" numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: theme.colors.warning, margin: 0, padding: 0 }}>
                    Deactivate
                  </Text>
                </Button>
              )}
              
              {/* Mark Sold Button - Only for active/draft listings */}
              {canMarkSold && (
                <Button
                  variant="primary"
                  icon={<CheckCircle size={14} color={theme.colors.primaryForeground} />}
                  onPress={handleBulkMarkSold}
                  loading={bulkActionLoading.markSold}
                  disabled={bulkActionLoading.markSold}
                  style={bulkActionStyles.markSold}
                  size="sm"
                >
                  <Text variant="caption" numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: theme.colors.primaryForeground, margin: 0, padding: 0 }}>
                    Mark Sold
                  </Text>
                </Button>
              )}
              
              {/* Restore Button - Only for hidden/suspended listings */}
              {canRestore && (
                <Button
                  variant="secondary"
                  icon={<Eye size={14} color={theme.colors.primary} />}
                  onPress={handleBulkRestore}
                  loading={bulkActionLoading.restore}
                  disabled={bulkActionLoading.restore}
                  style={bulkActionStyles.restore}
                  size="sm"
                >
                  <Text variant="caption" numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: theme.colors.primary, margin: 0, padding: 0 }}>
                    Restore
                  </Text>
                </Button>
              )}
              
              {/* Relist Button - Only for sold listings */}
              {canRelist && (
                <Button
                  variant="secondary"
                  icon={<RefreshCw size={14} color={theme.colors.primary} />}
                  onPress={handleBulkRelist}
                  loading={bulkActionLoading.relist}
                  disabled={bulkActionLoading.relist}
                  style={bulkActionStyles.relist}
                  size="sm"
                >
                  <Text variant="caption" numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: theme.colors.primary, margin: 0, padding: 0 }}>
                    Relist
                  </Text>
                </Button>
              )}
            </View>
          </Animated.View>
        )}

        {/* Listings Content */}
        {loading ? (
          <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
            {viewMode === 'grid' ? (
            <Grid columns={2} spacing={4}>
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingSkeleton
                  key={index}
                  width="100%"
                  height={280}
                  borderRadius={theme.borderRadius.lg}
                />
              ))}
            </Grid>
            ) : (
              <View style={{ paddingHorizontal: theme.spacing.lg }}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <LoadingSkeleton
                    key={index}
                    width="100%"
                    height={100}
                    borderRadius={theme.borderRadius.lg}
                    style={{ marginBottom: theme.spacing.md }}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        ) : filteredListings.length > 0 ? (
          <ScrollView
            contentContainerStyle={{
              paddingBottom: theme.spacing.xl,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          >
            {viewMode === 'grid' ? (
            <Grid columns={2} spacing={4}>
              {transformedListings.map((listing) => (
                <View key={listing.id} style={{ position: 'relative' }}>
                   <TouchableOpacity
                     onLongPress={() => handleLongPress(listing.id)}
                     delayLongPress={500}
                     activeOpacity={1}
                     style={{
                       opacity: longPressedItem === listing.id ? 0.7 : 1,
                       transform: [{ scale: longPressedItem === listing.id ? 0.95 : 1 }],
                     }}
                   >
                     {/* Blur overlay - ONLY for moderation-hidden listings */}
                     {listing.status === 'hidden' && !listing.hidden_by_seller && (
                       <View
                         style={{
                           position: 'absolute',
                           top: 0,
                           left: 0,
                           right: 0,
                           bottom: 0,
                           backgroundColor: 'rgba(0,0,0,0.3)',
                           borderRadius: theme.borderRadius.lg,
                           zIndex: 1,
                         }}
                       />
                     )}
                     <View style={{ 
                       opacity: (listing.status === 'hidden' && !listing.hidden_by_seller) ? 0.6 : 1,
                       borderWidth: (listing.status === 'hidden' && !listing.hidden_by_seller) ? 2 : 0,
                       borderColor: (listing.status === 'hidden' && !listing.hidden_by_seller) ? theme.colors.error : 'transparent',
                       borderRadius: theme.borderRadius.lg,
                       overflow: 'hidden'
                     }}>
                  <ProductCard
                    image={listing.image}
                    title={listing.title}
                    price={listing.price}
                    seller={listing.seller}
                    badge={listing.badge}
                    location={listing.location}
                    layout="grid"
                    fullWidth={true}
                        viewCount={listing.views}
                        favoritesCount={listing.favorites}
                        onPress={() => {
                          if (isSelectionMode) {
                            toggleListingSelection(listing.id);
                          } else if (listing.status === 'hidden' && !listing.hidden_by_seller) {
                            // Don't navigate to moderation-hidden listings
                            return;
                          } else {
                            router.push(`/(tabs)/home/${listing.id}`);
                          }
                        }}
                        enableImageViewer={!isSelectionMode && !(listing.status === 'hidden' && !listing.hidden_by_seller)}
                      />
                     </View>
                     
                      {/* Hidden by Moderation Banner - Only for moderation-hidden listings */}
                      {listing.status === 'hidden' && !listing.hidden_by_seller && (
                        <View
                          style={{
                            position: 'absolute',
                            top: theme.spacing.sm,
                            left: theme.spacing.sm,
                            right: theme.spacing.sm,
                            backgroundColor: theme.colors.error + 'E6',
                            borderWidth: 1,
                            borderColor: theme.colors.error,
                            borderRadius: theme.borderRadius.md,
                            padding: theme.spacing.sm,
                            zIndex: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,
                          }}
                        >
                          <Text variant="caption" style={{ color: theme.colors.errorForeground, textAlign: 'center', fontWeight: '700' }}>
                            ⚠️ Hidden due to community report
                          </Text>
                          <Text variant="caption" style={{ color: theme.colors.errorForeground, textAlign: 'center', marginTop: 2, fontWeight: '500' }}>
                            Contact support if you believe this was an error
                          </Text>
                        </View>
                      )}
                   </TouchableOpacity>

                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <View
                      style={{
                        position: 'absolute',
                        top: theme.spacing.sm,
                        left: theme.spacing.sm,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: selectedListings.has(listing.id) 
                          ? theme.colors.primary 
                          : theme.colors.surface + 'E6',
                        borderWidth: 2,
                        borderColor: selectedListings.has(listing.id) 
                          ? theme.colors.primary 
                          : theme.colors.border,
                        justifyContent: 'center',
                        alignItems: 'center',
                        ...theme.shadows.sm,
                      }}
                    >
                      {selectedListings.has(listing.id) && (
                        <Check size={14} color={theme.colors.primaryForeground} />
                      )}
                    </View>
                  )}

                  {/* Action Overlay - Hide in selection mode and moderation-hidden listings */}
                  {!isSelectionMode && !(listing.status === 'hidden' && !listing.hidden_by_seller) && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: theme.spacing.md,
                      right: theme.spacing.md,
                      flexDirection: 'row',
                      gap: theme.spacing.xs,
                    }}
                  >
                    {/* Show relist button for sold items */}
                    {listing.status === 'sold' ? (
                    <Button
                      variant="icon"
                        icon={<RefreshCw size={14} color={theme.colors.primary} />}
                        onPress={() => handleRelistListing(listing.id)}
                        style={{
                          width: 30,
                          height: 30,
                          backgroundColor: theme.colors.surface,
                          borderRadius: theme.borderRadius.md,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      />
                    ) : (
                      <Button
                        variant="icon"
                        icon={<Edit size={14} color={theme.colors.text.primary} />}
                      onPress={() => router.push(`/edit-listing/${listing.id}` as any)}
                      style={{
                          width: 30,
                          height: 30,
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.borderRadius.md,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                      }}
                    />
                    )}

                    {listing.status !== 'sold' && (
                    <Button
                      variant="icon"
                      icon={listing.status === 'active' ? 
                          <EyeOff size={14} color={theme.colors.warning} /> : 
                          <Eye size={14} color={theme.colors.success} />
                      }
                      onPress={() => handleToggleStatus(listing.id, listing.status)}
                      style={{
                          width: 30,
                          height: 30,
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.borderRadius.md,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                      }}
                    />
                    )}

                    <Button
                      variant="icon"
                      icon={<Trash2 size={14} color={theme.colors.error} />}
                      onPress={() => {
                        setSelectedListing(listing);
                        setShowDeleteModal(true);
                      }}
                      style={{
                        width: 30,
                        height: 30,
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.borderRadius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    />
                  </View>
                  )}
                </View>
              ))}
              </Grid>
            ) : (
              <View style={{ paddingHorizontal: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
                {transformedListings.map((listing) => {
                  // ✅ Prepare badges - extract ONLY text and variant (NO icons or React components)
                  const listBadges: Array<{ text: string; variant: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'secondary' }> = [];
                  
                  // Safely extract badge text and variant from the status badge (which contains an icon we must exclude)
                  if (listing.badge?.text && listing.badge?.variant) {
                    listBadges.push({ 
                      text: String(listing.badge.text), 
                      variant: String(listing.badge.variant) as any
                    });
                  }

                  return (
                    <View key={listing.id} style={{ position: 'relative' }}>
                      <ProductCard
                        variant="list"
                        shadowSize="sm"
                        listingId={String(listing.id)}
                        image={Array.isArray(listing.image) ? listing.image[0] : String(listing.image)}
                        title={String(listing.title)}
                        price={listing.price}
                        currency="GHS"
                        seller={listing.seller || { id: '', name: 'Unknown' }}
                        status={String(listing.status)}
                        location={listing.location}
                        viewCount={Number(listing.views) || 0}
                        favoritesCount={Number(listing.favorites) || 0}
                        badge={listBadges[0]}
                        badges={listBadges}
                        onPress={() => {
                          if (isSelectionMode) {
                            toggleListingSelection(listing.id);
                          } else if (listing.status === 'hidden' && !listing.hidden_by_seller) {
                            // Don't navigate to moderation-hidden listings
                            return;
                          } else {
                            router.push(`/(tabs)/home/${listing.id}`);
                          }
                        }}
                        onEdit={!(listing.status === 'hidden' && !listing.hidden_by_seller) && listing.status !== 'sold' ? () => router.push(`/edit-listing/${listing.id}` as any) : undefined}
                        onDelete={!(listing.status === 'hidden' && !listing.hidden_by_seller) ? () => {
                          setSelectedListing(listing);
                          setShowDeleteModal(true);
                        } : undefined}
                        onToggleVisibility={!(listing.status === 'hidden' && !listing.hidden_by_seller) && listing.status !== 'sold' ? () => handleToggleStatus(listing.id, listing.status) : undefined}
                      />
                      
                       {/* Hidden by Moderation Overlay for List View - Only for moderation-hidden listings */}
                       {listing.status === 'hidden' && !listing.hidden_by_seller && (
                  <View
                    style={{
                      position: 'absolute',
                      top: theme.spacing.md,
                             left: theme.spacing.md,
                      right: theme.spacing.md,
                             backgroundColor: theme.colors.error + 'E6',
                             borderWidth: 1,
                             borderColor: theme.colors.error,
                             borderRadius: theme.borderRadius.md,
                             padding: theme.spacing.sm,
                             zIndex: 20,
                             shadowColor: '#000',
                             shadowOffset: { width: 0, height: 2 },
                             shadowOpacity: 0.25,
                             shadowRadius: 4,
                             elevation: 5,
                           }}
                         >
                           <Text variant="caption" style={{ color: theme.colors.errorForeground, textAlign: 'center', fontWeight: '700' }}>
                             ⚠️ Hidden due to community report
                           </Text>
                           <Text variant="caption" style={{ color: theme.colors.errorForeground, textAlign: 'center', marginTop: 2, fontWeight: '500' }}>
                             Contact support if you believe this was an error
                    </Text>
                  </View>
                       )}
                </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        ) : (
          <EmptyState
            icon={<Package size={64} color={theme.colors.text.muted} />}
            title={getEmptyStateTitle()}
            description={getEmptyStateDescription()}
            action={{
              text: 'Create Listing',
              onPress: () => router.push('/(tabs)/create'),
            }}
          />
        )}
      </View>


      {/* Delete Confirmation Modal */}
      <AppModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Listing"
        primaryAction={{
          text: 'Delete',
          onPress: handleDeleteListing,
          loading: processing,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowDeleteModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary">
            Are you sure you want to delete &quot;{selectedListing?.title}&quot;?
          </Text>

          <View
            style={{
              backgroundColor: theme.colors.error + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.error, textAlign: 'center' }}>
              ⚠️ This action cannot be undone. All related messages and offers will also be removed.
            </Text>
          </View>
        </View>
      </AppModal>

      {/* Hide Confirmation Modal */}
      <AppModal
        visible={showHideModal}
        onClose={() => {
          setShowHideModal(false);
          setSelectedListing(null);
        }}
        title="Hide Listing"
        primaryAction={{
          text: 'Hide Listing',
          onPress: confirmHideListing,
          loading: processing,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => {
            setShowHideModal(false);
            setSelectedListing(null);
          },
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary">
            Are you sure you want to hide &quot;{selectedListing?.title}&quot;?
          </Text>

          <View
            style={{
              backgroundColor: theme.colors.warning + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.warning, textAlign: 'center' }}>
              ⚠️ This listing will be hidden from public view. You can restore it anytime from the Hidden tab.
            </Text>
          </View>
        </View>
      </AppModal>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );

  function getEmptyStateTitle() {
    switch (activeTab) {
      case 'active': return 'No active listings';
      case 'sold': return 'No sold items yet';
      case 'draft': return 'No draft listings';
      case 'expired': return 'No expired listings';
      case 'suspended': return 'No suspended listings';
      default: return 'No listings yet';
    }
  }

  function getEmptyStateDescription() {
    switch (activeTab) {
      case 'active': return 'You don\'t have any active listings. Create one to start selling!';
      case 'sold': return 'Your sold items will appear here once you complete sales.';
      case 'draft': return 'Save listings as drafts to publish later.';
      case 'expired': return 'Expired listings will appear here.';
      case 'suspended': return 'Suspended listings will appear here.';
      default: return 'Start selling by creating your first listing!';
    }
  }
}

