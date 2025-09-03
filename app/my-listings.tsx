import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useListings } from '@/hooks/useListings';
import { dbHelpers, supabase } from '@/lib/supabase';
import { router } from 'expo-router';
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
import { Package, Plus, CreditCard as Edit, Eye, EyeOff, Trash2, TrendingUp, Clock, CircleCheck as CheckCircle, Circle as XCircle, Pause } from 'lucide-react-native';

type ListingStatus = 'all' | 'active' | 'sold' | 'draft' | 'expired' | 'suspended';

export default function MyListingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<ListingStatus>('all');
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyListings();
    }
  }, [user, activeTab]);

  const fetchMyListings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('listings')
        .select(`
          *,
          categories (
            name,
            icon
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
  };

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
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listingId);

      if (error) throw error;

      setToastMessage(`Listing ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      setShowToast(true);
      
      // Refresh listings
      await fetchMyListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to update listing status');
    }
  };

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
      default:
        return { text: status, variant: 'neutral' as const, icon: null };
    }
  };

  const tabs = [
    { id: 'all', label: 'All', count: myListings.length },
    { id: 'active', label: 'Active', count: myListings.filter(l => l.status === 'active').length },
    { id: 'sold', label: 'Sold', count: myListings.filter(l => l.status === 'sold').length },
    { id: 'draft', label: 'Drafts', count: myListings.filter(l => l.status === 'draft').length },
  ];

  const filteredListings = activeTab === 'all' 
    ? myListings 
    : myListings.filter(listing => listing.status === activeTab);

  const transformedListings = filteredListings.map((listing: any) => ({
    id: listing.id,
    image: listing.images?.[0] || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg',
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
    views: listing.views_count || 0,
    favorites: listing.favorites_count || 0,
  }));

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="My Listings"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
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

        {/* Listings Content */}
        {loading ? (
          <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
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
            <Grid columns={2} spacing={4}>
              {transformedListings.map((listing) => (
                <View key={listing.id} style={{ position: 'relative' }}>
                  <ProductCard
                    image={listing.image}
                    title={listing.title}
                    price={listing.price}
                    seller={listing.seller}
                    badge={listing.badge}
                    location={listing.location}
                    layout="grid"
                    fullWidth={true}
                    onPress={() => router.push(`/(tabs)/home/${listing.id}`)}
                  />

                  {/* Action Overlay */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: theme.spacing.md,
                      right: theme.spacing.md,
                      flexDirection: 'row',
                      gap: theme.spacing.xs,
                    }}
                  >
                    <Button
                      variant="icon"
                      icon={<Edit size={16} color={theme.colors.text.primary} />}
                      onPress={() => {
                        Alert.alert('Coming Soon', 'Edit listing feature will be available soon');
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.borderRadius.md,
                        ...theme.shadows.md,
                      }}
                    />

                    <Button
                      variant="icon"
                      icon={listing.status === 'active' ? 
                        <EyeOff size={16} color={theme.colors.warning} /> : 
                        <Eye size={16} color={theme.colors.success} />
                      }
                      onPress={() => handleToggleStatus(listing.id, listing.status)}
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.borderRadius.md,
                        ...theme.shadows.md,
                      }}
                    />

                    <Button
                      variant="icon"
                      icon={<Trash2 size={16} color={theme.colors.error} />}
                      onPress={() => {
                        setSelectedListing(listing);
                        setShowDeleteModal(true);
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.borderRadius.md,
                        ...theme.shadows.md,
                      }}
                    />
                  </View>

                  {/* Stats Overlay */}
                  <View
                    style={{
                      position: 'absolute',
                      top: theme.spacing.md,
                      right: theme.spacing.md,
                      backgroundColor: theme.colors.surface + 'E6',
                      borderRadius: theme.borderRadius.sm,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.xs,
                    }}
                  >
                    <Text variant="caption" style={{ fontWeight: '600' }}>
                      👁️ {listing.views} • ❤️ {listing.favorites}
                    </Text>
                  </View>
                </View>
              ))}
            </Grid>
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
            Are you sure you want to delete "{selectedListing?.title}"?
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