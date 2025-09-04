import React from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
} from '@/components';

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Privacy Policy"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Container>
          <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>
            Privacy Policy
          </Text>

          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xl }}>
            Effective Date: January 16, 2025 • Last Updated: January 16, 2025
          </Text>

          {/* Introduction */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            Introduction
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 24 }}>
            Welcome to Sellar ("we," "our," or "us"), Ghana's premier mobile marketplace platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 24 }}>
            By using Sellar, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
          </Text>

          {/* Information We Collect */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            1. Information We Collect
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm, marginTop: theme.spacing.lg }}>
            1.1 Personal Information You Provide
          </Text>
          
          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
            Account Information:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
            • Full name (first and last name){'\n'}
            • Email address and phone number{'\n'}
            • Username and password (encrypted){'\n'}
            • Date of birth and gender{'\n'}
            • Profile photo/avatar
          </Text>

          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
            Profile Information:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
            • Bio/description and location{'\n'}
            • Professional title and experience{'\n'}
            • Contact preferences and response times
          </Text>

          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
            Business Information:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
            • Business name, type, and description{'\n'}
            • Registration number and address{'\n'}
            • Business contact details and website{'\n'}
            • Services offered and coverage areas
          </Text>

          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
            Financial Information:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Payment information (processed by Paystack){'\n'}
            • Transaction history and credit balance{'\n'}
            • Subscription plan information
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            1.2 Content You Create
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Product/service listings with descriptions and images{'\n'}
            • Messages, offers, and communications{'\n'}
            • Community posts, comments, and reviews{'\n'}
            • Support tickets and feedback
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            1.3 Automatically Collected Information
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Device information (type, OS, identifiers){'\n'}
            • Usage patterns and app interactions{'\n'}
            • Location data (when enabled){'\n'}
            • Technical logs and performance metrics
          </Text>

          {/* How We Use Your Information */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            2. How We Use Your Information
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 24 }}>
            We use your information to provide and improve our marketplace services, including:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Account management and user authentication{'\n'}
            • Facilitating buying and selling transactions{'\n'}
            • Enabling communication between users{'\n'}
            • Processing payments and managing subscriptions{'\n'}
            • Providing customer support and assistance{'\n'}
            • Ensuring platform safety and security{'\n'}
            • Improving our services and developing new features
          </Text>

          {/* Information Sharing */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            3. Information Sharing and Disclosure
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            3.1 With Other Users
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Public profile information (name, photo, bio, location){'\n'}
            • Listing details and pricing information{'\n'}
            • Messages between conversation participants{'\n'}
            • Reviews and ratings you give or receive
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            3.2 With Service Providers
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Paystack (payment processing){'\n'}
            • Supabase (database and authentication){'\n'}
            • Expo (mobile platform and notifications){'\n'}
            • SMS and email service providers
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            3.3 Legal Requirements
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            We may disclose information when required by law, to protect our rights, investigate fraud, or ensure user safety.
          </Text>

          {/* Data Security */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            4. Data Security
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 24 }}>
            We implement comprehensive security measures including encryption, access controls, regular audits, and secure infrastructure. Payment processing is PCI-compliant through Paystack, and sensitive data is never stored on our servers.
          </Text>

          {/* Your Privacy Rights */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            5. Your Privacy Rights
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            You can control your privacy through:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Account settings and privacy controls{'\n'}
            • Visibility settings for phone and email{'\n'}
            • Communication preferences{'\n'}
            • Data access and portability requests{'\n'}
            • Account deletion and data erasure
          </Text>

          {/* Contact Information */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            6. Contact Us
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            For privacy-related questions or to exercise your rights:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            Email: privacy@sellar.gh{'\n'}
            Address: Sellar Technologies Ltd., Accra, Ghana{'\n'}
            Phone: +233 (0) 123 456 789{'\n'}
            Data Protection Officer: dpo@sellar.gh
          </Text>

          {/* Ghana Compliance */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            7. Ghana Data Protection Compliance
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 24 }}>
            This Privacy Policy complies with the Ghana Data Protection Act, 2012 (Act 843) and its regulations. We are committed to protecting your personal data in accordance with Ghanaian law.
          </Text>

          {/* Footer */}
          <Text variant="caption" color="muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>
            This Privacy Policy is effective as of January 16, 2025, and was last updated on January 16, 2025.
          </Text>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
