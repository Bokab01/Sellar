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

export default function SafetyGuidelinesScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Safety Guidelines"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Container>
          <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>
            Safety Guidelines
          </Text>

          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xl }}>
            Your safety is our priority. Follow these guidelines for secure transactions.
          </Text>

          {/* Meeting Safely */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            🤝 Meeting Safely
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Choose Safe Meeting Locations:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Meet in well-lit, public places with good foot traffic{'\n'}
            • Shopping malls, banks, or police stations are ideal{'\n'}
            • Avoid secluded areas, private homes, or empty parking lots{'\n'}
            • Consider meeting during daylight hours when possible
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Bring Support:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Bring a friend or family member when possible{'\n'}
            • Let someone know where you're going and when{'\n'}
            • Share the buyer/seller's contact information with someone{'\n'}
            • Trust your instincts - if something feels wrong, leave
          </Text>

          {/* Online Safety */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            🔒 Online Safety
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Protect Your Personal Information:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Use Sellar's messaging system for initial communication{'\n'}
            • Be cautious about sharing personal details too quickly{'\n'}
            • Don't share your home address until you're comfortable{'\n'}
            • Use your privacy settings to control information visibility
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Verify Before You Buy:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Check the seller's verification status and ratings{'\n'}
            • Ask for additional photos or videos if needed{'\n'}
            • Be wary of deals that seem too good to be true{'\n'}
            • Research market prices for similar items
          </Text>

          {/* Payment Safety */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            💳 Payment Safety
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Secure Payment Methods:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Use Sellar's integrated payment system when available{'\n'}
            • Mobile money (MTN, Vodafone, AirtelTigo) is generally safe{'\n'}
            • Cash transactions should be done in person and in public{'\n'}
            • Count cash carefully and check for counterfeit notes
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Avoid Payment Scams:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Never send money before seeing the item in person{'\n'}
            • Be suspicious of requests for advance payments{'\n'}
            • Don't accept overpayments or requests to "refund the difference"{'\n'}
            • Avoid wire transfers or untraceable payment methods
          </Text>

          {/* Red Flags */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            🚩 Red Flags to Watch For
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Suspicious Behavior:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Pressure to complete the transaction quickly{'\n'}
            • Reluctance to meet in person or talk on the phone{'\n'}
            • Poor grammar or language that doesn't match location{'\n'}
            • Requests to move communication off the platform immediately
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Listing Red Flags:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Prices significantly below market value{'\n'}
            • Stock photos or images that look too professional{'\n'}
            • Vague descriptions or missing important details{'\n'}
            • Multiple identical listings from the same user
          </Text>

          {/* Reporting and Support */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            📢 Reporting and Support
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Report Suspicious Activity:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Use the report button on listings, messages, or profiles{'\n'}
            • Contact our support team immediately if you feel unsafe{'\n'}
            • Report any attempts at fraud or scams{'\n'}
            • Help keep the community safe by reporting violations
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Get Help When Needed:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Contact Sellar support for transaction disputes{'\n'}
            • Reach out to local authorities for serious safety concerns{'\n'}
            • Use our mediation services for payment disputes{'\n'}
            • Don't hesitate to ask for help if something goes wrong
          </Text>

          {/* Verification Benefits */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            ✅ Benefits of Verification
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Why Verify Your Account:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Increases trust with other users{'\n'}
            • Gets you a verification badge on your profile{'\n'}
            • May improve your search ranking{'\n'}
            • Helps prevent impersonation and fraud
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            What We Verify:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Phone number (SMS verification){'\n'}
            • Email address (email verification){'\n'}
            • Identity (government ID verification){'\n'}
            • Business registration (for business accounts)
          </Text>

          {/* Emergency Contacts */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            🚨 Emergency Contacts
          </Text>
          
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            If you're in immediate danger or need emergency assistance:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Ghana Police Service: 191 or 18555{'\n'}
            • National Ambulance Service: 193{'\n'}
            • Fire Service: 192{'\n'}
            • Emergency Services: 999
          </Text>

          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            For Sellar-related safety concerns:{'\n'}
            • Email: safety@sellarghana.com{'\n'}
            • Phone: +233 (0) 243 887 777{'\n'}
            • In-app support ticket system
          </Text>

          {/* Community Guidelines */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            👥 Community Guidelines
          </Text>
          
          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Be Respectful:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            • Treat all users with respect and courtesy{'\n'}
            • Use appropriate language in all communications{'\n'}
            • Respect cultural and religious differences{'\n'}
            • Be patient and understanding in negotiations
          </Text>

          <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Be Honest:
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
            • Provide accurate descriptions and photos{'\n'}
            • Disclose any defects or issues with items{'\n'}
            • Honor your commitments and agreements{'\n'}
            • Give honest reviews and ratings
          </Text>

          {/* Final Reminder */}
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            💡 Remember
          </Text>
          <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 24 }}>
            Your safety is more important than any transaction. Trust your instincts, take your time, and don't hesitate to walk away from any situation that makes you uncomfortable. When in doubt, ask for help or advice from our support team.
          </Text>

          {/* Footer */}
          <Text variant="caption" color="muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>
            Stay safe, stay smart, and enjoy using Sellar!
          </Text>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
