import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { 
  HeadphonesIcon, 
  MessageCircle, 
  Phone,
  Mail,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ExternalLink,
  Users,
  Zap,
  BookOpen,
  Video,
  Calendar,
  Star
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Container } from '@/components/Layout';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { supabase } from '@/lib/supabase';

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

interface BusinessSupportProps {
  onTabChange: (tab: 'overview' | 'boost' | 'analytics' | 'support') => void;
}

export const BusinessSupport: React.FC<BusinessSupportProps> = ({ onTabChange }) => {
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSupportTickets();
  }, []);

  const loadSupportTickets = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading support tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = () => {
    router.push('/support-tickets'); // Navigate to support section
  };

  const handleContactSupport = (method: 'phone' | 'email' | 'chat') => {
    switch (method) {
      case 'phone':
        Linking.openURL('tel:+233243887777');
        break;
      case 'email':
        Linking.openURL('mailto:prosupport@sellarghana.com?subject=Sellar Pro Support Request');
        break;
      case 'chat':
        // Open WhatsApp
        const phoneNumber = '233244857777'; // Ghana number without + sign
        const message = 'Hello! I need help with my Sellar Pro account.';
        const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
        
        Linking.openURL(whatsappUrl).catch(() => {
          // Fallback to web WhatsApp if app is not installed
          const webWhatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
          Linking.openURL(webWhatsappUrl);
        });
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return theme.colors.info;
      case 'in_progress':
        return theme.colors.warning;
      case 'resolved':
        return theme.colors.success;
      case 'closed':
        return theme.colors.text.secondary;
      default:
        return theme.colors.text.secondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return theme.colors.destructive;
      case 'high':
        return theme.colors.warning;
      case 'medium':
        return theme.colors.info;
      case 'low':
        return theme.colors.success;
      default:
        return theme.colors.text.secondary;
    }
  };

  return (
    <Container style={{ paddingTop: theme.spacing.lg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Priority Support Hero */}
        <View style={{
          backgroundColor: `linear-gradient(135deg, ${theme.colors.success}15, ${theme.colors.success}05)`,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
          borderWidth: 2,
          borderColor: theme.colors.success + '20',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <View style={{
              backgroundColor: theme.colors.success,
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.md,
              marginRight: theme.spacing.md,
            }}>
              <HeadphonesIcon size={28} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.xs, color: theme.colors.success }}>
                Priority Sellar Pro Support
              </Text>
              <Text variant="body" color="secondary">
                Get expert help with faster response times and dedicated support
              </Text>
            </View>
          </View>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.lg,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text variant="body" style={{ color: theme.colors.success, fontWeight: '700' }}>
                &lt; 2h
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Response Time
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text variant="body" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                08:00 - 20:00
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Working Hours
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text variant="body" style={{ color: theme.colors.warning, fontWeight: '700' }}>
                Support Team  
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Support
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'center', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onPress={() => handleContactSupport('chat')}
              style={{ flex: 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={16} color={theme.colors.success} />
                <Text variant="body" style={{ color: theme.colors.success, marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                  Live Chat
                </Text>
              </View>
            </Button>
            
            <Button
              variant="tertiary"
              onPress={() => handleContactSupport('phone')}
              style={{ flex: 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={16} color={theme.colors.text.secondary} />
                <Text variant="body" style={{ color: theme.colors.text.secondary, marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                  Call Now
                </Text>
              </View>
            </Button>
          </View>
        </View>

        {/* Quick Contact Options */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Contact Support
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            <TouchableOpacity
              onPress={() => handleContactSupport('chat')}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MessageCircle size={20} color={theme.colors.success} />
                  <View style={{ marginLeft: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      Live Chat Support
                    </Text>
                    <Text variant="caption" color="secondary">
                      Instant help via WhatsApp
                    </Text>
                  </View>
                </View>
                <Badge text="Online" variant="success" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleContactSupport('phone')}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Phone size={20} color={theme.colors.primary} />
                  <View style={{ marginLeft: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      Phone Support
                    </Text>
                    <Text variant="caption" color="secondary">
                      0243887777 (08:00 - 20:00)
                    </Text>
                  </View>
                </View>
                <ExternalLink size={16} color={theme.colors.text.secondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleContactSupport('email')}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Mail size={20} color={theme.colors.info} />
                  <View style={{ marginLeft: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      Email Support
                    </Text>
                    <Text variant="caption" color="secondary">
                      prosupport@sellarghana.com
                    </Text>
                  </View>
                </View>
                <ExternalLink size={16} color={theme.colors.text.secondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreateTicket}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Plus size={20} color={theme.colors.warning} />
                  <View style={{ marginLeft: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      Create Support Ticket
                    </Text>
                    <Text variant="caption" color="secondary">
                      For detailed technical issues
                    </Text>
                  </View>
                </View>
                <Text variant="caption" style={{ color: theme.colors.warning }}>
                  New
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Support Tickets */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <Text variant="h4">Recent Support Tickets</Text>
            <TouchableOpacity onPress={handleCreateTicket}>
              <Text variant="body" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={{ padding: theme.spacing.xl, alignItems: 'center' }}>
              <Text variant="body" color="secondary">Loading tickets...</Text>
            </View>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={<FileText size={48} color={theme.colors.text.secondary} />}
              title="No Support Tickets"
              description="You haven't created any support tickets yet. Contact us if you need help!"
              action={{
                text: 'Create Ticket',
                onPress: handleCreateTicket,
              }}
            />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {tickets.map((ticket) => (
                <TouchableOpacity
                  key={ticket.id}
                  onPress={() => router.push(`/support-tickets`)}
                  style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>
                      #{ticket.ticket_number}
                    </Text>
                    <Badge 
                      text={ticket.status.replace('_', ' ')} 
                      variant={ticket.status === 'resolved' ? 'success' : ticket.status === 'in_progress' ? 'warning' : 'info'}
                    />
                  </View>
                  
                  <Text variant="body" style={{ marginBottom: theme.spacing.sm }}>
                    {ticket.subject}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="caption" color="secondary">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </Text>
                    <Badge 
                      text={ticket.priority} 
                      variant={ticket.priority === 'urgent' ? 'error' : ticket.priority === 'high' ? 'warning' : 'info'}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Business Resources */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Sellar Pro Resources
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Sellar Pro Success Guide',
                  'This comprehensive guide will open in your browser. It contains detailed strategies, tips, and best practices to maximize your Pro plan benefits.',
                  [
                    {
                      text: 'Open Guide',
                      onPress: () => Linking.openURL('https://sellarghana.com/pro-success-guide'),
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ]
                );
              }}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <BookOpen size={20} color={theme.colors.primary} />
                  <View style={{ marginLeft: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      Sellar Pro Success Guide
                    </Text>
                    <Text variant="caption" color="secondary">
                      Complete guide to maximizing your Pro benefits
                    </Text>
                  </View>
                </View>
                <ExternalLink size={16} color={theme.colors.text.secondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Sellar Pro Webinars', 'No webinars scheduled at the moment. Check back later for updates.')}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Video size={20} color={theme.colors.success} />
                  <View style={{ marginLeft: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      Sellar Pro Webinars
                    </Text>
                    <Text variant="caption" color="secondary">
                      Weekly training sessions
                    </Text>
                  </View>
                </View>
                <Badge text="Live" variant="success" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/community')}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Users size={20} color={theme.colors.info} />
                  <View style={{ marginLeft: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      Sellar Pro Community
                    </Text>
                    <Text variant="caption" color="secondary">
                      Connect with other sellers
                    </Text>
                  </View>
                </View>
                <Text variant="caption" style={{ color: theme.colors.info }}>
                  5.2k members
                </Text>
              </View>
            </TouchableOpacity>

            {/* TODO: Later, we will add a 1-on-1 consultation booking feature */}
            {/* <TouchableOpacity
              onPress={() => Linking.openURL('https://calendly.com/sellar-pro')}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={20} color={theme.colors.warning} />
                  <View style={{ marginLeft: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      Book 1-on-1 Consultation
                    </Text>
                    <Text variant="caption" color="secondary">
                      Free business strategy session
                    </Text>
                  </View>
                </View>
                <Badge text="Free" variant="success" />
              </View>
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Support Satisfaction */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Support Satisfaction
          </Text>
          
          <View style={{
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            alignItems: 'center',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Star size={24} color={theme.colors.warning} />
              <Text variant="h2" style={{ marginLeft: theme.spacing.sm, color: theme.colors.warning, fontWeight: '700' }}>
                4.9
              </Text>
              <Text variant="body" color="secondary" style={{ marginLeft: theme.spacing.sm }}>
                / 5.0
              </Text>
            </View>
            
            <Text variant="body" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
              <Text style={{ fontWeight: '600' }}>Excellent Support Rating</Text>
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Based on 2,847 Sellar Pro customer reviews
            </Text>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
};
