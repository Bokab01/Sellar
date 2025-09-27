import { Platform, Share } from 'react-native';

interface WebShareData {
  title?: string;
  text?: string;
  url?: string;
}

export const WebShareAPI = {
  // Check if native sharing is available
  isAvailable: async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return 'share' in navigator;
    }
    return true; // Native platforms always support sharing
  },

  // Share content with fallback
  share: async (data: WebShareData): Promise<boolean> => {
    try {
      if (Platform.OS === 'web' && 'share' in navigator) {
        // Use Web Share API
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        });
        return true;
      } else {
        // Use React Native Share for native platforms
        await Share.share({
          title: data.title,
          message: data.text || '',
          url: data.url,
        });
        return true;
      }
    } catch (error) {
      console.warn('Share failed:', error);
      
      // Fallback: Copy to clipboard
      if (Platform.OS === 'web') {
        try {
          await navigator.clipboard.writeText(data.url || data.text || '');
          return true;
        } catch (clipboardError) {
          console.warn('Clipboard fallback failed:', clipboardError);
          return false;
        }
      }
      
      return false;
    }
  },

  // Share listing with optimized data
  shareListing: async (listing: {
    title: string;
    price: string;
    image?: string;
    id: string;
  }): Promise<boolean> => {
    const shareData: WebShareData = {
      title: `Check out this item: ${listing.title}`,
      text: `${listing.title} - ${listing.price}`,
      url: `${window.location.origin}/home/${listing.id}`,
    };

    return WebShareAPI.share(shareData);
  },

  // Share profile with optimized data
  shareProfile: async (profile: {
    name: string;
    id: string;
    avatar?: string;
  }): Promise<boolean> => {
    const shareData: WebShareData = {
      title: `Check out ${profile.name}'s profile on Sellar`,
      text: `View ${profile.name}'s listings on Sellar`,
      url: `${window.location.origin}/profile/${profile.id}`,
    };

    return WebShareAPI.share(shareData);
  },

  // Share app with referral
  shareApp: async (referralCode?: string): Promise<boolean> => {
    const shareData: WebShareData = {
      title: 'Join me on Sellar - Ghana\'s leading marketplace',
      text: 'Buy and sell anything in Ghana with Sellar. Download the app now!',
      url: referralCode 
        ? `${window.location.origin}?ref=${referralCode}`
        : window.location.origin,
    };

    return WebShareAPI.share(shareData);
  },
};
