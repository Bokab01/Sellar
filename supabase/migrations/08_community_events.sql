-- =============================================
-- COMMUNITY EVENTS SYSTEM MIGRATION
-- =============================================
-- This migration creates a comprehensive community events system
-- Run this in your Supabase SQL Editor to enable community events functionality

-- =============================================
-- TABLES
-- =============================================

-- Events table to store community events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'general', -- 'general', 'meetup', 'workshop', 'social', 'business', 'educational'
    category VARCHAR(50) DEFAULT 'general', -- 'electronics', 'fashion', 'home', 'automotive', 'food', 'sports', 'education', 'business', 'general'
    location_name VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Ghana',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT FALSE,
    online_link TEXT,
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    registration_required BOOLEAN DEFAULT FALSE,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    is_free BOOLEAN DEFAULT TRUE,
    ticket_price DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'GHS',
    organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'completed', 'postponed'
    visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'private', 'invite_only'
    tags TEXT[] DEFAULT '{}',
    image_url TEXT,
    banner_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event attendees table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered', -- 'registered', 'attending', 'cancelled', 'waitlist'
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_in_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(event_id, user_id)
);

-- Event comments table for discussions
CREATE TABLE IF NOT EXISTS event_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES event_comments(id) ON DELETE CASCADE, -- For replies
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event likes table
CREATE TABLE IF NOT EXISTS event_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Event shares table
CREATE TABLE IF NOT EXISTS event_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform VARCHAR(50), -- 'whatsapp', 'facebook', 'twitter', 'instagram', 'copy_link'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event notifications table
CREATE TABLE IF NOT EXISTS event_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'event_reminder', 'event_cancelled', 'event_updated', 'new_attendee', 'event_starting'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_region ON events(region);
CREATE INDEX IF NOT EXISTS idx_events_online ON events(is_online);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Event attendees indexes
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(status);

-- Event comments indexes
CREATE INDEX IF NOT EXISTS idx_event_comments_event ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user ON event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_parent ON event_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_created ON event_comments(created_at);

-- Event likes indexes
CREATE INDEX IF NOT EXISTS idx_event_likes_event ON event_likes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_user ON event_likes(user_id);

-- Event shares indexes
CREATE INDEX IF NOT EXISTS idx_event_shares_event ON event_shares(event_id);
CREATE INDEX IF NOT EXISTS idx_event_shares_user ON event_shares(user_id);

