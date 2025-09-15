-- Sellar Mobile App - Initial Seed Data
-- Insert essential data for the application to function

-- =============================================
-- CATEGORIES SEED DATA
-- =============================================

-- Insert main categories with predefined UUIDs for consistency
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
-- Main categories
('00000000-0000-4000-8000-000000000001', 'Electronics & Technology', 'electronics', NULL, 'smartphone', true, 1),
('00000000-0000-4000-8000-000000000002', 'Fashion', 'fashion', NULL, 'shirt', true, 2),
('00000000-0000-4000-8000-000000000003', 'Vehicles', 'vehicles', NULL, 'car', true, 3),
('00000000-0000-4000-8000-000000000004', 'Home & Garden', 'home-garden', NULL, 'home', true, 4),
('00000000-0000-4000-8000-000000000005', 'Sports & Fitness', 'health-sports', NULL, 'dumbbell', true, 5),
('00000000-0000-4000-8000-000000000006', 'Business & Industrial', 'business', NULL, 'briefcase', true, 6),
('00000000-0000-4000-8000-000000000007', 'Books & Media', 'education', NULL, 'book', true, 7),
('00000000-0000-4000-8000-000000000008', 'Entertainment', 'entertainment', NULL, 'gamepad-2', true, 8),
('00000000-0000-4000-8000-000000000009', 'Food & Beverages', 'food', NULL, 'utensils', true, 9),
('00000000-0000-4000-8000-000000000010', 'Services', 'services', NULL, 'briefcase', true, 10),
('00000000-0000-4000-8000-000000000011', 'Baby & Kids', 'baby-kids', NULL, 'baby', true, 11),
('00000000-0000-4000-8000-000000000012', 'Beauty & Health', 'beauty-health', NULL, 'heart', true, 12),
('00000000-0000-4000-8000-000000000013', 'Pets & Animals', 'pets-animals', NULL, 'heart', true, 13),
('00000000-0000-4000-8000-000000000014', 'Art & Crafts', 'art-crafts', NULL, 'palette', true, 14),
('00000000-0000-4000-8000-000000000015', 'Tickets & Events', 'tickets-events', NULL, 'ticket', true, 15),
('00000000-0000-4000-8000-000000000000', 'Other', 'general', NULL, 'more-horizontal', true, 16);

-- Electronics subcategories
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4000-8000-000000000001', 'Phones & Tablets', 'phones-tablets', '00000000-0000-4000-8000-000000000001', 'smartphone', true, 1),
('10000000-0000-4000-8000-000000000002', 'Computers & Laptops', 'computers', '00000000-0000-4000-8000-000000000001', 'laptop', true, 2),
('10000000-0000-4000-8000-000000000003', 'Audio & Video', 'audio-video', '00000000-0000-4000-8000-000000000001', 'headphones', true, 3),
('10000000-0000-4000-8000-000000000004', 'Gaming', 'gaming', '00000000-0000-4000-8000-000000000001', 'gamepad-2', true, 4),
('10000000-0000-4000-8000-000000000005', 'Home Appliances', 'home-appliances', '00000000-0000-4000-8000-000000000001', 'refrigerator', true, 5);

-- Fashion subcategories
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('20000000-0000-4000-8000-000000000001', 'Men''s Fashion', 'mens-fashion', '00000000-0000-4000-8000-000000000002', 'user', true, 1),
('20000000-0000-4000-8000-000000000002', 'Women''s Fashion', 'womens-fashion', '00000000-0000-4000-8000-000000000002', 'user', true, 2),
('20000000-0000-4000-8000-000000000003', 'Kids'' Fashion', 'kids-fashion', '00000000-0000-4000-8000-000000000002', 'baby', true, 3);

-- Vehicles subcategories
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('30000000-0000-4000-8000-000000000001', 'Cars', 'cars', '00000000-0000-4000-8000-000000000003', 'car', true, 1),
('30000000-0000-4000-8000-000000000002', 'Motorcycles', 'motorcycles', '00000000-0000-4000-8000-000000000003', 'bike', true, 2),
('30000000-0000-4000-8000-000000000003', 'Auto Parts & Accessories', 'auto-parts', '00000000-0000-4000-8000-000000000003', 'settings', true, 3);

