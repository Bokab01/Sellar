import React, { useState } from 'react';
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleTicketPress = (ticketId: string) => {
    router.push(`/(tabs)/support-ticket/${ticketId}`);
  };

  const handleTicketCreated = () => {
    setShowCreateModal(false);
    refetch();
  };

  if (loading && tickets.length === 0) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Support Tickets"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <LoadingSkeleton count={3} height={120} />
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
        rightElement={
          <Button
            variant="ghost"
            size="small"
            onPress={() => setShowCreateModal(true)}
            style={{
              paddingHorizontal: theme.spacing.md,
            }}
          >
            <Plus size={20} color={theme.colors.primary} />
          </Button>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Container>
          {/* Header Actions */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.xl,
          }}>
            <View>
              <Text variant="h2" style={{ marginBottom: theme.spacing.xs }}>
                Your Tickets
              </Text>
              <Text variant="body" color="secondary">
                Track your support requests and get help
              </Text>
            </View>

            <Button
              variant="primary"
              size="medium"
              onPress={() => setShowCreateModal(true)}
              style={{
                paddingHorizontal: theme.spacing.lg,
              }}
            >
              <Plus size={18} color={theme.colors.surface} />
              <Text 
                variant="body" 
                style={{ 
                  color: theme.colors.surface, 
                  marginLeft: theme.spacing.sm,
                  fontWeight: '600',
                }}
              >
                New Ticket
              </Text>
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
                size="medium"
                onPress={() => router.push('/(tabs)/knowledge-base')}
                style={{
                  justifyContent: 'flex-start',
                  paddingHorizontal: 0,
                }}
              >
                <Text variant="body" style={{ color: theme.colors.primary }}>
                  📚 Browse Knowledge Base
                </Text>
              </Button>
              
              <Button
                variant="ghost"
                size="medium"
                onPress={() => router.push('/(tabs)/help')}
                style={{
                  justifyContent: 'flex-start',
                  paddingHorizontal: 0,
                }}
              >
                <Text variant="body" style={{ color: theme.colors.primary }}>
                  ❓ View FAQ
                </Text>
              </Button>
              
              <Button
                variant="ghost"
                size="medium"
                onPress={() => router.push('/(tabs)/community')}
                style={{
                  justifyContent: 'flex-start',
                  paddingHorizontal: 0,
                }}
              >
                <Text variant="body" style={{ color: theme.colors.primary }}>
                  👥 Ask Community
                </Text>
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
