/**
 * Physical Shop Feature - Type Definitions
 * Centralized types for shop setup and management
 */

export interface ShopAddress {
  address: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  directions_note?: string;
}

export interface ShopPhoto {
  id?: string;
  photo_url: string;
  photo_type: 'storefront' | 'interior' | 'product_display' | 'team' | 'general';
  caption?: string;
  display_order: number;
  is_primary: boolean;
  file?: any; // For upload preview
}

export interface BusinessHoursSchedule {
  [key: string]: {
    open: string;  // HH:mm format
    close: string; // HH:mm format
    is_open: boolean;
  };
}

export interface ShopSetupData {
  // Step 1: Basic Info
  business_name: string;
  business_type: string;
  business_description: string;
  business_phone: string;
  business_email?: string;
  business_website?: string;
  
  // Step 2: Address & Location
  address: ShopAddress;
  
  // Step 3: Business Hours
  business_hours: BusinessHoursSchedule;
  
  // Step 4: Photos
  photos: ShopPhoto[];
  
  // Settings
  accepts_pickup: boolean;
  accepts_walkin: boolean;
}

export interface ShopSetupStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  isComplete: boolean;
  isValid: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

export interface AddressSuggestion {
  description: string;
  place_id: string;
}

// Constants
export const SHOP_PHOTO_TYPES: Array<{
  value: ShopPhoto['photo_type'];
  label: string;
  description: string;
}> = [
  { value: 'storefront', label: 'Storefront', description: 'Main entrance/exterior view' },
  { value: 'interior', label: 'Interior', description: 'Inside the shop' },
  { value: 'product_display', label: 'Product Display', description: 'How products are displayed' },
  { value: 'team', label: 'Team', description: 'Staff/team members' },
  { value: 'general', label: 'General', description: 'Other shop photos' },
];

export const BUSINESS_TYPES = [
  'Retail Store',
  'Electronics Shop',
  'Fashion Boutique',
  'Phone Accessories',
  'Furniture Store',
  'Auto Parts',
  'Hardware Store',
  'Beauty Supply',
  'Grocery Store',
  'Pharmacy',
  'Bookstore',
  'Jewelry Store',
  'Other',
];

export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

export const DEFAULT_BUSINESS_HOURS: BusinessHoursSchedule = {
  monday: { open: '09:00', close: '18:00', is_open: true },
  tuesday: { open: '09:00', close: '18:00', is_open: true },
  wednesday: { open: '09:00', close: '18:00', is_open: true },
  thursday: { open: '09:00', close: '18:00', is_open: true },
  friday: { open: '09:00', close: '18:00', is_open: true },
  saturday: { open: '10:00', close: '16:00', is_open: true },
  sunday: { open: '00:00', close: '00:00', is_open: false },
};