-- Event notifications indexes
CREATE INDEX IF NOT EXISTS idx_event_notifications_event ON event_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_user ON event_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_type ON event_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_event_notifications_read ON event_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_event_notifications_scheduled ON event_notifications(scheduled_for);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update event attendee count
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update attendee count for the event
    UPDATE events 
    SET current_attendees = (
        SELECT COUNT(*) 
        FROM event_attendees 
        WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
        AND status IN ('registered', 'attending')
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.event_id, OLD.event_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update event likes count
CREATE OR REPLACE FUNCTION update_event_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update likes count for the event
    UPDATE events 
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.event_id, OLD.event_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update event comment counts
CREATE OR REPLACE FUNCTION update_event_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update replies count for parent comment
    IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
        UPDATE event_comments 
        SET replies_count = replies_count + 1,
            updated_at = NOW()
        WHERE id = NEW.parent_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
        UPDATE event_comments 
        SET replies_count = GREATEST(replies_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.parent_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get events with filters
CREATE OR REPLACE FUNCTION get_events(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_event_type TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_region TEXT DEFAULT NULL,
    p_is_online BOOLEAN DEFAULT NULL,
    p_is_free BOOLEAN DEFAULT NULL,
    p_status TEXT DEFAULT 'active',
    p_visibility TEXT DEFAULT 'public'
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(200),
    description TEXT,
    event_type VARCHAR(50),
    category VARCHAR(50),
    location_name VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN,
    online_link TEXT,
    max_attendees INTEGER,
    current_attendees INTEGER,
    registration_required BOOLEAN,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    is_free BOOLEAN,
    ticket_price DECIMAL(10, 2),
    currency VARCHAR(3),
    organizer_id UUID,
    organizer_name TEXT,
    organizer_avatar TEXT,
    status VARCHAR(20),
    visibility VARCHAR(20),
    tags TEXT[],
    image_url TEXT,
    banner_url TEXT,
    likes_count BIGINT,
    comments_count BIGINT,
    shares_count BIGINT,
    is_attending BOOLEAN,
    user_attendance_status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.category,
        e.location_name,
        e.address,
        e.city,
        e.region,
        e.country,
        e.latitude,
        e.longitude,
        e.start_date,
        e.end_date,
        e.is_online,
        e.online_link,
        e.max_attendees,
        e.current_attendees,
        e.registration_required,
        e.registration_deadline,
        e.is_free,
        e.ticket_price,
        e.currency,
        e.organizer_id,
        COALESCE(pr.first_name || ' ' || pr.last_name, 'User') as organizer_name,
        pr.avatar_url as organizer_avatar,
        e.status,
        e.visibility,
        e.tags,
        e.image_url,
        e.banner_url,
        (SELECT COUNT(*) FROM event_likes WHERE event_id = e.id) as likes_count,
        (SELECT COUNT(*) FROM event_comments WHERE event_id = e.id) as comments_count,
        (SELECT COUNT(*) FROM event_shares WHERE event_id = e.id) as shares_count,
        CASE 
            WHEN EXISTS(SELECT 1 FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = auth.uid() AND ea.status IN ('registered', 'attending')) 
            THEN TRUE 
            ELSE FALSE 
        END as is_attending,
        (SELECT ea.status FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = auth.uid()) as user_attendance_status,
        e.created_at,
        e.updated_at
    FROM events e
    LEFT JOIN profiles pr ON e.organizer_id = pr.id
    WHERE 
        (p_event_type IS NULL OR e.event_type = p_event_type)
        AND (p_category IS NULL OR e.category = p_category)
        AND (p_city IS NULL OR e.city ILIKE '%' || p_city || '%')
        AND (p_region IS NULL OR e.region ILIKE '%' || p_region || '%')
        AND (p_is_online IS NULL OR e.is_online = p_is_online)
        AND (p_is_free IS NULL OR e.is_free = p_is_free)
        AND (p_status IS NULL OR e.status = p_status)
        AND (p_visibility IS NULL OR e.visibility = p_visibility)
    ORDER BY e.start_date ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's events (created or attending)
CREATE OR REPLACE FUNCTION get_user_events(
    p_user_id UUID,
    p_event_type TEXT DEFAULT 'all', -- 'created', 'attending', 'all'
    p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(200),
    description TEXT,
    event_type VARCHAR(50),
    category VARCHAR(50),
    location_name VARCHAR(200),
    city VARCHAR(100),
    region VARCHAR(100),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN,
    max_attendees INTEGER,
    current_attendees INTEGER,
    is_free BOOLEAN,
    ticket_price DECIMAL(10, 2),
    currency VARCHAR(3),
    organizer_id UUID,
    organizer_name TEXT,
    status VARCHAR(20),
    visibility VARCHAR(20),
    image_url TEXT,
    likes_count BIGINT,
    comments_count BIGINT,
    shares_count BIGINT,
    user_attendance_status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.category,
        e.location_name,
        e.city,
        e.region,
        e.start_date,
        e.end_date,
        e.is_online,
        e.max_attendees,
        e.current_attendees,
        e.is_free,
        e.ticket_price,
        e.currency,
        e.organizer_id,
        COALESCE(pr.first_name || ' ' || pr.last_name, 'User') as organizer_name,
        e.status,
        e.visibility,
        e.image_url,
        (SELECT COUNT(*) FROM event_likes WHERE event_id = e.id) as likes_count,
        (SELECT COUNT(*) FROM event_comments WHERE event_id = e.id) as comments_count,
        (SELECT COUNT(*) FROM event_shares WHERE event_id = e.id) as shares_count,
        ea.status as user_attendance_status,
        e.created_at
    FROM events e
    LEFT JOIN profiles pr ON e.organizer_id = pr.id
    LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.user_id = p_user_id
    WHERE 
        (p_event_type = 'created' AND e.organizer_id = p_user_id)
        OR (p_event_type = 'attending' AND ea.user_id = p_user_id AND ea.status IN ('registered', 'attending'))
        OR (p_event_type = 'all' AND (e.organizer_id = p_user_id OR ea.user_id = p_user_id))
        AND (p_status IS NULL OR e.status = p_status)
    ORDER BY e.start_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register for an event
CREATE OR REPLACE FUNCTION register_for_event(
    p_event_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON AS $$
DECLARE
    event_record events%ROWTYPE;
    attendee_count INTEGER;
    result JSON;
BEGIN
    -- Get event details
    SELECT * INTO event_record FROM events WHERE id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Event not found');
    END IF;
    
    -- Check if event is still active
    IF event_record.status != 'active' THEN
        RETURN json_build_object('success', false, 'error', 'Event is not active');
    END IF;
    
    -- Check if registration deadline has passed
    IF event_record.registration_deadline IS NOT NULL AND NOW() > event_record.registration_deadline THEN
        RETURN json_build_object('success', false, 'error', 'Registration deadline has passed');
    END IF;
    
    -- Check if user is already registered
    IF EXISTS(SELECT 1 FROM event_attendees WHERE event_id = p_event_id AND user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'Already registered for this event');
    END IF;
    
    -- Check if event is full
    IF event_record.max_attendees IS NOT NULL THEN
        SELECT COUNT(*) INTO attendee_count 
        FROM event_attendees 
        WHERE event_id = p_event_id AND status IN ('registered', 'attending');
        
        IF attendee_count >= event_record.max_attendees THEN
            RETURN json_build_object('success', false, 'error', 'Event is full');
        END IF;
    END IF;
    
    -- Register user for event
    INSERT INTO event_attendees (event_id, user_id, status)
    VALUES (p_event_id, p_user_id, 'registered');
    
    RETURN json_build_object('success', true, 'message', 'Successfully registered for event');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel event registration
CREATE OR REPLACE FUNCTION cancel_event_registration(
    p_event_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON AS $$
BEGIN
    -- Check if user is registered
    IF NOT EXISTS(SELECT 1 FROM event_attendees WHERE event_id = p_event_id AND user_id = p_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'Not registered for this event');
    END IF;
    
    -- Cancel registration
    UPDATE event_attendees 
    SET status = 'cancelled'
    WHERE event_id = p_event_id AND user_id = p_user_id;
    
    RETURN json_build_object('success', true, 'message', 'Registration cancelled successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update attendee count when attendees change
CREATE TRIGGER trigger_update_event_attendee_count
    AFTER INSERT OR UPDATE OR DELETE ON event_attendees
    FOR EACH ROW
    EXECUTE FUNCTION update_event_attendee_count();

-- Trigger to update likes count when likes change
CREATE TRIGGER trigger_update_event_likes_count
    AFTER INSERT OR DELETE ON event_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_event_likes_count();

-- Trigger to update comment counts when comments change
CREATE TRIGGER trigger_update_event_comment_counts
    AFTER INSERT OR DELETE ON event_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_event_comment_counts();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Events are viewable by all users" ON events
    FOR SELECT USING (visibility = 'public' OR organizer_id = auth.uid());

CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE USING (organizer_id = auth.uid());

CREATE POLICY "Users can delete their own events" ON events
    FOR DELETE USING (organizer_id = auth.uid());

-- Event attendees policies
CREATE POLICY "Event attendees are viewable by event participants" ON event_attendees
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM events WHERE id = event_id AND (organizer_id = auth.uid() OR visibility = 'public'))
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can register for events" ON event_attendees
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own attendance" ON event_attendees
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own attendance" ON event_attendees
    FOR DELETE USING (user_id = auth.uid());

-- Event comments policies
CREATE POLICY "Event comments are viewable by all users" ON event_comments
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM events WHERE id = event_id AND (organizer_id = auth.uid() OR visibility = 'public'))
    );

CREATE POLICY "Users can create event comments" ON event_comments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own event comments" ON event_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own event comments" ON event_comments
    FOR DELETE USING (user_id = auth.uid());

-- Event likes policies
CREATE POLICY "Event likes are viewable by all users" ON event_likes
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM events WHERE id = event_id AND (organizer_id = auth.uid() OR visibility = 'public'))
    );

CREATE POLICY "Users can like events" ON event_likes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike events" ON event_likes
    FOR DELETE USING (user_id = auth.uid());

-- Event shares policies
CREATE POLICY "Event shares are viewable by all users" ON event_shares
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM events WHERE id = event_id AND (organizer_id = auth.uid() OR visibility = 'public'))
    );

