import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  EmptyState,
  LoadingSkeleton,
  SupportTicketCard,
} from '@/components';
import { Plus, Ticket } from 'lucide-react-native';
import { useSupportTickets } from '@/hooks/useSupport';

export default function SupportTicketsScreen() {
  const { theme } = useTheme();
  const { tickets, loading, error, refetch } = useSupportTickets();
  const [refreshing, setRefreshing] = useState(false);


  // Memoize callback functions to prevent re-renders
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleTicketPress = useCallback((ticketId: string) => {
    // Navigate to ticket details - route will be created later
    console.log('Navigate to ticket:', ticketId);
  }, []);

  // Memoize styles to prevent re-renders
  const styles = useMemo(() => ({
    loadingContainer: { gap: theme.spacing.md },
    scrollContentContainer: { paddingBottom: theme.spacing.xl },
    headerButton: { paddingHorizontal: theme.spacing.md },
    headerActions: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: { marginBottom: theme.spacing.xs },
    newTicketButton: { paddingHorizontal: theme.spacing.lg },
    errorContainer: {
      backgroundColor: theme.colors.error + '10',
      borderColor: theme.colors.error + '30',
      borderWidth: 1,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    ticketsContainer: { gap: theme.spacing.md },
  }), [theme]);

  if (loading && tickets.length === 0) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Support Tickets"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          {/* Header Actions Skeleton */}
          <View style={styles.headerActions}>
            <LoadingSkeleton width={120} height={24} />
            <LoadingSkeleton width={100} height={40} borderRadius={theme.borderRadius.lg} />
          </View>

          {/* Support Ticket Cards Skeleton */}
          <View style={styles.ticketsContainer}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  marginBottom: theme.spacing.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  ...theme.shadows.sm,
                }}
              >
                {/* Header Section */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: theme.spacing.md,
                }}>
                  <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                    {/* Ticket Number and Priority */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: theme.spacing.xs,
                    }}>
                      <LoadingSkeleton width={80} height={14} style={{ marginRight: theme.spacing.sm }} />
                      <LoadingSkeleton width={60} height={20} borderRadius={10} />
                    </View>
                    
                    {/* Subject */}
                    <LoadingSkeleton width="90%" height={16} style={{ marginBottom: theme.spacing.xs }} />
                    <LoadingSkeleton width="70%" height={16} style={{ marginBottom: theme.spacing.xs }} />
                    
                    {/* Description */}
                    <LoadingSkeleton width="100%" height={14} style={{ marginBottom: theme.spacing.xs }} />
                    <LoadingSkeleton width="85%" height={14} />
                  </View>

                  {/* Arrow Icon */}
                  <LoadingSkeleton width={20} height={20} />
                </View>

                {/* Footer Section */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <LoadingSkeleton width={16} height={16} style={{ marginRight: theme.spacing.xs }} />
                    <LoadingSkeleton width={80} height={14} />
                  </View>
                  <LoadingSkeleton width={60} height={14} />
                </View>

                {/* Category Badge */}
                <View style={{
                  position: 'absolute',
                  top: theme.spacing.sm,
                  right: theme.spacing.sm,
                }}>
                  <LoadingSkeleton width={50} height={20} borderRadius={10} />
                </View>
              </View>
            ))}
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Support Tickets"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            key="create"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/create-support-ticket')}
            style={styles.headerButton}
          >
            <Plus size={20} color={theme.colors.primary} />
          </Button>
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Container>
          {/* Header Actions */}
          <View style={styles.headerActions}>
            <View>
              <Text variant="h2" style={styles.sectionTitle}>
                Your Tickets
              </Text>
              <Text variant="body" color="secondary">
                Track your support requests and get help
              </Text>
            </View>

          </View>

          {/* Error State */}
          {error && (
            <View
              style={{
                backgroundColor: theme.colors.error + '10',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
              }}
            >
              <Text variant="body" style={{ color: theme.colors.error, textAlign: 'center' }}>
                {error}
              </Text>
            </View>
          )}

          {/* Tickets List */}
          {tickets.length > 0 ? (
            <View>
              {tickets.map((ticket) => (
                <SupportTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onPress={() => handleTicketPress(ticket.id)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Ticket size={48} color={theme.colors.text.muted} />}
              title="No Support Tickets"
              description="You haven't created any support tickets yet. Create one to get help with any issues."
              action={{
                text: 'Create First Ticket',
                onPress: () => router.push('/create-support-ticket'),
              }}
            />
          )}

          {/* Quick Help Links */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginTop: theme.spacing.xl,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Need Quick Help?
            </Text>
            
            <View style={{ gap: theme.spacing.sm }}>
              <Button
                variant="ghost"
                size="md"
                onPress={() => router.push('/help')}
                style={{
                  justifyContent: 'flex-start',
                  paddingHorizontal: 0,
                }}
              >
                📚 Browse Knowledge Base
              </Button>
              
              <Button
                variant="ghost"
                size="md"
                onPress={() => router.push('/help')}
                style={{
                  justifyContent: 'flex-start',
                  paddingHorizontal: 0,
                }}
              >
                ❓ View FAQ
              </Button>
              
              <Button
                variant="ghost"
                size="md"
                onPress={() => router.push('/(tabs)/community')}
                style={{
                  justifyContent: 'flex-start',
                  paddingHorizontal: 0,
                }}
              >
                👥 Ask Community
              </Button>
            </View>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
