-- Check current reviews table schema
-- This will help diagnose what columns actually exist

-- Check if reviews table exists and show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the new columns exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reviews' AND column_name = 'review_type'
        ) THEN 'review_type column EXISTS'
        ELSE 'review_type column MISSING'
    END as review_type_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reviews' AND column_name = 'status'
        ) THEN 'status column EXISTS'
        ELSE 'status column MISSING'
    END as status_column_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reviews' AND column_name = 'is_transaction_confirmed'
        ) THEN 'is_transaction_confirmed column EXISTS'
        ELSE 'is_transaction_confirmed column MISSING'
    END as is_transaction_confirmed_status;

-- Check constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'reviews' 
AND table_schema = 'public';
