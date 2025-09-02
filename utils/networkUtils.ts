import { supabase } from '@/lib/supabase';

export interface NetworkStatus {
  isConnected: boolean;
  canReachSupabase: boolean;
  error?: string;
}

export const networkUtils = {
  async checkNetworkStatus(): Promise<NetworkStatus> {
    try {
      // First check if we can make a basic network request
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      
      if (!response) {
        return {
          isConnected: false,
          canReachSupabase: false,
          error: 'No network connection'
        };
      }
    } catch (error) {
      return {
        isConnected: false,
        canReachSupabase: false,
        error: 'Network connection failed'
      };
    }

    try {
      // Check if we can reach Supabase
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          isConnected: true,
          canReachSupabase: false,
          error: `Supabase connection failed: ${error.message}`
        };
      }

      return {
        isConnected: true,
        canReachSupabase: true
      };
    } catch (error) {
      return {
        isConnected: true,
        canReachSupabase: false,
        error: `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  async testStorageConnection(): Promise<boolean> {
    try {
      // Test storage connection by trying to generate a public URL for a known bucket
      // This doesn't require listing buckets (which anon users can't do with RLS)
      const { data: urlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl('test-connection.jpg');
      
      if (urlData.publicUrl) {
        console.log('Storage connection test passed');
        return true;
      }
      
      console.error('Storage connection test failed: No URL generated');
      return false;
    } catch (error) {
      console.error('Storage connection test error:', error);
      return false;
    }
  },

  async checkStorageBucket(bucketName: string = 'listing-images'): Promise<boolean> {
    try {
      // Test bucket access by trying to generate a public URL
      // This works even if we can't list files due to RLS policies
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl('test-access.jpg');
      
      if (urlData.publicUrl) {
        console.log(`Bucket '${bucketName}' access test passed`);
        return true;
      }
      
      console.error(`Bucket '${bucketName}' access test failed: No URL generated`);
      return false;
    } catch (error) {
      console.error(`Bucket '${bucketName}' access test error:`, error);
      return false;
    }
  }
};
