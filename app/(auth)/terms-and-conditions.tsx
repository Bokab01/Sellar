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

export default function TermsAndConditionsScreen() {
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
          
          <Text variant="h2">Terms and Conditions</Text>
        </View>

        {/* Content */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: theme.spacing['4xl'] }}
        >
          <View style={{ gap: theme.spacing.lg }}>
            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                1. Acceptance of Terms
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                By accessing and using the Sellar mobile application, you accept and agree to be bound by the terms and provision of this agreement.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                2. Use License
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                Permission is granted to temporarily download one copy of Sellar for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                3. User Accounts
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                4. Marketplace Rules
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                Users must comply with all applicable laws when buying or selling items. Prohibited items include but are not limited to illegal goods, counterfeit items, and items that violate intellectual property rights.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                5. Payment and Transactions
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                All transactions are conducted between users. Sellar facilitates the platform but is not responsible for the completion of transactions between users.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                6. Privacy and Data Protection
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                7. Limitation of Liability
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                In no event shall Sellar or its suppliers be liable for any damages arising out of the use or inability to use the materials on Sellar's platform.
              </Text>
            </View>

            <View>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                8. Contact Information
              </Text>
              <Text variant="body" style={{ lineHeight: 24, color: theme.colors.text.secondary }}>
                If you have any questions about these Terms and Conditions, please contact us at support@sellar.app
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
