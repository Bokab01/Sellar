import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Button, AppModal } from '@/components';
import { ChevronRight, ArrowLeft, Check } from 'lucide-react-native';
import { Category, COMPREHENSIVE_CATEGORIES, findCategoryById, getCategoryPath } from '@/constants/categories';

interface CategoryPickerProps {
  value?: string;
  onCategorySelect: (categoryId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

type SelectionStep = 'main' | 'subcategory' | 'final';

export function CategoryPicker({ 
  value, 
  onCategorySelect, 
  placeholder = "Select a category",
  disabled = false 
}: CategoryPickerProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<SelectionStep>('main');
  const [selectedMainCategory, setSelectedMainCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Category[]>([]);

  const selectedCategory = value ? findCategoryById(COMPREHENSIVE_CATEGORIES, value) : null;
  const selectedPath = value ? getCategoryPath(COMPREHENSIVE_CATEGORIES, value) : [];

  const handleOpen = () => {
    if (disabled) return;
    setIsVisible(true);
    setCurrentStep('main');
    setSelectedMainCategory(null);
    setSelectedSubcategory(null);
    setBreadcrumb([]);
  };

  const handleClose = () => {
    setIsVisible(false);
    setCurrentStep('main');
    setSelectedMainCategory(null);
    setSelectedSubcategory(null);
    setBreadcrumb([]);
  };

  const handleMainCategorySelect = (category: Category) => {
    setSelectedMainCategory(category);
    setBreadcrumb([category]);
    
    if (category.subcategories && category.subcategories.length > 0) {
      setCurrentStep('subcategory');
    } else {
      // No subcategories, select this category directly
      onCategorySelect(category.id);
      handleClose();
    }
  };

  const handleSubcategorySelect = (subcategory: Category) => {
    setSelectedSubcategory(subcategory);
    const newBreadcrumb = [...breadcrumb, subcategory];
    setBreadcrumb(newBreadcrumb);
    
    if (subcategory.subcategories && subcategory.subcategories.length > 0) {
      setCurrentStep('final');
    } else {
      // No further subcategories, select this one
      onCategorySelect(subcategory.id);
      handleClose();
    }
  };

  const handleFinalCategorySelect = (finalCategory: Category) => {
    onCategorySelect(finalCategory.id);
    handleClose();
  };

  const handleBackPress = () => {
    if (currentStep === 'final') {
      setCurrentStep('subcategory');
      setBreadcrumb(breadcrumb.slice(0, -1));
      setSelectedSubcategory(null);
    } else if (currentStep === 'subcategory') {
      setCurrentStep('main');
      setBreadcrumb([]);
      setSelectedMainCategory(null);
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

  const renderCategoryItem = (category: Category, onPress: () => void, showArrow: boolean = true) => (
    <Pressable
      key={category.id}
      onPress={onPress}
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
          backgroundColor: theme.colors.primary + '10',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}>
          <Text style={{ fontSize: 18 }}>
            {getCategoryIcon(category.icon)}
          </Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: '500' }}>
            {category.name}
          </Text>
          {category.subcategories && category.subcategories.length > 0 && (
            <Text variant="caption" color="muted">
              {category.subcategories.length} subcategories
            </Text>
          )}
        </View>
      </View>
      
      {showArrow && category.subcategories && category.subcategories.length > 0 && (
        <ChevronRight size={20} color={theme.colors.text.muted} />
      )}
      
      {!showArrow && (
        <Check size={20} color={theme.colors.primary} />
      )}
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
      'armchair': '🪑',
      'sofa': '🛋️',
      'bed': '🛏️',
      'utensils': '🍽️',
      'palette': '🎨',
      'image': '🖼️',
      'lightbulb': '💡',
      'square': '⬜',
      'flower': '🌸',
      'shovel': '🪓',
      'sun': '☀️',
      'activity': '📈',
      'heart': '❤️',
      'trophy': '🏆',
      'graduation-cap': '🎓',
      'book-open': '📖',
      'film': '🎬',
      'music': '🎵',
      'users': '👥',
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
              {selectedPath.length > 1 && (
                <Text variant="caption" color="muted">
                  {selectedPath.slice(0, -1).map(cat => cat.name).join(' > ')}
                </Text>
              )}
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
          {breadcrumb.length > 0 && renderBreadcrumb()}
          
          {currentStep !== 'main' && (
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
                icon={<ArrowLeft size={18} color={theme.colors.text.primary} />}
                onPress={handleBackPress}
                size="sm"
              >
                Back
              </Button>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {currentStep === 'main' && (
              <View>
                {COMPREHENSIVE_CATEGORIES.map((category) =>
                  renderCategoryItem(
                    category,
                    () => handleMainCategorySelect(category)
                  )
                )}
              </View>
            )}

            {currentStep === 'subcategory' && selectedMainCategory?.subcategories && (
              <View>
                {selectedMainCategory.subcategories.map((subcategory) =>
                  renderCategoryItem(
                    subcategory,
                    () => handleSubcategorySelect(subcategory)
                  )
                )}
              </View>
            )}

            {currentStep === 'final' && selectedSubcategory?.subcategories && (
              <View>
                {selectedSubcategory.subcategories.map((finalCategory) =>
                  renderCategoryItem(
                    finalCategory,
                    () => handleFinalCategorySelect(finalCategory),
                    false
                  )
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </AppModal>
    </>
  );
}

