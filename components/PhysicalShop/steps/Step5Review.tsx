/**
 * Step 5: Review & Publish
 * Final review of all shop information before publishing
 */

import React, { memo } from 'react';
import { View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { MapPin, Phone, Mail, Globe, Clock, Camera, Store } from 'lucide-react-native';
import type { ShopSetupData } from '../types';
import { DAYS_OF_WEEK, SHOP_PHOTO_TYPES } from '../types';

interface Step5ReviewProps {
  data: Partial<ShopSetupData>;
  updateData: <K extends keyof ShopSetupData>(key: K, value: ShopSetupData[K]) => void;
  updateMultiple: (updates: Partial<ShopSetupData>) => void;
}

const Step5Review = memo<Step5ReviewProps>(({ data }) => {
  const { theme } = useTheme();

  const formatBusinessHours = () => {
    if (!data.business_hours) return [];
    
    return DAYS_OF_WEEK.map(day => {
      const schedule = data.business_hours![day.key];
      return {
        day: day.label,
        isOpen: schedule?.is_open ?? false,
        hours: schedule?.is_open
          ? `${schedule.open} - ${schedule.close}`
          : 'Closed',
      };
    });
  };

  const businessHours = formatBusinessHours();
  const primaryPhoto = data.photos?.find(p => p.is_primary) || data.photos?.[0];

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ gap: theme.spacing.lg }}>
        {/* Header */}
        <View>
          <Text variant="h3" style={{ marginBottom: theme.spacing.xs }}>
            Review Your Shop
          </Text>
          <Text variant="body" color="secondary">
            Double-check everything before publishing
          </Text>
        </View>

        {/* Shop Preview Card */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: 'hidden',
        }}>
          {/* Header Image */}
          {primaryPhoto && (
            <View style={{ width: '100%', height: 200 }}>
              <Image
                source={{ uri: primaryPhoto.photo_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <View style={{
                position: 'absolute',
                bottom: theme.spacing.md,
                left: theme.spacing.md,
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.md,
              }}>
                <Text variant="h4" style={{ color: '#fff' }}>
                  {data.business_name}
                </Text>
                <Text variant="bodySmall" style={{ color: '#fff', opacity: 0.9 }}>
                  {data.business_type}
                </Text>
              </View>
            </View>
          )}

          {/* Shop Info */}
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            {/* Basic Info Section */}
            <Section title="Basic Information" icon={<Store size={20} color={theme.colors.primary} />}>
              <InfoRow label="Business Name" value={data.business_name} />
              <InfoRow label="Type" value={data.business_type} />
              <InfoRow label="Description" value={data.business_description} multiline />
            </Section>

            <Divider />

            {/* Contact Section */}
            <Section title="Contact Information" icon={<Phone size={20} color={theme.colors.primary} />}>
              <InfoRow label="Phone" value={data.business_phone} icon={<Phone size={16} color={theme.colors.text.muted} />} />
              {data.business_email && (
                <InfoRow label="Email" value={data.business_email} icon={<Mail size={16} color={theme.colors.text.muted} />} />
              )}
              {data.business_website && (
                <InfoRow label="Website" value={data.business_website} icon={<Globe size={16} color={theme.colors.text.muted} />} />
              )}
            </Section>

            <Divider />

            {/* Location Section */}
            <Section title="Location" icon={<MapPin size={20} color={theme.colors.primary} />}>
              <InfoRow label="Address" value={data.address?.address} />
              {data.address?.address_line_2 && (
                <InfoRow label="Address Line 2" value={data.address.address_line_2} />
              )}
              <InfoRow label="City" value={data.address?.city} />
              <InfoRow label="Region" value={data.address?.state} />
              {data.address?.postal_code && (
                <InfoRow label="Postal Code" value={data.address.postal_code} />
              )}
              {data.address?.directions_note && (
                <InfoRow label="Landmark Directions" value={data.address.directions_note} multiline />
              )}
              <InfoRow 
                label="Coordinates" 
                value={`${data.address?.latitude?.toFixed(6)}, ${data.address?.longitude?.toFixed(6)}`} 
              />
            </Section>

            <Divider />

            {/* Business Hours Section */}
            <Section title="Business Hours" icon={<Clock size={20} color={theme.colors.primary} />}>
              <View style={{ gap: theme.spacing.sm }}>
                {businessHours.map((day) => (
                  <View
                    key={day.day}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text variant="bodySmall" style={{ fontWeight: '500', flex: 1 }}>
                      {day.day}
                    </Text>
                    <Text
                      variant="bodySmall"
                      color={day.isOpen ? 'primary' : 'muted'}
                      style={{ fontWeight: day.isOpen ? '600' : '400' }}
                    >
                      {day.hours}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>

            <Divider />

            {/* Service Options */}
            <Section title="Customer Service Options" icon={<Store size={20} color={theme.colors.primary} />}>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md, flexWrap: 'wrap' }}>
                {data.accepts_pickup && (
                  <View style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    backgroundColor: theme.colors.success + '20',
                    borderRadius: theme.borderRadius.md,
                  }}>
                    <Text variant="bodySmall" style={{ color: theme.colors.success, fontWeight: '600' }}>
                      ✓ Accepts Pickups
                    </Text>
                  </View>
                )}
                {data.accepts_walkin && (
                  <View style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    backgroundColor: theme.colors.success + '20',
                    borderRadius: theme.borderRadius.md,
                  }}>
                    <Text variant="bodySmall" style={{ color: theme.colors.success, fontWeight: '600' }}>
                      ✓ Accepts Walk-ins
                    </Text>
                  </View>
                )}
              </View>
            </Section>

            <Divider />

            {/* Photos Section */}
            <Section title="Shop Photos" icon={<Camera size={20} color={theme.colors.primary} />}>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                {data.photos?.length || 0} photo{(data.photos?.length || 0) !== 1 ? 's' : ''} uploaded
              </Text>
              
              {data.photos && data.photos.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -theme.spacing.lg }}
                  contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}
                >
                  {data.photos.map((photo, index) => (
                    <View key={index} style={{ position: 'relative' }}>
                      <Image
                        source={{ uri: photo.photo_url }}
                        style={{
                          width: 120,
                          height: 90,
                          borderRadius: theme.borderRadius.md,
                          borderWidth: photo.is_primary ? 2 : 1,
                          borderColor: photo.is_primary ? theme.colors.primary : theme.colors.border,
                        }}
                        resizeMode="cover"
                      />
                      <View style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}>
                        <Text style={{ color: '#fff', fontSize: 9 }}>
                          {SHOP_PHOTO_TYPES.find(t => t.value === photo.photo_type)?.label}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </Section>
          </View>
        </View>

        {/* Success Message */}
        <View style={{
          backgroundColor: theme.colors.success + '10',
          padding: theme.spacing.lg,
          borderRadius: theme.borderRadius.md,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.success,
          gap: theme.spacing.sm,
        }}>
          <Text variant="body" style={{ fontWeight: '600' }}>
            🎉 You're all set!
          </Text>
          <Text variant="bodySmall" style={{ lineHeight: 20 }}>
            Your physical shop will be visible to buyers on your profile and listings. They'll be able to see your location, hours, and visit you in person!
          </Text>
        </View>

        {/* Note */}
        <View style={{
          backgroundColor: theme.colors.primary + '10',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.primary,
        }}>
          <Text variant="bodySmall" style={{ lineHeight: 18 }}>
            💡 You can edit your shop information anytime from your profile settings.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
});

Step5Review.displayName = 'Step5Review';

export default Step5Review;

// =============================================
// HELPER COMPONENTS
// =============================================

const Section = memo<{ title: string; icon: React.ReactNode; children: React.ReactNode }>(
  ({ title, icon, children }) => {
    const { theme } = useTheme();
    return (
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          {icon}
          <Text variant="body" style={{ fontWeight: '600' }}>
            {title}
          </Text>
        </View>
        {children}
      </View>
    );
  }
);
Section.displayName = 'Section';

const InfoRow = memo<{
  label: string;
  value?: string;
  icon?: React.ReactNode;
  multiline?: boolean;
}>(({ label, value, icon, multiline }) => {
  const { theme } = useTheme();
  
  if (!value) return null;

  return (
    <View style={{ gap: 4 }}>
      <Text variant="caption" color="muted" style={{ fontWeight: '500' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: theme.spacing.xs }}>
        {icon}
        <Text
          variant="bodySmall"
          style={{
            flex: 1,
            lineHeight: multiline ? 20 : undefined,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
});
InfoRow.displayName = 'InfoRow';

const Divider = memo(() => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.xs,
      }}
    />
  );
});
Divider.displayName = 'Divider';

