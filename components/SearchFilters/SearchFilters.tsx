import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Picker } from '@react-native-picker/picker';
import {
  Filter,
  X,
  DollarSign,
  MapPin,
  Tag,
  Star,
  Calendar,
  TrendingUp,
  User,
  Check
} from 'lucide-react-native';
import { SearchFilters } from '@/lib/smartSearchService';

interface SmartSearchFiltersProps {
  visible: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

const CONDITION_OPTIONS = [
  { value: '', label: 'Any Condition' },
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant', icon: Star },
  { value: 'date_desc', label: 'Newest First', icon: Calendar },
  { value: 'date_asc', label: 'Oldest First', icon: Calendar },
  { value: 'price_asc', label: 'Price: Low to High', icon: DollarSign },
  { value: 'price_desc', label: 'Price: High to Low', icon: DollarSign },
  { value: 'popularity', label: 'Most Popular', icon: TrendingUp },
];

const CATEGORIES = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Electronics & Technology', icon: '📱' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Fashion & Beauty', icon: '👕' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Home & Garden', icon: '🏠' },
  { id: '00000000-0000-4000-8000-000000000004', name: 'Vehicles & Transportation', icon: '🚗' },
  { id: '00000000-0000-4000-8000-000000000005', name: 'Health & Sports', icon: '❤️' },
  { id: '00000000-0000-4000-8000-000000000006', name: 'Business & Industrial', icon: '💼' },
  { id: '00000000-0000-4000-8000-000000000007', name: 'Education & Books', icon: '📚' },
  { id: '00000000-0000-4000-8000-000000000008', name: 'Entertainment & Media', icon: '🎵' },
  { id: '00000000-0000-4000-8000-000000000009', name: 'Food & Agriculture', icon: '☕' },
  { id: '00000000-0000-4000-8000-000000000010', name: 'Services', icon: '🔧' },
];

export function SmartSearchFilters({
  visible,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onClear,
}: SmartSearchFiltersProps) {
  const { theme } = useTheme();
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply();
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: SearchFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClear();
  };

  const getActiveFiltersCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== '' && value !== null
    ).length;
  };

  const renderPriceRange = () => (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <DollarSign size={20} color={theme.colors.primary} />
        <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
          Price Range
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="muted" style={{ marginBottom: theme.spacing.xs }}>
            Min Price (GHS)
          </Text>
          <Input
            value={localFilters.minPrice?.toString() || ''}
            onChangeText={(text) => updateFilter('minPrice', text ? parseFloat(text) : undefined)}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="muted" style={{ marginBottom: theme.spacing.xs }}>
            Max Price (GHS)
          </Text>
          <Input
            value={localFilters.maxPrice?.toString() || ''}
            onChangeText={(text) => updateFilter('maxPrice', text ? parseFloat(text) : undefined)}
            placeholder="Any"
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );

  const renderCategories = () => (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <Tag size={20} color={theme.colors.primary} />
        <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
          Category
        </Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <TouchableOpacity
            onPress={() => updateFilter('category', undefined)}
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              borderColor: !localFilters.category ? theme.colors.primary : theme.colors.border,
              backgroundColor: !localFilters.category ? theme.colors.primaryContainer : theme.colors.surface,
              minWidth: 80,
              alignItems: 'center',
            }}
          >
            <Text
              variant="bodySmall"
              style={{
                color: !localFilters.category ? theme.colors.primary : theme.colors.text,
                fontWeight: !localFilters.category ? '600' : '400',
              }}
            >
              All
            </Text>
          </TouchableOpacity>
          
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => updateFilter('category', category.id)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: localFilters.category === category.id ? theme.colors.primary : theme.colors.border,
                backgroundColor: localFilters.category === category.id ? theme.colors.primaryContainer : theme.colors.surface,
                minWidth: 100,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, marginBottom: 2 }}>{category.icon}</Text>
              <Text
                variant="bodySmall"
                numberOfLines={2}
                style={{
                  color: localFilters.category === category.id ? theme.colors.primary : theme.colors.text,
                  fontWeight: localFilters.category === category.id ? '600' : '400',
                  textAlign: 'center',
                }}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderCondition = () => (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <Star size={20} color={theme.colors.primary} />
        <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
          Condition
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {CONDITION_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => updateFilter('condition', option.value || undefined)}
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              borderColor: localFilters.condition === option.value ? theme.colors.primary : theme.colors.border,
              backgroundColor: localFilters.condition === option.value ? theme.colors.primaryContainer : theme.colors.surface,
            }}
          >
            <Text
              variant="bodySmall"
              style={{
                color: localFilters.condition === option.value ? theme.colors.primary : theme.colors.text,
                fontWeight: localFilters.condition === option.value ? '600' : '400',
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLocation = () => (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <MapPin size={20} color={theme.colors.primary} />
        <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
          Location
        </Text>
      </View>
      
      <Input
        value={localFilters.location || ''}
        onChangeText={(text) => updateFilter('location', text || undefined)}
        placeholder="Enter city, region, or area"
        leftIcon={<MapPin size={16} color={theme.colors.secondary} />}
      />
    </View>
  );

  const renderSortBy = () => (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <TrendingUp size={20} color={theme.colors.primary} />
        <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
          Sort By
        </Text>
      </View>
      
      <View style={{ gap: theme.spacing.xs }}>
        {SORT_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          const isSelected = localFilters.sortBy === option.value;
          
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => updateFilter('sortBy', option.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                backgroundColor: isSelected ? theme.colors.primaryContainer : 'transparent',
              }}
            >
              <IconComponent size={18} color={isSelected ? theme.colors.primary : theme.colors.secondary} />
              <Text
                variant="body"
                style={{
                  marginLeft: theme.spacing.md,
                  flex: 1,
                  color: isSelected ? theme.colors.primary : theme.colors.text,
                  fontWeight: isSelected ? '600' : '400',
                }}
              >
                {option.label}
              </Text>
              {isSelected && (
                <Check size={18} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Filter size={24} color={theme.colors.primary} />
            <Text variant="h3" style={{ marginLeft: theme.spacing.sm }}>
              Search Filters
            </Text>
            {getActiveFiltersCount() > 0 && (
              <View
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: theme.spacing.sm,
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.surface,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {getActiveFiltersCount()}
                </Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          {renderSortBy()}
          {renderCategories()}
          {renderPriceRange()}
          {renderCondition()}
          {renderLocation()}
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <Button
            variant="outline"
            onPress={handleClear}
            style={{ flex: 1 }}
            disabled={getActiveFiltersCount() === 0}
          >
            Clear All
          </Button>
          
          <Button
            variant="primary"
            onPress={handleApply}
            style={{ flex: 2 }}
          >
            Apply Filters
          </Button>
        </View>
      </View>
    </Modal>
  );
}
