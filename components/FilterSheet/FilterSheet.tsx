import React, { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { Chip } from '@/components/Chip/Chip';
import { Input } from '@/components/Input/Input';
import { Stepper } from '@/components/Stepper/Stepper';
import { LocationPicker } from '@/components/LocationPicker/LocationPicker';
import { 
  Filter, 
  Tag, 
  DollarSign, 
  MapPin, 
  ArrowUpDown, 
  CheckCircle,
  X
} from 'lucide-react-native';

interface FilterOptions {
  categories: string[];
  priceRange: { min?: number; max?: number };
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
  currentCategory?: string; // Current category context
}

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onClearFilters,
  currentCategory,
}: FilterSheetProps) {
  const { theme } = useTheme();
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  // Smart categories based on current category context
  const getSmartCategories = () => {
    if (!currentCategory) {
      // Show all main categories when no specific category is selected
      return [
        'Electronics', 'Fashion', 'Home & Garden', 'Vehicles',
        'Books & Media', 'Sports', 'Services', 'Other'
      ];
    }

    // Show relevant subcategories or related categories based on current category
    const categoryMap: Record<string, string[]> = {
      'Electronics': [
        'iPhone', 'Android', 'Samsung', 'Laptop', 'Computer', 'Gaming', 
        'Headphones', 'Speaker', 'Camera', 'TV', 'Tablet'
      ],
      'Fashion': [
        'Dress', 'Shirt', 'Jeans', 'Shoes', 'Bag', 'Watch', 
        'Jewelry', 'Sunglasses', 'Hat', 'Jacket'
      ],
      'Vehicles': [
        'Toyota', 'Honda', 'BMW', 'Mercedes', 'Motorcycle', 'Bike', 
        'Truck', 'SUV', 'Car Parts', 'Tires'
      ],
      'Home & Garden': [
        'Sofa', 'Chair', 'Table', 'Bed', 'Refrigerator', 'Microwave', 
        'Garden', 'Plants', 'Tools', 'Decor'
      ],
      'Sports': [
        'Football', 'Basketball', 'Gym', 'Fitness', 'Running', 'Swimming', 
        'Tennis', 'Golf', 'Soccer', 'Equipment'
      ],
      'Books & Media': [
        'Book', 'Novel', 'Textbook', 'Movie', 'Music', 'Game', 
        'Magazine', 'DVD', 'CD', 'Educational'
      ],
      'Beauty & Health': [
        'Makeup', 'Skincare', 'Perfume', 'Hair', 'Health', 'Vitamins', 
        'Shampoo', 'Lotion', 'Cream', 'Medicine'
      ],
      'Services': [
        'Cleaning', 'Repair', 'Tutoring', 'Photography', 'Design', 
        'Consulting', 'Delivery', 'Maintenance', 'Installation', 'Support'
      ],
      'Other': [
        'Vintage', 'Antique', 'Collectible', 'Art', 'Craft', 
        'Gift', 'Tool', 'Miscellaneous', 'Rare', 'Unique'
      ]
    };

    return categoryMap[currentCategory] || [
      'Electronics', 'Fashion', 'Home & Garden', 'Vehicles',
      'Books & Media', 'Sports', 'Services', 'Other'
    ];
  };

  const categories = getSmartCategories();

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
      priceRange: { min: undefined, max: undefined },
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
        icon: <CheckCircle size={16} color="white" />,
      }}
      secondaryAction={{
        text: 'Clear All',
        onPress: handleClear,
      }}
    >
       <KeyboardAwareScrollView 
         style={{ maxHeight: 500 }}
         showsVerticalScrollIndicator={false}
         bounces={true}
         keyboardShouldPersistTaps="handled"
         enableOnAndroid
         enableAutomaticScroll
         extraScrollHeight={20}
         nestedScrollEnabled={true}
         contentContainerStyle={{ flexGrow: 1 }}
       >
         <View style={{ gap: theme.spacing.xl }}>
          {/* Categories */}
          <View>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: theme.spacing.lg,
              gap: theme.spacing.sm 
            }}>
              <View style={{
                backgroundColor: theme.colors.primary + '15',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.sm,
              }}>
                <Tag size={18} color={theme.colors.primary} />
              </View>
              <Text variant="h4" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
                Categories
              </Text>
            </View>
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
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: theme.spacing.lg,
              gap: theme.spacing.sm 
            }}>
              <View style={{
                backgroundColor: theme.colors.success + '15',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.sm,
              }}>
                <DollarSign size={18} color={theme.colors.success} />
              </View>
              <Text variant="h4" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
                Price Range (GHS)
              </Text>
            </View>
            <View style={{ 
              flexDirection: 'row', 
              gap: theme.spacing.md,
              backgroundColor: theme.colors.surfaceVariant,
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
            }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Min Price"
                  placeholder="0"
                  value={localFilters.priceRange.min?.toString() || ''}
                  onChangeText={(text) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, min: text ? parseFloat(text) : undefined }
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={{ 
                justifyContent: 'center', 
                alignItems: 'center',
                paddingHorizontal: theme.spacing.sm 
              }}>
                <Text variant="bodySmall" color="muted" style={{ fontWeight: '500' }}>
                  to
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Max Price"
                  placeholder="No limit"
                  value={localFilters.priceRange.max?.toString() || ''}
                  onChangeText={(text) => 
                    setLocalFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, max: text ? parseFloat(text) : undefined }
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Condition */}
          <View>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: theme.spacing.lg,
              gap: theme.spacing.sm 
            }}>
              <View style={{
                backgroundColor: theme.colors.warning + '15',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.sm,
              }}>
                <CheckCircle size={18} color={theme.colors.warning} />
              </View>
              <Text variant="h4" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
                Condition
              </Text>
            </View>
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
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: theme.spacing.lg,
              gap: theme.spacing.sm 
            }}>
              <View style={{
                backgroundColor: theme.colors.info + '15',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.sm,
              }}>
                <MapPin size={18} color={theme.colors.info} />
              </View>
              <Text variant="h4" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
                Location
              </Text>
            </View>
            <LocationPicker
              value={localFilters.location}
              onLocationSelect={(location) => 
                setLocalFilters(prev => ({ ...prev, location }))
              }
              placeholder="Select city or region"
            />
          </View>

          {/* Sort By */}
          <View>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: theme.spacing.lg,
              gap: theme.spacing.sm 
            }}>
              <View style={{
                backgroundColor: theme.colors.secondary + '15',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.sm,
              }}>
                <ArrowUpDown size={18} color={theme.colors.secondary} />
              </View>
              <Text variant="h4" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
                Sort By
              </Text>
            </View>
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
      </KeyboardAwareScrollView>
    </AppModal>
  );
}
