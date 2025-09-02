import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Badge } from '@/components/Badge/Badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';

interface OfferExpiryTimerProps {
  expiresAt: string;
  onExpiry?: () => void;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'badge';
  style?: any;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

export function OfferExpiryTimer({
  expiresAt,
  onExpiry,
  showIcon = true,
  variant = 'default',
  style,
}: OfferExpiryTimerProps) {
  const { theme } = useTheme();
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

  const calculateTimeRemaining = (): TimeRemaining => {
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isExpired: true,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      totalMs: diff,
      isExpired: false,
    };
  };

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Call onExpiry when timer reaches zero
      if (remaining.isExpired && onExpiry) {
        onExpiry();
      }
    };

    // Initial calculation
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpiry]);

  if (!timeRemaining) {
    return null;
  }

  const getUrgencyLevel = (): 'low' | 'medium' | 'high' | 'expired' => {
    if (timeRemaining.isExpired) return 'expired';
    
    const totalHours = timeRemaining.totalMs / (1000 * 60 * 60);
    
    if (totalHours <= 1) return 'high';
    if (totalHours <= 6) return 'medium';
    return 'low';
  };

  const getUrgencyColor = (urgency: ReturnType<typeof getUrgencyLevel>) => {
    switch (urgency) {
      case 'expired':
        return theme.colors.text.muted;
      case 'high':
        return theme.colors.error;
      case 'medium':
        return theme.colors.warning;
      case 'low':
        return theme.colors.success;
      default:
        return theme.colors.text.secondary;
    }
  };

  const getUrgencyIcon = (urgency: ReturnType<typeof getUrgencyLevel>) => {
    switch (urgency) {
      case 'expired':
        return <CheckCircle size={14} color={theme.colors.text.muted} />;
      case 'high':
        return <AlertTriangle size={14} color={theme.colors.error} />;
      case 'medium':
      case 'low':
        return <Clock size={14} color={getUrgencyColor(urgency)} />;
      default:
        return <Clock size={14} color={theme.colors.text.secondary} />;
    }
  };

  const formatTimeDisplay = (): string => {
    if (timeRemaining.isExpired) {
      return 'Expired';
    }

    const { days, hours, minutes, seconds } = timeRemaining;

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const urgency = getUrgencyLevel();
  const urgencyColor = getUrgencyColor(urgency);
  const timeDisplay = formatTimeDisplay();

  // Badge variant
  if (variant === 'badge') {
    const badgeVariant = urgency === 'expired' ? 'neutral' : 
                        urgency === 'high' ? 'error' : 
                        urgency === 'medium' ? 'warning' : 'success';

    return (
      <Badge
        text={timeDisplay}
        variant={badgeVariant}
        size="sm"
        style={style}
      />
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <View style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
        },
        style,
      ]}>
        {showIcon && getUrgencyIcon(urgency)}
        <Text 
          variant="caption" 
          style={{ 
            color: urgencyColor,
            fontWeight: urgency === 'high' ? '600' : '500',
          }}
        >
          {timeDisplay}
        </Text>
      </View>
    );
  }

  // Default variant
  return (
    <View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.sm,
        backgroundColor: urgency === 'expired' ? theme.colors.surface :
                         urgency === 'high' ? theme.colors.error + '15' :
                         urgency === 'medium' ? theme.colors.warning + '15' :
                         theme.colors.success + '15',
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: urgency === 'expired' ? theme.colors.border :
                     urgency === 'high' ? theme.colors.error + '30' :
                     urgency === 'medium' ? theme.colors.warning + '30' :
                     theme.colors.success + '30',
      },
      style,
    ]}>
      {showIcon && getUrgencyIcon(urgency)}
      
      <View style={{ flex: 1 }}>
        <Text 
          variant="body" 
          style={{ 
            color: urgencyColor,
            fontWeight: '600',
          }}
        >
          {timeRemaining.isExpired ? 'Offer Expired' : 'Expires in'}
        </Text>
        
        {!timeRemaining.isExpired && (
          <Text 
            variant="h3" 
            style={{ 
              color: urgencyColor,
              fontWeight: '700',
            }}
          >
            {timeDisplay}
          </Text>
        )}
      </View>

      {/* Urgency indicator */}
      {urgency === 'high' && !timeRemaining.isExpired && (
        <View style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.colors.error,
        }} />
      )}
    </View>
  );
}

// Hook for managing multiple offer timers
export function useOfferTimer(expiresAt: string) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = (): TimeRemaining => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalMs: 0,
          isExpired: true,
        };
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return {
        days,
        hours,
        minutes,
        seconds,
        totalMs: diff,
        isExpired: false,
      };
    };

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
      setIsExpired(remaining.isExpired);
    };

    // Initial calculation
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return {
    timeRemaining,
    isExpired,
    formatTime: (format: 'short' | 'long' = 'short') => {
      if (!timeRemaining || timeRemaining.isExpired) return 'Expired';

      const { days, hours, minutes, seconds } = timeRemaining;

      if (format === 'long') {
        const parts = [];
        if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
        
        return parts.join(', ');
      }

      // Short format
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    },
  };
}
