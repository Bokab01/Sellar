import React from 'react';
import { View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { 
  ShieldCheck, 
  Heart, 
  MessageCircle, 
  AlertTriangle,
  UserX,
  Flag,
  Lock,
  ThumbsUp,
  Ban,
  CheckCircle2,
  XCircle
} from 'lucide-react-native';
import { SafeAreaWrapper } from '@/components';

interface GuidelineSection {
  icon: any;
  title: string;
  description: string;
  rules: string[];
  color: string;
}

export default function CommunityGuidelinesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const guidelines: GuidelineSection[] = [
    {
      icon: Heart,
      title: 'Be Respectful',
      description: 'Treat everyone with kindness and respect',
      color: theme.colors.error,
      rules: [
        'Use polite and courteous language in all interactions',
        'Respect different opinions, backgrounds, and perspectives',
        'No harassment, bullying, or personal attacks',
        'Avoid discriminatory language based on ethnicity, religion, gender, or nationality',
        'Be constructive in your criticism and feedback'
      ]
    },
    {
      icon: ShieldCheck,
      title: 'Stay Safe',
      description: 'Protect yourself and others in the community',
      color: theme.colors.primary,
       rules: [
         'Never share personal information like passwords, ID/Ghana Card numbers, Mobile Money PINs, or bank details',
         'Meet in public places for transactions - malls, banks, or busy areas',
         'Report suspicious activity or "sakawa" attempts immediately',
         'Verify seller/buyer identity and phone number before completing transactions',
         'Use Sellar\'s built-in messaging system for secure communication'
       ]
    },
    {
      icon: CheckCircle2,
      title: 'Post Quality Content',
      description: 'Share valuable and appropriate content',
      color: theme.colors.success,
      rules: [
        'Post clear, accurate descriptions and high-quality photos',
        'Ensure listings are in the correct category',
        'No spam, duplicate posts, or misleading information',
        'Keep content relevant to the Sellar marketplace',
        'Update or remove listings when items are sold'
      ]
    },
    {
      icon: Ban,
      title: 'Prohibited Content',
      description: 'Content that is not allowed on Sellar',
      color: theme.colors.warning,
       rules: [
         'No illegal items, drugs, weapons, or counterfeit goods',
         'No adult content, nudity, or sexually explicit material',
         'No hate speech, tribal discrimination, or promotion of harmful activities',
         'No stolen goods or items obtained illegally',
         'No scams, pyramid schemes, or fraudulent investment schemes'
       ]
    },
    {
      icon: MessageCircle,
      title: 'Communication Guidelines',
      description: 'How to interact with other users',
      color: theme.colors.info,
       rules: [
         'Respond to messages promptly and professionally',
         'Be honest about item condition, location, and availability',
         'Negotiate fairly - "make we talk" in good faith',
         'No spam messages or unsolicited advertising',
         'Keep conversations relevant to the transaction and respectful'
       ]
    },
    {
      icon: ThumbsUp,
      title: 'Fair Trading',
      description: 'Conduct honest and transparent transactions',
      color: theme.colors.success,
       rules: [
         'Price items fairly in Ghana Cedis (GH₵) - no hidden charges',
         'Honor your commitments and agreements - "your word is your bond"',
         'Provide accurate product descriptions and real photos',
         'Accept reasonable offers and negotiate respectfully',
         'Complete transactions as agreed'
       ]
    },
    {
      icon: Flag,
      title: 'Reporting & Moderation',
      description: 'Help us maintain a safe community',
      color: theme.colors.error,
       rules: [
         'Report inappropriate content, scams, or policy violations immediately',
         'Use the report feature responsibly - no false or malicious reports',
         'Cooperate with moderators and provide honest information',
         'Provide evidence (screenshots, receipts) when reporting serious violations',
         'Trust the moderation process - appeals will be reviewed fairly'
       ]
    },
    {
      icon: UserX,
      title: 'Account Integrity',
      description: 'Maintain the integrity of your account',
      color: theme.colors.primary,
      rules: [
        'One account per person - no multiple accounts',
        'Don\'t share your account credentials',
        'No impersonation of other users or businesses',
        'Keep your profile information accurate and up-to-date',
        'Don\'t manipulate ratings, reviews, or engagement'
      ]
    }
  ];

  const consequences = [
    {
      icon: AlertTriangle,
      title: 'Warning',
      description: 'First-time minor violations receive a warning',
      color: theme.colors.warning
    },
    {
      icon: Lock,
      title: 'Temporary Suspension',
      description: 'Repeated violations may result in temporary account suspension',
      color: theme.colors.error
    },
    {
      icon: XCircle,
      title: 'Permanent Ban',
      description: 'Serious or repeated violations may lead to permanent account termination',
      color: theme.colors.error
    }
  ];

  return (
    <SafeAreaWrapper style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <AppHeader 
            title="Community Guidelines"
            showBackButton
            onBackPress={() => router.back()}
        />

        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ 
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
            paddingBottom: insets.bottom + theme.spacing.xl 
            }}
            showsVerticalScrollIndicator={false}
        >
            {/* Introduction */}
            <View
            style={{
                backgroundColor: theme.colors.primary + '10',
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.xl,
                borderWidth: 1,
                borderColor: theme.colors.primary + '20',
            }}
            >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <ShieldCheck size={24} color={theme.colors.primary} />
                <Text variant="h3" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                Welcome to Sellar
                </Text>
            </View>
            <Text variant="body" color="secondary" style={{ lineHeight: 22 }}>
                Our community guidelines ensure a safe, respectful, and trustworthy marketplace for all Ghanaians. 
                By using Sellar, you agree to follow these guidelines and help us maintain a positive environment that reflects our values.
            </Text>
            </View>

            {/* Guidelines Sections */}
            {guidelines.map((section, index) => {
            const IconComponent = section.icon;
            return (
                <View
                key={index}
                style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.lg,
                    marginBottom: theme.spacing.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                }}
                >
                {/* Section Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                    <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: section.color + '15',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: theme.spacing.md,
                    }}
                    >
                    <IconComponent size={20} color={section.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                    <Text variant="h4" style={{ fontWeight: '600', marginBottom: 2 }}>
                        {section.title}
                    </Text>
                    <Text variant="caption" color="muted">
                        {section.description}
                    </Text>
                    </View>
                </View>

                {/* Rules List */}
                <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
                    {section.rules.map((rule, ruleIndex) => (
                    <View
                        key={ruleIndex}
                        style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        paddingVertical: theme.spacing.xs,
                        }}
                    >
                        <View
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: section.color,
                            marginTop: 6,
                            marginRight: theme.spacing.sm,
                        }}
                        />
                        <Text 
                        variant="bodySmall" 
                        color="secondary" 
                        style={{ flex: 1, lineHeight: 20 }}
                        >
                        {rule}
                        </Text>
                    </View>
                    ))}
                </View>
                </View>
            );
            })}

            {/* Consequences Section */}
            <View
            style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
            }}
            >
            <Text variant="h4" style={{ fontWeight: '600', marginBottom: theme.spacing.md }}>
                Consequences of Violations
            </Text>
            <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
                We take violations seriously to protect our community. Depending on the severity and frequency 
                of violations, the following actions may be taken:
            </Text>

            {consequences.map((consequence, index) => {
                const IconComponent = consequence.icon;
                return (
                <View
                    key={index}
                    style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.background,
                    borderRadius: theme.borderRadius.md,
                    marginBottom: index < consequences.length - 1 ? theme.spacing.sm : 0,
                    }}
                >
                    <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: consequence.color + '15',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: theme.spacing.md,
                    }}
                    >
                    <IconComponent size={18} color={consequence.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600', marginBottom: 2 }}>
                        {consequence.title}
                    </Text>
                    <Text variant="bodySmall" color="muted">
                        {consequence.description}
                    </Text>
                    </View>
                </View>
                );
            })}
            </View>

            {/* Contact & Support */}
            <View
            style={{
                backgroundColor: theme.colors.info + '10',
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.info + '20',
            }}
            >
            <Text variant="h4" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                Questions or Concerns?
            </Text>
             <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
                If you have questions about these guidelines or need to report a violation, our Ghana-based support team is here to help.
            </Text>
            <TouchableOpacity
                onPress={() => router.push('/help')}
                style={{
                backgroundColor: theme.colors.info,
                borderRadius: theme.borderRadius.md,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
                alignSelf: 'flex-start',
                }}
            >
                <Text variant="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Contact Support
                </Text>
            </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: theme.spacing.md }}>
             <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 18 }}>
                Last updated: October 2025{'\n'}
                By using Sellar, you agree to these guidelines{'\n'}
                🇬🇭 Made for Ghana, by Ghanaians
            </Text>
            </View>
        </ScrollView>
        </View>
    </SafeAreaWrapper>
  );
}
