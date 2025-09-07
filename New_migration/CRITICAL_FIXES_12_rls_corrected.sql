-- =============================================
-- CRITICAL FIX: RLS POLICIES CORRECTED FOR EXACT TABLE MATCHES
-- This replaces 12_rls_policies.sql with policies for corrected table structures
-- =============================================

-- =============================================
-- ENABLE RLS ON ALL TABLES (CORRECTED NAMES)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_activity_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tables from other migrations
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;

ALTER TABLE moderation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_blacklist ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_searches ENABLE ROW LEVEL SECURITY;

ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES AND AUTH POLICIES (CORRECTED)
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view all public profiles" ON profiles
    FOR SELECT USING (
        is_active = true AND (
            id = auth.uid() OR
            EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = profiles.id)
        )
    );

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users cannot delete profiles" ON profiles
    FOR DELETE USING (false);

-- User settings policies
CREATE POLICY "Users can manage their own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Security events policies
CREATE POLICY "Users can view their own security events" ON security_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert security events" ON security_events
    FOR INSERT WITH CHECK (true);

-- Profile activity log policies
CREATE POLICY "Users can view their own activity log" ON profile_activity_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON profile_activity_log
    FOR INSERT WITH CHECK (true);

-- =============================================
-- CATEGORIES AND LISTINGS POLICIES (CORRECTED)
-- =============================================

-- Categories policies (public read)
CREATE POLICY "Anyone can view active categories" ON categories
    FOR SELECT USING (is_active = true);

-- Listings policies (corrected field names)
CREATE POLICY "Anyone can view active listings" ON listings
    FOR SELECT USING (status = 'active' AND moderation_status = 'approved');

CREATE POLICY "Users can view their own listings" ON listings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listings" ON listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings" ON listings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings" ON listings
    FOR DELETE USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can manage their own favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- MESSAGING POLICIES (CORRECTED FIELD NAMES)
-- =============================================

-- Conversations policies (corrected field names: participant_1, participant_2)
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

CREATE POLICY "Users can create conversations they participate in" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id 
            AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id 
            AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Offers policies (corrected table name)
CREATE POLICY "Users can view offers in their conversations" ON offers
    FOR SELECT USING (
        auth.uid() = buyer_id OR auth.uid() = seller_id
    );

CREATE POLICY "Users can create offers" ON offers
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update offers they made or received" ON offers
    FOR UPDATE USING (
        auth.uid() = buyer_id OR auth.uid() = seller_id
    );

-- =============================================
-- SOCIAL FEATURES POLICIES (CORRECTED FIELD NAMES)
-- =============================================

-- Posts policies
CREATE POLICY "Anyone can view published posts" ON posts
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can view their own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own posts" ON posts
    FOR ALL USING (auth.uid() = user_id);

-- Comments policies (corrected field name: parent_id)
CREATE POLICY "Anyone can view published comments" ON comments
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can view their own comments" ON comments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comments" ON comments
    FOR ALL USING (auth.uid() = user_id);

-- Likes policies (corrected table name and field names)
CREATE POLICY "Users can manage their own likes" ON likes
    FOR ALL USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Users can view all follows" ON follows
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows" ON follows
    FOR ALL USING (auth.uid() = follower_id);

-- Reviews policies (corrected field name: reviewed_id)
CREATE POLICY "Anyone can view published reviews" ON reviews
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can view reviews they wrote or received" ON reviews
    FOR SELECT USING (
        auth.uid() = reviewer_id OR auth.uid() = reviewed_id
    );

CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- =============================================
-- MISSING TABLES POLICIES
-- =============================================

-- Callback requests policies
CREATE POLICY "Users can manage their own callback requests" ON callback_requests
    FOR ALL USING (auth.uid() = user_id);

-- Transaction receipts policies
CREATE POLICY "Users can view their own transaction receipts" ON transaction_receipts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage transaction receipts" ON transaction_receipts
    FOR ALL USING (true);

-- Transaction notifications policies
CREATE POLICY "Users can view their own transaction notifications" ON transaction_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage transaction notifications" ON transaction_notifications
    FOR ALL USING (true);

-- Credit packages policies (public read)
CREATE POLICY "Anyone can view active credit packages" ON credit_packages
    FOR SELECT USING (is_active = true);