-- Home & Garden subcategories
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('40000000-0000-4000-8000-000000000001', 'Furniture', 'furniture', '00000000-0000-4000-8000-000000000004', 'armchair', true, 1),
('40000000-0000-4000-8000-000000000002', 'Home Decor', 'home-decor', '00000000-0000-4000-8000-000000000004', 'palette', true, 2),
('40000000-0000-4000-8000-000000000003', 'Garden & Outdoor', 'garden', '00000000-0000-4000-8000-000000000004', 'flower', true, 3);

-- =============================================
-- CREDIT PACKAGES SEED DATA
-- =============================================

INSERT INTO credit_packages (id, name, credits, price_ghs, description, is_active) VALUES
('c0000000-0000-4000-8000-000000000001', 'Starter', 50, 15.00, 'Perfect for getting started', true),
('c0000000-0000-4000-8000-000000000002', 'Seller', 120, 25.00, 'Great value for regular sellers', true),
('c0000000-0000-4000-8000-000000000003', 'Pro', 300, 50.00, 'For serious sellers', true),
('c0000000-0000-4000-8000-000000000004', 'Max', 700, 100.00, 'Maximum value for power users', true);

-- =============================================
-- SUBSCRIPTION PLANS SEED DATA
-- =============================================

INSERT INTO subscription_plans (id, name, description, price_ghs, billing_cycle, features, is_active) VALUES
('a0000000-0000-4000-8000-000000000001', 'Sellar Business', 'Complete business solution for serious sellers', 400.00, 'monthly', 
'[
  "unlimited_listings",
  "120_boost_credits_monthly",
  "auto_boost_listings",
  "comprehensive_analytics",
  "priority_support",
  "homepage_placement",
  "premium_branding",
  "sponsored_posts",
  "bulk_operations"
]'::jsonb, true);

-- =============================================
-- APP SETTINGS SEED DATA
-- =============================================

INSERT INTO app_settings (key, value, description) VALUES
('app_version', '"1.0.0"', 'Current app version'),
('maintenance_mode', 'false', 'Whether the app is in maintenance mode'),
('max_free_listings', '5', 'Maximum number of free listings per user'),
('listing_expiry_days', '30', 'Number of days before listings expire'),
('max_images_per_listing', '8', 'Maximum number of images per listing'),
('min_offer_percentage', '0.5', 'Minimum offer as percentage of listing price'),
('max_offer_percentage', '1.5', 'Maximum offer as percentage of listing price'),
('referral_bonus_credits', '50', 'Credits awarded for successful referrals'),
('anniversary_bonus_credits', '100', 'Credits awarded on user anniversary'),
('verification_required_for_business', 'true', 'Whether verification is required for business accounts'),
('push_notifications_enabled', 'true', 'Whether push notifications are enabled globally'),
('chat_message_max_length', '1000', 'Maximum length of chat messages'),
('review_min_length', '10', 'Minimum length of review comments'),
('report_categories', 
'[
  "spam",
  "inappropriate_content",
  "fake_listing",
  "harassment",
  "fraud",
  "copyright_violation",
  "other"
]'::jsonb, 'Available report categories'),
('supported_currencies', '["GHS"]', 'List of supported currencies'),
('default_currency', '"GHS"', 'Default currency for the app'),
('search_results_per_page', '20', 'Number of search results per page'),
('conversation_auto_archive_days', '90', 'Days after which inactive conversations are archived'),
('offer_expiry_days', '7', 'Number of days before offers expire'),
('boost_duration_hours', '24', 'Duration of listing boost in hours'),
('mega_boost_duration_days', '7', 'Duration of mega boost in days'),
('category_spotlight_duration_days', '3', 'Duration of category spotlight in days');

-- =============================================
-- INITIAL ADMIN/SYSTEM DATA
-- =============================================

-- Note: User profiles will be created automatically when users sign up through Supabase Auth
-- The profiles table will be populated via triggers or the application logic

-- Create some sample notification preferences defaults (these will be used as templates)
-- Actual user preferences will be created when users first access notification settings

-- =============================================
-- VERIFICATION TEMPLATES (if needed)
-- =============================================

-- These could be stored in app_settings or a separate verification_templates table
-- For now, we'll store them in app_settings as JSON

