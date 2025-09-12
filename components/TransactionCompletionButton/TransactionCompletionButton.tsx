import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Badge } from '@/components';
import { CheckCircle, Clock, Users } from 'lucide-react-native';
import { TransactionCompletionModal } from '../TransactionCompletionModal/TransactionCompletionModal';

interface TransactionCompletionButtonProps {
  conversationId: string;
  otherUser: any;
  listing: any;
  existingTransaction?: any;
  onTransactionCreated?: (transactionId: string) => void;
  style?: any;
}

export function TransactionCompletionButton({
  conversationId,
  otherUser,
  listing,
  existingTransaction,
  onTransactionCreated,
  style,
}: TransactionCompletionButtonProps) {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);

  // If transaction already exists, show status
  if (existingTransaction) {
    const getStatusInfo = () => {
      switch (existingTransaction.status) {
        case 'confirmed':
          return {
            text: 'Transaction Completed',
            variant: 'success' as const,
            icon: <CheckCircle size={16} color={theme.colors.success} />,
          };
        case 'pending':
          return {
            text: 'Awaiting Confirmation',
            variant: 'warning' as const,
            icon: <Clock size={16} color={theme.colors.warning} />,
          };
        default:
          return {
            text: 'Transaction Created',
            variant: 'info' as const,
            icon: <Users size={16} color={theme.colors.info} />,
          };
      }
    };

    const statusInfo = getStatusInfo();

    return (
      <View style={[{ alignItems: 'center' }, style]}>
        <Badge
          text={statusInfo.text}
          variant={statusInfo.variant}
          leftIcon={statusInfo.icon}
        />
      </View>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        onPress={() => setShowModal(true)}
        leftIcon={<CheckCircle size={16} color={theme.colors.primaryForeground} />}
        style={[
          {
            backgroundColor: theme.colors.success,
            borderColor: theme.colors.success,
          },
          style,
        ]}
      >
        Mark as Completed
      </Button>

      <TransactionCompletionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        conversationId={conversationId}
        otherUser={otherUser}
        listing={listing}
        onTransactionCreated={onTransactionCreated}
      />
    </>
  );
}
