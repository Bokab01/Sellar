import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { Mail, Lock, User, Phone } from 'lucide-react-native';

export function InputTest() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: theme.spacing.lg }}>
        <Text variant="h2" style={{ marginBottom: theme.spacing.xl }}>
          Input Component Test
        </Text>

        {/* Debug Theme Colors */}
        <View style={{ 
          backgroundColor: theme.colors.surface, 
          padding: theme.spacing.md, 
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg 
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Theme Colors Debug
          </Text>
          <Text variant="body" style={{ color: theme.colors.text.primary }}>
            Primary Text: {theme.colors.text.primary}
          </Text>
          <Text variant="body" style={{ color: theme.colors.text.secondary }}>
            Secondary Text: {theme.colors.text.secondary}
          </Text>
          <Text variant="body" style={{ color: theme.colors.text.muted }}>
            Muted Text: {theme.colors.text.muted}
          </Text>
          <Text variant="body" style={{ color: theme.colors.primary }}>
            Primary Color: {theme.colors.primary}
          </Text>
        </View>

        {/* Test Inputs */}
        <Input
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Mail size={20} color={theme.colors.text.muted} />}
          style={{ marginBottom: theme.spacing.lg }}
        />

        <Input
          label="First Name"
          placeholder="Enter your first name"
          value={firstName}
          onChangeText={setFirstName}
          leftIcon={<User size={20} color={theme.colors.text.muted} />}
          style={{ marginBottom: theme.spacing.lg }}
        />

        <Input
          label="Phone"
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          leftIcon={<Phone size={20} color={theme.colors.text.muted} />}
          style={{ marginBottom: theme.spacing.lg }}
        />

        <Input
          variant="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
          style={{ marginBottom: theme.spacing.lg }}
        />

        {/* Test with different states */}
        <Input
          label="Focused Input"
          placeholder="This should show focus state"
          leftIcon={<Mail size={20} color={theme.colors.primary} />}
          style={{ marginBottom: theme.spacing.lg }}
        />

        <Input
          label="Error Input"
          placeholder="This has an error"
          error="This is an error message"
          leftIcon={<Mail size={20} color={theme.colors.error} />}
          style={{ marginBottom: theme.spacing.lg }}
        />

        <Input
          label="Disabled Input"
          placeholder="This is disabled"
          editable={false}
          value="Disabled text"
          leftIcon={<Mail size={20} color={theme.colors.text.muted} />}
          style={{ marginBottom: theme.spacing.lg }}
        />

        {/* Current values display */}
        <View style={{ 
          backgroundColor: theme.colors.surface, 
          padding: theme.spacing.md, 
          borderRadius: theme.borderRadius.md,
          marginTop: theme.spacing.lg 
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Current Values
          </Text>
          <Text variant="body">Email: {email || 'Empty'}</Text>
          <Text variant="body">First Name: {firstName || 'Empty'}</Text>
          <Text variant="body">Phone: {phone || 'Empty'}</Text>
          <Text variant="body">Password: {password ? '*'.repeat(password.length) : 'Empty'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
