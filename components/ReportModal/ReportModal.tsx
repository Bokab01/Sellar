import React from 'react';
import { UniversalReportModal } from './UniversalReportModal';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

export function ReportModal({
  visible,
  onClose,
  listingId,
  listingTitle,
}: ReportModalProps) {
  return (
    <UniversalReportModal
      visible={visible}
      onClose={onClose}
      targetType="listing"
      targetId={listingId}
      targetTitle={listingTitle}
    />
  );
}