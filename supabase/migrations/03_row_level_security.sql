-- Sellar Mobile App - Row Level Security (RLS) Policies
-- Secure access control for all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetup_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetup_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can view all profiles (public information)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users cannot delete profiles (handled by auth cascade)
CREATE POLICY "Profiles cannot be deleted by users" ON profiles
    FOR DELETE USING (false);

-- =============================================
-- CATEGORIES POLICIES
-- =============================================

-- Categories are readable by everyone
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

-- Only service role can modify categories
CREATE POLICY "Only service role can modify categories" ON categories
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- LISTINGS POLICIES
-- =============================================

-- Active listings are viewable by everyone
CREATE POLICY "Active listings are viewable by everyone" ON listings
    FOR SELECT USING (
        status = 'active' OR 
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- Users can insert their own listings
CREATE POLICY "Users can insert their own listings" ON listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own listings
CREATE POLICY "Users can update their own listings" ON listings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own listings
CREATE POLICY "Users can delete their own listings" ON listings
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- LISTING VIEWS POLICIES
-- =============================================

-- Anyone can insert listing views
CREATE POLICY "Anyone can insert listing views" ON listing_views
    FOR INSERT WITH CHECK (true);

-- Users can view their own listing views
CREATE POLICY "Users can view their own listing views" ON listing_views
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.uid() IN (SELECT user_id FROM listings WHERE id = listing_id)
    );

-- =============================================
-- FAVORITES POLICIES
-- =============================================

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites" ON favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites" ON favorites
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- CONVERSATIONS POLICIES
-- =============================================

-- Users can view conversations they participate in
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

-- Users can update conversations they participate in
CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

-- Users can delete conversations they participate in
CREATE POLICY "Users can delete their conversations" ON conversations
    FOR DELETE USING (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

-- =============================================
-- MESSAGES POLICIES
-- =============================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT participant_1 FROM conversations WHERE id = conversation_id
            UNION
            SELECT participant_2 FROM conversations WHERE id = conversation_id
        )
    );

-- Users can insert messages in their conversations
CREATE POLICY "Users can insert messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        auth.uid() IN (
            SELECT participant_1 FROM conversations WHERE id = conversation_id
            UNION
            SELECT participant_2 FROM conversations WHERE id = conversation_id
        )
    );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON messages
    FOR DELETE USING (auth.uid() = sender_id);

-- =============================================
-- OFFERS POLICIES
-- =============================================

-- Users can view offers they're involved in
CREATE POLICY "Users can view their offers" ON offers
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id
    );

-- Users can create offers as buyers
CREATE POLICY "Users can create offers as buyers" ON offers
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Users can update offers they're involved in
CREATE POLICY "Users can update their offers" ON offers
    FOR UPDATE USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id
    );

-- =============================================
-- CALLBACK REQUESTS POLICIES
-- =============================================

-- Users can view callback requests they're involved in
CREATE POLICY "Users can view their callback requests" ON callback_requests
    FOR SELECT USING (
        auth.uid() = requester_id OR 
        auth.uid() = seller_id
    );

-- Users can create callback requests
CREATE POLICY "Users can create callback requests" ON callback_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Users can update callback requests they're involved in
CREATE POLICY "Users can update their callback requests" ON callback_requests
    FOR UPDATE USING (
        auth.uid() = requester_id OR 
        auth.uid() = seller_id
    );

-- =============================================
-- POSTS POLICIES
-- =============================================

-- Posts are viewable by everyone
CREATE POLICY "Posts are viewable by everyone" ON posts
    FOR SELECT USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can insert their own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- COMMENTS POLICIES
-- =============================================

-- Comments are viewable by everyone
CREATE POLICY "Comments are viewable by everyone" ON comments
    FOR SELECT USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert their own comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- LIKES POLICIES
-- =============================================

-- Users can view all likes
CREATE POLICY "Likes are viewable by everyone" ON likes
    FOR SELECT USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can insert their own likes" ON likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete their own likes" ON likes
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SHARES POLICIES
-- =============================================

-- Users can view all shares
CREATE POLICY "Shares are viewable by everyone" ON shares
    FOR SELECT USING (true);

-- Users can insert their own shares
CREATE POLICY "Users can insert their own shares" ON shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares" ON shares
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- FOLLOWS POLICIES
-- =============================================

-- Users can view all follows
CREATE POLICY "Follows are viewable by everyone" ON follows
    FOR SELECT USING (true);

