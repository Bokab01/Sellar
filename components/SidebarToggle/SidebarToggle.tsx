import React from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Menu, X } from 'lucide-react-native';

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  style?: any;
}

export function SidebarToggle({ isOpen, onToggle, style }: SidebarToggleProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        {
          padding: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          justifyContent: 'center',
          alignItems: 'center',
          width: 40,
          height: 40,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {isOpen ? (
        <X size={20} color={theme.colors.text.primary} />
      ) : (
        <Menu size={20} color={theme.colors.text.primary} />
      )}
    </TouchableOpacity>
  );
}
