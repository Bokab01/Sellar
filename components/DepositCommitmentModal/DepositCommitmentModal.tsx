import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { Minus, Plus } from 'lucide-react-native';

interface DepositCommitmentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  listingTitle: string;
  availableQuantity?: number;
  loading?: boolean;
}

export function DepositCommitmentModal({ 
  visible, 
  onClose, 
  onConfirm, 
  listingTitle,
  availableQuantity = 1,
  loading = false,
}: DepositCommitmentModalProps) {
  const { theme } = useTheme();
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const showQuantitySelector = availableQuantity > 1;

  const handleIncrease = () => {
    if (selectedQuantity < Math.min(availableQuantity, 10)) {
      setSelectedQuantity(prev => prev + 1);
    }
  };

  const handleDecrease = () => {
    if (selectedQuantity > 1) {
      setSelectedQuantity(prev => prev - 1);
    }
  };

  const depositAmount = selectedQuantity * 20;

  return (
    <AppModal 
      visible={visible} 
      onClose={onClose} 
      title="Sellar Secure Deposit"
      position="bottom"
      size="md"
    >
      <View style={{ padding: theme.spacing.lg }}>
        <Text variant="body" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
          This seller requires a ₵20 commitment deposit per unit for:
        </Text>
        
        <View style={{
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="body" style={{ fontWeight: '600' }}>
            "{listingTitle}"
          </Text>
        </View>

        {/* Quantity Selector */}
        {showQuantitySelector && (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: theme.spacing.sm,
            }}>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                How many units?
              </Text>
              <Text variant="caption" color="secondary">
                {availableQuantity} available
              </Text>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.md,
            }}>
              <TouchableOpacity
                onPress={handleDecrease}
                disabled={selectedQuantity <= 1}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: selectedQuantity <= 1 
                    ? theme.colors.surfaceVariant 
                    : theme.colors.primary + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: selectedQuantity <= 1 
                    ? theme.colors.border 
                    : theme.colors.primary + '40',
                }}
              >
                <Minus 
                  size={20} 
                  color={selectedQuantity <= 1 ? theme.colors.text.muted : theme.colors.primary} 
                />
              </TouchableOpacity>

              <View style={{
                minWidth: 80,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                borderWidth: 2,
                borderColor: theme.colors.primary,
                alignItems: 'center',
              }}>
                <Text variant="h3" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                  {selectedQuantity}
                </Text>
                <Text variant="caption" color="secondary">
                  {selectedQuantity === 1 ? 'unit' : 'units'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleIncrease}
                disabled={selectedQuantity >= Math.min(availableQuantity, 10)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: selectedQuantity >= Math.min(availableQuantity, 10)
                    ? theme.colors.surfaceVariant 
                    : theme.colors.primary + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: selectedQuantity >= Math.min(availableQuantity, 10)
                    ? theme.colors.border 
                    : theme.colors.primary + '40',
                }}
              >
                <Plus 
                  size={20} 
                  color={selectedQuantity >= Math.min(availableQuantity, 10) 
                    ? theme.colors.text.muted 
                    : theme.colors.primary
                  } 
                />
              </TouchableOpacity>
            </View>

            {availableQuantity > 10 && (
              <Text 
                variant="caption" 
                color="secondary" 
                style={{ textAlign: 'center', marginTop: theme.spacing.xs }}
              >
                Maximum 10 units per deposit
              </Text>
            )}
          </View>
        )}
        
        {/* Deposit Summary */}
        <View style={{
          backgroundColor: theme.colors.primary + '10',
          padding: theme.spacing.lg,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.md,
          borderWidth: 2,
          borderColor: theme.colors.primary + '30',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs }}>
            <Text variant="bodySmall" color="secondary">
              Deposit Amount:
            </Text>
            <Text variant="h2" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              ₵{depositAmount}
            </Text>
          </View>
          <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
            {selectedQuantity} unit{selectedQuantity > 1 ? 's' : ''} × ₵20 per unit
          </Text>
        </View>

        <View style={{ 
          backgroundColor: theme.colors.info + '15',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.info + '30',
        }}>
          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
            How it works:
          </Text>
          <Text variant="bodySmall" style={{ lineHeight: 20 }}>
            ✓ Your deposit is protected{'\n'}
            ✓ Meet seller within 3 days{'\n'}
            ✓ Confirm transaction to release deposit{'\n'}
            ✓ Auto-refund if you don't confirm
          </Text>
        </View>
        
        <View style={{ 
          backgroundColor: theme.colors.warning + '10',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.warning + '30',
        }}>
          <Text variant="caption" color="secondary" style={{ lineHeight: 18 }}>
            💡 The deposit shows commitment. It will be released to the seller 
            after you confirm receiving the {selectedQuantity > 1 ? 'items' : 'item'}, or refunded if the transaction 
            doesn't happen.
          </Text>
        </View>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Button 
            variant="primary" 
            onPress={() => onConfirm(selectedQuantity)} 
            fullWidth
            loading={loading}
            disabled={loading}
          >
            Pay ₵{depositAmount} Deposit
          </Button>
          <Button 
            variant="outline" 
            onPress={onClose} 
            fullWidth
            disabled={loading}
          >
            Cancel
          </Button>
        </View>
      </View>
    </AppModal>
  );
}

