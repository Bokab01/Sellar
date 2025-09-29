-- Fix Security Lints - Comprehensive Security and RLS Fix
-- This migration addresses all security issues identified by Supabase linter

-- 1. Fix SECURITY DEFINER Views
-- These views bypass RLS policies and should be changed to SECURITY INVOKER

-- Fix listings_with_category view
DROP VIEW IF EXISTS public.listings_with_category;
CREATE VIEW public.listings_with_category WITH (security_invoker = true) AS
SELECT 
    l.*,
    c.name as category_name,
    c.name as category_display_name,
    c.icon as category_icon,
    c.sort_order
FROM public.listings l
LEFT JOIN public.categories c ON l.category_id = c.id;

-- Fix listings_with_spotlight_category view  
DROP VIEW IF EXISTS public.listings_with_spotlight_category;
CREATE VIEW public.listings_with_spotlight_category WITH (security_invoker = true) AS
SELECT 
    l.*,
    c.name as category_name,
    c.name as category_display_name,
    c.icon as category_icon,
    c.sort_order
FROM public.listings l
LEFT JOIN public.categories c ON l.category_id = c.id
WHERE l.spotlight_until > NOW();

-- 2. Enable RLS on all tables that are missing it

-- Enable RLS on category_id_mapping
ALTER TABLE public.category_id_mapping ENABLE ROW LEVEL SECURITY;

-- Enable RLS on support_ticket_messages
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on kb_articles
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on faq_items
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on data_deletion_requests
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on feature_purchases
ALTER TABLE public.feature_purchases ENABLE ROW LEVEL SECURITY;

-- Enable RLS on moderation_actions
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on moderation_rules
ALTER TABLE public.moderation_rules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on moderation_categories
ALTER TABLE public.moderation_categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_reputation
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for all tables

-- Category ID Mapping policies
CREATE POLICY "category_id_mapping_select_policy" ON public.category_id_mapping
    FOR SELECT USING (true);

CREATE POLICY "category_id_mapping_insert_policy" ON public.category_id_mapping
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "category_id_mapping_update_policy" ON public.category_id_mapping
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "category_id_mapping_delete_policy" ON public.category_id_mapping
    FOR DELETE USING (auth.role() = 'service_role');

-- Support Ticket Messages policies
CREATE POLICY "support_ticket_messages_select_policy" ON public.support_ticket_messages
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT user_id FROM public.support_tickets 
            WHERE id = ticket_id
        ) OR
        auth.role() = 'service_role'
    );

CREATE POLICY "support_ticket_messages_insert_policy" ON public.support_ticket_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "support_ticket_messages_update_policy" ON public.support_ticket_messages
    FOR UPDATE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "support_ticket_messages_delete_policy" ON public.support_ticket_messages
    FOR DELETE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- Support Tickets policies
CREATE POLICY "support_tickets_select_policy" ON public.support_tickets
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "support_tickets_insert_policy" ON public.support_tickets
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "support_tickets_update_policy" ON public.support_tickets
    FOR UPDATE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "support_tickets_delete_policy" ON public.support_tickets
    FOR DELETE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- KB Articles policies (public read, admin write)
CREATE POLICY "kb_articles_select_policy" ON public.kb_articles
    FOR SELECT USING (true);

CREATE POLICY "kb_articles_insert_policy" ON public.kb_articles
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "kb_articles_update_policy" ON public.kb_articles
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "kb_articles_delete_policy" ON public.kb_articles
    FOR DELETE USING (auth.role() = 'service_role');

-- FAQ Items policies (public read, admin write)
CREATE POLICY "faq_items_select_policy" ON public.faq_items
    FOR SELECT USING (true);

CREATE POLICY "faq_items_insert_policy" ON public.faq_items
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "faq_items_update_policy" ON public.faq_items
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "faq_items_delete_policy" ON public.faq_items
    FOR DELETE USING (auth.role() = 'service_role');

-- Data Deletion Requests policies
CREATE POLICY "data_deletion_requests_select_policy" ON public.data_deletion_requests
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "data_deletion_requests_insert_policy" ON public.data_deletion_requests
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "data_deletion_requests_update_policy" ON public.data_deletion_requests
    FOR UPDATE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "data_deletion_requests_delete_policy" ON public.data_deletion_requests
    FOR DELETE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- Feature Purchases policies
CREATE POLICY "feature_purchases_select_policy" ON public.feature_purchases
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "feature_purchases_insert_policy" ON public.feature_purchases
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "feature_purchases_update_policy" ON public.feature_purchases
    FOR UPDATE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "feature_purchases_delete_policy" ON public.feature_purchases
    FOR DELETE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- Moderation Actions policies (admin only)
CREATE POLICY "moderation_actions_select_policy" ON public.moderation_actions
    FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "moderation_actions_insert_policy" ON public.moderation_actions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "moderation_actions_update_policy" ON public.moderation_actions
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "moderation_actions_delete_policy" ON public.moderation_actions
    FOR DELETE USING (auth.role() = 'service_role');

-- Moderation Rules policies (admin only)
CREATE POLICY "moderation_rules_select_policy" ON public.moderation_rules
    FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "moderation_rules_insert_policy" ON public.moderation_rules
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "moderation_rules_update_policy" ON public.moderation_rules
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "moderation_rules_delete_policy" ON public.moderation_rules
    FOR DELETE USING (auth.role() = 'service_role');

-- Moderation Categories policies (public read, admin write)
CREATE POLICY "moderation_categories_select_policy" ON public.moderation_categories
    FOR SELECT USING (true);

CREATE POLICY "moderation_categories_insert_policy" ON public.moderation_categories
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "moderation_categories_update_policy" ON public.moderation_categories
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "moderation_categories_delete_policy" ON public.moderation_categories
    FOR DELETE USING (auth.role() = 'service_role');

-- User Reputation policies
CREATE POLICY "user_reputation_select_policy" ON public.user_reputation
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "user_reputation_insert_policy" ON public.user_reputation
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "user_reputation_update_policy" ON public.user_reputation
    FOR UPDATE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "user_reputation_delete_policy" ON public.user_reputation
    FOR DELETE USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- 4. Grant necessary permissions for service role
GRANT ALL ON public.category_id_mapping TO service_role;
GRANT ALL ON public.support_ticket_messages TO service_role;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.kb_articles TO service_role;
GRANT ALL ON public.faq_items TO service_role;
GRANT ALL ON public.data_deletion_requests TO service_role;
GRANT ALL ON public.feature_purchases TO service_role;
GRANT ALL ON public.moderation_actions TO service_role;
GRANT ALL ON public.moderation_rules TO service_role;
GRANT ALL ON public.moderation_categories TO service_role;
GRANT ALL ON public.user_reputation TO service_role;

-- 5. Grant read permissions for authenticated users where appropriate
GRANT SELECT ON public.kb_articles TO authenticated;
GRANT SELECT ON public.faq_items TO authenticated;
GRANT SELECT ON public.moderation_categories TO authenticated;
