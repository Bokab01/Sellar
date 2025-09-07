-- =============================================
-- SELLAR MOBILE APP - ROW LEVEL SECURITY POLICIES
-- Migration 12: Comprehensive RLS policies for all tables
-- =============================================

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_activity_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_inquiries ENABLE ROW LEVEL SECURITY;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

-- Support System Tables
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

-- Reward System Tables
ALTER TABLE community_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reward_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_triggers ENABLE ROW LEVEL SECURITY;

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
-- PROFILES AND AUTH POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view all public profiles" ON profiles
    FOR SELECT USING (
        profile_visibility = 'public' OR 
        auth.uid() = id OR
        (profile_visibility = 'contacts' AND EXISTS (
            SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = profiles.id
        ))
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
-- CATEGORIES AND LISTINGS POLICIES
-- =============================================

-- Categories policies (public read)
CREATE POLICY "Anyone can view active categories" ON categories
    FOR SELECT USING (is_active = true);

-- Category attributes policies (public read)
CREATE POLICY "Anyone can view active category attributes" ON category_attributes
    FOR SELECT USING (is_active = true);

-- Listings policies
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

-- Listing views policies
CREATE POLICY "Anyone can insert listing views" ON listing_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view listing views for their listings" ON listing_views
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND user_id = auth.uid())
    );

-- Favorites policies
CREATE POLICY "Users can manage their own favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id);

-- Listing inquiries policies
CREATE POLICY "Users can view inquiries for their listings" ON listing_inquiries
    FOR SELECT USING (
        auth.uid() = inquirer_id OR
        EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can create inquiries" ON listing_inquiries
    FOR INSERT WITH CHECK (auth.uid() = inquirer_id);

CREATE POLICY "Listing owners can update inquiries" ON listing_inquiries
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND user_id = auth.uid())
    );

-- =============================================
-- MESSAGING POLICIES
-- =============================================

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

CREATE POLICY "Users can create conversations they participate in" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id 
            AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id 
            AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Message reactions policies
CREATE POLICY "Users can manage reactions in their conversations" ON message_reactions
    FOR ALL USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.id = message_id 
            AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
        )
    );

-- Chat offers policies
CREATE POLICY "Users can view offers in their conversations" ON chat_offers
    FOR SELECT USING (
        auth.uid() = offered_by OR auth.uid() = offered_to
    );

CREATE POLICY "Users can create offers" ON chat_offers
    FOR INSERT WITH CHECK (auth.uid() = offered_by);

CREATE POLICY "Users can update offers they made or received" ON chat_offers
    FOR UPDATE USING (
        auth.uid() = offered_by OR auth.uid() = offered_to
    );

-- Blocked users policies
CREATE POLICY "Users can manage their own blocked list" ON blocked_users
    FOR ALL USING (auth.uid() = blocker_id);

-- =============================================
-- MONETIZATION POLICIES
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

-- User subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user subscriptions" ON user_subscriptions
    FOR ALL USING (true);

-- Feature purchases policies
CREATE POLICY "Users can view their own feature purchases" ON feature_purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage feature purchases" ON feature_purchases
    FOR ALL USING (true);

-- Plan entitlements policies (public read)
CREATE POLICY "Anyone can view plan entitlements" ON plan_entitlements
    FOR SELECT USING (true);

-- =============================================
-- SOCIAL FEATURES POLICIES
-- =============================================

-- Reviews policies
CREATE POLICY "Anyone can view published reviews" ON reviews
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can view reviews they wrote or received" ON reviews
    FOR SELECT USING (
        auth.uid() = reviewer_id OR auth.uid() = reviewed_user_id
    );

CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- Review helpful votes policies
CREATE POLICY "Users can manage their own review votes" ON review_helpful_votes
    FOR ALL USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Users can view all follows" ON follows
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows" ON follows
    FOR ALL USING (auth.uid() = follower_id);

-- Posts policies
CREATE POLICY "Anyone can view published posts" ON posts
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can view their own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own posts" ON posts
    FOR ALL USING (auth.uid() = user_id);

-- Post likes policies
CREATE POLICY "Users can manage their own post likes" ON post_likes
    FOR ALL USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view published comments" ON comments
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can view their own comments" ON comments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comments" ON comments
    FOR ALL USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY "Users can manage their own comment likes" ON comment_likes
    FOR ALL USING (auth.uid() = user_id);

-- Shares policies
CREATE POLICY "Anyone can view shares" ON shares
    FOR SELECT USING (true);

CREATE POLICY "Users can create shares" ON shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shares" ON shares
    FOR DELETE USING (auth.uid() = user_id);

-- Post bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON post_bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks" ON post_bookmarks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks" ON post_bookmarks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON post_bookmarks
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SUPPORT SYSTEM POLICIES
-- =============================================

-- Support tickets policies
CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" ON support_tickets
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Support ticket messages policies
CREATE POLICY "Users can view ticket messages" ON support_ticket_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create ticket messages" ON support_ticket_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()
        )
    );

-- Knowledge base articles policies
CREATE POLICY "Anyone can view published articles" ON kb_articles
    FOR SELECT
    TO authenticated
    USING (status = 'published');

CREATE POLICY "Authors can manage own articles" ON kb_articles
    FOR ALL
    TO authenticated
    USING (auth.uid() = author_id);

-- Knowledge base feedback policies
CREATE POLICY "Users can create feedback" ON kb_article_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON kb_article_feedback
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- FAQ categories policies
CREATE POLICY "Anyone can view active FAQ categories" ON faq_categories
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- FAQ items policies
CREATE POLICY "Anyone can view active FAQ items" ON faq_items
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- =============================================
-- REWARD SYSTEM POLICIES
-- =============================================

-- Community rewards policies
CREATE POLICY "Users can view own rewards" ON community_rewards
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "System can create rewards" ON community_rewards
    FOR INSERT
    TO authenticated
    WITH CHECK (true); -- System functions can create rewards

-- User achievements policies
CREATE POLICY "Users can view own achievements" ON user_achievements
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "System can manage achievements" ON user_achievements
    FOR ALL
    TO authenticated
    USING (true); -- System functions can manage achievements

-- User reward history policies
CREATE POLICY "Users can view own reward history" ON user_reward_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "System can manage reward history" ON user_reward_history
    FOR ALL
    TO authenticated
    USING (true); -- System functions can manage reward history

-- Reward triggers policies (admin only)
CREATE POLICY "System can manage reward triggers" ON reward_triggers
    FOR ALL
    TO authenticated
    USING (true); -- System functions can manage triggers

-- =============================================
-- MODERATION POLICIES
-- =============================================

-- Moderation categories policies (public read)
CREATE POLICY "Anyone can view active moderation categories" ON moderation_categories
    FOR SELECT USING (is_active = true);

-- Moderation logs policies (admin only)
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
SELECT 'Row Level Security policies created successfully!' as status;
