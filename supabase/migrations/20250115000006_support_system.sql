-- =============================================
-- COMPREHENSIVE SUPPORT SYSTEM MIGRATION
-- Complete help desk and knowledge base functionality
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- SUPPORT TICKETS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Ticket Details
    ticket_number TEXT UNIQUE NOT NULL, -- Auto-generated: SUP-YYYYMMDD-XXXX
    subject TEXT NOT NULL CHECK (char_length(subject) >= 5 AND char_length(subject) <= 200),
    description TEXT NOT NULL CHECK (char_length(description) >= 10 AND char_length(description) <= 5000),
    
    -- Categorization
    category TEXT NOT NULL CHECK (category IN (
        'account', 'billing', 'technical', 'listing', 'chat', 'safety', 
        'verification', 'payments', 'features', 'bug_report', 'other'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Status Management
    status TEXT DEFAULT 'open' CHECK (status IN (
        'open', 'in_progress', 'waiting_user', 'waiting_internal', 
        'resolved', 'closed', 'escalated'
    )),
    
    -- Assignment
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Support agent
    assigned_at TIMESTAMPTZ,
    
    -- Resolution
    resolution TEXT CHECK (char_length(resolution) <= 2000),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Satisfaction
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    satisfaction_feedback TEXT CHECK (char_length(satisfaction_feedback) <= 1000),
    
    -- Metadata
    user_agent TEXT,
    app_version TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    first_response_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SUPPORT TICKET MESSAGES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Message Content
    message TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 5000),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    
    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Message Status
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes vs customer-facing
    is_system BOOLEAN DEFAULT FALSE,   -- System-generated messages
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- KNOWLEDGE BASE ARTICLES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Article Content
    title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
    slug TEXT UNIQUE NOT NULL, -- URL-friendly version of title
    content TEXT NOT NULL CHECK (char_length(content) >= 50),
    excerpt TEXT CHECK (char_length(excerpt) <= 500),
    
    -- Categorization
    category TEXT NOT NULL CHECK (category IN (
        'getting_started', 'buying_selling', 'credits_billing', 'account_privacy',
        'technical_issues', 'safety_guidelines', 'features', 'policies'
    )),
    tags TEXT[] DEFAULT '{}',
    
    -- Publishing
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    
    -- Authoring
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- SEO
    meta_description TEXT CHECK (char_length(meta_description) <= 160),
    search_keywords TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- KNOWLEDGE BASE FEEDBACK TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS kb_article_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Allow anonymous feedback
    
    -- Feedback
    is_helpful BOOLEAN NOT NULL,
    feedback_text TEXT CHECK (char_length(feedback_text) <= 1000),
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate feedback from same user
    UNIQUE(article_id, user_id)
);

-- =============================================
-- FAQ CATEGORIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Details
    name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    slug TEXT UNIQUE NOT NULL,
    description TEXT CHECK (char_length(description) <= 500),
    icon TEXT, -- Icon name for UI
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FAQ ITEMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
    
    -- FAQ Content
    question TEXT NOT NULL CHECK (char_length(question) >= 10 AND char_length(question) <= 300),
    answer TEXT NOT NULL CHECK (char_length(answer) >= 10 AND char_length(answer) <= 2000),
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SUPPORT ANALYTICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS support_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Date tracking
    date DATE NOT NULL,
    
    -- Ticket metrics
    tickets_created INTEGER DEFAULT 0,
    tickets_resolved INTEGER DEFAULT 0,
    tickets_escalated INTEGER DEFAULT 0,
    
    -- Response time metrics (in minutes)
    avg_first_response_time INTEGER DEFAULT 0,
    avg_resolution_time INTEGER DEFAULT 0,
    
    -- Satisfaction metrics
    avg_satisfaction_rating DECIMAL(3,2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    
    -- Category breakdown
    category_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- Agent performance
    agent_metrics JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint for daily analytics
    UNIQUE(date)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets(ticket_number);

-- Support ticket messages indexes
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_sender_id ON support_ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at DESC);

