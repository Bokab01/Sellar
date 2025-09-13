import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Button,
} from '@/components';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaWrapper>
      <Container padding="sm">
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          marginBottom: theme.spacing.lg,
        }}>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              padding: 0,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: theme.spacing.md,
            }}
          >
            <ArrowLeft size={20} color={theme.colors.text.primary} />
          </Button>
          
          <Text variant="h2">Privacy Policy</Text>
        </View>

        {/* Content */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: theme.spacing['4xl'] }}
        >
          <View style={{ gap: theme.spacing.lg }}>
            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Information We Collect
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This includes your name, email address, phone number, and location.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                How We Use Your Information
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and communicate with you about products and services.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Information Sharing
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information with service providers who assist us in operating our platform.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Data Security
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Location Information
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                We may collect and use your location information to provide location-based services, such as showing nearby listings. You can control location sharing through your device settings.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Cookies and Tracking
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                We use cookies and similar tracking technologies to improve your experience, analyze usage patterns, and personalize content. You can control cookie preferences through your browser settings.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Your Rights
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                You have the right to access, update, or delete your personal information. You can also opt out of certain communications and request data portability where applicable under local laws.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Children's Privacy
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Changes to This Policy
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Contact Us
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                If you have any questions about this Privacy Policy, please contact us at privacy@sellar.app or through the app's support section.
              </Text>
            </View>

            <View style={{
              backgroundColor: theme.colors.background + '80',
              padding: theme.spacing.lg,
              borderRadius: theme.borderRadius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Text variant="bodySmall" style={{ 
                fontStyle: 'italic',
                color: theme.colors.text.muted,
                textAlign: 'center' 
              }}>
                Last updated: {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </ScrollView>
      </Container>
    </SafeAreaWrapper>
  );
}
