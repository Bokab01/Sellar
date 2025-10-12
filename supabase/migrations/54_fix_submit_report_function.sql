-- =============================================
-- FIX SUBMIT_REPORT FUNCTION
-- =============================================
-- This migration fixes the submit_report function to not set both
-- reported_user_id and target_id (listing_id, post_id, etc.) at the same time
-- The reported_user_id should only be set when target_type is 'user'

CREATE OR REPLACE FUNCTION submit_report(
    p_reporter_id UUID,
    p_target_type VARCHAR(20),
    p_target_id UUID,
    p_category VARCHAR(50),
    p_reason TEXT,
    p_description TEXT DEFAULT NULL,
    p_evidence_urls JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (success BOOLEAN, report_id UUID, error TEXT) AS $$
DECLARE
    v_report_id UUID;
    v_reported_user_id UUID;
    v_priority VARCHAR(20);
    v_auto_action VARCHAR(50);
    v_category_id UUID;
BEGIN
    -- Validate target type
    IF p_target_type NOT IN ('listing', 'post', 'comment', 'message', 'user') THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid target type'::TEXT;
        RETURN;
    END IF;

    -- Get category information
    SELECT id, priority, auto_action INTO v_category_id, v_priority, v_auto_action
    FROM moderation_categories 
    WHERE name = p_category AND is_active = true;

    IF v_category_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid category'::TEXT;
        RETURN;
    END IF;

    -- Get reported user ID based on target type (for reputation tracking)
    CASE p_target_type
        WHEN 'listing' THEN
            SELECT user_id INTO v_reported_user_id FROM listings WHERE id = p_target_id;
        WHEN 'post' THEN
            SELECT user_id INTO v_reported_user_id FROM posts WHERE id = p_target_id;
        WHEN 'comment' THEN
            SELECT user_id INTO v_reported_user_id FROM comments WHERE id = p_target_id;
        WHEN 'message' THEN
            SELECT sender_id INTO v_reported_user_id FROM messages WHERE id = p_target_id;
        WHEN 'user' THEN
            v_reported_user_id := p_target_id;
    END CASE;

    -- Prevent self-reporting
    IF v_reported_user_id = p_reporter_id THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Cannot report yourself'::TEXT;
        RETURN;
    END IF;

    -- Create the report
    -- IMPORTANT: Only set reported_user_id when target_type is 'user'
    -- For other types, set the specific target_id column instead
    INSERT INTO reports (
        reporter_id,
        reported_user_id,
        listing_id,
        post_id,
        comment_id,
        message_id,
        category,
        reason,
        description,
        evidence_urls,
        priority
    ) VALUES (
        p_reporter_id,
        CASE WHEN p_target_type = 'user' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'listing' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'post' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'comment' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'message' THEN p_target_id ELSE NULL END,
        p_category,
        p_reason,
        p_description,
        p_evidence_urls,
        v_priority
    ) RETURNING id INTO v_report_id;

    -- Update user reputation (if we have a reported user)
    IF v_reported_user_id IS NOT NULL THEN
        UPDATE user_reputation 
        SET 
            negative_reports = negative_reports + 1,
            reputation_score = reputation_score - 1,
            updated_at = NOW()
        WHERE user_id = v_reported_user_id;

        -- Insert if user doesn't have reputation record
        INSERT INTO user_reputation (user_id, negative_reports, reputation_score)
        SELECT v_reported_user_id, 1, -1
        WHERE NOT EXISTS (SELECT 1 FROM user_reputation WHERE user_id = v_reported_user_id);
    END IF;

    -- Handle automatic actions
    IF v_auto_action != 'none' THEN
        PERFORM handle_automatic_moderation(v_report_id, v_auto_action, p_target_type, p_target_id);
    END IF;

    RETURN QUERY SELECT true, v_report_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the fix
COMMENT ON FUNCTION submit_report IS 'Submit a content report. Only sets reported_user_id when target_type is user, otherwise uses specific target columns (listing_id, post_id, etc.) to avoid constraint violations.';

SELECT 'Report submission function fixed - reported_user_id now only set for user reports' as status;

