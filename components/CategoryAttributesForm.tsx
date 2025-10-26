import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { AppModal } from '@/components/Modal/Modal';
import Checkbox from 'expo-checkbox';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { ChevronDown, Check } from 'lucide-react-native';

// Types
export interface CategoryAttribute {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  label: string;
  placeholder?: string;
  help_text?: string;
  field_type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date' | 'range';
  data_type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  options?: Array<{ value: string; label: string }>;
  is_required: boolean;
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  validation_message?: string;
  icon?: string;
  sort_order: number;
  show_in_search: boolean;
  show_in_card: boolean;
}

export interface CategoryAttributesFormProps {
  categoryId: string;
  values: Record<string, any>;
  onChange: (slug: string, value: any) => void;
  errors?: Record<string, string>;
}

export const CategoryAttributesForm: React.FC<CategoryAttributesFormProps> = ({
  categoryId,
  values,
  onChange,
  errors = {},
}) => {
  const { theme } = useTheme();
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSelectModal, setActiveSelectModal] = useState<string | null>(null);

  // ✅ FIX: Move fetchAttributes inside useEffect to avoid memory leak
  useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchAttributes = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_category_attributes', { p_category_id: categoryId });

        if (error) {
          console.error('Error fetching attributes:', error);
          if (isMounted) {
            setAttributes([]);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setAttributes(data || []);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error:', error);
        if (isMounted) {
          setAttributes([]);
          setLoading(false);
        }
      }
    };

    fetchAttributes();

    // ✅ Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  const renderField = (attribute: CategoryAttribute) => {
    const value = values[attribute.slug];
    const error = errors[attribute.slug];
    const hasError = !!error;

    const commonProps = {
      label: attribute.label + (attribute.is_required ? ' *' : ''),
      error: error,
      helperText: attribute.help_text,
    };

    switch (attribute.field_type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            value={value || ''}
            onChangeText={(text: string) => onChange(attribute.slug, text)}
            placeholder={attribute.placeholder}
            maxLength={attribute.max_length || undefined}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            value={value?.toString() || ''}
            onChangeText={(text: string) => {
              // Allow decimal numbers by not parsing immediately
              onChange(attribute.slug, text);
            }}
            placeholder={attribute.placeholder}
            keyboardType="decimal-pad"
          />
        );

      case 'select':
        const selectedOption = attribute.options?.find(opt => opt.value === value);
        const displayLabel = selectedOption?.label || attribute.placeholder || 'Select...';
        
        return (
          <View key={attribute.id} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>
              {attribute.label}
              {attribute.is_required && <Text style={{ color: theme.colors.text.secondary }}> *</Text>}
            </Text>
            {attribute.help_text && (
              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                {attribute.help_text}
              </Text>
            )}
            
            {/* Custom Select Button */}
            <TouchableOpacity
              onPress={() => setActiveSelectModal(attribute.slug)}
              style={[
                styles.selectButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: hasError ? theme.colors.error : theme.colors.border,
                  borderWidth: 1,
                  borderRadius: theme.borderRadius.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.md,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                },
              ]}
            >
              <Text
                style={{
                  color: value ? theme.colors.text.primary : theme.colors.text.muted,
                  fontSize: 16,
                }}
              >
                {displayLabel}
              </Text>
              <ChevronDown size={20} color={theme.colors.text.muted} />
            </TouchableOpacity>
            
            {error && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
            )}
            
            {/* Select Modal */}
            <AppModal
              visible={activeSelectModal === attribute.slug}
              onClose={() => setActiveSelectModal(null)}
              title={attribute.label}
            >
              <ScrollView style={{ maxHeight: 400 }}>
                {attribute.options?.map((option) => {
                  const isSelected = value === option.value;
                  
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        onChange(attribute.slug, option.value);
                        setActiveSelectModal(null);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: theme.spacing.md,
                        paddingHorizontal: theme.spacing.lg,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                        backgroundColor: isSelected ? theme.colors.primary + '10' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color: isSelected ? theme.colors.primary : theme.colors.text.primary,
                          fontWeight: isSelected ? '600' : '400',
                        }}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Check size={20} color={theme.colors.primary} strokeWidth={3} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </AppModal>
          </View>
        );

      case 'multiselect':
        return (
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>
              {attribute.label}
              {attribute.is_required && <Text style={{ color: theme.colors.text.secondary }}> *</Text>}
            </Text>
            {attribute.help_text && (
              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                {attribute.help_text}
              </Text>
            )}
            <View style={styles.checkboxGroup}>
              {attribute.options?.map((option) => {
                const selectedValues = Array.isArray(value) ? value : [];
                const isChecked = selectedValues.includes(option.value);

                return (
                  <View key={option.value} style={styles.checkboxItem}>
                    <Checkbox
                      value={isChecked}
                      onValueChange={(checked: boolean) => {
                        const newValues = checked
                          ? [...selectedValues, option.value]
                          : selectedValues.filter((v) => v !== option.value);
                        onChange(attribute.slug, newValues);
                      }}
                      color={isChecked ? theme.colors.primary : undefined}
                    />
                    <Text
                      style={[styles.checkboxLabel, { color: theme.colors.text.primary }]}
                      onPress={() => {
                        const newValues = isChecked
                          ? selectedValues.filter((v) => v !== option.value)
                          : [...selectedValues, option.value];
                        onChange(attribute.slug, newValues);
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            {error && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
            )}
          </View>
        );

      case 'boolean':
        return (
          <View style={styles.fieldContainer}>
            <View style={styles.checkboxItem}>
              <Checkbox
                value={value || false}
                onValueChange={(checked: boolean) => onChange(attribute.slug, checked)}
                color={value ? theme.colors.primary : undefined}
              />
              <View style={styles.booleanLabelContainer}>
                <Text
                  style={[styles.checkboxLabel, { color: theme.colors.text.primary }]}
                  onPress={() => onChange(attribute.slug, !value)}
                >
                  {attribute.label}
                  {attribute.is_required && <Text style={{ color: theme.colors.text.secondary }}> *</Text>}
                </Text>
                {attribute.help_text && (
                  <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                    {attribute.help_text}
                  </Text>
                )}
              </View>
            </View>
            {error && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
            )}
          </View>
        );

      case 'range':
        return (
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>
              {attribute.label}
              {attribute.is_required && <Text style={{ color: theme.colors.text.secondary }}> *</Text>}
            </Text>
            {attribute.help_text && (
              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                {attribute.help_text}
              </Text>
            )}
            <View style={styles.rangeContainer}>
              <Input
                value={value?.min?.toString() || ''}
                onChangeText={(text: string) => {
                  const numValue = text === '' ? null : parseFloat(text);
                  onChange(attribute.slug, { ...value, min: numValue });
                }}
                placeholder="Min"
                keyboardType="numeric"
                containerStyle={styles.rangeInput}
              />
              <Text style={[styles.rangeSeparator, { color: theme.colors.text.primary }]}>-</Text>
              <Input
                value={value?.max?.toString() || ''}
                onChangeText={(text: string) => {
                  const numValue = text === '' ? null : parseFloat(text);
                  onChange(attribute.slug, { ...value, max: numValue });
                }}
                placeholder="Max"
                keyboardType="numeric"
                containerStyle={styles.rangeInput}
              />
            </View>
            {error && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading category fields...
        </Text>
      </View>
    );
  }

  if (attributes.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Category Details
      </Text>
      {attributes.map((attribute) => (
        <View key={attribute.id} style={styles.fieldWrapper}>
          {renderField(attribute)}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    // Asterisk color removed - will inherit from parent label color
  },
  helpText: {
    fontSize: 12,
    marginBottom: 8,
  },
  selectButton: {
    minHeight: 52,
  },
  checkboxGroup: {
    gap: 12,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  booleanLabelContainer: {
    flex: 1,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeInput: {
    flex: 1,
  },
  rangeSeparator: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});

