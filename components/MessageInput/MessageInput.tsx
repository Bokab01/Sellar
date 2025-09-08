import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { usePresence } from '@/hooks/usePresence';
import { Send, Paperclip, Camera, Mic, Image as ImageIcon } from 'lucide-react-native';

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  onCamera?: () => void;
  onVoice?: () => void;
  onImagePicker?: () => void;
  placeholder?: string;
  disabled?: boolean;
  conversationId?: string;
  style?: any;
}

export function MessageInput({
  value,
  onChangeText,
  onSend,
  onAttach,
  onCamera,
  onVoice,
  onImagePicker,
  placeholder = "Type a message...",
  disabled = false,
  conversationId,
  style,
}: MessageInputProps) {
  const { theme } = useTheme();
  const { setTypingStatus } = usePresence();
  const [isFocused, setIsFocused] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSend = value.trim().length > 0 && !disabled;

  // Handle typing indicators
  const handleTextChange = (text: string) => {
    onChangeText(text);

    if (!conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status
    if (text.length > 0) {
      setTypingStatus(conversationId, true);
      
      // Clear typing status after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(conversationId, false);
      }, 3000);
    } else {
      setTypingStatus(conversationId, false);
    }
  };

  // Clear typing status when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (conversationId) {
        setTypingStatus(conversationId, false);
      }
    };
  }, [conversationId]);

  const handleSend = () => {
    if (!canSend) return;
    
    // Clear typing status immediately when sending
    if (conversationId) {
      setTypingStatus(conversationId, false);
    }
    
    onSend();
  };

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.sm,
        }}
      >
        {/* Attachment Actions */}
        <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
          {onAttach && (
            <Button
              variant="icon"
              icon={<Paperclip size={20} color={theme.colors.text.muted} />}
              onPress={onAttach}
              disabled={disabled}
              style={{ width: 36, height: 36 }}
            />
          )}

          {onCamera && (
            <Button
              variant="icon"
              icon={<Camera size={20} color={theme.colors.text.muted} />}
              onPress={onCamera}
              disabled={disabled}
              style={{ width: 36, height: 36 }}
            />
          )}

          {onImagePicker && (
            <Button
              variant="icon"
              icon={<ImageIcon size={20} color={theme.colors.primary} />}
              onPress={onImagePicker}
              disabled={disabled}
              style={{ 
                width: 36, 
                height: 36,
                backgroundColor: theme.colors.primary + '10',
              }}
            />
          )}
        </View>

        {/* Message Input */}
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.lg,
            borderWidth: isFocused ? 2 : 1,
            borderColor: isFocused ? theme.colors.primary : theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            maxHeight: 100,
            minHeight: 44,
          }}
        >
          {/* Custom placeholder overlay for single-line display */}
          {!value && (
            <View
              style={{
                position: 'absolute',
                left: theme.spacing.md,
                top: theme.spacing.sm + 2, // Adjust vertical alignment
                right: theme.spacing.md,
                pointerEvents: 'none',
                zIndex: 1,
                justifyContent: 'center',
              }}
            >
              <Text
                variant="body"
                color="muted"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  fontSize: 16,
                  lineHeight: 20,
                }}
              >
                {placeholder}
              </Text>
            </View>
          )}
          
          <TextInput
            value={value}
            onChangeText={handleTextChange}
            placeholder=""
            placeholderTextColor="transparent"
            multiline
            style={{
              fontSize: 16,
              lineHeight: 20,
              color: theme.colors.text.primary,
              textAlignVertical: 'center',
              minHeight: 20,
              maxHeight: 80,
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              // Clear typing status when input loses focus
              if (conversationId) {
                setTypingStatus(conversationId, false);
              }
            }}
            editable={!disabled}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
        </View>

        {/* Send/Voice Button */}
        {canSend ? (
          <Button
            variant="primary"
            icon={<Send size={20} color={theme.colors.primaryForeground} />}
            onPress={handleSend}
            disabled={disabled}
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.borderRadius.full,
            }}
          />
        ) : (
          onVoice && (
            <Button
              variant="icon"
              icon={<Mic size={20} color={theme.colors.text.muted} />}
              onPress={onVoice}
              disabled={disabled}
              style={{
                width: 44,
                height: 44,
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            />
          )
        )}
      </View>
    </View>
  );
}
