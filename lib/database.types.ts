export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          full_name?: string;
          username?: string;
          email?: string;
          phone: string | null;
          avatar_url: string | null;
          location: string;
          bio: string | null;
          rating: number;
          total_sales: number;
          total_reviews: number;
          credit_balance: number;
          is_verified: boolean;
          is_online: boolean;
          last_seen: string;
          response_time: string;
          created_at: string;
          updated_at: string;
          // Professional fields
          professional_title?: string | null;
          years_of_experience?: number | null;
          // Contact preferences
          preferred_contact_method?: 'app' | 'phone' | 'email' | 'whatsapp';
          response_time_expectation?: 'within_minutes' | 'within_hours' | 'within_day' | 'within_week';
          // Privacy settings
          phone_visibility?: 'public' | 'contacts' | 'private';
          email_visibility?: 'public' | 'contacts' | 'private';
          show_online_status?: boolean;
          show_last_seen?: boolean;
          // Business fields
          is_business?: boolean;
          business_name?: string | null;
          business_type?: string | null;
          business_description?: string | null;
          business_phone?: string | null;
          business_email?: string | null;
          business_website?: string | null;
          display_business_name?: boolean;
          business_name_priority?: 'primary' | 'secondary' | 'hidden';
          // Physical shop fields
          business_address?: string | null;
          business_address_line_2?: string | null;
          business_city?: string | null;
          business_state?: string | null;
          business_postal_code?: string | null;
          business_latitude?: number | null;
          business_longitude?: number | null;
          business_map_verified?: boolean;
          business_directions_note?: string | null;
          accepts_pickup?: boolean;
          accepts_walkin?: boolean;
          has_physical_shop?: boolean;
          // Additional fields
          account_type?: string;
          verification_status?: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          full_name?: string;
          username?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          location?: string;
          bio?: string | null;
          rating?: number;
          total_sales?: number;
          total_reviews?: number;
          credit_balance?: number;
          is_verified?: boolean;
          is_online?: boolean;
          last_seen?: string;
          response_time?: string;
          created_at?: string;
          updated_at?: string;
          // Professional fields
          professional_title?: string | null;
          years_of_experience?: number | null;
          // Contact preferences
          preferred_contact_method?: 'app' | 'phone' | 'email' | 'whatsapp';
          response_time_expectation?: 'within_minutes' | 'within_hours' | 'within_day' | 'within_week';
          // Privacy settings
          phone_visibility?: 'public' | 'contacts' | 'private';
          email_visibility?: 'public' | 'contacts' | 'private';
          show_online_status?: boolean;
          show_last_seen?: boolean;
          // Business fields
          is_business?: boolean;
          business_name?: string | null;
          business_type?: string | null;
          business_description?: string | null;
          business_phone?: string | null;
          business_email?: string | null;
          business_website?: string | null;
          display_business_name?: boolean;
          business_name_priority?: 'primary' | 'secondary' | 'hidden';
          // Physical shop fields
          business_address?: string | null;
          business_address_line_2?: string | null;
          business_city?: string | null;
          business_state?: string | null;
          business_postal_code?: string | null;
          business_latitude?: number | null;
          business_longitude?: number | null;
          business_map_verified?: boolean;
          business_directions_note?: string | null;
          accepts_pickup?: boolean;
          accepts_walkin?: boolean;
          has_physical_shop?: boolean;
          // Additional fields
          account_type?: string;
          verification_status?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          full_name?: string;
          username?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          location?: string;
          bio?: string | null;
          rating?: number;
          total_sales?: number;
          total_reviews?: number;
          credit_balance?: number;
          is_verified?: boolean;
          is_online?: boolean;
          last_seen?: string;
          response_time?: string;
          created_at?: string;
          updated_at?: string;
          // Professional fields
          professional_title?: string | null;
          years_of_experience?: number | null;
          // Contact preferences
          preferred_contact_method?: 'app' | 'phone' | 'email' | 'whatsapp';
          response_time_expectation?: 'within_minutes' | 'within_hours' | 'within_day' | 'within_week';
          // Privacy settings
          phone_visibility?: 'public' | 'contacts' | 'private';
          email_visibility?: 'public' | 'contacts' | 'private';
          show_online_status?: boolean;
          show_last_seen?: boolean;
          // Business fields
          is_business?: boolean;
          business_name?: string | null;
          business_type?: string | null;
          business_description?: string | null;
          business_phone?: string | null;
          business_email?: string | null;
          business_website?: string | null;
          display_business_name?: boolean;
          business_name_priority?: 'primary' | 'secondary' | 'hidden';
          // Physical shop fields
          business_address?: string | null;
          business_address_line_2?: string | null;
          business_city?: string | null;
          business_state?: string | null;
          business_postal_code?: string | null;
          business_latitude?: number | null;
          business_longitude?: number | null;
          business_map_verified?: boolean;
          business_directions_note?: string | null;
          accepts_pickup?: boolean;
          accepts_walkin?: boolean;
          has_physical_shop?: boolean;
          // Additional fields
          account_type?: string;
          verification_status?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          icon: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          icon?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          parent_id?: string | null;
          icon?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      business_photos: {
        Row: {
          id: string;
          user_id: string;
          photo_url: string;
          photo_type: 'storefront' | 'interior' | 'product_display' | 'team' | 'general';
          caption: string | null;
          display_order: number;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          photo_url: string;
          photo_type?: 'storefront' | 'interior' | 'product_display' | 'team' | 'general';
          caption?: string | null;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          photo_url?: string;
          photo_type?: 'storefront' | 'interior' | 'product_display' | 'team' | 'general';
          caption?: string | null;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          price: number;
          currency: string;
          category_id: string;
          condition: string;
          quantity: number;
          location: string;
          images: any[];
          accept_offers: boolean;
          status: string;
          views_count: number;
          favorites_count: number;
          boost_until: string | null;
          boost_score: number;
          highlight_until: string | null;
          urgent_until: string | null;
          spotlight_until: string | null;
          pickup_available: boolean;
          pickup_location_override: string | null;
          pickup_preparation_time: number;
          pickup_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          price: number;
          currency?: string;
          category_id: string;
          condition: string;
          quantity?: number;
          location: string;
          images?: any[];
          accept_offers?: boolean;
          status?: string;
          views_count?: number;
          favorites_count?: number;
          boost_until?: string | null;
          boost_score?: number;
          highlight_until?: string | null;
          urgent_until?: string | null;
          spotlight_until?: string | null;
          pickup_available?: boolean;
          pickup_location_override?: string | null;
          pickup_preparation_time?: number;
          pickup_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          price?: number;
          currency?: string;
          category_id?: string;
          condition?: string;
          quantity?: number;
          location?: string;
          images?: any[];
          accept_offers?: boolean;
          status?: string;
          views_count?: number;
          favorites_count?: number;
          boost_until?: string | null;
          boost_score?: number;
          highlight_until?: string | null;
          urgent_until?: string | null;
          spotlight_until?: string | null;
          pickup_available?: boolean;
          pickup_location_override?: string | null;
          pickup_preparation_time?: number;
          pickup_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          listing_id: string | null;
          participant_1: string;
          participant_2: string;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id?: string | null;
          participant_1: string;
          participant_2: string;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string | null;
          participant_1?: string;
          participant_2?: string;
          last_message_at?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: string;
          images: any[];
          offer_data: any | null;
          status: string;
          reply_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: string;
          images?: any[];
          offer_data?: any | null;
          status?: string;
          reply_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: string;
          images?: any[];
          offer_data?: any | null;
          status?: string;
          reply_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      offers: {
        Row: {
          id: string;
          listing_id: string;
          conversation_id: string;
          message_id: string;
          buyer_id: string;
          seller_id: string;
          amount: number;
          currency: string;
          message: string | null;
          status: string;
          expires_at: string;
          parent_offer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          conversation_id: string;
          message_id: string;
          buyer_id: string;
          seller_id: string;
          amount: number;
          currency?: string;
          message?: string | null;
          status?: string;
          expires_at?: string;
          parent_offer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          conversation_id?: string;
          message_id?: string;
          buyer_id?: string;
          seller_id?: string;
          amount?: number;
          currency?: string;
          message?: string | null;
          status?: string;
          expires_at?: string;
          parent_offer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          images: any[];
          listing_id: string | null;
          location: string | null;
          likes_count: number;
          comments_count: number;
          shares_count: number;
          is_pinned: boolean;
          type: 'general' | 'listing' | 'review' | 'announcement' | 'showcase' | 'question' | 'tips' | 'event' | 'collaboration';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          images?: any[];
          listing_id?: string | null;
          location?: string | null;
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          is_pinned?: boolean;
          type?: 'general' | 'listing' | 'review' | 'announcement' | 'showcase' | 'question' | 'tips' | 'event' | 'collaboration';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          images?: any[];
          listing_id?: string | null;
          location?: string | null;
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          is_pinned?: boolean;
          type?: 'general' | 'listing' | 'review' | 'announcement' | 'showcase' | 'question' | 'tips' | 'event' | 'collaboration';
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          parent_id: string | null;
          likes_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          parent_id?: string | null;
          likes_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          parent_id?: string | null;
          likes_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string | null;
          comment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          reviewer_id: string;
          reviewed_user_id: string;
          listing_id: string | null;
          rating: number;
          comment: string;
          is_verified_purchase: boolean;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reviewer_id: string;
          reviewed_user_id: string;
          listing_id?: string | null;
          rating: number;
          comment: string;
          is_verified_purchase?: boolean;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reviewer_id?: string;
          reviewed_user_id?: string;
          listing_id?: string | null;
          rating?: number;
          comment?: string;
          is_verified_purchase?: boolean;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          listing_id?: string;
          created_at?: string;
        };
      };
      listing_views: {
        Row: {
          id: string;
          listing_id: string;
          user_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          listing_id: string | null;
          post_id: string | null;
          comment_id: string | null;
          message_id: string | null;
          reason: string;
          description: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string | null;
          listing_id?: string | null;
          post_id?: string | null;
          comment_id?: string | null;
          message_id?: string | null;
          reason: string;
          description?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_user_id?: string | null;
          listing_id?: string | null;
          post_id?: string | null;
          comment_id?: string | null;
          message_id?: string | null;
          reason?: string;
          description?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      callback_requests: {
        Row: {
          id: string;
          listing_id: string;
          requester_id: string;
          seller_id: string;
          phone_number: string;
          preferred_time: string;
          message: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          requester_id: string;
          seller_id: string;
          phone_number: string;
          preferred_time?: string;
          message?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          requester_id?: string;
          seller_id?: string;
          phone_number?: string;
          preferred_time?: string;
          message?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data: any;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data?: any;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          data?: any;
          is_read?: boolean;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          push_notifications: boolean;
          email_notifications: boolean;
          phone_visibility: string;
          online_status_visibility: boolean;
          theme_preference: string;
          language: string;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          push_notifications?: boolean;
          email_notifications?: boolean;
          phone_visibility?: string;
          online_status_visibility?: boolean;
          theme_preference?: string;
          language?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          push_notifications?: boolean;
          email_notifications?: boolean;
          phone_visibility?: string;
          online_status_visibility?: boolean;
          theme_preference?: string;
          language?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      blocked_users: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          reason?: string | null;
          created_at?: string;
        };
      };
      shares: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      device_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string;
          device_name: string | null;
          device_model: string | null;
          app_version: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: string;
          device_name?: string | null;
          device_model?: string | null;
          app_version?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: string;
          device_name?: string | null;
          device_model?: string | null;
          app_version?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      push_notification_queue: {
        Row: {
          id: string;
          user_ids: string[];
          title: string;
          body: string;
          notification_type: string;
          data: any;
          status: string;
          attempts: number;
          max_attempts: number;
          error_message: string | null;
          scheduled_for: string;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_ids: string[];
          title: string;
          body: string;
          notification_type: string;
          data?: any;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          error_message?: string | null;
          scheduled_for?: string;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_ids?: string[];
          title?: string;
          body?: string;
          notification_type?: string;
          data?: any;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          error_message?: string | null;
          scheduled_for?: string;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          push_enabled: boolean;
          messages_enabled: boolean;
          offers_enabled: boolean;
          community_enabled: boolean;
          system_enabled: boolean;
          quiet_hours_enabled: boolean;
          quiet_start_time: string;
          quiet_end_time: string;
          instant_notifications: boolean;
          daily_digest: boolean;
          weekly_summary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          push_enabled?: boolean;
          messages_enabled?: boolean;
          offers_enabled?: boolean;
          community_enabled?: boolean;
          system_enabled?: boolean;
          quiet_hours_enabled?: boolean;
          quiet_start_time?: string;
          quiet_end_time?: string;
          instant_notifications?: boolean;
          daily_digest?: boolean;
          weekly_summary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          push_enabled?: boolean;
          messages_enabled?: boolean;
          offers_enabled?: boolean;
          community_enabled?: boolean;
          system_enabled?: boolean;
          quiet_hours_enabled?: boolean;
          quiet_start_time?: string;
          quiet_end_time?: string;
          instant_notifications?: boolean;
          daily_digest?: boolean;
          weekly_summary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          reference: string;
          amount: number;
          currency: string;
          payment_method: string;
          purchase_type: string;
          purchase_id: string;
          customer_email: string | null;
          status: string;
          webhook_received: boolean;
          webhook_processed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reference: string;
          amount: number;
          currency: string;
          payment_method: string;
          purchase_type: string;
          purchase_id: string;
          customer_email?: string | null;
          status?: string;
          webhook_received?: boolean;
          webhook_processed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reference?: string;
          amount?: number;
          currency?: string;
          payment_method?: string;
          purchase_type?: string;
          purchase_id?: string;
          customer_email?: string | null;
          status?: string;
          webhook_received?: boolean;
          webhook_processed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_verification: {
        Row: {
          id: string;
          user_id: string;
          verification_type: string;
          status: string;
          submitted_at: string;
          reviewed_at: string | null;
          reviewer_id: string | null;
          review_notes: string | null;
          documents: any[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          verification_type: string;
          status?: string;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          review_notes?: string | null;
          documents?: any[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          verification_type?: string;
          status?: string;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          review_notes?: string | null;
          documents?: any[];
          created_at?: string;
          updated_at?: string;
        };
      };
      app_settings: {
        Row: {
          id: string;
          key: string;
          value: any;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value?: any;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: any;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_credits: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          lifetime_earned: number;
          lifetime_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          amount: number;
          balance_before: number;
          balance_after: number;
          reference_id: string | null;
          reference_type: string | null;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          amount: number;
          balance_before?: number;
          balance_after?: number;
          reference_id?: string | null;
          reference_type?: string | null;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          amount?: number;
          balance_before?: number;
          balance_after?: number;
          reference_id?: string | null;
          reference_type?: string | null;
          metadata?: any;
          created_at?: string;
        };
      };
      credit_packages: {
        Row: {
          id: string;
          name: string;
          credits: number;
          price_ghs: number;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          credits: number;
          price_ghs: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          credits?: number;
          price_ghs?: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      credit_purchases: {
        Row: {
          id: string;
          user_id: string;
          package_id: string;
          credits: number;
          amount_ghs: number;
          status: string;
          payment_reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          package_id: string;
          credits: number;
          amount_ghs: number;
          status?: string;
          payment_reference?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          package_id?: string;
          credits?: number;
          amount_ghs?: number;
          status?: string;
          payment_reference?: string | null;
          created_at?: string;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price_ghs: number;
          billing_cycle: string;
          features: any[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price_ghs: number;
          billing_cycle: string;
          features?: any[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price_ghs?: number;
          billing_cycle?: string;
          features?: any[];
          is_active?: boolean;
          created_at?: string;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: string;
          current_period_start: string;
          current_period_end: string;
          auto_renew: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          status?: string;
          current_period_start: string;
          current_period_end: string;
          auto_renew?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          status?: string;
          current_period_start?: string;
          current_period_end?: string;
          auto_renew?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      community_rewards: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          points: number;
          description: string;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          points: number;
          description: string;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          points?: number;
          description?: string;
          metadata?: any;
          created_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          icon: string;
          unlocked_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          icon: string;
          unlocked_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_type?: string;
          title?: string;
          description?: string;
          icon?: string;
          unlocked_at?: string;
          created_at?: string;
        };
      };
      paystack_transactions: {
        Row: {
          id: string;
          user_id: string;
          reference: string;
          amount: number;
          currency: string;
          payment_method: string;
          purchase_type: string;
          purchase_id: string;
          customer_email: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reference: string;
          amount: number;
          currency: string;
          payment_method: string;
          purchase_type: string;
          purchase_id: string;
          customer_email?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reference?: string;
          amount?: number;
          currency?: string;
          payment_method?: string;
          purchase_type?: string;
          purchase_id?: string;
          customer_email?: string | null;
          status?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_notification: {
        Args: {
          target_user_id: string;
          notification_type: string;
          notification_title: string;
          notification_body: string;
          notification_data?: any;
        };
        Returns: string;
      };
      queue_push_notification: {
        Args: {
          p_user_ids: string[];
          p_title: string;
          p_body: string;
          p_notification_type: string;
          p_data?: any;
          p_scheduled_for?: string;
        };
        Returns: string;
      };
      get_user_notification_preferences: {
        Args: {
          p_user_id: string;
        };
        Returns: Database['public']['Tables']['notification_preferences']['Row'];
      };
      update_notification_preferences: {
        Args: {
          p_user_id: string;
          p_preferences: any;
        };
        Returns: Database['public']['Tables']['notification_preferences']['Row'];
      };
      claim_referral_bonus: {
        Args: {
          p_referrer_id: string;
          p_referee_id: string;
          p_referral_code: string;
        };
        Returns: {
          success: boolean;
          message: string;
        };
      };
      get_user_followers: {
        Args: {
          target_user_id: string;
          page_limit: number;
          page_offset: number;
        };
        Returns: any[];
      };
      get_user_following: {
        Args: {
          target_user_id: string;
          page_limit: number;
          page_offset: number;
        };
        Returns: any[];
      };
      follow_user: {
        Args: {
          follower_id: string;
          following_id: string;
        };
        Returns: {
          success: boolean;
          message: string;
        };
      };
      unfollow_user: {
        Args: {
          follower_id: string;
          following_id: string;
        };
        Returns: {
          success: boolean;
          message: string;
        };
      };
      spend_user_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reason: string;
          p_reference_id: any;
          p_reference_type: any;
        };
        Returns: {
          success: boolean;
          new_balance: number;
          error?: string;
        };
      };
      purchase_feature: {
        Args: {
          p_user_id: string;
          p_feature_key: string;
          p_credits: number;
          p_metadata: any;
        };
        Returns: {
          success: boolean;
          new_balance: number;
          error?: string;
        };
      };
      get_user_entitlements: {
        Args: {
          p_user_id: string;
        };
        Returns: any;
      };
      get_user_reward_summary: {
        Args: {
          p_user_id: string;
        };
        Returns: any;
      };
      claim_anniversary_bonus: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          message: string;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}