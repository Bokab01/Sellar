import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Button, Input, AppModal } from '@/components';
import { Filter, Calendar, Search, X } from 'lucide-react-native';
import { TransactionType, TransactionStatus } from '@/hooks/useTransactions';
import { useTransactionCategories } from '@/hooks/useTransactions';
import { 
  formatTransactionType, 
  formatTransactionStatus,
  getDateRangePresets 
} from '@/lib/transactionService';

export interface TransactionFiltersState {
  type?: TransactionType;
  status?: TransactionStatus;
  category?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  amountMin?: number;
  amountMax?: number;
}

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  onFiltersChange: (filters: TransactionFiltersState) => void;
  onClearFilters: () => void;
}

export function TransactionFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: TransactionFiltersProps) {
  const { theme } = useTheme();
  const { categories } = useTransactionCategories();
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<TransactionFiltersState>(filters);

  const transactionTypes: TransactionType[] = [
    'credit_purchase',
    'credit_usage',
    'listing_boost',
    'listing_promotion',
    'feature_unlock',
    'commission_earned',
    'referral_bonus',
    'withdrawal',
    'deposit',
  ];

  const transactionStatuses: TransactionStatus[] = [
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded',
  ];

  const datePresets = getDateRangePresets();

  const hasActiveFilters = () => {
    return Object.keys(filters).some(key => 
      filters[key as keyof TransactionFiltersState] !== undefined && 
      filters[key as keyof TransactionFiltersState] !== ''
    );
  };

  const applyFilters = () => {
    onFiltersChange(tempFilters);
    setShowFilters(false);
  };

  const clearAllFilters = () => {
    setTempFilters({});
    onClearFilters();
    setShowFilters(false);
  };

  const setDateRange = (preset: keyof typeof datePresets) => {
    const range = datePresets[preset];
    setTempFilters({
      ...tempFilters,
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
    });
  };

  return (
    <View>
      {/* Search and Filter Bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
      }}>
        {/* Search Input */}
        <View style={{ flex: 1 }}>
          <Input
            placeholder="Search transactions..."
            value={filters.searchQuery || ''}
            onChangeText={(value) => onFiltersChange({ ...filters, searchQuery: value })}
            leftIcon={<Search size={20} color={theme.colors.text.secondary} />}
            style={{ marginBottom: 0 }}
          />
        </View>

        {/* Filter Button */}
        <Button
          variant={hasActiveFilters() ? 'primary' : 'tertiary'}
          size="md"
          onPress={() => setShowFilters(true)}
          icon={<Filter size={20} color={hasActiveFilters() ? theme.colors.primaryForeground : theme.colors.text.primary} />}
        >
          {hasActiveFilters() ? 'Filtered' : 'Filter'}
        </Button>

        {/* Clear Filters Button */}
        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="md"
            onPress={onClearFilters}
            icon={<X size={20} color={theme.colors.text.secondary} />}
          />
        )}
      </View>

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: theme.spacing.md }}
        >
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {filters.type && (
              <View style={{
                backgroundColor: theme.colors.primary + '20',
                borderRadius: theme.borderRadius.md,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}>
                <Text variant="caption" style={{ color: theme.colors.primary }}>
                  Type: {formatTransactionType(filters.type)}
                </Text>
              </View>
            )}
            
            {filters.status && (
              <View style={{
                backgroundColor: theme.colors.secondary + '20',
                borderRadius: theme.borderRadius.md,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}>
                <Text variant="caption" style={{ color: theme.colors.secondary }}>
                  Status: {formatTransactionStatus(filters.status)}
                </Text>
              </View>
            )}
            
            {filters.category && (
              <View style={{
                backgroundColor: theme.colors.success + '20',
                borderRadius: theme.borderRadius.md,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}>
                <Text variant="caption" style={{ color: theme.colors.success }}>
                  Category: {filters.category}
                </Text>
              </View>
            )}
            
            {(filters.startDate || filters.endDate) && (
              <View style={{
                backgroundColor: theme.colors.warning + '20',
                borderRadius: theme.borderRadius.md,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}>
                <Text variant="caption" style={{ color: theme.colors.warning }}>
                  Date Range
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Filter Modal */}
      <AppModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Transactions"
      >
        <ScrollView style={{ maxHeight: 600 }}>
          <View style={{ gap: theme.spacing.lg }}>
            {/* Transaction Type Filter */}
            <View>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Transaction Type
              </Text>
              <View style={{ gap: theme.spacing.sm }}>
                <Button
                  variant={!tempFilters.type ? 'primary' : 'tertiary'}
                  size="md"
                  onPress={() => setTempFilters({ ...tempFilters, type: undefined })}
                  style={{ justifyContent: 'flex-start' }}
                >
                  All Types
                </Button>
                {transactionTypes.map((type) => (
                  <Button
                    key={type}
                    variant={tempFilters.type === type ? 'primary' : 'tertiary'}
                    size="md"
                    onPress={() => setTempFilters({ ...tempFilters, type })}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {formatTransactionType(type)}
                  </Button>
                ))}
              </View>
            </View>

            {/* Transaction Status Filter */}
            <View>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Status
              </Text>
              <View style={{ gap: theme.spacing.sm }}>
                <Button
                  variant={!tempFilters.status ? 'primary' : 'tertiary'}
                  size="md"
                  onPress={() => setTempFilters({ ...tempFilters, status: undefined })}
                  style={{ justifyContent: 'flex-start' }}
                >
                  All Statuses
                </Button>
                {transactionStatuses.map((status) => (
                  <Button
                    key={status}
                    variant={tempFilters.status === status ? 'primary' : 'tertiary'}
                    size="md"
                    onPress={() => setTempFilters({ ...tempFilters, status })}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {formatTransactionStatus(status)}
                  </Button>
                ))}
              </View>
            </View>

            {/* Category Filter */}
            {categories.length > 0 && (
              <View>
                <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                  Category
                </Text>
                <View style={{ gap: theme.spacing.sm }}>
                  <Button
                    variant={!tempFilters.category ? 'primary' : 'tertiary'}
                    size="md"
                    onPress={() => setTempFilters({ ...tempFilters, category: undefined })}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    All Categories
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={tempFilters.category === category.name ? 'primary' : 'tertiary'}
                      size="md"
                      onPress={() => setTempFilters({ ...tempFilters, category: category.name })}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      {category.display_name}
                    </Button>
                  ))}
                </View>
              </View>
            )}

            {/* Date Range Filter */}
            <View>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Date Range
              </Text>
              <View style={{ gap: theme.spacing.sm }}>
                <Button
                  variant={!tempFilters.startDate && !tempFilters.endDate ? 'primary' : 'tertiary'}
                  size="md"
                  onPress={() => setTempFilters({ 
                    ...tempFilters, 
                    startDate: undefined, 
                    endDate: undefined 
                  })}
                  style={{ justifyContent: 'flex-start' }}
                >
                  All Time
                </Button>
                {Object.entries(datePresets).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="tertiary"
                    size="md"
                    onPress={() => setDateRange(key as keyof typeof datePresets)}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </View>
            </View>

            {/* Amount Range Filter */}
            <View>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Amount Range (GHS)
              </Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <Input
                  label="Min Amount"
                  placeholder="0"
                  value={tempFilters.amountMin?.toString() || ''}
                  onChangeText={(value) => setTempFilters({ 
                    ...tempFilters, 
                    amountMin: value ? parseFloat(value) : undefined 
                  })}
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                />
                <Input
                  label="Max Amount"
                  placeholder="No limit"
                  value={tempFilters.amountMax?.toString() || ''}
                  onChangeText={(value) => setTempFilters({ 
                    ...tempFilters, 
                    amountMax: value ? parseFloat(value) : undefined 
                  })}
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Filter Actions */}
        <View style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
          marginTop: theme.spacing.xl,
        }}>
          <Button
            variant="ghost"
            size="lg"
            onPress={clearAllFilters}
            style={{ flex: 1 }}
          >
            Clear All
          </Button>
          <Button
            variant="primary"
            size="lg"
            onPress={applyFilters}
            style={{ flex: 1 }}
          >
            Apply Filters
          </Button>
        </View>
      </AppModal>
    </View>
  );
}
