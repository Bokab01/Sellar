import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components';
import { Eye, Heart, Calendar, RefreshCw } from 'lucide-react-native';

export interface DataTableRow {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
}

export interface DataTableProps {
  title?: string;
  data: DataTableRow[];
  showBorders?: boolean;
  compact?: boolean;
  style?: any;
}

export function DataTable({ 
  title, 
  data, 
  showBorders = true, 
  compact = false,
  style 
}: DataTableProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    header: {
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: showBorders ? 1 : 0,
      borderBottomColor: theme.colors.border,
    },
    headerText: {
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: compact ? theme.spacing.sm : theme.spacing.md,
      borderBottomWidth: showBorders ? 1 : 0,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    lastRow: {
      borderBottomWidth: 0,
    },
    labelContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    label: {
      color: theme.colors.text.secondary,
      fontWeight: '500',
    },
    valueContainer: {
      flex: 1,
      alignItems: 'flex-end',
    },
    value: {
      color: theme.colors.text.primary,
      fontWeight: '600',
      textAlign: 'right',
    },
    highlightedValue: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.lg,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {title && (
        <View style={styles.header}>
          <Text variant="h4" style={styles.headerText}>
            {title}
          </Text>
        </View>
      )}
      
      {data.map((row, index) => (
        <View key={index}>
          <View style={[
            styles.row,
            index === data.length - 1 && styles.lastRow
          ]}>
            <View style={styles.labelContainer}>
              {row.icon && row.icon}
              <Text 
                variant={compact ? "bodySmall" : "body"} 
                style={styles.label}
              >
                {row.label}
              </Text>
            </View>
            
            <View style={styles.valueContainer}>
              {typeof row.value === 'string' || typeof row.value === 'number' ? (
                <Text 
                  variant={compact ? "bodySmall" : "body"} 
                  style={[
                    styles.value,
                    row.highlight && styles.highlightedValue
                  ]}
                >
                  {row.value}
                </Text>
              ) : (
                row.value
              )}
            </View>
          </View>
          
          {showBorders && index < data.length - 1 && (
            <View style={styles.separator} />
          )}
        </View>
      ))}
    </View>
  );
}

