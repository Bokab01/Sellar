import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Image, TextInput } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { ChevronRight, ArrowLeft, Check, Search, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// Database category interface matching Supabase schema
interface DbCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  image_url?: string;
  color?: string;
  description?: string;
}

interface CategoryPickerProps {
  value?: string;
  onCategorySelect: (categoryId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategoryPicker({ 
  value, 
  onCategorySelect, 
  placeholder = "Select a category",
  disabled = false 
}: CategoryPickerProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Category state
  const [mainCategories, setMainCategories] = useState<DbCategory[]>([]);
  const [currentCategories, setCurrentCategories] = useState<DbCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DbCategory | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<DbCategory[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DbCategory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allCategories, setAllCategories] = useState<DbCategory[]>([]);

  // Function definitions
  const fetchMainCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setMainCategories(data || []);
      setCurrentCategories(data || []);
    } catch (error) {
      console.error('Error fetching main categories:', error);
    }
  };

  const fetchAllCategoriesForSearch = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setAllCategories(data || []);
    } catch (error) {
      console.error('Error fetching all categories:', error);
    }
  };

  // Fetch main categories and all categories on mount
  useEffect(() => {
    fetchMainCategories();
    fetchAllCategoriesForSearch();
  }, []);

  // Fetch selected category details when value changes
  useEffect(() => {
    if (value) {
      fetchCategoryDetails(value);
    } else {
      setSelectedCategory(null);
    }
  }, [value]);

  const fetchSubcategories = async (parentId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', parentId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryDetails = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) throw error;
      setSelectedCategory(data);
    } catch (error) {
      console.error('Error fetching category details:', error);
    }
  };

  const handleOpen = async () => {
    if (disabled) return;
    setIsVisible(true);
    setCurrentCategories(mainCategories);
    setBreadcrumb([]);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleClose = () => {
    setIsVisible(false);
    setCurrentCategories(mainCategories);
    setBreadcrumb([]);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Filter categories by name, description, or slug
    const results = allCategories.filter((category) => {
      const searchLower = query.toLowerCase();
      return (
        category.name.toLowerCase().includes(searchLower) ||
        category.slug.toLowerCase().includes(searchLower) ||
        (category.description && category.description.toLowerCase().includes(searchLower))
      );
    });
    
    setSearchResults(results);
  };

  const handleSearchResultSelect = async (category: DbCategory) => {
    // If it's a parent category with subcategories, navigate to it
    const subcategories = await fetchSubcategories(category.id);
    
    if (subcategories.length > 0) {
      // Navigate to this category's subcategories
      setCurrentCategories(subcategories);
      setBreadcrumb([category]);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
    } else {
      // Select this category directly
      onCategorySelect(category.id);
      handleClose();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleCategorySelect = async (category: DbCategory) => {
    // Check if category has subcategories
    const subcategories = await fetchSubcategories(category.id);
    
    if (subcategories.length > 0) {
      // Navigate to subcategories
      setCurrentCategories(subcategories);
      setBreadcrumb([...breadcrumb, category]);
    } else {
      // No subcategories, select this category
      onCategorySelect(category.id);
      handleClose();
    }
  };

  const handleBackPress = () => {
    if (breadcrumb.length === 0) return;

    if (breadcrumb.length === 1) {
      // Go back to main categories
      setCurrentCategories(mainCategories);
      setBreadcrumb([]);
    } else {
      // Go back to previous level
      const newBreadcrumb = breadcrumb.slice(0, -1);
      const parentCategory = newBreadcrumb[newBreadcrumb.length - 1];
      
      fetchSubcategories(parentCategory.id).then((subcategories) => {
        setCurrentCategories(subcategories);
        setBreadcrumb(newBreadcrumb);
      });
    }
  };

  const renderBreadcrumb = () => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    }}>
      {breadcrumb.map((item, index) => (
        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
          {index > 0 && (
            <ChevronRight 
              size={14} 
              color={theme.colors.text.muted} 
              style={{ marginHorizontal: theme.spacing.xs }}
            />
          )}
          <Text variant="bodySmall" color="secondary">
            {item.name}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderCategoryItem = (category: DbCategory) => (
    <Pressable
      key={category.id}
      onPress={() => handleCategorySelect(category)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: theme.borderRadius.md,
          backgroundColor: category.color || theme.colors.primary + '10',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
          overflow: 'hidden',
        }}>
          {category.image_url ? (
            <Image
              source={{ uri: category.image_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ fontSize: 20 }}>
              {getCategoryIcon(category.icon)}
            </Text>
          )}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: '500' }}>
            {category.name}
          </Text>
          {category.description && (
            <Text variant="caption" color="muted" numberOfLines={1}>
              {category.description}
            </Text>
          )}
        </View>
      </View>
      
      <ChevronRight size={20} color={theme.colors.text.muted} />
    </Pressable>
  );

  const getCategoryIcon = (iconName: string): string => {
    const iconMap: Record<string, string> = {
      'smartphone': '📱',
      'laptop': '💻',
      'headphones': '🎧',
      'gamepad-2': '🎮',
      'shirt': '👕',
      'car': '🚗',
      'home': '🏠',
      'dumbbell': '🏋️',
      'book': '📚',
      'briefcase': '💼',
      'package': '📦',
      'more-horizontal': '⋯',
      'phone': '☎️',
      'tablet': '📱',
      'monitor': '🖥️',
      'mouse': '🖱️',
      'hard-drive': '💾',
      'volume-2': '🔊',
      'tv': '📺',
      'camera': '📷',
      'disc': '💿',
      'joystick': '🕹️',
      'refrigerator': '❄️',
      'chef-hat': '👨‍🍳',
      'vacuum': '🧹',
      'air-vent': '🌬️',
      'user': '👤',
      'footprints': '👟',
      'watch': '⌚',
      'gem': '💎',
      'shopping-bag': '👜',
      'baby': '👶',
      'truck': '🚛',
      'crown': '👑',
      'bike': '🏍️',
      'zap': '⚡',
      'settings': '⚙️',
      'wrench': '🔧',
      'circle': '⭕',
      'cog': '⚙️',
      'wind': '💨',
      'box': '📦',
      'anchor': '⚓',
      'key': '🔑',
      'calendar': '📅',
      'users': '👥',
      'square': '⬜',
      'bag': '👜',
      'sparkles': '✨',
      'armchair': '🪑',
      'sofa': '🛋️',
      'bed': '🛏️',
      'utensils': '🍽️',
      'palette': '🎨',
      'image': '🖼️',
      'lightbulb': '💡',
      'flower': '🌸',
      'shovel': '🪓',
      'sun': '☀️',
      'activity': '📈',
      'heart': '❤️',
      'scissors': '✂️',
      'tent': '⛺',
      'trophy': '🏆',
      'graduation-cap': '🎓',
      'pencil': '✏️',
      'book-open': '📖',
      'film': '🎬',
      'music': '🎵',
      'scale': '⚖️',
      'calculator': '🧮',
      'spray-can': '🧴',
      'star': '⭐',
      'coffee': '☕',
      'leaf': '🍃',
      'feather': '🪶',
      'waves': '🌊',
      'printer': '🖨️',
      'ticket': '🎫',
      'gift': '🎁',
      'search': '🔍',
      'clock': '🕐',
      'wifi': '📡',
      'shopping-basket': '🛒',
      'tractor': '🚜',
      'bone': '🦴',
      'cow': '🐄',
      'hard-hat': '🎩',
      'boxes': '📦',
      'shopping-cart': '🛒',
      'plane': '✈️',
      'map': '🗺️',
      'building': '🏢',
      'file': '📄',
      'credit-card': '💳',
      'puzzle': '🧩',
      'repeat': '🔄',
      'heart-pulse': '💓',
      'grid': '⊞',
    };
    return iconMap[iconName] || '📦';
  };

  return (
    <>
      <Pressable
        onPress={handleOpen}
        disabled={disabled}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.lg,
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.md,
          opacity: disabled ? 0.5 : 1,
        })}
      >
        <View style={{ flex: 1 }}>
          {selectedCategory ? (
            <View>
              <Text variant="body" style={{ fontWeight: '500' }}>
                {selectedCategory.name}
              </Text>
            </View>
          ) : (
            <Text variant="body" color="muted">
              {placeholder}
            </Text>
          )}
        </View>
        <ChevronRight size={20} color={theme.colors.text.muted} />
      </Pressable>

      <AppModal
        visible={isVisible}
        onClose={handleClose}
        title="Select Category"
        size="lg"
      >
        <View style={{ maxHeight: 500 }}>
          {/* Search Bar */}
          <View style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              paddingHorizontal: theme.spacing.md,
              height: 44,
            }}>
              <Search size={18} color={theme.colors.text.muted} />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Search categories..."
                placeholderTextColor={theme.colors.text.muted}
                style={{
                  flex: 1,
                  marginLeft: theme.spacing.sm,
                  fontSize: 15,
                  color: theme.colors.text.primary,
                  paddingVertical: 0,
                }}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={handleClearSearch} hitSlop={8}>
                  <X size={18} color={theme.colors.text.muted} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Breadcrumb */}
          {!isSearching && breadcrumb.length > 0 && renderBreadcrumb()}
          
          {/* Back Button */}
          {!isSearching && breadcrumb.length > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}>
              <Button
                variant="ghost"
                leftIcon={<ArrowLeft size={18} color={theme.colors.text.primary} />}
                onPress={handleBackPress}
                size="sm"
              >
                Back
              </Button>
            </View>
          )}

          {/* Category List */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={{ padding: theme.spacing.xl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : isSearching ? (
              <View>
                {searchResults.length > 0 ? (
                  <>
                    <View style={{
                      paddingHorizontal: theme.spacing.lg,
                      paddingVertical: theme.spacing.sm,
                      backgroundColor: theme.colors.surfaceVariant,
                    }}>
                      <Text variant="caption" color="muted">
                        {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
                      </Text>
                    </View>
                    {searchResults.map((category) => (
                      <Pressable
                        key={category.id}
                        onPress={() => handleSearchResultSelect(category)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: theme.spacing.lg,
                          paddingVertical: theme.spacing.lg,
                          backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent',
                          borderBottomWidth: 1,
                          borderBottomColor: theme.colors.border,
                        })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: theme.borderRadius.md,
                            backgroundColor: category.color || theme.colors.primary + '10',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: theme.spacing.md,
                            overflow: 'hidden',
                          }}>
                            {category.image_url ? (
                              <Image
                                source={{ uri: category.image_url }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text style={{ fontSize: 18 }}>
                                {getCategoryIcon(category.icon)}
                              </Text>
                            )}
                          </View>
                          
                          <View style={{ flex: 1 }}>
                            <Text variant="body" style={{ fontWeight: '500' }}>
                              {category.name}
                            </Text>
                            {category.description && (
                              <Text variant="caption" color="muted" numberOfLines={1}>
                                {category.description}
                              </Text>
                            )}
                          </View>
                        </View>
                        
                        <ChevronRight size={20} color={theme.colors.text.muted} />
                      </Pressable>
                    ))}
                  </>
                ) : (
                  <View style={{
                    padding: theme.spacing.xl,
                    alignItems: 'center',
                  }}>
                    <Search size={48} color={theme.colors.text.muted} style={{ marginBottom: theme.spacing.md }} />
                    <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                      No categories found for "{searchQuery}"
                    </Text>
                    <Text variant="caption" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
                      Try a different search term
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                {currentCategories.map((category) => renderCategoryItem(category))}
              </View>
            )}
          </ScrollView>
        </View>
      </AppModal>
    </>
  );
}

