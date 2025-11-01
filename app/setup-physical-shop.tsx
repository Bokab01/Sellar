/**
 * Setup Physical Shop Screen
 * Main entry point for shop configuration wizard
 */

import React from 'react';
import { ShopSetupWizard } from '@/components/PhysicalShop/ShopSetupWizard';
import { router } from 'expo-router';

export default function SetupPhysicalShopScreen() {
  const handleComplete = () => {
    // Navigate back to edit profile or show success
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ShopSetupWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}

