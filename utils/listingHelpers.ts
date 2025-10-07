/**
 * Listing Helper Functions
 * Utility functions for listing status, badges, and display logic
 */

export interface ListingBadge {
  text: string;
  variant: 'new' | 'sold' | 'featured' | 'discount' | 'info' | 'success' | 'neutral' | 'warning' | 'error' | 'urgent' | 'spotlight';
}

/**
 * Get the appropriate badge for a listing based on its status
 */
export function getListingStatusBadge(
  status: string,
  reserved_until?: string | null,
  reserved_for?: string | null,
  currentUserId?: string
): ListingBadge | undefined {
  switch (status) {
    case 'reserved':
      // Show different badge text based on whether current user is the buyer
      const isReservedForCurrentUser = reserved_for === currentUserId;
      return {
        text: isReservedForCurrentUser ? 'Reserved for You' : 'Reserved',
        variant: 'warning',
      };
    
    case 'sold':
      return {
        text: 'Sold',
        variant: 'sold',
      };
    
    case 'pending':
      return {
        text: 'Pending Approval',
        variant: 'info',
      };
    
    case 'suspended':
      return {
        text: 'Suspended',
        variant: 'error',
      };
    
    case 'expired':
      return {
        text: 'Expired',
        variant: 'neutral',
      };
    
    default:
      return undefined;
  }
}

/**
 * Calculate time remaining until reservation expires
 */
export function getReservationTimeRemaining(reserved_until: string | null): string | null {
  if (!reserved_until) return null;
  
  const now = new Date();
  const expires = new Date(reserved_until);
  const diff = expires.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else if (minutes > 0) {
    return `${minutes}m remaining`;
  } else {
    return 'Expiring soon';
  }
}

/**
 * Check if a listing is available for offers/purchase
 */
export function isListingAvailable(status: string): boolean {
  return status === 'active';
}

/**
 * Check if a listing is reserved
 */
export function isListingReserved(status: string): boolean {
  return status === 'reserved';
}

/**
 * Check if a listing is sold
 */
export function isListingSold(status: string): boolean {
  return status === 'sold';
}
