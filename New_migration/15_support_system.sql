-- =============================================
-- SELLAR MOBILE APP - SUPPORT SYSTEM
-- Migration 15: Complete help desk and knowledge base functionality
-- =============================================

-- =============================================
-- SUPPORT TICKETS TABLE
-- =============================================

CREATE TABLE support_tickets (
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
    device_info JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    first_response_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUPPORT TICKET MESSAGES TABLE
-- =============================================

CREATE TABLE support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Message Content
    message TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 2000),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachments JSONB DEFAULT '[]',
    
    -- Message Context
    is_internal BOOLEAN DEFAULT false, -- Internal support team messages
    is_system BOOLEAN DEFAULT false,   -- System-generated messages
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- KNOWLEDGE BASE ARTICLES TABLE
-- =============================================

CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Article Content
    title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) >= 50),
    excerpt TEXT CHECK (char_length(excerpt) <= 500),
    
    -- Categorization
    category TEXT NOT NULL CHECK (category IN (
        'getting_started', 'buying_selling', 'credits_billing', 'account_privacy', 
        'technical_issues', 'safety_guidelines', 'features', 'policies'
    )),
    tags TEXT[] DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    
    -- Authorship
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- KNOWLEDGE BASE ARTICLE FEEDBACK TABLE
-- =============================================

CREATE TABLE kb_article_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for anonymous feedback
    
    -- Feedback
    is_helpful BOOLEAN NOT NULL,
    feedback_text TEXT CHECK (char_length(feedback_text) <= 1000),
    
    -- Metadata
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one feedback per user per article
    UNIQUE(article_id, user_id)
);

-- =============================================
-- FAQ CATEGORIES TABLE
-- =============================================

CREATE TABLE faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Details
    name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    slug TEXT UNIQUE NOT NULL,
    description TEXT CHECK (char_length(description) <= 500),
    icon TEXT,
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FAQ ITEMS TABLE
-- =============================================

CREATE TABLE faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
    
    -- FAQ Content
    question TEXT NOT NULL CHECK (char_length(question) >= 10 AND char_length(question) <= 500),
    answer TEXT NOT NULL CHECK (char_length(answer) >= 20 AND char_length(answer) <= 2000),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Support tickets indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_last_activity_at ON support_tickets(last_activity_at DESC);

-- Support ticket messages indexes
CREATE INDEX idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_sender_id ON support_ticket_messages(sender_id);
CREATE INDEX idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);

-- Knowledge base articles indexes
CREATE INDEX idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX idx_kb_articles_category ON kb_articles(category);
CREATE INDEX idx_kb_articles_status ON kb_articles(status);
CREATE INDEX idx_kb_articles_author_id ON kb_articles(author_id);
CREATE INDEX idx_kb_articles_published_at ON kb_articles(published_at DESC);
CREATE INDEX idx_kb_articles_view_count ON kb_articles(view_count DESC);
CREATE INDEX idx_kb_articles_search_keywords ON kb_articles USING GIN(search_keywords);
CREATE INDEX idx_kb_articles_tags ON kb_articles USING GIN(tags);

-- Knowledge base feedback indexes
CREATE INDEX idx_kb_article_feedback_article_id ON kb_article_feedback(article_id);
CREATE INDEX idx_kb_article_feedback_user_id ON kb_article_feedback(user_id);
CREATE INDEX idx_kb_article_feedback_created_at ON kb_article_feedback(created_at);

-- FAQ categories indexes
CREATE INDEX idx_faq_categories_slug ON faq_categories(slug);
CREATE INDEX idx_faq_categories_is_active ON faq_categories(is_active);
CREATE INDEX idx_faq_categories_sort_order ON faq_categories(sort_order);

-- FAQ items indexes
CREATE INDEX idx_faq_items_category_id ON faq_items(category_id);
CREATE INDEX idx_faq_items_is_active ON faq_items(is_active);
CREATE INDEX idx_faq_items_sort_order ON faq_items(sort_order);
CREATE INDEX idx_faq_items_view_count ON faq_items(view_count DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on support tickets
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on support ticket messages
CREATE TRIGGER update_support_ticket_messages_updated_at
    BEFORE UPDATE ON support_ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on knowledge base articles
CREATE TRIGGER update_kb_articles_updated_at
    BEFORE UPDATE ON kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on FAQ categories
CREATE TRIGGER update_faq_categories_updated_at
    BEFORE UPDATE ON faq_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on FAQ items
CREATE TRIGGER update_faq_items_updated_at
    BEFORE UPDATE ON faq_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update last_activity_at on support tickets when messages are added
CREATE OR REPLACE FUNCTION update_ticket_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_tickets 
    SET last_activity_at = NOW() 
    WHERE id = NEW.ticket_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_last_activity_trigger
    AFTER INSERT ON support_ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_last_activity();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate unique ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    sequence_part TEXT;
    ticket_number TEXT;
    counter INTEGER;
BEGIN
    -- Get date part (YYYYMMDD)
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 13) AS INTEGER)), 0) + 1
    INTO counter
    FROM support_tickets
    WHERE ticket_number LIKE 'SUP-' || date_part || '-%';
    
    -- Format sequence part (4 digits with leading zeros)
    sequence_part := LPAD(counter::TEXT, 4, '0');
    
    -- Combine parts
    ticket_number := 'SUP-' || date_part || '-' || sequence_part;
    
    RETURN ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Function to increment article view count
CREATE OR REPLACE FUNCTION increment_article_views(article_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE kb_articles 
    SET view_count = view_count + 1 
    WHERE id = article_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to increment FAQ view count
CREATE OR REPLACE FUNCTION increment_faq_views(faq_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE faq_items 
    SET view_count = view_count + 1 
    WHERE id = faq_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update article helpful counts
CREATE OR REPLACE FUNCTION update_article_helpful_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_helpful THEN
            UPDATE kb_articles SET helpful_count = helpful_count + 1 WHERE id = NEW.article_id;
        ELSE
            UPDATE kb_articles SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.article_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_helpful != NEW.is_helpful THEN
            IF NEW.is_helpful THEN
                UPDATE kb_articles SET 
                    helpful_count = helpful_count + 1,
                    not_helpful_count = not_helpful_count - 1
                WHERE id = NEW.article_id;
            ELSE
                UPDATE kb_articles SET 
                    helpful_count = helpful_count - 1,
                    not_helpful_count = not_helpful_count + 1
                WHERE id = NEW.article_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_helpful THEN
            UPDATE kb_articles SET helpful_count = helpful_count - 1 WHERE id = OLD.article_id;
        ELSE
            UPDATE kb_articles SET not_helpful_count = not_helpful_count - 1 WHERE id = OLD.article_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for article helpful counts
CREATE TRIGGER update_article_helpful_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON kb_article_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_article_helpful_counts();

-- Function to set first_response_at when support agent responds
CREATE OR REPLACE FUNCTION set_first_response_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a support agent response (is_internal = true)
    IF NEW.is_internal = true THEN
        -- Update first_response_at if not already set
        UPDATE support_tickets 
        SET first_response_at = COALESCE(first_response_at, NOW())
        WHERE id = NEW.ticket_id AND first_response_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_first_response_time_trigger
    AFTER INSERT ON support_ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION set_first_response_time();

-- Success message
SELECT 'Support system tables created successfully!' as status;
