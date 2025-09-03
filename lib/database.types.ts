export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
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
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
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
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
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
          reviewed_id: string;
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
          reviewed_id: string;
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
          reviewed_id?: string;
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
    };
    Enums: {
      [_ in never]: never;
    };
  };
}