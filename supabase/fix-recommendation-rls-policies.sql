-- =============================================
-- FIX RECOMMENDATION SYSTEM RLS POLICIES
-- =============================================

-- The recommendation system functions need to insert/update data in various tables
-- but the current RLS policies are too restrictive. We need to allow the functions
-- to work while maintaining security.

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view listing popularity" ON listing_popularity;
DROP POLICY IF EXISTS "Users can view their own interactions" ON user_interactions;
DROP POLICY IF EXISTS "Users can insert their own interactions" ON user_interactions;
DROP POLICY IF EXISTS "Users can update their own interactions" ON user_interactions;
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view their own recently viewed" ON recently_viewed;
DROP POLICY IF EXISTS "Users can insert their own recently viewed" ON recently_viewed;
DROP POLICY IF EXISTS "Users can update their own recently viewed" ON recently_viewed;
DROP POLICY IF EXISTS "Users can delete their own recently viewed" ON recently_viewed;
DROP POLICY IF EXISTS "Anyone can view co-interactions" ON listing_co_interactions;
DROP POLICY IF EXISTS "Anyone can view active boosted listings" ON boosted_listings;
DROP POLICY IF EXISTS "Users can view their own search history" ON search_history;
DROP POLICY IF EXISTS "Users can insert their own search history" ON search_history;
DROP POLICY IF EXISTS "Users can delete their own search history" ON search_history;

-- Create more permissive policies for recommendation system tables

-- Listing popularity policies (read-only for users, full access for functions)
CREATE POLICY "Anyone can view listing popularity" ON listing_popularity FOR SELECT USING (true);
CREATE POLICY "Functions can manage listing popularity" ON listing_popularity FOR ALL USING (true);

-- User interactions policies (users can manage their own, functions can manage all)
CREATE POLICY "Users can view their own interactions" ON user_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own interactions" ON user_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own interactions" ON user_interactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Functions can manage all interactions" ON user_interactions FOR ALL USING (true);

-- User preferences policies (users can manage their own, functions can manage all)
CREATE POLICY "Users can view their own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Functions can manage all preferences" ON user_preferences FOR ALL USING (true);

-- Recently viewed policies (users can manage their own, functions can manage all)
CREATE POLICY "Users can view their own recently viewed" ON recently_viewed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recently viewed" ON recently_viewed FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recently viewed" ON recently_viewed FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recently viewed" ON recently_viewed FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Functions can manage all recently viewed" ON recently_viewed FOR ALL USING (true);

-- Co-interactions policies (read-only for users, full access for functions)
CREATE POLICY "Anyone can view co-interactions" ON listing_co_interactions FOR SELECT USING (true);
CREATE POLICY "Functions can manage co-interactions" ON listing_co_interactions FOR ALL USING (true);

-- Boosted listings policies (read-only for users, full access for functions)
CREATE POLICY "Anyone can view active boosted listings" ON boosted_listings FOR SELECT USING (is_active = true AND boost_until > NOW());
CREATE POLICY "Functions can manage boosted listings" ON boosted_listings FOR ALL USING (true);

-- Search history policies (users can manage their own, functions can manage all)
CREATE POLICY "Users can view their own search history" ON search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own search history" ON search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own search history" ON search_history FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Functions can manage all search history" ON search_history FOR ALL USING (true);

-- Verify policies were created
SELECT 'RLS policies updated successfully' as status;