-- Users can insert their own follows
CREATE POLICY "Users can insert their own follows" ON follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows
CREATE POLICY "Users can delete their own follows" ON follows
    FOR DELETE USING (auth.uid() = follower_id);

-- =============================================
-- REVIEWS POLICIES
-- =============================================

-- Reviews are viewable by everyone
CREATE POLICY "Reviews are viewable by everyone" ON reviews
    FOR SELECT USING (true);

-- Users can insert reviews they write
CREATE POLICY "Users can insert their own reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Users can update reviews they write
CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- Users can delete reviews they write
CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid() = reviewer_id);

-- =============================================
-- TRANSACTIONS POLICIES
-- =============================================

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update transactions
CREATE POLICY "Service role can update transactions" ON transactions
    FOR UPDATE USING (auth.role() = 'service_role');

-- =============================================
-- PAYSTACK TRANSACTIONS POLICIES
-- =============================================

-- Users can view their own paystack transactions
CREATE POLICY "Users can view their own paystack transactions" ON paystack_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own paystack transactions
CREATE POLICY "Users can insert their own paystack transactions" ON paystack_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update paystack transactions
CREATE POLICY "Service role can update paystack transactions" ON paystack_transactions
    FOR UPDATE USING (auth.role() = 'service_role');

-- =============================================
-- MEETUP TRANSACTIONS POLICIES
-- =============================================

-- Users can view meetup transactions they're involved in
CREATE POLICY "Users can view their meetup transactions" ON meetup_transactions
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id
    );

-- Users can insert meetup transactions as buyers
CREATE POLICY "Users can create meetup transactions as buyers" ON meetup_transactions
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Users can update meetup transactions they're involved in
CREATE POLICY "Users can update their meetup transactions" ON meetup_transactions
    FOR UPDATE USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id
    );

-- =============================================
-- USER CREDITS POLICIES
-- =============================================

-- Users can view their own credits
CREATE POLICY "Users can view their own credits" ON user_credits
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own credits record
CREATE POLICY "Users can insert their own credits" ON user_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update credits
CREATE POLICY "Service role can update credits" ON user_credits
    FOR UPDATE USING (auth.role() = 'service_role');

-- =============================================
-- CREDIT TRANSACTIONS POLICIES
-- =============================================

-- Users can view their own credit transactions
CREATE POLICY "Users can view their own credit transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert credit transactions
CREATE POLICY "Service role can insert credit transactions" ON credit_transactions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- CREDIT PACKAGES POLICIES
-- =============================================

-- Credit packages are viewable by everyone
CREATE POLICY "Credit packages are viewable by everyone" ON credit_packages
    FOR SELECT USING (is_active = true);

-- Only service role can modify credit packages
CREATE POLICY "Only service role can modify credit packages" ON credit_packages
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- CREDIT PURCHASES POLICIES
-- =============================================

-- Users can view their own credit purchases
CREATE POLICY "Users can view their own credit purchases" ON credit_purchases
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own credit purchases
CREATE POLICY "Users can insert their own credit purchases" ON credit_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update credit purchases
CREATE POLICY "Service role can update credit purchases" ON credit_purchases
    FOR UPDATE USING (auth.role() = 'service_role');

-- =============================================
-- SUBSCRIPTION PLANS POLICIES
-- =============================================

-- Active subscription plans are viewable by everyone
CREATE POLICY "Active subscription plans are viewable by everyone" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- Only service role can modify subscription plans
CREATE POLICY "Only service role can modify subscription plans" ON subscription_plans
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- USER SUBSCRIPTIONS POLICIES
-- =============================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update subscriptions
CREATE POLICY "Service role can update subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.role() = 'service_role');

-- =============================================
-- COMMUNITY REWARDS POLICIES
-- =============================================

-- Users can view their own community rewards
CREATE POLICY "Users can view their own community rewards" ON community_rewards
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert community rewards
CREATE POLICY "Service role can insert community rewards" ON community_rewards
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- USER ACHIEVEMENTS POLICIES
-- =============================================

-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert achievements
CREATE POLICY "Service role can insert achievements" ON user_achievements
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- USER VERIFICATION POLICIES
-- =============================================

-- Users can view their own verification requests
CREATE POLICY "Users can view their own verification" ON user_verification
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own verification requests
CREATE POLICY "Users can insert their own verification" ON user_verification
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own verification requests (for resubmission)
CREATE POLICY "Users can update their own verification" ON user_verification
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- USER SETTINGS POLICIES
-- =============================================

