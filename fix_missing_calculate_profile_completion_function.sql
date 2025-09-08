-- =============================================
-- FIX: Add missing calculate_profile_completion function
-- =============================================

-- Create function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_record RECORD;
    completion_percentage INTEGER := 0;
    missing_fields TEXT[] := '{}';
    suggestions TEXT[] := '{}';
    total_fields INTEGER := 0;
    completed_fields INTEGER := 0;
BEGIN
    -- Get the user's profile
    SELECT * INTO profile_record
    FROM profiles
    WHERE id = user_uuid;
    
    -- If no profile found, return empty completion
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'percentage', 0,
            'missing_fields', '{}',
            'suggestions', ARRAY['Create your profile to get started']
        );
    END IF;
    
    -- Define required fields and their weights
    -- Basic Information (40% of completion)
    IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'full_name');
        suggestions := array_append(suggestions, 'Add your full name');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'bio');
        suggestions := array_append(suggestions, 'Write a bio to tell others about yourself');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'location');
        suggestions := array_append(suggestions, 'Add your location');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'avatar_url');
        suggestions := array_append(suggestions, 'Upload a profile picture');
    END IF;
    total_fields := total_fields + 1;
    
    -- Contact Information (20% of completion)
    IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'phone');
        suggestions := array_append(suggestions, 'Add your phone number');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.website IS NOT NULL AND profile_record.website != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'website');
        suggestions := array_append(suggestions, 'Add your website or social media');
    END IF;
    total_fields := total_fields + 1;
    
    -- Business Information (20% of completion) - only if user is a business
    IF profile_record.is_business = true THEN
        IF profile_record.business_name IS NOT NULL AND profile_record.business_name != '' THEN
            completed_fields := completed_fields + 1;
        ELSE
            missing_fields := array_append(missing_fields, 'business_name');
            suggestions := array_append(suggestions, 'Add your business name');
        END IF;
        total_fields := total_fields + 1;
        
        IF profile_record.business_description IS NOT NULL AND profile_record.business_description != '' THEN
            completed_fields := completed_fields + 1;
        ELSE
            missing_fields := array_append(missing_fields, 'business_description');
            suggestions := array_append(suggestions, 'Describe your business');
        END IF;
        total_fields := total_fields + 1;
        
        IF profile_record.business_category_id IS NOT NULL THEN
            completed_fields := completed_fields + 1;
        ELSE
            missing_fields := array_append(missing_fields, 'business_category_id');
            suggestions := array_append(suggestions, 'Select your business category');
        END IF;
        total_fields := total_fields + 1;
    END IF;
    
    -- Verification (20% of completion)
    IF profile_record.email_verified = true THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'email_verified');
        suggestions := array_append(suggestions, 'Verify your email address');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.phone_verified = true THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'phone_verified');
        suggestions := array_append(suggestions, 'Verify your phone number');
    END IF;
    total_fields := total_fields + 1;
    
    -- Calculate completion percentage
    IF total_fields > 0 THEN
        completion_percentage := ROUND((completed_fields::DECIMAL / total_fields::DECIMAL) * 100);
    END IF;
    
    -- Return completion data
    RETURN jsonb_build_object(
        'percentage', completion_percentage,
        'missing_fields', missing_fields,
        'suggestions', suggestions,
        'completed_fields', completed_fields,
        'total_fields', total_fields
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_profile_completion(UUID) TO authenticated;

-- Add comment to document the function
COMMENT ON FUNCTION calculate_profile_completion(UUID) IS 'Calculates profile completion percentage and returns missing fields and suggestions for improvement';

-- Success message
SELECT 'calculate_profile_completion function created successfully!' as status;
