import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { dbHelpers, supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  Container,
  AppHeader,
  Button,
  Badge,
  LoadingSkeleton,
  EmptyState,
  PriceDisplay,
} from '@/components';
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';

const Tab = createMaterialTopTabNavigator();

type TabType = 'sold' | 'bought';
type FilterType = 'all' | 'in_progress' | 'completed' | 'cancelled';

interface Order {
  id: string;
  listing_id: string | null; // Nullable if listing was deleted
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'released' | 'refunded' | 'expired' | 'claimed';
  created_at: string;
  expires_at: string | null;
  meetup_confirmed_by_buyer_at: string | null;
  meetup_confirmed_by_seller_at: string | null;
  reserved_quantity: number;
  // Snapshot data (preserved when listing deleted)
  listing_title: string | null;
  listing_price: number | null;
  listing_images: any | null;
  // Related listing (null if deleted)
  listing: {
    title: string;
    price: number;
    images: string[];
    status: string;
  } | null;
  buyer: {
    full_name: string;
    avatar_url: string | null;
  };
  seller: {
    full_name: string;
    avatar_url: string | null;
  };
}

// Orders List Component
function OrdersList({ 
  tabType, 
  activeFilter 
}: { 
  tabType: 'sold' | 'bought';
  activeFilter: FilterType;
}) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [activeFilter]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Build query based on tab type
      let query = supabase
        .from('listing_deposits')
        .select(`
          *,
          listing:listings(title, price, images, status),
          buyer:buyer_id(full_name, avatar_url),
          seller:seller_id(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Filter by tab (sold or bought)
      if (tabType === 'sold') {
        query = query.eq('seller_id', user.id);
      } else {
        query = query.eq('buyer_id', user.id);
      }

      // Apply status filter
      if (activeFilter === 'in_progress') {
        query = query.eq('status', 'paid'); // Only show paid deposits (completed payment)
      } else if (activeFilter === 'completed') {
        query = query.in('status', ['released', 'claimed']);
      } else if (activeFilter === 'cancelled') {
        query = query.in('status', ['refunded', 'expired']);
      }
      
      // Exclude pending deposits from all views (abandoned payments)
      if (activeFilter === 'all') {
        query = query.neq('status', 'pending');
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending Payment',
          variant: 'warning' as const,
          icon: <Clock size={16} color={theme.colors.warning} />,
        };
      case 'paid':
        return {
          label: 'In Progress',
          variant: 'info' as const,
          icon: <Clock size={16} color={theme.colors.info} />,
        };
      case 'released':
        return {
          label: 'Completed',
          variant: 'success' as const,
          icon: <CheckCircle size={16} color={theme.colors.success} />,
        };
      case 'claimed':
        return {
          label: 'No-Show Claimed',
          variant: 'neutral' as const,
          icon: <XCircle size={16} color={theme.colors.text.muted} />,
        };
      case 'refunded':
        return {
          label: 'Refunded',
          variant: 'neutral' as const,
          icon: <XCircle size={16} color={theme.colors.text.muted} />,
        };
      case 'expired':
        return {
          label: 'Expired',
          variant: 'neutral' as const,
          icon: <XCircle size={16} color={theme.colors.text.muted} />,
        };
      default:
        return {
          label: status,
          variant: 'neutral' as const,
          icon: null,
        };
    }
  };

  const renderOrderCard = (order: Order) => {
    const statusInfo = getStatusInfo(order.status);
    const otherParty = tabType === 'sold' ? order.buyer : order.seller;

    // Use listing data if available, otherwise use snapshot (for deleted listings)
    const listingTitle = order.listing?.title || order.listing_title || 'Deleted Listing';
    const listingPrice = order.listing?.price || order.listing_price || 0;
    const listingImages = order.listing?.images || (order.listing_images ? 
      (Array.isArray(order.listing_images) ? order.listing_images : JSON.parse(order.listing_images as any)) 
      : []);
    const isListingDeleted = !order.listing_id || !order.listing;

    return (
      <TouchableOpacity
        key={order.id}
        onPress={() => router.push(`/deposit-confirmation/${order.id}` as any)}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.sm,
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {/* Listing Image */}
          <Image
            source={{ uri: listingImages?.[0] || 'https://via.placeholder.com/80' }}
            style={{
              width: 80,
              height: 80,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.surfaceVariant,
            }}
            resizeMode="cover"
          />

          {/* Order Details */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs, flex: 1 }} numberOfLines={2}>
                {listingTitle}
              </Text>
              {isListingDeleted && (
                <Badge text="Deleted" variant="neutral" size="sm" />
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs }}>
              <Text variant="bodySmall" color="secondary">
                {tabType === 'sold' ? 'Buyer' : 'Seller'}:
              </Text>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                {otherParty?.full_name || 'Unknown'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
              <PriceDisplay amount={listingPrice} size="sm" />
              <Text variant="caption" color="secondary">
                •
              </Text>
              <Text variant="caption" style={{ fontWeight: '600', color: theme.colors.primary }}>
                ₵{order.amount.toFixed(2)} deposit
              </Text>
            </View>

            {/* Status Badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              {statusInfo.icon}
              <Badge text={statusInfo.label} variant={statusInfo.variant} size="sm" />
            </View>

            {/* Date */}
            <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
              {new Date(order.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Action Buttons Based on Status */}
        
        {/* Confirm Transaction Button - Only for Buyer with Paid Deposits */}
        {tabType === 'bought' && order.status === 'paid' && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/deposit-confirmation/${order.id}` as any);
            }}
            style={{
              marginTop: theme.spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.success,
              borderRadius: theme.borderRadius.md,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.md,
              gap: theme.spacing.xs,
              shadowColor: theme.colors.success,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <CheckCircle size={20} color="#FFF" />
            <Text 
              variant="body" 
              style={{ 
                color: '#FFF', 
                fontWeight: '700' 
              }}
            >
              ✅ Confirm Transaction
            </Text>
          </TouchableOpacity>
        )}

        {/* Review Button for Completed/Cancelled Orders */}
        {['released', 'refunded', 'expired', 'cancelled'].includes(order.status) && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: '/review/create' as any,
                params: {
                  listingId: order.listing_id,
                  sellerId: tabType === 'bought' ? order.seller_id : order.buyer_id,
                  depositId: order.id,
                  transactionType: 'deposit',
                  transactionStatus: order.status, // Pass status to show appropriate review UI
                },
              });
            }}
            style={{
              marginTop: theme.spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: order.status === 'released' 
                ? theme.colors.primary + '10' 
                : theme.colors.warning + '10',
              borderWidth: 1,
              borderColor: order.status === 'released' 
                ? theme.colors.primary + '30' 
                : theme.colors.warning + '30',
              borderRadius: theme.borderRadius.md,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              gap: theme.spacing.xs,
            }}
          >
            <Text 
              variant="bodySmall" 
              style={{ 
                color: order.status === 'released' ? theme.colors.primary : theme.colors.warning, 
                fontWeight: '600' 
              }}
            >
              {order.status === 'released' ? '⭐ Leave a Review' : '⚠️ Report Experience'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Render function
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {loading ? (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.sm }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              width="100%"
              height={120}
              borderRadius={theme.borderRadius.lg}
              style={{ marginBottom: theme.spacing.md }}
            />
          ))}
        </ScrollView>
      ) : orders.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
          <EmptyState
            icon={tabType === 'sold' ? <ShoppingBag size={64} color={theme.colors.text.muted} /> : <Package size={64} color={theme.colors.text.muted} />}
            title={tabType === 'sold' ? 'No Orders Yet' : 'No Purchases Yet'}
            description={
              tabType === 'sold'
                ? 'Orders from buyers with deposits will appear here'
                : 'Items you commit to buy with deposits will appear here'
            }
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
        >
          {orders.map((order) => renderOrderCard(order))}
        </ScrollView>
      )}
    </View>
  );
}

