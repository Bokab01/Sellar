#!/usr/bin/env python3
"""
Remove all 'Condition' attributes from the migration file
since Condition is a universal field in the Details step
"""

import re

# Read the file
with open('supabase/migrations/24_seed_category_attributes.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Track lines to remove
lines_to_remove = set()
i = 0

while i < len(lines):
    line = lines[i]
    
    # Check if this line contains a Condition attribute
    if "'Condition', 'condition'" in line:
        # Mark this line and find the end of this INSERT statement
        start = i
        
        # Go back to find if there's a comma before this entry
        prev_line_idx = i - 1
        while prev_line_idx >= 0 and lines[prev_line_idx].strip() == '':
            prev_line_idx -= 1
        
        # Find the end of this attribute (ends with );, or just ,)
        end = i
        while end < len(lines) and not (']\'::jsonb' in lines[end] and (');' in lines[end] or '),' in lines[end])):
            end += 1
        
        # Mark all lines from start to end for removal
        for j in range(start, min(end + 1, len(lines))):
            lines_to_remove.add(j)
        
        # Also remove the blank line after if it exists
        if end + 1 < len(lines) and lines[end + 1].strip() == '':
            lines_to_remove.add(end + 1)
        
        i = end + 1
    else:
        i += 1

# Filter out the marked lines
new_lines = [line for idx, line in enumerate(lines) if idx not in lines_to_remove]

# Write back
with open('supabase/migrations/24_seed_category_attributes.sql', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"✅ Removed {len(lines_to_remove)} lines containing Condition attributes")
print(f"📝 Updated migration file")

