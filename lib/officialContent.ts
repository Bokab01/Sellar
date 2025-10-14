/**
 * Official Sellar Ghana Content Utilities
 * 
 * Handles identification and styling of official posts/comments
 * created by admins using the system account.
 */

export const OFFICIAL_SELLAR_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Check if a user ID belongs to the official Sellar Ghana account
 */
export const isOfficialSellarContent = (userId: string | undefined | null): boolean => {
  if (!userId) return false;
  return userId === OFFICIAL_SELLAR_USER_ID;
};

/**
 * Get the display name for official content
 */
export const getOfficialDisplayName = (): string => {
  return 'Sellar Ghana';
};

/**
 * Get the official Sellar avatar (logo) based on theme
 * Note: In React Native, use require() directly in components with theme.mode check
 * 
 * Example:
 * ```tsx
 * const officialIcon = theme.mode === 'dark' || theme.mode === 'amoled'
 *   ? require('../../assets/icon/icon-dark.png')
 *   : require('../../assets/icon/icon-light.png');
 * ```
 */
export const getOfficialAvatarPath = (isDarkMode: boolean): string => {
  return isDarkMode 
    ? '../assets/icon/icon-dark.png'
    : '../assets/icon/icon-light.png';
};

/**
 * Transform user data to show official branding if applicable
 */
export const transformOfficialUser = (user: {
  id?: string;
  user_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  [key: string]: any;
}) => {
  const userId = user.id || user.user_id;
  
  if (isOfficialSellarContent(userId)) {
    return {
      ...user,
      full_name: getOfficialDisplayName(),
      first_name: 'Sellar',
      last_name: 'Ghana',
      avatar_url: getOfficialAvatarPath(false), // Default to light mode path
      is_official: true,
    };
  }
  
  return {
    ...user,
    is_official: false,
  };
};