-- Knowledge base indexes
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON kb_articles(status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published_at ON kb_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_articles_view_count ON kb_articles(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_kb_articles_slug ON kb_articles(slug);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_kb_articles_search ON kb_articles USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX IF NOT EXISTS idx_support_tickets_search ON support_tickets USING gin(to_tsvector('english', subject || ' ' || description));

-- FAQ indexes
CREATE INDEX IF NOT EXISTS idx_faq_categories_sort_order ON faq_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_faq_items_category_id ON faq_items(category_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_sort_order ON faq_items(sort_order);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_support_analytics_date ON support_analytics(date DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_analytics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - SUPPORT TICKETS
-- =============================================

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (limited fields)
CREATE POLICY "Users can update own tickets" ON support_tickets
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Support agents can view all tickets (requires role-based access)
-- Note: This would need proper role management in production

-- =============================================
-- RLS POLICIES - SUPPORT TICKET MESSAGES
-- =============================================

-- Users can view messages in their tickets
CREATE POLICY "Users can view own ticket messages" ON support_ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = support_ticket_messages.ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
    );

-- Users can create messages in their tickets
CREATE POLICY "Users can create messages in own tickets" ON support_ticket_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
    );

-- =============================================
-- RLS POLICIES - KNOWLEDGE BASE
-- =============================================

-- Anyone can view published articles
CREATE POLICY "Anyone can view published articles" ON kb_articles
    FOR SELECT USING (status = 'published');

-- Anyone can view active FAQ categories
CREATE POLICY "Anyone can view active FAQ categories" ON faq_categories
    FOR SELECT USING (is_active = true);

-- Anyone can view active FAQ items
CREATE POLICY "Anyone can view active FAQ items" ON faq_items
    FOR SELECT USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM faq_categories 
            WHERE faq_categories.id = faq_items.category_id 
            AND faq_categories.is_active = true
        )
    );

-- Anyone can provide feedback on articles
CREATE POLICY "Anyone can provide article feedback" ON kb_article_feedback
    FOR INSERT WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON kb_article_feedback
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all relevant tables
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_ticket_messages_updated_at
    BEFORE UPDATE ON support_ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at
    BEFORE UPDATE ON kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_categories_updated_at
    BEFORE UPDATE ON faq_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at
    BEFORE UPDATE ON faq_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_analytics_updated_at
    BEFORE UPDATE ON support_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    ticket_date TEXT;
    sequence_num INTEGER;
    ticket_number TEXT;
BEGIN
    -- Get current date in YYYYMMDD format
    ticket_date := to_char(now(), 'YYYYMMDD');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(
        CASE 
            WHEN ticket_number LIKE 'SUP-' || ticket_date || '-%' 
            THEN CAST(SUBSTRING(ticket_number FROM 'SUP-' || ticket_date || '-(.*)') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_num
    FROM support_tickets
    WHERE ticket_number LIKE 'SUP-' || ticket_date || '-%';
    
    -- Format as SUP-YYYYMMDD-XXXX
    ticket_number := 'SUP-' || ticket_date || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN ticket_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update ticket activity timestamp
CREATE OR REPLACE FUNCTION update_ticket_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the ticket's last_activity_at when a message is added
    UPDATE support_tickets 
    SET last_activity_at = now()
    WHERE id = NEW.ticket_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ticket activity on new messages
CREATE TRIGGER update_ticket_activity_on_message
    AFTER INSERT ON support_ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_activity();

-- Function to update article view count
CREATE OR REPLACE FUNCTION increment_article_views(article_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE kb_articles 
    SET view_count = view_count + 1
    WHERE id = article_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update FAQ view count
CREATE OR REPLACE FUNCTION increment_faq_views(faq_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE faq_items 
    SET view_count = view_count + 1
    WHERE id = faq_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SEED DATA - FAQ CATEGORIES
-- =============================================

INSERT INTO faq_categories (name, slug, description, icon, sort_order) VALUES
('Getting Started', 'getting-started', 'Learn the basics of using Sellar', 'play-circle', 1),
('Buying & Selling', 'buying-selling', 'Everything about transactions on Sellar', 'shopping-cart', 2),
('Credits & Billing', 'credits-billing', 'Understanding credits and subscription plans', 'credit-card', 3),
('Account & Privacy', 'account-privacy', 'Manage your account and privacy settings', 'user', 4),
('Technical Issues', 'technical-issues', 'Troubleshooting and technical support', 'settings', 5),
('Safety Guidelines', 'safety-guidelines', 'Stay safe while using Sellar', 'shield', 6)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify all tables were created successfully
SELECT 
    'support_tickets' as table_name,
    COUNT(*) as row_count
FROM support_tickets
UNION ALL
SELECT 
    'support_ticket_messages' as table_name,
    COUNT(*) as row_count
FROM support_ticket_messages
UNION ALL
SELECT 
    'kb_articles' as table_name,
    COUNT(*) as row_count
FROM kb_articles
UNION ALL
SELECT 
    'kb_article_feedback' as table_name,
    COUNT(*) as row_count
FROM kb_article_feedback
UNION ALL
SELECT 
    'faq_categories' as table_name,
    COUNT(*) as row_count
FROM faq_categories
UNION ALL
SELECT 
    'faq_items' as table_name,
    COUNT(*) as row_count
FROM faq_items
UNION ALL
SELECT 
    'support_analytics' as table_name,
    COUNT(*) as row_count
FROM support_analytics;

-- Show created indexes
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE tablename IN (
    'support_tickets', 'support_ticket_messages', 'kb_articles', 
    'kb_article_feedback', 'faq_categories', 'faq_items', 'support_analytics'
)
ORDER BY tablename, indexname;