INSERT INTO app_settings (key, value, description) VALUES
('verification_templates',
'{
  "phone": {
    "title": "Phone Verification",
    "description": "Verify your phone number to increase trust and enable SMS notifications",
    "required_documents": [],
    "verification_type": "phone"
  },
  "email": {
    "title": "Email Verification", 
    "description": "Verify your email address (usually done during signup)",
    "required_documents": [],
    "verification_type": "email"
  },
  "identity": {
    "title": "Identity Verification",
    "description": "Verify your identity with official government documents",
    "required_documents": ["national_id", "passport", "drivers_license"],
    "verification_type": "identity"
  },
  "business": {
    "title": "Business Verification",
    "description": "Verify your business registration and credentials",
    "required_documents": ["business_registration", "tax_certificate"],
    "verification_type": "business"
  },
  "address": {
    "title": "Address Verification",
    "description": "Verify your physical address with utility bills or bank statements",
    "required_documents": ["utility_bill", "bank_statement", "lease_agreement"],
    "verification_type": "address"
  }
}'::jsonb, 'Verification templates and requirements');

-- =============================================
-- SAMPLE ACHIEVEMENT TYPES
-- =============================================

INSERT INTO app_settings (key, value, description) VALUES
('achievement_types',
'{
  "first_listing": {
    "title": "First Listing",
    "description": "Created your first listing",
    "icon": "package",
    "points": 10
  },
  "first_sale": {
    "title": "First Sale",
    "description": "Made your first sale",
    "icon": "dollar-sign",
    "points": 50
  },
  "verified_seller": {
    "title": "Verified Seller",
    "description": "Completed identity verification",
    "icon": "shield-check",
    "points": 100
  },
  "community_contributor": {
    "title": "Community Contributor",
    "description": "Made 10 helpful posts in the community",
    "icon": "users",
    "points": 75
  },
  "power_seller": {
    "title": "Power Seller",
    "description": "Made 50+ successful sales",
    "icon": "trending-up",
    "points": 500
  },
  "early_adopter": {
    "title": "Early Adopter",
    "description": "Joined Sellar in the first month",
    "icon": "star",
    "points": 200
  }
}'::jsonb, 'Available achievement types and rewards');

-- =============================================
-- FEATURE COSTS (for monetization)
-- =============================================

INSERT INTO app_settings (key, value, description) VALUES
('feature_costs',
'{
  "pulse_boost_24h": 15,
  "mega_pulse_7d": 50,
  "category_spotlight_3d": 35,
  "ad_refresh": 5,
  "listing_highlight": 10,
  "urgent_badge": 8,
  "additional_listing": 10
}'::jsonb, 'Credit costs for various features');

-- =============================================
-- TRUST SCORE CONFIGURATION
-- =============================================

INSERT INTO app_settings (key, value, description) VALUES
('trust_score_weights',
'{
  "email_verified": 10,
  "phone_verified": 15,
  "identity_verified": 25,
  "business_verified": 20,
  "address_verified": 15,
  "successful_transactions": 2,
  "positive_reviews": 1,
  "account_age_months": 0.5,
  "profile_completeness": 10
}'::jsonb, 'Weights for calculating user trust scores');

-- =============================================
-- NOTIFICATION TEMPLATES
-- =============================================

INSERT INTO app_settings (key, value, description) VALUES
('notification_templates',
'{
  "new_message": {
    "title": "New message from {sender_name}",
    "body": "{message_preview}",
    "type": "message"
  },
  "new_offer": {
    "title": "New offer on your listing",
    "body": "{buyer_name} made an offer of GHS {amount} on {listing_title}",
    "type": "offer"
  },
  "offer_accepted": {
    "title": "Your offer was accepted!",
    "body": "{seller_name} accepted your offer of GHS {amount} for {listing_title}",
    "type": "offer"
  },
  "offer_rejected": {
    "title": "Offer declined",
    "body": "Your offer for {listing_title} was declined",
    "type": "offer"
  },
  "listing_sold": {
    "title": "Congratulations! Your item sold",
    "body": "{listing_title} has been marked as sold",
    "type": "listing"
  },
  "verification_approved": {
    "title": "Verification approved!",
    "body": "Your {verification_type} verification has been approved",
    "type": "verification"
  },
  "verification_rejected": {
    "title": "Verification needs attention",
    "body": "Your {verification_type} verification was rejected. Please review and resubmit.",
    "type": "verification"
  },
  "credits_purchased": {
    "title": "Credits added to your account",
    "body": "{credits} credits have been added to your account",
    "type": "credits"
  },
  "welcome": {
    "title": "Welcome to Sellar!",
    "body": "Thanks for joining our marketplace community. Start by creating your first listing!",
    "type": "welcome"
  }
}'::jsonb, 'Templates for various notification types');
