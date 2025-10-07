-- Test the exact query that the app is running
SELECT 
  l.*,
  p.id as profile_id,
  p.full_name,
  c.id as category_id,
  c.name as category_name
FROM listings l
LEFT JOIN profiles p ON p.id = l.user_id
LEFT JOIN categories c ON c.id = l.category_id
WHERE l.status IN ('active', 'reserved')
ORDER BY l.created_at DESC
LIMIT 20;

-- Also check if there are any RLS policies blocking the reserved listing
SELECT 
  id,
  title,
  status,
  user_id,
  created_at
FROM listings
WHERE status = 'reserved'
ORDER BY created_at DESC;
