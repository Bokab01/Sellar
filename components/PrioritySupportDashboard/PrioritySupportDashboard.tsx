import React, { useState, useEffect } from 'react';
import { View, ScrollView, Linking, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { ListItem } from '@/components/ListItem/ListItem';
import { 
  HeadphonesIcon, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  Phone,
  Mail,
  ExternalLink,
  User,
  Calendar,
  Star,
  ArrowRight
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { router } from 'expo-router';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  lastUpdate: string;
  responseTime?: string;
}

interface AccountManager {
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  timezone: string;
  workingHours: string;
}

export function PrioritySupportDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const businessFeatures = useBusinessFeatures();
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountManager] = useState<AccountManager>({
    name: 'Sarah Johnson',
    email: 'sarah.johnson@sellar.com',
    phone: '+233 24 123 4567',
    timezone: 'GMT',
    workingHours: '9:00 AM - 6:00 PM (Mon-Fri)',
  });

  useEffect(() => {
    fetchSupportData();
  }, []);

  const fetchSupportData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Simulate fetching priority support tickets
      const mockTickets: SupportTicket[] = [
        {
          id: '1',
          ticketNumber: 'PRI-2024-001',
          subject: 'Payment processing issue',
          status: 'in_progress',
          priority: 'high',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          lastUpdate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          responseTime: '2 hours',
        },
        {
          id: '2',
          ticketNumber: 'PRI-2024-002',
          subject: 'Analytics data discrepancy',
          status: 'resolved',
          priority: 'medium',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          lastUpdate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          responseTime: '1 hour',
        },
      ];

      setTickets(mockTickets);
    } catch (error) {
      console.error('Error fetching support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return theme.colors.warning;
      case 'in_progress': return theme.colors.primary;
      case 'resolved': return theme.colors.success;
      case 'closed': return theme.colors.text.muted;
      default: return theme.colors.text.muted;
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.success;
      default: return theme.colors.text.muted;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleContactAccountManager = (method: 'email' | 'phone') => {
    if (method === 'email') {
      Linking.openURL(`mailto:${accountManager.email}?subject=Priority Support Inquiry`);
    } else {
      Linking.openURL(`tel:${accountManager.phone}`);
    }
  };

  const createPriorityTicket = () => {
    router.push('/support-tickets');
  };

  if (loading) {
    return (
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <LoadingSkeleton count={3} height={120} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing.lg }}>
      {/* Priority Support Status */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}>
          <View style={{
            backgroundColor: theme.colors.success + '15',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.sm,
            marginRight: theme.spacing.md,
          }}>
            <HeadphonesIcon size={24} color={theme.colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h4">Priority Support</Text>
            <Text variant="bodySmall" color="muted">
              Premium customer support with faster response times
            </Text>
          </View>
          <Badge text="Active" variant="success" />
        </View>

        <View style={{
          backgroundColor: theme.colors.success + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.lg,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
          }}>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              Service Level Agreement (SLA)
            </Text>
            <CheckCircle size={16} color={theme.colors.success} />
          </View>
          
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="bodySmall" color="secondary">
              • First response within 2 hours
            </Text>
            <Text variant="bodySmall" color="secondary">
              • Resolution target: 24-48 hours
            </Text>
            <Text variant="bodySmall" color="secondary">
              • Dedicated account manager
            </Text>
            <Text variant="bodySmall" color="secondary">
              • Direct phone and email support
            </Text>
          </View>
        </View>

        <Button
          variant="primary"
          onPress={createPriorityTicket}
          style={{ width: '100%' }}
        >
          <MessageSquare size={18} color={theme.colors.surface} />
          <Text variant="body" style={{ 
            color: theme.colors.surface,
            marginLeft: theme.spacing.sm,
          }}>
            Create Priority Ticket
          </Text>
        </Button>
      </View>

      {/* Account Manager */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
          Your Account Manager
        </Text>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.colors.primary + '15',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.md,
          }}>
            <User size={28} color={theme.colors.primary} />
          </View>
          
          <View style={{ flex: 1 }}>
            <Text variant="h4" style={{ fontWeight: '600' }}>
              {accountManager.name}
            </Text>
            <Text variant="bodySmall" color="muted">
              Senior Account Manager
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: theme.spacing.xs,
            }}>
              <Clock size={14} color={theme.colors.text.muted} />
              <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                {accountManager.workingHours}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Button
            variant="tertiary"
            onPress={() => handleContactAccountManager('email')}
            style={{ width: '100%' }}
          >
            <Mail size={18} color={theme.colors.primary} />
            <Text variant="body" style={{ 
              color: theme.colors.primary,
              marginLeft: theme.spacing.sm,
              flex: 1,
              textAlign: 'left',
            }}>
              {accountManager.email}
            </Text>
            <ExternalLink size={16} color={theme.colors.text.muted} />
          </Button>

          <Button
            variant="tertiary"
            onPress={() => handleContactAccountManager('phone')}
            style={{ width: '100%' }}
          >
            <Phone size={18} color={theme.colors.primary} />
            <Text variant="body" style={{ 
              color: theme.colors.primary,
              marginLeft: theme.spacing.sm,
              flex: 1,
              textAlign: 'left',
            }}>
              {accountManager.phone}
            </Text>
            <ExternalLink size={16} color={theme.colors.text.muted} />
          </Button>
        </View>
      </View>

      {/* Recent Priority Tickets */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}>
          <Text variant="h4">Recent Tickets</Text>
          <Button
            variant="ghost"
            size="small"
            onPress={() => router.push('/support-tickets')}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
              View All
            </Text>
            <ArrowRight size={14} color={theme.colors.primary} />
          </Button>
        </View>

        {tickets.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {tickets.slice(0, 3).map((ticket, index) => (
              <View
                key={ticket.id}
                style={{
                  paddingVertical: theme.spacing.sm,
                  borderBottomWidth: index < Math.min(tickets.length, 3) - 1 ? 1 : 0,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: theme.spacing.xs,
                }}>
                  <Text variant="body" style={{ fontWeight: '500', flex: 1 }}>
                    {ticket.subject}
                  </Text>
                  <Badge 
                    text={ticket.status.replace('_', ' ')}
                    variant={ticket.status === 'resolved' ? 'success' : ticket.status === 'in_progress' ? 'primary' : 'warning'}
                    size="small"
                  />
                </View>
                
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                }}>
                  <Text variant="caption" color="muted">
                    {ticket.ticketNumber}
                  </Text>
                  <Text variant="caption" color="muted">
                    {formatDate(ticket.createdAt)}
                  </Text>
                  {ticket.responseTime && (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <Clock size={12} color={theme.colors.success} />
                      <Text variant="caption" style={{ 
                        color: theme.colors.success,
                        marginLeft: theme.spacing.xs,
                      }}>
                        Responded in {ticket.responseTime}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
          }}>
            <MessageSquare size={48} color={theme.colors.text.muted} style={{ marginBottom: theme.spacing.md }} />
            <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
              No support tickets yet
            </Text>
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
              Create a priority ticket to get fast support
            </Text>
          </View>
        )}
      </View>

      {/* Support Resources */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
          Quick Resources
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <ListItem
            title="Knowledge Base"
            description="Find answers to common questions"
            leftIcon={<MessageSquare size={20} color={theme.colors.text.primary} />}
            onPress={() => router.push('/knowledge-base')}
            showChevron
          />
          
          <ListItem
            title="Business Guide"
            description="Tips for growing your business"
            leftIcon={<Star size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // Navigate to business guide
            }}
            showChevron
            style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
          />
          
          <ListItem
            title="Schedule Call"
            description="Book a consultation with your account manager"
            leftIcon={<Calendar size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // Navigate to scheduling
            }}
            showChevron
            style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
          />
        </View>
      </View>
    </ScrollView>
  );
}
