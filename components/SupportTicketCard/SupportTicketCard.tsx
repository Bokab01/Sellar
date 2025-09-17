import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Badge } from '@/components';
import { 
  Clock, 
  MessageCircle, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  ArrowRight
} from 'lucide-react-native';
import { SupportTicket } from '@/hooks/useSupport';

interface SupportTicketCardProps {
  ticket: SupportTicket;
  onPress?: () => void;
}

export function SupportTicketCard({ ticket, onPress }: SupportTicketCardProps) {
  const { theme } = useTheme();

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'open':
      case 'in_progress':
        return theme.colors.warning;
      case 'resolved':
      case 'closed':
        return theme.colors.success;
      case 'escalated':
        return theme.colors.error;
      default:
        return theme.colors.text.muted;
    }
  };

  const getStatusIcon = () => {
    const color = getStatusColor();
    const size = 16;

    switch (ticket.status) {
      case 'open':
        return <Clock size={size} color={color} />;
      case 'in_progress':
        return <MessageCircle size={size} color={color} />;
      case 'resolved':
      case 'closed':
        return <CheckCircle size={size} color={color} />;
      case 'escalated':
        return <AlertCircle size={size} color={color} />;
      default:
        return <XCircle size={size} color={color} />;
    }
  };

  const getStatusText = () => {
    switch (ticket.status) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'waiting_user':
        return 'Waiting for You';
      case 'waiting_internal':
        return 'Waiting for Support';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      case 'escalated':
        return 'Escalated';
      default:
        return ticket.status;
    }
  };

  const getPriorityBadge = () => {
    const variants = {
      low: 'default' as const,
      medium: 'warning' as const,
      high: 'error' as const,
      urgent: 'error' as const,
    };

    return (
      <Badge 
        text={ticket.priority.toUpperCase()} 
        variant={variants[ticket.priority]} 
        size="small"
      />
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffInHours < 168) { // 7 days
        return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      }}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
      }}>
        <View style={{ flex: 1, marginRight: theme.spacing.md }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.xs,
          }}>
            <Text variant="bodySmall" color="muted" style={{ marginRight: theme.spacing.sm }}>
              {ticket.ticket_number}
            </Text>
            {getPriorityBadge()}
          </View>
          
          <Text 
            variant="body" 
            style={{ 
              fontWeight: '600',
              marginBottom: theme.spacing.xs,
            }}
            numberOfLines={2}
          >
            {ticket.subject}
          </Text>
          
          <Text variant="bodySmall" color="secondary" numberOfLines={2}>
            {ticket.description}
          </Text>
        </View>

        <ArrowRight size={20} color={theme.colors.text.muted} />
      </View>

      {/* Footer */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          {getStatusIcon()}
          <Text 
            variant="bodySmall" 
            style={{ 
              marginLeft: theme.spacing.xs,
              color: getStatusColor(),
              fontWeight: '500',
            }}
          >
            {getStatusText()}
          </Text>
        </View>

        <Text variant="bodySmall" color="muted">
          {formatDate(ticket.last_message_at || ticket.created_at)}
        </Text>
      </View>

      {/* Category */}
      <View style={{
        position: 'absolute',
        top: theme.spacing.sm,
        right: theme.spacing.sm,
      }}>
        <Badge 
          text={ticket.category.replace('_', ' ').toUpperCase()} 
          variant="default" 
          size="small"
        />
      </View>
    </TouchableOpacity>
  );
}
