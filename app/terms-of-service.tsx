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

export default function TermsOfServiceScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Terms of Service"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Container>
          <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>
            Terms of Service
          </Text>

          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xl }}>
            Effective Date: January 16, 2025 • Last Updated: January 16, 2025
          </Text>

          {/* Introduction */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            Introduction
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 24 }}>
            Welcome to Sellar, Ghana's premier mobile marketplace platform. These Terms of Service ("Terms") govern your use of the Sellar mobile application and related services operated by Sellar Technologies Ltd.
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 24 }}>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the Service.
          </Text>

          {/* Acceptance of Terms */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            1. Acceptance of Terms
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            By creating an account or using Sellar, you acknowledge that you:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Are at least 18 years old{'\n'}
            • Have the legal capacity to enter binding contracts{'\n'}
            • Will provide accurate and complete information{'\n'}
            • Agree to these Terms and our Privacy Policy
          </Text>

          {/* Service Description */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            2. Description of Service
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 24 }}>
            Sellar is a mobile marketplace platform that enables users in Ghana to buy and sell goods and services, communicate through integrated messaging, and access business tools.
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Core Features:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Listing creation and management{'\n'}
            • Search and discovery tools{'\n'}
            • Messaging and offers system{'\n'}
            • User profiles and verification{'\n'}
            • Reviews and ratings system
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Business Plans:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Starter Business (GHS 100/month){'\n'}
            • Pro Business (GHS 250/month){'\n'}
            • Premium Business (GHS 400/month)
          </Text>

          {/* User Conduct */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            3. User Conduct and Prohibited Activities
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            You Must:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Provide accurate information in listings{'\n'}
            • Respect other users' rights and property{'\n'}
            • Comply with all applicable laws{'\n'}
            • Use the Service for legitimate purposes
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Prohibited Activities:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Posting false or misleading listings{'\n'}
            • Engaging in fraudulent transactions{'\n'}
            • Impersonating others or creating fake accounts{'\n'}
            • Posting illegal items or content{'\n'}
            • Spamming or harassing other users{'\n'}
            • Attempting to circumvent security measures
          </Text>

          {/* Transactions and Payments */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            4. Transactions and Payments
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Transaction Facilitation:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Sellar facilitates transactions between users{'\n'}
            • We are not a party to actual transactions{'\n'}
            • Users are responsible for completing transactions in good faith{'\n'}
            • Disputes should be resolved directly between parties
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Credit System:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Starter: 50 credits for GHS 10{'\n'}
            • Seller: 120 credits for GHS 20{'\n'}
            • Pro: 300 credits for GHS 50{'\n'}
            • Business: 650 credits for GHS 100{'\n'}
            • Credits are non-refundable once purchased
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Listing Limits:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • All users receive 5 free active listings{'\n'}
            • Additional listings require 10 credits each{'\n'}
            • Business plan subscribers get increased limits
          </Text>

          {/* Business Plans */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            5. Business Plans and Subscriptions
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            Business plans are billed monthly and automatically renew unless cancelled:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • You may cancel your subscription at any time{'\n'}
            • Cancellation takes effect at the end of the billing period{'\n'}
            • No refunds for partial months or unused portions{'\n'}
            • Plan changes take effect at the next billing cycle
          </Text>

          {/* Intellectual Property */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            6. Intellectual Property Rights
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • The Sellar app and materials are protected by intellectual property laws{'\n'}
            • You retain ownership of content you post{'\n'}
            • You grant us a license to use your content on the platform{'\n'}
            • We respect copyright and will investigate infringement claims
          </Text>

          {/* Disclaimers */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            7. Disclaimers and Limitations
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • We strive for service availability but cannot guarantee uninterrupted access{'\n'}
            • We do not endorse or guarantee user-generated content{'\n'}
            • Users are solely responsible for their transactions{'\n'}
            • Our liability is limited to the maximum extent permitted by law
          </Text>

          {/* Dispute Resolution */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            8. Dispute Resolution
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            These Terms are governed by Ghana law. Dispute resolution process:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            1. First, attempt direct resolution with other users{'\n'}
            2. We may offer mediation for transaction disputes{'\n'}
            3. Legal action through Ghana's court system as last resort
          </Text>

          {/* Termination */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            9. Termination
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • You may terminate your account at any time{'\n'}
            • We may suspend accounts for Terms violations{'\n'}
            • Upon termination, access ceases immediately{'\n'}
            • You remain liable for outstanding obligations
          </Text>

          {/* Modifications */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            10. Modifications to Terms
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            We may modify these Terms at any time. We will notify you of material changes through the app, email, or prominent notices. Your continued use constitutes acceptance of updated Terms.
          </Text>

          {/* Contact Information */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            11. Contact Information
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            For questions about these Terms:{'\n\n'}
            Email: legal@sellar.gh{'\n'}
            Address: Sellar Technologies Ltd., Accra, Ghana{'\n'}
            Phone: +233 (0) 123 456 789{'\n'}
            Customer Support: support@sellar.gh
          </Text>

          {/* Acknowledgment */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            12. Acknowledgment
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 24 }}>
            By using Sellar, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
          </Text>

          {/* Footer */}
          <Text variant="caption" color="muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>
            These Terms of Service are effective as of January 16, 2025, and were last updated on January 16, 2025.
          </Text>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