// Tab Screen Components with Filter Pills
function SoldOrdersScreen() {
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Filter Pills */}
      <View style={{ paddingVertical: theme.spacing.xs }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.sm,
            gap: theme.spacing.xs,
          }}
        >
          {(['all', 'in_progress', 'completed', 'cancelled'] as FilterType[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={{
                height: 32,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.borderRadius.full,
                backgroundColor: activeFilter === filter ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: activeFilter === filter ? theme.colors.primary : theme.colors.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                variant="caption"
                style={{
                  fontWeight: '600',
                  color: activeFilter === filter ? '#FFFFFF' : theme.colors.text.secondary,
                }}
              >
                {filter === 'all' ? 'All' : filter === 'in_progress' ? 'In Progress' : filter === 'completed' ? 'Completed' : 'Cancelled'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <OrdersList tabType="sold" activeFilter={activeFilter} />
    </View>
  );
}

function BoughtOrdersScreen() {
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Filter Pills */}
      <View style={{ paddingVertical: theme.spacing.xs }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.sm,
            gap: theme.spacing.xs,
          }}
        >
          {(['all', 'in_progress', 'completed', 'cancelled'] as FilterType[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={{
                height: 32,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.borderRadius.full,
                backgroundColor: activeFilter === filter ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: activeFilter === filter ? theme.colors.primary : theme.colors.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                variant="caption"
                style={{
                  fontWeight: '600',
                  color: activeFilter === filter ? '#FFFFFF' : theme.colors.text.secondary,
                }}
              >
                {filter === 'all' ? 'All' : filter === 'in_progress' ? 'In Progress' : filter === 'completed' ? 'Completed' : 'Cancelled'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <OrdersList tabType="bought" activeFilter={activeFilter} />
    </View>
  );
}

// Main Screen with Material Top Tabs
export default function MyOrdersScreen() {
  const { theme } = useTheme();
  const layout = useWindowDimensions();

  return (
    <SafeAreaWrapper>
      <AppHeader 
        title="My Orders" 
        showBackButton 
        onBackPress={() => router.back()}
      />

      <Tab.Navigator
        initialRouteName="Sold"
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.text.secondary,
          tabBarIndicatorStyle: {
            backgroundColor: theme.colors.primary,
            height: 3,
          },
          tabBarLabelStyle: {
            fontWeight: '600',
            textTransform: 'none',
            fontSize: 14,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          tabBarPressColor: theme.colors.surfaceVariant,
          tabBarItemStyle: {
            flexDirection: 'row',
          },
          tabBarShowIcon: true,
          swipeEnabled: true,
          lazy: true,
          lazyPreloadDistance: 0,
        }}
      >
        <Tab.Screen
          name="Sold"
          component={SoldOrdersScreen}
          options={{
            tabBarIcon: ({ color }) => <ShoppingBag size={20} color={color} />,
            tabBarLabel: 'Sold',
          }}
        />
        <Tab.Screen
          name="Bought"
          component={BoughtOrdersScreen}
          options={{
            tabBarIcon: ({ color }) => <Package size={20} color={color} />,
            tabBarLabel: 'Bought',
          }}
        />
      </Tab.Navigator>
    </SafeAreaWrapper>
  );
}

