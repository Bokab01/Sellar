import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { ProductCard } from '@/components/Card/Card';
import { Grid } from '@/components/Grid/Grid';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { LoadingSkeleton, ProductCardSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { ShoppingBag } from 'lucide-react-native';

interface Product {
  id: string;
  image: string;
  title: string;
  price: number;
  seller: {
    name: string;
    avatar?: string;
    rating?: number;
  };
  badge?: {
    text: string;
    variant?: 'new' | 'sold' | 'featured' | 'discount';
  };
  location?: string;
}

interface ProductListProps {
  products: Product[];
  layout?: 'list' | 'grid';
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onProductPress?: (product: Product) => void;
  onSellerPress?: (seller: Product['seller']) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  style?: any;
}

export function ProductList({
  products,
  layout = 'grid',
  loading = false,
  refreshing = false,
  onRefresh,
  onProductPress,
  onSellerPress,
  emptyTitle = "No products found",
  emptyDescription = "Try adjusting your search or filters to find what you're looking for.",
  style,
}: ProductListProps) {
  const { theme } = useTheme();

  if (loading && products.length === 0) {
    return (
      <View style={style}>
        {layout === 'grid' ? (
          <Grid columns={2}>
            {Array.from({ length: 4 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </Grid>
        ) : (
          <View>
            {Array.from({ length: 3 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </View>
        )}
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag size={64} color={theme.colors.text.muted} />}
        title={emptyTitle}
        description={emptyDescription}
        style={style}
      />
    );
  }

  const renderProduct = (product: Product) => (
    <ProductCard
      key={product.id}
      image={product.image}
      title={product.title}
      price={product.price}
      seller={product.seller}
      badge={product.badge}
      location={product.location}
      layout={layout === 'grid' ? 'grid' : 'default'}
      onPress={() => onProductPress?.(product)}
      onSellerPress={() => onSellerPress?.(product.seller)}
      onActionPress={() => onProductPress?.(product)}
    />
  );

  if (layout === 'grid') {
    return (
      <ScrollView
        style={style}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <Grid columns={2}>
          {products.map(renderProduct)}
        </Grid>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={style}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: theme.spacing.md }}>
        {products.map(renderProduct)}
      </View>
    </ScrollView>
  );
}
