import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { AppModal } from '@/components/Modal/Modal';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { supabase } from '@/lib/supabase';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface QuickEditModalProps {
  visible: boolean;
  onClose: () => void;
  listing: {
    id: string;
    title: string;
    price: number;
    description: string;
    previous_price?: number;
  };
  onSuccess?: (updatedListing: any) => void;
}

export function QuickEditModal({ 
  visible, 
  onClose, 
  listing,
  onSuccess 
}: QuickEditModalProps) {
  const { theme } = useTheme();
  const [price, setPrice] = useState(listing.price.toString());
  const [description, setDescription] = useState(listing.description);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Price validation states
  const [priceError, setPriceError] = useState('');
  const isPriceChanged = parseFloat(price) !== listing.price;
  const isDescriptionChanged = description !== listing.description;
  const hasChanges = isPriceChanged || isDescriptionChanged;

  // Calculate price change
  const newPriceNum = parseFloat(price);
  const isValidPrice = !isNaN(newPriceNum) && newPriceNum > 0;
  const isPriceDrop = isValidPrice && newPriceNum < listing.price;
  const priceChangePercent = isValidPrice && listing.price > 0 
    ? Math.abs(((newPriceNum - listing.price) / listing.price) * 100)
    : 0;

  useEffect(() => {
    // Reset form when modal opens with new listing
    if (visible) {
      setPrice(listing.price.toString());
      setDescription(listing.description);
      setError('');
      setSuccess(false);
      setPriceError('');
    }
  }, [visible, listing]);

  const validatePrice = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      setPriceError('Price must be greater than 0');
      return false;
    }
    if (num > 10000000) {
      setPriceError('Price is too high');
      return false;
    }
    setPriceError('');
    return true;
  };

  const handlePriceChange = (value: string) => {
    // Only allow numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('') 
      : cleaned;
    
    setPrice(formatted);
    if (formatted) {
      validatePrice(formatted);
    }
  };

  const handleSave = async () => {
    // Validate inputs
    if (isPriceChanged && !validatePrice(price)) {
      return;
    }

    if (!hasChanges) {
      setError('No changes made');
      return;
    }

    setLoading(true);
    setError('');

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { data, error: rpcError } = await supabase.rpc('quick_edit_listing', {
        p_listing_id: listing.id,
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_new_price: isPriceChanged ? parseFloat(price) : null,
        p_new_description: isDescriptionChanged ? description : null,
      });

      if (rpcError) throw rpcError;

      if (data && data.length > 0 && data[0].success) {
        setSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Debug: Log the returned data
        console.log('✅ Quick edit success, returned data:', data[0].updated_listing);

        // Call success callback with updated listing
        if (onSuccess && data[0].updated_listing) {
          onSuccess(data[0].updated_listing);
        }

        // Close modal after short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(data[0]?.message || 'Failed to update listing');
      }
    } catch (err: any) {
      console.error('Quick edit error:', err);
      setError(err.message || 'Failed to update listing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Quick Edit"
      position="bottom"
      size="lg"
      avoidKeyboard={true}
    >
      <View style={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          
          {/* Listing Title */}
          <View style={{
            marginBottom: theme.spacing.xl,
            paddingBottom: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: 4 }}>
              Editing
            </Text>
            <Text variant="h4" numberOfLines={2}>
              {listing.title}
            </Text>
          </View>

          {/* Success Message */}
          {success && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.success + '15',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.success + '30',
            }}>
              <CheckCircle size={20} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
              <Text variant="body" style={{ color: theme.colors.success, flex: 1 }}>
                Listing updated successfully!
              </Text>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.error + '15',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.error + '30',
            }}>
              <AlertCircle size={20} color={theme.colors.error} style={{ marginRight: theme.spacing.sm }} />
              <Text variant="body" style={{ color: theme.colors.error, flex: 1 }}>
                {error}
              </Text>
            </View>
          )}

          {/* Price Input */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Input
              label="Price (GH₵)"
              placeholder="0.00"
              value={price}
              onChangeText={handlePriceChange}
              keyboardType="decimal-pad"
              leftIcon={
                <Text style={{ fontSize: 20, color: theme.colors.text.muted, fontWeight: '600' }}>
                  ₵
                </Text>
              }
              error={priceError}
              state={loading || success ? 'disabled' : 'default'}
              editable={!loading && !success}
            />

            {/* Price Change Indicator */}
            {isPriceChanged && !priceError && isValidPrice && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: theme.spacing.sm,
                padding: theme.spacing.sm,
                backgroundColor: isPriceDrop ? theme.colors.success + '10' : theme.colors.warning + '10',
                borderRadius: theme.borderRadius.sm,
                borderWidth: 1,
                borderColor: isPriceDrop ? theme.colors.success + '30' : theme.colors.warning + '30',
              }}>
                <Text variant="caption" style={{
                  color: isPriceDrop ? theme.colors.success : theme.colors.warning,
                  fontWeight: '600',
                }}>
                  {isPriceDrop ? '📉 Price Drop' : '📈 Price Increase'}: {priceChangePercent.toFixed(1)}%
                </Text>
                {isPriceDrop && (
                  <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing.sm }}>
                    • Interested users will be notified
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Description Input */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Input
              label="Description"
              placeholder="Describe your item..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              leftIcon={<FileText size={20} color={theme.colors.text.muted} />}
              state={loading || success ? 'disabled' : 'default'}
              editable={!loading && !success}
              style={{ 
                minHeight: 120,
                textAlignVertical: 'top',
                paddingTop: theme.spacing.md,
              }}
            />
          </View>

          {/* Info Banner */}
          <View style={{
            backgroundColor: theme.colors.primary + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            borderWidth: 1,
            borderColor: theme.colors.primary + '30',
          }}>
            <Text variant="caption" color="secondary" style={{ lineHeight: 18 }}>
              ℹ️ Quick edits won't affect your boosts, features, or subscription benefits. Your listing will remain exactly as is, just with updated price and/or description.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Button
              variant="outline"
              onPress={onClose}
              disabled={loading || success}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleSave}
              disabled={!hasChanges || loading || success || !!priceError}
              loading={loading}
              style={{ flex: 1 }}
            >
              {success ? 'Saved!' : 'Save Changes'}
            </Button>
          </View>
        </View>
    </AppModal>
  );
}

