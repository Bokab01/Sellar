import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Button,
  LoadingSkeleton,
} from '@/components';
import { testStorageConnection, testImageUpload } from '@/utils/storageTest';

export default function StorageDiagnosticsScreen() {
  const { theme } = useTheme();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    setResults(null);

    try {
      console.log('🔍 Running storage diagnostics...');
      
      // Test 1: Storage Connection
      const connectionTest = await testStorageConnection();
      
      // Test 2: Image Upload
      const uploadTest = await testImageUpload();
      
      setResults({
        connection: connectionTest,
        upload: uploadTest,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      setResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? theme.colors.success : theme.colors.error;
  };

  const getStatusText = (success: boolean) => {
    return success ? '✅ PASS' : '❌ FAIL';
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Storage Diagnostics"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.sm,
          }}
        >
          <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
            Image Upload Diagnostics
          </Text>
          
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.lg, lineHeight: 22 }}>
            This tool helps diagnose image upload issues by testing storage connectivity and permissions.
          </Text>

          <Button
            variant="primary"
            onPress={runDiagnostics}
            disabled={testing}
            fullWidth
            style={{ marginBottom: theme.spacing.lg }}
          >
            {testing ? 'Running Tests...' : 'Run Diagnostics'}
          </Button>

          {testing && (
            <View style={{ gap: theme.spacing.md }}>
              <LoadingSkeleton width="100%" height={40} />
              <LoadingSkeleton width="80%" height={40} />
              <LoadingSkeleton width="90%" height={40} />
            </View>
          )}

          {results && (
            <View style={{ gap: theme.spacing.lg }}>
              <Text variant="h4">Test Results</Text>
              
              {results.error ? (
                <View
                  style={{
                    backgroundColor: theme.colors.error + '10',
                    borderColor: theme.colors.error,
                    borderWidth: 1,
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                  }}
                >
                  <Text variant="body" style={{ color: theme.colors.error }}>
                    ❌ Diagnostics failed: {results.error}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Connection Test */}
                  <View
                    style={{
                      backgroundColor: theme.colors.surfaceVariant,
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                      <Text variant="body" style={{ fontWeight: '600' }}>
                        Storage Connection
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: getStatusColor(results.connection.success),
                          fontWeight: '600',
                        }}
                      >
                        {getStatusText(results.connection.success)}
                      </Text>
                    </View>
                    
                    {results.connection.error && (
                      <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: theme.spacing.sm }}>
                        Error: {results.connection.error}
                      </Text>
                    )}
                    
                    {results.connection.details && (
                      <View style={{ gap: theme.spacing.xs }}>
                        {results.connection.details.buckets && (
                          <Text variant="caption" color="secondary">
                            Available buckets: {results.connection.details.buckets.join(', ')}
                          </Text>
                        )}
                        {results.connection.details.userId && (
                          <Text variant="caption" color="secondary">
                            User ID: {results.connection.details.userId}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Upload Test */}
                  <View
                    style={{
                      backgroundColor: theme.colors.surfaceVariant,
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                      <Text variant="body" style={{ fontWeight: '600' }}>
                        Image Upload Test
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: getStatusColor(results.upload.success),
                          fontWeight: '600',
                        }}
                      >
                        {getStatusText(results.upload.success)}
                      </Text>
                    </View>
                    
                    {results.upload.error && (
                      <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: theme.spacing.sm }}>
                        Error: {results.upload.error}
                      </Text>
                    )}
                    
                    {results.upload.url && (
                      <Text variant="caption" color="secondary">
                        Test URL: {results.upload.url}
                      </Text>
                    )}
                  </View>

                  <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
                    Test completed at {new Date(results.timestamp).toLocaleString()}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: theme.colors.primary + '10',
            borderColor: theme.colors.primary + '30',
            borderWidth: 1,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
          }}
        >
          <Text variant="bodySmall" style={{ color: theme.colors.primary, lineHeight: 20 }}>
            💡 <Text style={{ fontWeight: '600' }}>Troubleshooting Tips:</Text>
            {'\n'}• Check your internet connection
            {'\n'}• Ensure you're logged in
            {'\n'}• Try restarting the app
            {'\n'}• Contact support if issues persist
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
