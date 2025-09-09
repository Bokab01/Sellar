import { useTheme } from '@/theme/ThemeProvider';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';

export interface PremiumBrandingConfig {
  // Visual enhancements
  hasGradientBorder: boolean;
  hasGlowEffect: boolean;
  hasPremiumBadge: boolean;
  hasEnhancedShadow: boolean;
  
  // Color scheme
  borderColor: string;
  gradientColors: string[];
  badgeColor: string;
  shadowColor: string;
  
  // Layout enhancements
  hasRibbonBanner: boolean;
  hasPriorityPlacement: boolean;
  hasEnhancedSpacing: boolean;
}

export interface BusinessUserProfile {
  isBusinessUser: boolean;
  businessTier: 'free' | 'business';
  badges: string[];
  features: {
    premiumBranding: boolean;
    homepagePlacement: boolean;
    priorityListing: boolean;
  };
}

class PremiumBrandingService {
  /**
   * Get premium branding configuration for a user
   */
  getPremiumBrandingConfig(isBusinessUser: boolean, theme: any): PremiumBrandingConfig {
    if (!isBusinessUser) {
      return {
        hasGradientBorder: false,
        hasGlowEffect: false,
        hasPremiumBadge: false,
        hasEnhancedShadow: false,
        borderColor: theme.colors.border,
        gradientColors: [],
        badgeColor: theme.colors.text.muted,
        shadowColor: theme.colors.shadow,
        hasRibbonBanner: false,
        hasPriorityPlacement: false,
        hasEnhancedSpacing: false,
      };
    }

    // Premium branding for business users
    return {
      hasGradientBorder: true,
      hasGlowEffect: true,
      hasPremiumBadge: true,
      hasEnhancedShadow: true,
      borderColor: theme.colors.primary,
      gradientColors: [
        theme.colors.primary + '40',
        theme.colors.secondary + '40',
        theme.colors.primary + '60',
      ],
      badgeColor: theme.colors.primary,
      shadowColor: theme.colors.primary + '20',
      hasRibbonBanner: true,
      hasPriorityPlacement: true,
      hasEnhancedSpacing: true,
    };
  }

  /**
   * Get premium card styling
   */
  getPremiumCardStyles(isBusinessUser: boolean, theme: any) {
    const config = this.getPremiumBrandingConfig(isBusinessUser, theme);
    
    const baseStyles = {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden' as const,
    };

    if (!isBusinessUser) {
      return {
        ...baseStyles,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      };
    }

    // Premium styling for business users
    return {
      ...baseStyles,
      borderWidth: 2,
      borderColor: config.borderColor,
      ...theme.shadows.lg,
      // Add subtle glow effect
      shadowColor: config.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    };
  }

  /**
   * Get premium badge configuration
   */
  getPremiumBadgeConfig(isBusinessUser: boolean, theme: any) {
    if (!isBusinessUser) {
      return null;
    }

    return {
      text: 'BUSINESS',
      variant: 'primary' as const,
      size: 'small' as const,
      style: {
        position: 'absolute' as const,
        top: theme.spacing.sm,
        right: theme.spacing.sm,
        zIndex: 10,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
      },
    };
  }

  /**
   * Get premium ribbon banner styling
   */
  getPremiumRibbonStyles(isBusinessUser: boolean, theme: any) {
    if (!isBusinessUser) {
      return null;
    }

    return {
      position: 'absolute' as const,
      top: theme.spacing.md,
      right: -theme.spacing.lg,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xs,
      transform: [{ rotate: '45deg' }],
      zIndex: 5,
      minWidth: 80,
      alignItems: 'center' as const,
    };
  }

  /**
   * Get enhanced seller info styling for business users
   */
  getPremiumSellerStyles(isBusinessUser: boolean, theme: any) {
    if (!isBusinessUser) {
      return {
        container: {},
        name: {},
        badge: null,
      };
    }

    return {
      container: {
        backgroundColor: theme.colors.primary + '10',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.primary + '20',
      },
      name: {
        fontWeight: '600' as const,
        color: theme.colors.primary,
      },
      badge: {
        backgroundColor: theme.colors.primary,
        color: theme.colors.primaryForeground,
        fontSize: 10,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        overflow: 'hidden' as const,
      },
    };
  }

  /**
   * Get priority placement indicator
   */
  getPriorityIndicator(isBusinessUser: boolean, theme: any) {
    if (!isBusinessUser) {
      return null;
    }

    return {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: theme.colors.primary,
      zIndex: 10,
    };
  }

  /**
   * Get enhanced image styling for business listings
   */
  getPremiumImageStyles(isBusinessUser: boolean, theme: any) {
    const baseStyles = {
      borderRadius: theme.borderRadius.md,
    };

    if (!isBusinessUser) {
      return baseStyles;
    }

    return {
      ...baseStyles,
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
      // Add subtle inner glow
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    };
  }

  /**
   * Get business user profile information
   */
  getBusinessUserProfile(isBusinessUser: boolean): BusinessUserProfile {
    return {
      isBusinessUser,
      businessTier: isBusinessUser ? 'business' : 'free',
      badges: isBusinessUser ? ['business', 'priority_seller', 'premium'] : [],
      features: {
        premiumBranding: isBusinessUser,
        homepagePlacement: isBusinessUser,
        priorityListing: isBusinessUser,
      },
    };
  }
}

export const premiumBrandingService = new PremiumBrandingService();

/**
 * Hook for using premium branding in components
 */
export function usePremiumBranding() {
  const { theme } = useTheme();
  const businessFeatures = useBusinessFeatures();

  const getBrandingConfig = () => {
    return premiumBrandingService.getPremiumBrandingConfig(
      businessFeatures.isBusinessUser,
      theme
    );
  };

  const getCardStyles = () => {
    return premiumBrandingService.getPremiumCardStyles(
      businessFeatures.isBusinessUser,
      theme
    );
  };

  const getBadgeConfig = () => {
    return premiumBrandingService.getPremiumBadgeConfig(
      businessFeatures.isBusinessUser,
      theme
    );
  };

  const getRibbonStyles = () => {
    return premiumBrandingService.getPremiumRibbonStyles(
      businessFeatures.isBusinessUser,
      theme
    );
  };

  const getSellerStyles = () => {
    return premiumBrandingService.getPremiumSellerStyles(
      businessFeatures.isBusinessUser,
      theme
    );
  };

  const getPriorityIndicator = () => {
    return premiumBrandingService.getPriorityIndicator(
      businessFeatures.isBusinessUser,
      theme
    );
  };

  const getImageStyles = () => {
    return premiumBrandingService.getPremiumImageStyles(
      businessFeatures.isBusinessUser,
      theme
    );
  };

  const getUserProfile = () => {
    return premiumBrandingService.getBusinessUserProfile(
      businessFeatures.isBusinessUser
    );
  };

  return {
    isBusinessUser: businessFeatures.isBusinessUser,
    getBrandingConfig,
    getCardStyles,
    getBadgeConfig,
    getRibbonStyles,
    getSellerStyles,
    getPriorityIndicator,
    getImageStyles,
    getUserProfile,
  };
}
