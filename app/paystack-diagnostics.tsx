import React, { useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { diagnosePaystackIntegration, type DiagnosticResult } from '@/utils/paystackDiagnostics';
import { runPaystackTest } from '@/utils/testPaystackIntegration';
import { runPaystackDebug } from '@/utils/debugPaystackEdgeFunction';
import { testPaystackTransactionInsert, testEnvironmentVariables } from '@/utils/testDatabaseInsert';
import { debugEdgeFunctionResponse, testPaystackSecretKey } from '@/utils/debugEdgeFunctionResponse';
import { testWebhookConfiguration, checkPaystackWebhookConfig, simulateWebhookCall } from '@/utils/webhookTester';
import { supabase } from '@/lib/supabase';
import {
  Text,
  Button,
  Badge,
  LoadingSkeleton,
  AppHeader,
  SafeAreaWrapper,
  Container,
} from '@/components';
import { CheckCircle, AlertCircle, XCircle, Play, RefreshCw } from 'lucide-react-native';

export default function PaystackDiagnosticsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setRunning(true);
    setResults([]);

    try {
      const diagnosticResults = await diagnosePaystackIntegration();
      setResults(diagnosticResults);
    } catch (error: any) {
      Alert.alert('Diagnostic Error', error.message);
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle size={20} color={theme.colors.success} />;
      case 'warning':
        return <AlertCircle size={20} color={theme.colors.warning} />;
      case 'fail':
        return <XCircle size={20} color={theme.colors.destructive} />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge text="PASS" variant="success" size="sm" />;
      case 'warning':
        return <Badge text="WARN" variant="warning" size="sm" />;
      case 'fail':
        return <Badge text="FAIL" variant="error" size="sm" />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Paystack Diagnostics"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            key="refresh"
            variant="ghost"
            size="sm"
            onPress={runDiagnostics}
            loading={running}
            disabled={running}
          >
            <RefreshCw size={20} color={theme.colors.text.primary} />
          </Button>
        ]}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={running}
            onRefresh={runDiagnostics}
            colors={[theme.colors.primary]}
          />
        }
      >
        <Container>
          {/* Header Section */}
          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
            }}
          >
            <Text variant="h2" style={{ marginBottom: theme.spacing.sm }}>
              💡 Paystack Integration Test
            </Text>
            <Text variant="body" color="secondary">
              This diagnostic checks your Paystack integration setup including environment variables, 
              database connectivity, and Edge Function deployment.
            </Text>
          </View>

          {/* User Info */}
          {user && (
            <View
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
              }}
            >
              <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
                👤 Current User
              </Text>
              <Text variant="body" color="secondary">
                {user.email}
              </Text>
              <Text variant="bodySmall" color="muted">
                ID: {user.id.substring(0, 8)}...
              </Text>
            </View>
          )}

          {/* Run Diagnostics Button */}
          {results.length === 0 && !running && (
            <View style={{ marginBottom: theme.spacing.lg }}>
              <Button
                onPress={runDiagnostics}
                icon={<Play size={20} color={theme.colors.primaryForeground} />}
                fullWidth
              >
                Run Diagnostics
              </Button>
            </View>
          )}

          {/* Loading State */}
          {running && (
            <View style={{ marginBottom: theme.spacing.lg }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                🔄 Running Diagnostics...
              </Text>
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingSkeleton
                  key={index}
                  width="100%"
                  height={80}
                  style={{ marginBottom: theme.spacing.md }}
                />
              ))}
            </View>
          )}

          {/* Results Section */}
          {results.length > 0 && (
            <View style={{ marginBottom: theme.spacing.lg }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
                📊 Diagnostic Results
              </Text>

              {results.map((result, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.lg,
                    marginBottom: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: result.status === 'pass' 
                      ? theme.colors.success + '30'
                      : result.status === 'warning'
                      ? theme.colors.warning + '30'
                      : theme.colors.destructive + '30',
                  }}
                >
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: theme.spacing.sm 
                  }}>
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      gap: theme.spacing.sm, 
                      flex: 1 
                    }}>
                      {getStatusIcon(result.status)}
                      <Text variant="h4" style={{ flex: 1 }}>
                        {result.test}
                      </Text>
                    </View>
                    {getStatusBadge(result.status)}
                  </View>

                  <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                    {result.message}
                  </Text>

                  {result.details && result.status !== 'pass' && (
                    <View
                      style={{
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.md,
                      }}
                    >
                      <Text variant="caption" color="muted" style={{ fontFamily: 'monospace' }}>
                        {typeof result.details === 'string' 
                          ? result.details 
                          : JSON.stringify(result.details, null, 2)
                        }
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Summary */}
              <View
                style={{
                  backgroundColor: theme.colors.primary + '10',
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  marginTop: theme.spacing.md,
                }}
              >
                <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
                  📈 Summary
                </Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text variant="h2" style={{ color: theme.colors.success, marginBottom: theme.spacing.xs }}>
                      {results.filter(r => r.status === 'pass').length}
                    </Text>
                    <Text variant="body" color="muted">Passed</Text>
                  </View>
                  
                  <View style={{ alignItems: 'center' }}>
                    <Text variant="h2" style={{ color: theme.colors.warning, marginBottom: theme.spacing.xs }}>
                      {results.filter(r => r.status === 'warning').length}
                    </Text>
                    <Text variant="body" color="muted">Warnings</Text>
                  </View>
                  
                  <View style={{ alignItems: 'center' }}>
                    <Text variant="h2" style={{ color: theme.colors.destructive, marginBottom: theme.spacing.xs }}>
                      {results.filter(r => r.status === 'fail').length}
                    </Text>
                    <Text variant="body" color="muted">Failed</Text>
                  </View>
                </View>

                {/* Overall Status */}
                <View style={{ marginTop: theme.spacing.lg, alignItems: 'center' }}>
                  {results.filter(r => r.status === 'fail').length === 0 && 
                   results.filter(r => r.status === 'warning').length === 0 ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text variant="h3" style={{ color: theme.colors.success, marginBottom: theme.spacing.xs }}>
                        🎉 All Tests Passed!
                      </Text>
                      <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                        Your Paystack integration is ready to use.
                      </Text>
                    </View>
                  ) : results.filter(r => r.status === 'fail').length > 0 ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text variant="h3" style={{ color: theme.colors.destructive, marginBottom: theme.spacing.xs }}>
                        🚨 Issues Found
                      </Text>
                      <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                        Please fix the failed tests before using Paystack.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <Text variant="h3" style={{ color: theme.colors.warning, marginBottom: theme.spacing.xs }}>
                        ⚠️ Warnings Found
                      </Text>
                      <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                        Paystack may work but with limitations.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
                <Button
                  variant="secondary"
                  onPress={runDiagnostics}
                  loading={running}
                  icon={<RefreshCw size={20} color={theme.colors.text.primary} />}
                  fullWidth
                >
                  Run Diagnostics Again
                </Button>
                
                <Button
                  variant="primary"
                  onPress={async () => {
                    const result = await runPaystackTest();
                    if (result.success) {
                      Alert.alert('Success!', 'Paystack integration is working correctly!');
                    } else {
                      Alert.alert('Test Failed', result.error || 'Unknown error');
                    }
                  }}
                  fullWidth
                >
                  Test Payment Integration
                </Button>
                
                <Button
                  variant="tertiary"
                  onPress={async () => {
                    const result = await runPaystackDebug();
                    const logs = result.logs.join('\n');
                    
                    Alert.alert(
                      result.success ? 'Debug Success' : 'Debug Results', 
                      logs,
                      [{ text: 'OK' }],
                      { userInterfaceStyle: 'light' }
                    );
                  }}
                  fullWidth
                >
                  🔍 Deep Debug Analysis
                </Button>

                <Button
                  variant="secondary"
                  onPress={async () => {
                    const result = await debugEdgeFunctionResponse();
                    
                    let message = '';
                    if (result.success) {
                      message = `✅ Success!\nData: ${JSON.stringify(result.data, null, 2)}`;
                    } else {
                      message = `❌ Failed (Status: ${result.status})\nError: ${result.error}\nDetails: ${JSON.stringify(result.details, null, 2)}`;
                    }
                    
                    Alert.alert(
                      'Edge Function Response Debug',
                      message,
                      [{ text: 'OK' }],
                      { userInterfaceStyle: 'light' }
                    );
                  }}
                  fullWidth
                >
                  📡 Debug Edge Function Response
                </Button>

                <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={async () => {
                      const result = await testPaystackTransactionInsert();
                      Alert.alert(
                        result.success ? 'Database Test Passed' : 'Database Test Failed',
                        result.success 
                          ? 'Database insert/delete works correctly'
                          : `Error: ${result.error}`,
                        [{ text: 'OK' }]
                      );
                    }}
                    style={{ flex: 1 }}
                  >
                    🗄️ Test DB
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={async () => {
                      const result = await testEnvironmentVariables();
                      Alert.alert(
                        'Environment Test',
                        result.success 
                          ? 'Environment variables seem OK'
                          : `Issue found: ${result.error}`,
                        [{ text: 'OK' }]
                      );
                    }}
                    style={{ flex: 1 }}
                  >
                    🔧 Test Env
                  </Button>
                </View>
              </View>
            </View>
          )}

          {/* Webhook Testing Section */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
              🔗 Webhook Testing
            </Text>
            
            <Button
              variant="secondary"
              onPress={async () => {
                const result = await testWebhookConfiguration();
                Alert.alert(
                  'Webhook Status',
                  result.message,
                  [
                    { text: 'Details', onPress: () => console.log('Webhook details:', result.details) },
                    { text: 'OK' }
                  ]
                );
              }}
              fullWidth
              style={{ marginBottom: theme.spacing.sm }}
            >
              🔍 Check Webhook Status
            </Button>
            
            <Button
              variant="secondary"
              onPress={async () => {
                const result = await checkPaystackWebhookConfig();
                Alert.alert(
                  'Webhook Configuration',
                  result.message,
                  [
                    { 
                      text: 'Show Instructions', 
                      onPress: () => {
                        const instructions = result.details?.instructions?.join('\n\n') || 'No instructions available';
                        Alert.alert('Setup Instructions', instructions);
                      }
                    },
                    { text: 'OK' }
                  ]
                );
              }}
              fullWidth
              style={{ marginBottom: theme.spacing.sm }}
            >
              ⚙️ Webhook Setup Guide
            </Button>
            
            <Button
              variant="tertiary"
              onPress={async () => {
                // Get the most recent transaction reference
                const { data: transactions } = await supabase
                  .from('paystack_transactions')
                  .select('reference')
                  .order('created_at', { ascending: false })
                  .limit(1);
                
                if (transactions && transactions.length > 0) {
                  const reference = transactions[0].reference;
                  const result = await simulateWebhookCall(reference);
                  Alert.alert(
                    'Webhook Simulation',
                    result.message,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert('No Transactions', 'No recent transactions found to test with');
                }
              }}
              fullWidth
            >
              🧪 Simulate Webhook Call
            </Button>
          </View>

          {/* Instructions */}
          {!running && results.length === 0 && (
            <View
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                alignItems: 'center',
              }}
            >
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                🚀 Ready to Test
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Click &quot;Run Diagnostics&quot; to test your Paystack integration setup and identify any issues.
              </Text>
            </View>
          )}
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
