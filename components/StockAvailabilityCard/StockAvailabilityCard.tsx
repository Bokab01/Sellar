import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

interface StockAvailabilityCardProps {
  quantity: number;
  reservedQuantity?: number;
  style?: any;
}

interface StockStatus {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export function StockAvailabilityCard({ 
  quantity, 
  reservedQuantity = 0,
  style 
}: StockAvailabilityCardProps) {
  const { theme } = useTheme();

  // Don't show for single items
  if (!quantity || quantity <= 1) {
    return null;
  }

  const totalQuantity = quantity;
  const availableQuantity = totalQuantity - reservedQuantity;
  const stockPercentage = (availableQuantity / totalQuantity) * 100;

  // Determine stock status
  const getStockStatus = (): StockStatus => {
    if (availableQuantity === 0) {
      return {
        label: 'Out of Stock',
        color: theme.colors.error,
        bgColor: theme.colors.error + '10',
        borderColor: theme.colors.error + '30',
        icon: '✕',
      };
    }
    
    if (availableQuantity === 1) {
      return {
        label: 'Last Unit!',
        color: theme.colors.error,
        bgColor: theme.colors.error + '10',
        borderColor: theme.colors.error + '30',
        icon: '⚠️',
      };
    }
    
    if (stockPercentage <= 20) {
      return {
        label: 'Low Stock',
        color: theme.colors.warning,
        bgColor: theme.colors.warning + '10',
        borderColor: theme.colors.warning + '30',
        icon: '⚠️',
      };
    }
    
    return {
      label: 'In Stock',
      color: theme.colors.success,
      bgColor: theme.colors.success + '10',
      borderColor: theme.colors.success + '30',
      icon: '✓',
    };
  };

  const stockStatus = getStockStatus();

  return (
    <View
      style={[
        {
          backgroundColor: stockStatus.bgColor,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: stockStatus.borderColor,
        },
        style,
      ]}
    >
      {/* Status and Quantity */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xs,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Text style={{ fontSize: 16 }}>{stockStatus.icon}</Text>
          <Text
            variant="bodySmall"
            style={{
              fontWeight: '700',
              color: stockStatus.color,
            }}
          >
            {stockStatus.label}
          </Text>
        </View>
        <Text
          variant="bodySmall"
          style={{
            fontWeight: '600',
            color: theme.colors.text.primary,
          }}
        >
          {availableQuantity} / {totalQuantity} Available
        </Text>
      </View>

      {/* Stock Progress Bar */}
      <View
        style={{
          height: 6,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${stockPercentage}%`,
            backgroundColor: stockStatus.color,
          }}
        />
      </View>

      {/* Reserved Units Info */}
      {reservedQuantity > 0 && (
        <Text
          variant="caption"
          style={{
            color: theme.colors.text.secondary,
            marginTop: theme.spacing.xs,
          }}
        >
          {reservedQuantity} unit{reservedQuantity > 1 ? 's' : ''} reserved by other buyers
        </Text>
      )}
    </View>
  );
}

