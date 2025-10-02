-- Remove "Condition" from all category attributes since it's a universal field in Details step

DELETE FROM category_attributes WHERE slug = 'condition';

-- Verify deletion
SELECT 
  '✅ Condition attributes removed!' as status,
  COUNT(*) as remaining_attributes 
FROM category_attributes;

-- Show categories that had condition removed (for reference)
SELECT 
  'These categories no longer have condition attribute (now in Details step)' as note;

