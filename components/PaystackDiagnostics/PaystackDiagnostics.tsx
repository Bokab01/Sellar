import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { diagnosePaystackIntegration, type DiagnosticResult } from '@/utils/paystackDiagnostics';
import {
  Text,
  Button,
  Badge,
  LoadingSkeleton,
  AppModal,
} from '@/components';
import { CheckCircle, AlertCircle, XCircle, Play } from 'lucide-react-native';

interface PaystackDiagnosticsProps {
  visible: boolean;
  onClose: () => void;
}

export function PaystackDiagnostics({ visible, onClose }: PaystackDiagnosticsProps) {
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
        return <CheckCircle size={16} color={theme.colors.success} />;
      case 'warning':
        return <AlertCircle size={16} color={theme.colors.warning} />;
      case 'fail':
        return <XCircle size={16} color={theme.colors.destructive} />;
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
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Paystack Diagnostics"
      size="lg"
      primaryAction={{
        text: running ? 'Running...' : 'Run Diagnostics',
        onPress: runDiagnostics,
        loading: running,
        icon: <Play size={16} color={theme.colors.primaryForeground} />,
      }}
      secondaryAction={{
        text: 'Close',
        onPress: onClose,
      }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView 
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ 
            padding: theme.spacing.md,
            paddingBottom: theme.spacing.xl 
          }}
        >
        <View style={{ gap: theme.spacing.md }}>
          {/* Info Section */}
          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
              💡 About This Test
            </Text>
            <Text variant="bodySmall" color="secondary">
              This diagnostic checks your Paystack integration setup including environment variables, 
              database connectivity, and Edge Function deployment.
            </Text>
          </View>

          {/* User Info */}
          {user && (
            <View
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
              }}
            >
              <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                👤 Current User
              </Text>
              <Text variant="bodySmall" color="secondary">
                {user.email} ({user.id.substring(0, 8)}...)
              </Text>
            </View>
          )}

          {/* Results Section */}
          {running && (
            <View style={{ gap: theme.spacing.md }}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                🔄 Running Diagnostics...
              </Text>
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingSkeleton
                  key={index}
                  width="100%"
                  height={60}
                  style={{ marginBottom: theme.spacing.sm }}
                />
              ))}
            </View>
          )}

          {results.length > 0 && (
            <View style={{ gap: theme.spacing.md }}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                📊 Diagnostic Results
              </Text>

              {results.map((result, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: result.status === 'pass' 
                      ? theme.colors.success + '30'
                      : result.status === 'warning'
                      ? theme.colors.warning + '30'
                      : theme.colors.destructive + '30',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}>
                      {getStatusIcon(result.status)}
                      <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>
                        {result.test}
                      </Text>
                    </View>
                    {getStatusBadge(result.status)}
                  </View>

                  <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                    {result.message}
                  </Text>

                  {result.details && result.status !== 'pass' && (
                    <View
                      style={{
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.sm,
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
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                }}
              >
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                  📈 Summary
                </Text>
                
                <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text variant="h4" style={{ color: theme.colors.success }}>
                      {results.filter(r => r.status === 'pass').length}
                    </Text>
                    <Text variant="caption" color="muted">Passed</Text>
                  </View>
                  
                  <View style={{ alignItems: 'center' }}>
                    <Text variant="h4" style={{ color: theme.colors.warning }}>
                      {results.filter(r => r.status === 'warning').length}
                    </Text>
                    <Text variant="caption" color="muted">Warnings</Text>
                  </View>
                  
                  <View style={{ alignItems: 'center' }}>
                    <Text variant="h4" style={{ color: theme.colors.destructive }}>
                      {results.filter(r => r.status === 'fail').length}
                    </Text>
                    <Text variant="caption" color="muted">Failed</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Instructions */}
          {!running && results.length === 0 && (
            <View
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                alignItems: 'center',
              }}
            >
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Click &quot;Run Diagnostics&quot; to test your Paystack integration setup.
              </Text>
            </View>
          )}
        </View>
        </ScrollView>
      </View>
    </AppModal>
  );
}
