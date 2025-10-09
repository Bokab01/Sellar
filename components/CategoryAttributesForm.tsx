import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';

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

  useEffect(() => {
    if (categoryId) {
      fetchAttributes();
    }
  }, [categoryId]);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_category_attributes', { p_category_id: categoryId });

      if (error) {
        console.error('Error fetching attributes:', error);
        return;
      }

      setAttributes(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <View
              style={[
                styles.pickerContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: hasError ? theme.colors.error : theme.colors.border,
                },
              ]}
            >
              <Picker
                selectedValue={value || ''}
                onValueChange={(itemValue) => onChange(attribute.slug, itemValue)}
                style={[styles.picker, { color: theme.colors.text.primary }]}
              >
                <Picker.Item label={attribute.placeholder || 'Select...'} value="" />
                {attribute.options?.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
            {error && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
            )}
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
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 56,
  },
  picker: {
    height: 56,
    paddingVertical: 4,
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