// Preset components for common use cases
export function ItemDetailsTable({ 
  listing, 
  compact = false,
  style 
}: { 
  listing: any; 
  compact?: boolean;
  style?: any;
}) {
  const { theme } = useTheme();
  
  const data: DataTableRow[] = [
    {
      label: 'Category',
      value: listing.categories?.name || 'N/A',
      icon: <Text style={{ fontSize: 16 }}>📂</Text>,
    },
    {
      label: 'Quantity Available',
      value: listing.quantity || 1,
      icon: <Text style={{ fontSize: 16 }}>📦</Text>,
      highlight: listing.quantity > 1,
    },
  ];

  // Add category attributes if they exist
  if (listing.attributes && Object.keys(listing.attributes).length > 0) {
    Object.entries(listing.attributes).forEach(([key, value]) => {
      // Skip empty values (but allow 0 and false as valid values)
      if (
        value === null || 
        value === undefined || 
        (Array.isArray(value) && value.length === 0) || 
        (typeof value === 'string' && value.trim() === '')
      ) {
        return;
      }
      
      // Get appropriate icon based on attribute type
      const getAttributeIcon = (attrKey: string) => {
        const key = attrKey.toLowerCase();
        // Property/Real Estate attributes
        if (key.includes('bedroom')) return '🛏️';
        if (key.includes('bathroom')) return '🚿';
        if (key.includes('parking')) return '🅿️';
        if (key.includes('floor') || key.includes('storey')) return '🏢';
        if (key.includes('area') || key.includes('sqft') || key.includes('sqm')) return '📐';
        if (key.includes('furnished')) return '🛋️';
        if (key.includes('kitchen')) return '🍳';
        if (key.includes('balcony')) return '🌆';
        if (key.includes('garden') || key.includes('yard')) return '🌳';
        if (key.includes('pool') || key.includes('swimming')) return '🏊';
        if (key.includes('gym') || key.includes('fitness')) return '💪';
        if (key.includes('security')) return '🔒';
        if (key.includes('elevator') || key.includes('lift')) return '🛗';
        // Electronics attributes
        if (key.includes('brand') || key.includes('make')) return '🏷️';
        if (key.includes('model')) return '📱';
        if (key.includes('year')) return '📅';
        if (key.includes('color')) return '🎨';
        if (key.includes('size')) return '📏';
        if (key.includes('weight')) return '⚖️';
        if (key.includes('material')) return '🧱';
        if (key.includes('condition')) return '🔍';
        if (key.includes('warranty')) return '🛡️';
        if (key.includes('storage') || key.includes('memory')) return '💾';
        if (key.includes('screen') || key.includes('display')) return '📺';
        if (key.includes('battery')) return '🔋';
        if (key.includes('camera')) return '📷';
        if (key.includes('processor') || key.includes('cpu')) return '⚡';
        if (key.includes('ram')) return '🧠';
        if (key.includes('storage') || key.includes('ssd') || key.includes('hdd')) return '💿';
        if (key.includes('graphics') || key.includes('gpu')) return '🎮';
        if (key.includes('network') || key.includes('wifi') || key.includes('bluetooth')) return '📶';
        if (key.includes('os') || key.includes('operating')) return '💻';
        if (key.includes('resolution')) return '🖥️';
        if (key.includes('connectivity')) return '🔌';
        if (key.includes('features')) return '✨';
        if (key.includes('accessories')) return '🎒';
        // Vehicle attributes
        if (key.includes('mileage') || key.includes('km')) return '🛣️';
        if (key.includes('fuel') || key.includes('gas')) return '⛽';
        if (key.includes('transmission')) return '⚙️';
        if (key.includes('engine')) return '🔧';
        if (key.includes('doors')) return '🚪';
        if (key.includes('seats')) return '🪑';
        if (key.includes('type') || key.includes('category')) return '📂';
        return '⚙️'; // Default icon
      };
      
      // Format the value with proper capitalization
      const formatAttributeValue = (val: string | string[]): string => {
        if (Array.isArray(val)) {
          return val.map(v => formatSingleValue(v)).join(', ');
        }
        return formatSingleValue(String(val));
      };
      
      const formatSingleValue = (val: string): string => {
        // Common words that should remain lowercase (except at the beginning)
        const lowercaseWords = new Set([
          'and', 'or', 'of', 'the', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from',
          'up', 'down', 'out', 'off', 'over', 'under', 'above', 'below', 'between',
          'among', 'through', 'during', 'before', 'after', 'inside', 'outside', 'upon',
          'within', 'without', 'against', 'across', 'around', 'behind', 'beyond',
          'except', 'including', 'regarding', 'concerning', 'considering', 'despite',
          'throughout', 'toward', 'towards', 'via', 'versus', 'vice'
        ]);
        
        return val
          .split('_')
          .map((word, index) => {
            const lowerWord = word.toLowerCase();
            // First word is always capitalized, others follow the rules
            if (index === 0 || !lowercaseWords.has(lowerWord)) {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return lowerWord;
          })
          .join(' ');
      };
      
      // Format the value based on its type
      let displayValue: string;
      if (typeof value === 'number') {
        displayValue = String(value);
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No';
      } else if (typeof value === 'string' || Array.isArray(value)) {
        displayValue = formatAttributeValue(value);
      } else {
        displayValue = String(value);
      }

      data.push({
        label: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: displayValue,
        icon: <Text style={{ fontSize: 16 }}>{getAttributeIcon(key)}</Text>,
      });
    });
  }

  return (
    <DataTable
      title="Item Details"
      data={data}
      compact={compact}
      style={style}
    />
  );
}

export function SellerInfoTable({ 
  profile, 
  compact = false,
  style 
}: { 
  profile: any; 
  compact?: boolean;
  style?: any;
}) {
  const data: DataTableRow[] = [
    {
      label: 'Seller Name',
      value: `${profile?.first_name} ${profile?.last_name}`,
      icon: <Text style={{ fontSize: 16 }}>👤</Text>,
    },
    {
      label: 'Rating',
      value: profile?.rating ? `${Number(profile.rating).toFixed(1)} ⭐` : 'No ratings yet',
      icon: <Text style={{ fontSize: 16 }}>⭐</Text>,
      highlight: profile?.rating > 0,
    },
    {
      label: 'Total Sales',
      value: profile?.total_sales || 0,
      icon: <Text style={{ fontSize: 16 }}>💼</Text>,
    },
    {
      label: 'Response Time',
      value: profile?.response_time ? profile.response_time.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Within hours',
      icon: <Text style={{ fontSize: 16 }}>⏱️</Text>,
    },
    {
      label: 'Location',
      value: profile?.location || 'Not specified',
      icon: <Text style={{ fontSize: 16 }}>📍</Text>,
    },
  ];

  return (
    <DataTable
      title="Seller Information"
      data={data}
      compact={compact}
      style={style}
    />
  );
}

export function ListingStatsTable({ 
  listing, 
  viewCount,
  favoritesCount,
  compact = false,
  style 
}: { 
  listing: any; 
  viewCount?: number;
  favoritesCount?: number;
  compact?: boolean;
  style?: any;
}) {
  const { theme } = useTheme();
  
  // Use real-time stats if provided, otherwise fall back to listing data
  const actualViewCount = viewCount !== undefined ? viewCount : (listing.views_count || 0);
  const actualFavoritesCount = favoritesCount !== undefined ? favoritesCount : (listing.favorites_count || 0);
  
  const data: DataTableRow[] = [
    {
      label: 'Views',
      value: actualViewCount,
      icon: <Eye size={16} color={theme.colors.text.secondary} />,
    },
    {
      label: 'Favorites',
      value: actualFavoritesCount,
      icon: <Heart size={16} color={theme.colors.text.secondary} />,
    },
    {
      label: 'Listed Date',
      value: new Date(listing.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      icon: <Calendar size={16} color={theme.colors.text.secondary} />,
    },
    {
      label: 'Last Updated',
      value: new Date(listing.updated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      icon: <RefreshCw size={16} color={theme.colors.text.secondary} />,
    },
  ];

  return (
    <DataTable
      title="Listing Statistics"
      data={data}
      compact={compact}
      style={style}
    />
  );
}
