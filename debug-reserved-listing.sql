-- Debug: Check reserved listings
-- Run this in Supabase SQL Editor to see if reserved listings exist

-- 1. Check all listings with their status
SELECT 
  id,
  title,
  status,
  reserved_until,
  reserved_for,
  created_at
FROM listings
WHERE status = 'reserved'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if there are ANY listings with status = 'reserved'
SELECT COUNT(*) as reserved_count
FROM listings
WHERE status = 'reserved';

-- 3. Check the most recent listing status changes
SELECT 
  id,
  title,
  status,
  updated_at
FROM listings
ORDER BY updated_at DESC
LIMIT 20;
