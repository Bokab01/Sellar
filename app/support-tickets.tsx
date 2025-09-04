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
  CreateTicketModal,
} from '@/components';
import { Plus, Ticket } from 'lucide-react-native';
import { useSupportTickets } from '@/hooks/useSupport';

export default function SupportTicketsScreen() {
  const { theme } = useTheme();
  const { tickets, loading, error, refetch } = useSupportTickets();
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const handleTicketCreated = useCallback(() => {
    setShowCreateModal(false);
    refetch();
  }, [refetch]);

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
          <View style={styles.loadingContainer}>
            <LoadingSkeleton height={120} />
            <LoadingSkeleton height={120} />
            <LoadingSkeleton height={120} />
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
            onPress={() => setShowCreateModal(true)}
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

            <Button
              variant="primary"
              size="md"
              onPress={() => setShowCreateModal(true)}
              style={styles.newTicketButton}
              icon={<Plus size={18} color={theme.colors.surface} />}
            >
              New Ticket
            </Button>
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
                onPress: () => setShowCreateModal(true),
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
                onPress={() => router.push('/knowledge-base')}
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

      {/* Create Ticket Modal */}
      <CreateTicketModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTicketCreated={handleTicketCreated}
      />
    </SafeAreaWrapper>
  );
}