CREATE POLICY "Users can share events" ON event_shares
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Event notifications policies
CREATE POLICY "Users can view their own notifications" ON event_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON event_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample events
INSERT INTO events (
    title, description, event_type, category, location_name, address, city, region,
    start_date, end_date, is_online, max_attendees, registration_required, is_free,
    organizer_id, tags
) VALUES
(
    'Tech Meetup Accra',
    'Join us for an exciting tech meetup featuring the latest in mobile app development, AI, and startup culture. Network with fellow developers and entrepreneurs.',
    'meetup',
    'electronics',
    'Accra Digital Center',
    '123 Independence Avenue, Accra',
    'Accra',
    'Greater Accra',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '3 hours',
    FALSE,
    50,
    TRUE,
    TRUE,
    (SELECT id FROM profiles LIMIT 1),
    ARRAY['tech', 'meetup', 'networking', 'startup']
),
(
    'Fashion Week Kumasi',
    'Experience the latest fashion trends and designs from local and international designers. Includes runway shows, pop-up shops, and networking opportunities.',
    'social',
    'fashion',
    'Kumasi Cultural Center',
    '456 Cultural Street, Kumasi',
    'Kumasi',
    'Ashanti',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days' + INTERVAL '6 hours',
    FALSE,
    200,
    TRUE,
    FALSE,
    (SELECT id FROM profiles LIMIT 1),
    ARRAY['fashion', 'design', 'runway', 'networking']
),
(
    'Online Business Workshop',
    'Learn essential business skills including marketing, finance, and operations. Perfect for entrepreneurs and small business owners.',
    'workshop',
    'business',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW() + INTERVAL '10 days',
    NOW() + INTERVAL '10 days' + INTERVAL '2 hours',
    TRUE,
    100,
    TRUE,
    TRUE,
    (SELECT id FROM profiles LIMIT 1),
    ARRAY['business', 'workshop', 'entrepreneurship', 'online']
),
(
    'Home Decor Expo',
    'Discover the latest trends in home decoration and interior design. Meet with suppliers, get design consultations, and shop for your home.',
    'general',
    'home',
    'Accra Mall',
    '789 Ring Road, Accra',
    'Accra',
    'Greater Accra',
    NOW() + INTERVAL '21 days',
    NOW() + INTERVAL '21 days' + INTERVAL '8 hours',
    FALSE,
    300,
    FALSE,
    TRUE,
    (SELECT id FROM profiles LIMIT 1),
    ARRAY['home', 'decor', 'interior', 'design']
),
(
    'Car Show & Sale',
    'Browse the latest vehicles from top dealers. Test drives available, financing options, and special deals for attendees.',
    'general',
    'automotive',
    'Independence Square',
    'Independence Square, Accra',
    'Accra',
    'Greater Accra',
    NOW() + INTERVAL '28 days',
    NOW() + INTERVAL '28 days' + INTERVAL '10 hours',
    FALSE,
    500,
    FALSE,
    TRUE,
    (SELECT id FROM profiles LIMIT 1),
    ARRAY['cars', 'automotive', 'sale', 'test-drive']
);

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Community events system setup completed successfully!';
    RAISE NOTICE '📊 Tables created: events, event_attendees, event_comments, event_likes, event_shares, event_notifications';
    RAISE NOTICE '⚙️ Functions created: get_events, get_user_events, register_for_event, cancel_event_registration';
    RAISE NOTICE '🔄 Triggers created: Automatic count updates for attendees, likes, and comments';
    RAISE NOTICE '🔒 RLS policies enabled for secure access';
    RAISE NOTICE '🎯 Sample events inserted for testing';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your community events system is now ready!';
    RAISE NOTICE '   - Create events with location, date, and attendee limits';
    RAISE NOTICE '   - Users can register and attend events';
    RAISE NOTICE '   - Support for online and offline events';
    RAISE NOTICE '   - Event discussions and social features';
    RAISE NOTICE '   - Comprehensive filtering and search capabilities';
END $$;
