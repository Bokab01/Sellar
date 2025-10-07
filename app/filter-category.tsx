import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, SafeAreaWrapper, AppHeader, LoadingSkeleton } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { fetchMainCategories, fetchSubcategories } from '@/utils/categoryUtils';
import { Check, ChevronRight, ArrowLeft } from 'lucide-react-native';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  hasSubcategories?: boolean;
}

export default function FilterCategoryScreen() {
  const { theme } = useTheme();
  const { filters, setFilters } = useAppStore();
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [currentCategories, setCurrentCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    filters.categories && filters.categories.length > 0 ? filters.categories[0] : ''
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(
    filters.categories && filters.categories.length > 1 ? filters.categories[1] : ''
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const categories = await fetchMainCategories();
        
        // Check which categories have subcategories
        const categoriesWithSubcategoryInfo = await Promise.all(
          categories.map(async (category) => {
            const subcategories = await fetchSubcategories(category.id);
            return {
              ...category,
              hasSubcategories: subcategories.length > 0,
            };
          })
        );
        
        setMainCategories(categoriesWithSubcategoryInfo);
        setCurrentCategories(categoriesWithSubcategoryInfo);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCategories();
  }, []);

  const handleCategoryClick = async (category: Category) => {
    if (category.hasSubcategories) {
      // Load subcategories and navigate deeper
      setLoading(true);
      try {
        const subcategories = await fetchSubcategories(category.id);
        const subcategoriesWithInfo = await Promise.all(
          subcategories.map(async (sub) => {
            const subSubs = await fetchSubcategories(sub.id);
            return {
              ...sub,
              hasSubcategories: subSubs.length > 0,
            };
          })
        );
        setCurrentCategories(subcategoriesWithInfo);
        setBreadcrumb([...breadcrumb, category]);
      } catch (error) {
        console.error('Error loading subcategories:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // No subcategories, select this category
      handleFinalSelect(category);
    }
  };

  const handleFinalSelect = (category: Category) => {
    // Build the full category path from breadcrumb
    const categoryPath = [...breadcrumb.map(c => c.name), category.name];
    
    setFilters({ 
      ...filters, 
      categories: categoryPath, 
      attributeFilters: {} 
    });
    router.back();
  };

  const handleBack = () => {
    if (breadcrumb.length > 0) {
      // Go back one level
      const newBreadcrumb = [...breadcrumb];
      newBreadcrumb.pop();
      setBreadcrumb(newBreadcrumb);
      
      if (newBreadcrumb.length === 0) {
        // Back to main categories
        setCurrentCategories(mainCategories);
      } else {
        // Load previous level's subcategories
        const parentCategory = newBreadcrumb[newBreadcrumb.length - 1];
        loadSubcategories(parentCategory.id);
      }
    } else {
      // Go back to filter screen
      router.back();
    }
  };

  const loadSubcategories = async (parentId: string) => {
    setLoading(true);
    try {
      const subcategories = await fetchSubcategories(parentId);
      const subcategoriesWithInfo = await Promise.all(
        subcategories.map(async (sub) => {
          const subSubs = await fetchSubcategories(sub.id);
          return {
            ...sub,
            hasSubcategories: subSubs.length > 0,
          };
        })
      );
      setCurrentCategories(subcategoriesWithInfo);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setFilters({ ...filters, categories: [], attributeFilters: {} });
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Category"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <LoadingSkeleton key={index} width="100%" height={50} />
          ))}
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : "Category"}
        showBackButton
        onBackPress={handleBack}
        rightActions={selectedCategory ? [
          <TouchableOpacity
            key="clear"
            onPress={handleClearAll}
            style={{ paddingHorizontal: theme.spacing.md }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              Clear
            </Text>
          </TouchableOpacity>
        ] : []}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* All [Current Level] Option - Only show if we're in a subcategory */}
        {breadcrumb.length > 0 && (
          <TouchableOpacity
            onPress={() => handleFinalSelect(breadcrumb[breadcrumb.length - 1])}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: theme.spacing.lg,
              paddingHorizontal: theme.spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
            activeOpacity={0.7}
          >
            <Text 
              variant="body" 
              style={{ 
                fontWeight: '400',
                color: theme.colors.text.primary
              }}
            >
              All {breadcrumb[breadcrumb.length - 1].name}
            </Text>
          </TouchableOpacity>
        )}

        {/* Category/Subcategory List */}
        {currentCategories.map((category, index) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => handleCategoryClick(category)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: theme.spacing.lg,
              paddingHorizontal: theme.spacing.lg,
              borderBottomWidth: index < currentCategories.length - 1 ? 1 : 0,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
            activeOpacity={0.7}
          >
            <Text 
              variant="body" 
              style={{ 
                fontWeight: '400',
                color: theme.colors.text.primary
              }}
            >
              {category.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              {category.hasSubcategories && (
                <ChevronRight 
                  size={20} 
                  color={theme.colors.text.secondary} 
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaWrapper>
  );
}
