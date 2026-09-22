import React from 'react';
import { UnifiedLoginModal } from './UnifiedLoginModal';

interface CitizenLoginPageProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLoginSuccessAndReport?: () => void;
}

export const CitizenLoginPage: React.FC<CitizenLoginPageProps> = ({
  isOpen,
  onClose,
  onLoginSuccessAndReport
}) => {
  return (
    <UnifiedLoginModal
      isOpen={isOpen}
      onClose={onClose}
      initialTab="citizen"
      onLoginSuccessAndReport={onLoginSuccessAndReport}
    />
  );
};
