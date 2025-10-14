import React, { useState, useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  avoidKeyboard?: boolean; // Whether to push modal up when keyboard appears
  primaryAction?: {
    text: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    variant?: 'primary' | 'destructive';
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
  avoidKeyboard = true,
  primaryAction,
  secondaryAction,
}: AppModalProps) {
  const { theme } = useTheme();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<any>(null);
  const modalTranslateY = useRef(new Animated.Value(0)).current;

  // Listen to keyboard events to get exact keyboard height
  useEffect(() => {
    if (!visible || position !== 'bottom' || !avoidKeyboard) return;

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates.height;
        setKeyboardHeight(keyboardHeight);
        
        // Animate modal up by keyboard height
        Animated.timing(modalTranslateY, {
          toValue: -keyboardHeight,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        
        // Animate modal back to original position
        Animated.timing(modalTranslateY, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [visible, position, avoidKeyboard]);

  const getModalSize = () => {
    if (fullScreen) {
      return {
        width: screenWidth,
        height: screenHeight,
        maxHeight: screenHeight,
      };
    }
    
    // For bottom-positioned modals, use full width and more height
    if (position === 'bottom') {
      return {
        width: screenWidth,
        maxHeight: screenHeight * 0.9, // Increased from 0.8 to 0.9
      };
    }
    
    const maxWidth = screenWidth - (theme.spacing.xl * 2);
    
    switch (size) {
      case 'sm':
        return {
          width: Math.min(320, maxWidth),
          maxHeight: screenHeight * 0.6, // More flexible height
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
          maxHeight: screenHeight * 0.6,
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
      <View style={{ flex: 1 }}>
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
          />
        </TouchableWithoutFeedback>
        
        <View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              padding: (size === 'full' || fullScreen || position === 'bottom') ? 0 : theme.spacing.lg,
            },
            position === 'bottom' && { bottom: 0 },
            position === 'top' && { top: Platform.OS === 'ios' ? 44 : 24 },
            position === 'center' && { 
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
          pointerEvents="box-none"
        >
            <Animated.View
              style={[
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius: (size === 'full' || fullScreen) ? 0 : theme.borderRadius.xl,
                  ...theme.shadows.lg,
                  overflow: 'hidden',
                  alignSelf: position === 'center' ? 'center' : 'stretch',
                  transform: position === 'bottom' ? [{ translateY: modalTranslateY }] : undefined,
                  borderWidth: 1,
                  borderColor: theme.colors.border + '20',
                },
                modalSize,
                position === 'bottom' && {
                  borderTopLeftRadius: theme.borderRadius.xl * 1.5,
                  borderTopRightRadius: theme.borderRadius.xl * 1.5,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                },
              ]}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                  fullScreen ? (
                    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.surface }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: theme.spacing.lg,
                          paddingTop: theme.spacing.sm,
                          paddingBottom: theme.spacing.sm,
                          backgroundColor: theme.colors.surface,
                        }}
                      >
                        {title ? (
                          <Text 
                            variant="h4" 
                            style={{ 
                              flex: 1, 
                              fontWeight: '600',
                              letterSpacing: -0.3,
                              color: theme.colors.text.primary 
                            }}
                          >
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
                              backgroundColor: theme.colors.surfaceVariant + '80',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <X size={18} color={theme.colors.text.secondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </SafeAreaView>
                  ) : (
                    <View
                      style={{
                        paddingHorizontal: theme.spacing.lg,
                        paddingTop: position === 'bottom' ? theme.spacing.md : theme.spacing.lg,
                        paddingBottom: theme.spacing.sm,
                        backgroundColor: theme.colors.surface,
                      }}
                    >
                      {/* Handle bar for bottom sheets */}
                      {position === 'bottom' && (
                        <View
                          style={{
                            alignSelf: 'center',
                            width: 40,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: theme.colors.border,
                            marginBottom: theme.spacing.md,
                          }}
                        />
                      )}
                      
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                      {title ? (
                        <Text 
                          variant="h4" 
                          style={{ 
                            flex: 1, 
                            fontWeight: '600',
                            
                            letterSpacing: -0.3,
                            color: theme.colors.text.primary 
                          }}
                        >
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
                            backgroundColor: theme.colors.surfaceVariant + '80',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={18} color={theme.colors.text.secondary} />
                        </TouchableOpacity>
                      )}
                      </View>
                    </View>
                  )
                )}

              {/* Content */}
              <View
                style={{
                  flex: fullScreen ? 1 : undefined,
                  flexGrow: position === 'bottom' ? 1 : undefined,
                }}
              >
                {children}
              </View>

                {/* Actions */}
                {(primaryAction || secondaryAction) && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: theme.spacing.sm,
                      paddingHorizontal: theme.spacing.lg,
                      paddingTop: theme.spacing.md,
                      paddingBottom: position === 'bottom' ? theme.spacing.lg : theme.spacing.lg,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    {secondaryAction && (
                      <Button
                        variant="secondary"
                        onPress={secondaryAction.onPress}
                        style={{ 
                          flex: 1,
                          height: 44,
                        }}
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
                        style={[
                          { 
                            flex: 1,
                            height: 44,
                          },
                          primaryAction.variant === 'destructive' && {
                            backgroundColor: theme.colors.error,
                          }
                        ]}
                        leftIcon={primaryAction.icon}
                      >
                        {primaryAction.text}
                      </Button>
                    )}
                  </View>
                )}
            </Animated.View>
        </View>
      </View>
    </RNModal>
  );
}

// Export Modal as an alias for AppModal
export const Modal = AppModal;
