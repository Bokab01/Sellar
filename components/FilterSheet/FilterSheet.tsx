import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { Chip } from '@/components/Chip/Chip';
import { Input } from '@/components/Input/Input';
import { Stepper } from '@/components/Stepper/Stepper';

interface FilterOptions {
  categories: string[];
  priceRange: { min: number; max: number };
  condition: string[];
  location: string;
  sortBy: string;
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
  onClearFilters: () => void;
}

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onClearFilters,
}: FilterSheetProps) {
  const { theme } = useTheme();
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Vehicles',
    'Books & Media', 'Sports', 'Services', 'Other'
  ];

  const conditions = [
    'Brand New', 'Like New', 'Good', 'Fair', 'For Parts'
  ];

  const sortOptions = [
    'Newest First', 'Price: Low to High', 'Price: High to Low',
    'Most Popular', 'Nearest First'
  ];

  const handleCategoryToggle = (category: string) => {
    const updatedCategories = localFilters.categories.includes(category)
      ? localFilters.categories.filter(c => c !== category)
      : [...localFilters.categories, category];
    
    setLocalFilters(prev => ({
      ...prev,
      categories: updatedCategories,
    }));
  };

  const handleConditionToggle = (condition: string) => {
    const updatedConditions = localFilters.condition.includes(condition)
      ? localFilters.condition.filter(c => c !== condition)
      : [...localFilters.condition, condition];
    
    setLocalFilters(prev => ({
      ...prev,
      condition: updatedConditions,
    }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: FilterOptions = {
      categories: [],
      priceRange: { min: 0, max: 10000 },
      condition: [],
      location: '',
      sortBy: 'Newest First',
    };
    setLocalFilters(clearedFilters);
    onClearFilters();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Filter Products"
      size="lg"
      position="bottom"
      primaryAction={{
        text: 'Apply Filters',
        onPress: handleApply,
      }}
      secondaryAction={{
        text: 'Clear All',
        onPress: handleClear,
      }}
    >
      <ScrollView style={{ maxHeight: 500 }}>
        <View style={{ gap: theme.spacing.xl }}>
          {/* Categories */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Categories
            </Text>
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: theme.spacing.sm 
            }}>
              {categories.map((category) => (
                <Chip
                  key={category}
                  text={category}
                  variant="filter"
                  selected={localFilters.categories.includes(category)}
                  onPress={() => handleCategoryToggle(category)}
                />
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Price Range (GHS)
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Min Price"
                  placeholder="0"
                  value={localFilters.priceRange.min.toString()}
                  onChangeText={(text) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, min: Number(text) || 0 }
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Max Price"
                  placeholder="10000"
                  value={localFilters.priceRange.max.toString()}
                  onChangeText={(text) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, max: Number(text) || 10000 }
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Condition */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Condition
            </Text>
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: theme.spacing.sm 
            }}>
              {conditions.map((condition) => (
                <Chip
                  key={condition}
                  text={condition}
                  variant="filter"
                  selected={localFilters.condition.includes(condition)}
                  onPress={() => handleConditionToggle(condition)}
                />
              ))}
            </View>
          </View>

          {/* Location */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Location
            </Text>
            <Input
              placeholder="Enter city or region"
              value={localFilters.location}
              onChangeText={(text) => 
                setLocalFilters(prev => ({ ...prev, location: text }))
              }
            />
          </View>

          {/* Sort By */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Sort By
            </Text>
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: theme.spacing.sm 
            }}>
              {sortOptions.map((option) => (
                <Chip
                  key={option}
                  text={option}
                  variant="filter"
                  selected={localFilters.sortBy === option}
                  onPress={() => 
                    setLocalFilters(prev => ({ ...prev, sortBy: option }))
                  }
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </AppModal>
  );
}