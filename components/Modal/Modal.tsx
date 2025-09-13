import React from 'react';
import {
  Modal as RNModal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { X } from 'lucide-react-native';

type ModalSize = 'sm' | 'md' | 'lg' | 'full';
type ModalPosition = 'center' | 'bottom' | 'top';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  position?: ModalPosition;
  showCloseButton?: boolean;
  dismissOnBackdrop?: boolean;
  fullScreen?: boolean;
  primaryAction?: {
    text: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    text: string;
    onPress: () => void;
  };
}

export function AppModal({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  position = 'center',
  showCloseButton = true,
  dismissOnBackdrop = true,
  fullScreen = false,
  primaryAction,
  secondaryAction,
}: AppModalProps) {
  const { theme } = useTheme();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const getModalSize = () => {
    if (fullScreen) {
      return {
        width: screenWidth,
        height: screenHeight,
        maxHeight: screenHeight,
      };
    }
    
    // For bottom-positioned modals, use full width
    if (position === 'bottom') {
      return {
        width: screenWidth,
        maxHeight: screenHeight * 0.8,
      };
    }
    
    const maxWidth = screenWidth - (theme.spacing.xl * 2);
    
    switch (size) {
      case 'sm':
        return {
          width: Math.min(320, maxWidth),
          maxHeight: 280,
        };
      case 'lg':
        return {
          width: Math.min(600, maxWidth),
          maxHeight: screenHeight * 0.9,
        };
      case 'full':
        return {
          width: screenWidth,
          height: screenHeight,
          maxHeight: screenHeight,
        };
      case 'md':
      default:
        return {
          width: Math.min(480, maxWidth),
          maxHeight: screenHeight * 0.4,
        };
    }
  };

  const getModalPosition = () => {
    const modalSize = getModalSize();
    
    switch (position) {
      case 'top':
        return {
          justifyContent: 'flex-start' as const,
          paddingTop: Platform.OS === 'ios' ? 44 : 24,
        };
      case 'bottom':
        return {
          justifyContent: 'flex-end' as const,
        };
      case 'center':
      default:
        return {
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        };
    }
  };

  const modalSize = getModalSize();
  const positionStyles = getModalPosition();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={position === 'bottom' ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={dismissOnBackdrop ? onClose : undefined}>
        <View
          style={[
            {
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: (size === 'full' || fullScreen || position === 'bottom') ? 0 : theme.spacing.lg,
            },
            positionStyles,
          ]}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius: (size === 'full' || fullScreen) ? 0 : theme.borderRadius.lg,
                  ...theme.shadows.lg,
                  overflow: 'hidden',
                  alignSelf: position === 'center' ? 'center' : 'stretch',
                },
                modalSize,
                position === 'bottom' && {
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                },
              ]}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: theme.spacing.lg,
                    paddingTop: theme.spacing.lg,
                    paddingBottom: theme.spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  {title ? (
                    <Text variant="h3" style={{ flex: 1, fontWeight: '600' }}>
                      {title}
                    </Text>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}

                  {showCloseButton && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: theme.colors.surfaceVariant,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={18} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Content */}
              <View
                style={{
                  padding: fullScreen ? 0 : theme.spacing.lg,
                  flex: fullScreen ? 1 : undefined,
                }}
              >
                {children}
              </View>

              {/* Actions */}
              {(primaryAction || secondaryAction) && (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: theme.spacing.md,
                    padding: theme.spacing.lg,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  {secondaryAction && (
                    <Button
                      variant="tertiary"
                      onPress={secondaryAction.onPress}
                      style={{ flex: 1 }}
                    >
                      {secondaryAction.text}
                    </Button>
                  )}
                  
                  {primaryAction && (
                    <Button
                      variant="primary"
                      onPress={primaryAction.onPress}
                      loading={primaryAction.loading}
                      disabled={primaryAction.disabled}
                      style={{ flex: 1 }}
                      leftIcon={primaryAction.icon}
                    >
                      {primaryAction.text}
                    </Button>
                  )}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

// Export Modal as an alias for AppModal
export const Modal = AppModal;