-- User subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user subscriptions" ON user_subscriptions
    FOR ALL USING (true);

-- Transaction categories policies (public read)
CREATE POLICY "Anyone can view active transaction categories" ON transaction_categories
    FOR SELECT USING (is_active = true);

-- =============================================
-- MONETIZATION POLICIES (FROM EXISTING MIGRATIONS)
-- =============================================

-- User credits policies
CREATE POLICY "Users can view their own credits" ON user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user credits" ON user_credits
    FOR ALL USING (true);

-- Credit transactions policies
CREATE POLICY "Users can view their own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON credit_transactions
    FOR INSERT WITH CHECK (true);

-- Credit purchases policies
CREATE POLICY "Users can manage their own purchases" ON credit_purchases
    FOR ALL USING (auth.uid() = user_id);

-- Paystack transactions policies
CREATE POLICY "Users can view their own paystack transactions" ON paystack_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage paystack transactions" ON paystack_transactions
    FOR ALL USING (true);

-- Subscription plans policies (public read)
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- Feature purchases policies
CREATE POLICY "Users can view their own feature purchases" ON feature_purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage feature purchases" ON feature_purchases
    FOR ALL USING (true);

-- Plan entitlements policies (public read)
CREATE POLICY "Anyone can view plan entitlements" ON plan_entitlements
    FOR SELECT USING (true);

-- =============================================
-- MODERATION POLICIES
-- =============================================

-- Moderation categories policies (public read)
CREATE POLICY "Anyone can view active moderation categories" ON moderation_categories
    FOR SELECT USING (is_active = true);

-- Moderation logs policies (system only)
CREATE POLICY "System can manage moderation logs" ON moderation_logs
    FOR ALL USING (true);

-- Reports policies
CREATE POLICY "Users can view their own reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- User reputation policies
CREATE POLICY "Anyone can view user reputation" ON user_reputation
    FOR SELECT USING (true);

CREATE POLICY "System can manage user reputation" ON user_reputation
    FOR ALL USING (true);

-- Keyword blacklist policies (system only)
CREATE POLICY "System can manage keyword blacklist" ON keyword_blacklist
    FOR ALL USING (true);

-- =============================================
-- VERIFICATION POLICIES
-- =============================================

-- User verification policies
CREATE POLICY "Users can view their own verifications" ON user_verification
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verifications" ON user_verification
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verifications" ON user_verification
    FOR UPDATE USING (auth.uid() = user_id);

-- Verification documents policies
CREATE POLICY "Users can view their own verification documents" ON verification_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_verification 
            WHERE id = verification_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own verification documents" ON verification_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_verification 
            WHERE id = verification_id AND user_id = auth.uid()
        )
    );

-- Verification templates policies (public read)
CREATE POLICY "Anyone can view active verification templates" ON verification_templates
    FOR SELECT USING (is_active = true);

-- Verification history policies
CREATE POLICY "Users can view their own verification history" ON verification_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert verification history" ON verification_history
    FOR INSERT WITH CHECK (true);

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Device tokens policies
CREATE POLICY "Users can manage their own device tokens" ON device_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage notifications" ON notifications
    FOR ALL USING (true);

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- ANALYTICS POLICIES
-- =============================================

-- Search analytics policies
CREATE POLICY "Users can view their own search analytics" ON search_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert search analytics" ON search_analytics
    FOR INSERT WITH CHECK (true);

-- Search suggestions policies (public read)
CREATE POLICY "Anyone can view active search suggestions" ON search_suggestions
    FOR SELECT USING (is_active = true);

CREATE POLICY "System can manage search suggestions" ON search_suggestions
    FOR ALL USING (true);

-- User activity log policies
CREATE POLICY "Users can view their own activity log" ON user_activity_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON user_activity_log
    FOR INSERT WITH CHECK (true);

-- Popular searches policies (public read)
CREATE POLICY "Anyone can view popular searches" ON popular_searches
    FOR SELECT USING (true);

CREATE POLICY "System can manage popular searches" ON popular_searches
    FOR ALL USING (true);

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Storage usage policies
CREATE POLICY "Users can view their own storage usage" ON storage_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage storage usage" ON storage_usage
    FOR ALL USING (true);

-- Success message
SELECT 'CRITICAL FIX: RLS policies corrected for exact table and field name matches!' as status;