-- Users can view their own settings
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- NOTIFICATION PREFERENCES POLICIES
-- =============================================

-- Users can view their own notification preferences
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notification preferences
CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own notification preferences
CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- DEVICE TOKENS POLICIES
-- =============================================

-- Users can view their own device tokens
CREATE POLICY "Users can view their own device tokens" ON device_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own device tokens
CREATE POLICY "Users can insert their own device tokens" ON device_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own device tokens
CREATE POLICY "Users can update their own device tokens" ON device_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own device tokens
CREATE POLICY "Users can delete their own device tokens" ON device_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PUSH NOTIFICATION QUEUE POLICIES
-- =============================================

-- Only service role can access push notification queue
CREATE POLICY "Only service role can access push notification queue" ON push_notification_queue
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- REPORTS POLICIES
-- =============================================

-- Users can view reports they created
CREATE POLICY "Users can view their own reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Users can insert their own reports
CREATE POLICY "Users can insert their own reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- =============================================
-- BLOCKED USERS POLICIES
-- =============================================

-- Users can view their own blocked users list
CREATE POLICY "Users can view their own blocked users" ON blocked_users
    FOR SELECT USING (auth.uid() = blocker_id);

-- Users can insert their own blocks
CREATE POLICY "Users can insert their own blocks" ON blocked_users
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete their own blocks" ON blocked_users
    FOR DELETE USING (auth.uid() = blocker_id);

-- =============================================
-- APP SETTINGS POLICIES
-- =============================================

-- App settings are viewable by everyone (for public configuration)
CREATE POLICY "App settings are viewable by everyone" ON app_settings
    FOR SELECT USING (true);

-- Only service role can modify app settings
CREATE POLICY "Only service role can modify app settings" ON app_settings
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- MEETUP TRANSACTIONS POLICIES
-- =============================================

-- Users can view transactions they are involved in
CREATE POLICY "Users can view their own meetup transactions" ON meetup_transactions
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id
    );

-- Users can insert transactions they are involved in
CREATE POLICY "Users can insert their own meetup transactions" ON meetup_transactions
    FOR INSERT WITH CHECK (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id
    );

-- Users can update transactions they are involved in
CREATE POLICY "Users can update their own meetup transactions" ON meetup_transactions
    FOR UPDATE USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id
    );

-- =============================================
-- TRANSACTION CATEGORIES POLICIES
-- =============================================

-- Transaction categories are viewable by everyone
CREATE POLICY "Transaction categories are viewable by everyone" ON transaction_categories
    FOR SELECT USING (is_active = true);

-- Only service role can modify transaction categories
CREATE POLICY "Only service role can modify transaction categories" ON transaction_categories
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- TRANSACTION RECEIPTS POLICIES
-- =============================================

-- Users can view receipts for their own transactions
CREATE POLICY "Users can view their own transaction receipts" ON transaction_receipts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.id = transaction_receipts.transaction_id 
            AND t.user_id = auth.uid()
        )
    );

-- Service role can insert transaction receipts
CREATE POLICY "Service role can insert transaction receipts" ON transaction_receipts
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- TRANSACTION NOTIFICATIONS POLICIES
-- =============================================

-- Users can view their own transaction notifications
CREATE POLICY "Users can view their own transaction notifications" ON transaction_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert transaction notifications
CREATE POLICY "Service role can insert transaction notifications" ON transaction_notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Users can update their own transaction notifications (mark as read)
CREATE POLICY "Users can update their own transaction notifications" ON transaction_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- SEARCH ANALYTICS POLICIES
-- =============================================

-- Users can view their own search analytics
CREATE POLICY "Users can view their own search analytics" ON search_analytics
    FOR SELECT USING (auth.uid() = user_id);

-- Anyone can insert search analytics (for anonymous searches)
CREATE POLICY "Anyone can insert search analytics" ON search_analytics
    FOR INSERT WITH CHECK (true);

-- Service role can view all search analytics
CREATE POLICY "Service role can view all search analytics" ON search_analytics
    FOR SELECT USING (auth.role() = 'service_role');

-- =============================================
-- SUBSCRIPTION CHANGE LOG POLICIES
-- =============================================

-- Users can view their own subscription change log
CREATE POLICY "Users can view their own subscription change log" ON subscription_change_log
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert subscription change log entries
CREATE POLICY "Service role can insert subscription change log" ON subscription_change_log
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Service role can view all subscription change logs
CREATE POLICY "Service role can view all subscription change logs" ON subscription_change_log
    FOR SELECT USING (auth.role() = 'service_role');
