import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

// Types for support system
export interface SupportTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: 'account' | 'billing' | 'technical' | 'listing' | 'chat' | 'safety' | 'verification' | 'payments' | 'features' | 'bug_report' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'waiting_internal' | 'resolved' | 'closed' | 'escalated';
  assigned_to?: string;
  assigned_at?: string;
  resolution?: string;
  resolved_at?: string;
  resolved_by?: string;
  satisfaction_rating?: number;
  satisfaction_feedback?: string;
  user_agent?: string;
  app_version?: string;
  device_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
  first_response_at?: string;
  last_activity_at: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  attachments: any[];
  is_internal: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category: 'getting_started' | 'buying_selling' | 'credits_billing' | 'account_privacy' | 'technical_issues' | 'safety_guidelines' | 'features' | 'policies';
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  author_id: string;
  last_updated_by?: string;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  meta_description?: string;
  search_keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FAQItem {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

// Hook for managing support tickets
export function useSupportTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching support tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  return {
    tickets,
    loading,
    error,
    refetch: fetchTickets,
  };
}

// Hook for creating support tickets
export function useCreateSupportTicket() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTicket = async (ticketData: {
    subject: string;
    description: string;
    category: SupportTicket['category'];
    priority?: SupportTicket['priority'];
    user_agent?: string;
    app_version?: string;
    device_info?: Record<string, any>;
  }) => {
    if (!user) {
      throw new Error('User must be authenticated to create tickets');
    }

    setLoading(true);
    setError(null);

    try {
      // Generate ticket number
      const { data: ticketNumber, error: numberError } = await supabase
        .rpc('generate_ticket_number');

      if (numberError) throw numberError;

      // Create the ticket
      const { data, error: createError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          ticket_number: ticketNumber,
          subject: ticketData.subject,
          description: ticketData.description,
          category: ticketData.category,
          priority: ticketData.priority || 'medium',
          user_agent: ticketData.user_agent,
          app_version: ticketData.app_version,
          device_info: ticketData.device_info || {},
        })
        .select()
        .single();

      if (createError) throw createError;

      return data as SupportTicket;
    } catch (err) {
      console.error('Error creating support ticket:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create ticket';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createTicket,
    loading,
    error,
  };
}

// Hook for managing ticket messages
export function useTicketMessages(ticketId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!ticketId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('support_ticket_messages')
        .select(`
          *,
          sender:profiles!sender_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const addMessage = async (message: string, attachments: any[] = []) => {
    if (!user || !ticketId) return;

    try {
      const { data, error: addError } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message,
          attachments,
          is_internal: false,
          is_system: false,
        })
        .select(`
          *,
          sender:profiles!sender_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (addError) throw addError;

      setMessages(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding ticket message:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [ticketId]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!ticketId) return;

    const subscription = supabase
      .channel(`ticket_messages:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          // Fetch the complete message with sender info
          supabase
            .from('support_ticket_messages')
            .select(`
              *,
              sender:profiles!sender_id (
                id,
                full_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setMessages(prev => [...prev, data]);
              }
            });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [ticketId]);

  return {
    messages,
    loading,
    error,
    addMessage,
    refetch: fetchMessages,
  };
}

// Hook for knowledge base articles
export function useKnowledgeBase() {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = async (category?: string, searchQuery?: string) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('kb_articles')
        .select('*')
        .eq('status', 'published')
        .order('view_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (searchQuery) {
        query = query.textSearch('title,content', searchQuery);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setArticles(data || []);
    } catch (err) {
      console.error('Error fetching knowledge base articles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  };

  const getArticle = async (slug: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('kb_articles')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (fetchError) throw fetchError;

      // Increment view count
      await supabase.rpc('increment_article_views', { article_uuid: data.id });

      return data as KnowledgeBaseArticle;
    } catch (err) {
      console.error('Error fetching article:', err);
      throw err;
    }
  };

  const submitFeedback = async (articleId: string, isHelpful: boolean, feedbackText?: string) => {
    try {
      const { error } = await supabase
        .from('kb_article_feedback')
        .insert({
          article_id: articleId,
          is_helpful: isHelpful,
          feedback_text: feedbackText,
        });

      if (error) throw error;

      // Update article helpful counts
      const field = isHelpful ? 'helpful_count' : 'not_helpful_count';
      await supabase
        .from('kb_articles')
        .update({ [field]: supabase.raw(`${field} + 1`) })
        .eq('id', articleId);

    } catch (err) {
      console.error('Error submitting feedback:', err);
      throw err;
    }
  };

  return {
    articles,
    loading,
    error,
    fetchArticles,
    getArticle,
    submitFeedback,
  };
}

// Hook for FAQ system
export function useFAQ() {
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('faq_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching FAQ categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (categoryId?: string) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('faq_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching FAQ items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch FAQ items');
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async (faqId: string) => {
    try {
      await supabase.rpc('increment_faq_views', { faq_uuid: faqId });
    } catch (err) {
      console.error('Error incrementing FAQ views:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  return {
    categories,
    items,
    loading,
    error,
    fetchItems,
    incrementViews,
    refetch: () => {
      fetchCategories();
      fetchItems();
    },
  };
}

// Hook for updating ticket satisfaction
export function useTicketSatisfaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitSatisfaction = async (
    ticketId: string, 
    rating: number, 
    feedback?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({
          satisfaction_rating: rating,
          satisfaction_feedback: feedback,
        })
        .eq('id', ticketId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error submitting satisfaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit satisfaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    submitSatisfaction,
    loading,
    error,
  };
}
