# 🎯 Dynamic Category Attributes System

## Overview
A comprehensive system that automatically shows relevant fields based on the selected category. For example, when a user selects "Mobile Phones", they see fields for Brand, Model, Storage, RAM, etc.

## 🗄️ Database Schema

### Tables Created

#### `category_attributes`
Stores attribute definitions for each category.

**Key Fields:**
- `category_id` - Links to categories table
- `slug` - Unique identifier (e.g., "brand", "model")
- `label` - Display label
- `field_type` - UI component type (text, number, select, multiselect, boolean, range)
- `data_type` - Data type (string, number, boolean, array)
- `options` - JSONB array for select/multiselect options
- `is_required` - Whether field is mandatory
- `validation rules` - min/max values, length, pattern
- `show_in_search` - Show as filter in search
- `show_in_card` - Display on listing cards

#### `listings.attributes`
JSONB column to store dynamic attribute values.

**Example:**
```json
{
  "brand": "apple",
  "model": "iPhone 15 Pro",
  "storage": "256gb",
  "ram": "8gb",
  "condition": "brand_new",
  "color": "Black",
  "features": ["5g", "wireless_charging", "face_unlock"]
}
```

## 📊 Pre-Seeded Attributes

### ✅ Electronics - Mobile Phones
- Brand (select) - Required
- Model (text) - Required
- Storage (select) - Required
- RAM (select)
- Condition (select) - Required
- Color (text)
- Battery Health (number)
- Warranty (select)
- Features (multiselect) - 5G, Dual SIM, Fast Charging, etc.

### ✅ Vehicles - Cars
- Brand (select) - Required
- Model (text) - Required
- Year (number) - Required
- Mileage (number) - Required
- Transmission (select) - Required
- Fuel Type (select) - Required
- Engine Size (number)
- Color (select)
- Condition (select) - Required
- Body Type (select)
- Features (multiselect) - AC, Leather Seats, Sunroof, etc.
- Registered (boolean)
- Number of Owners (number)

### ✅ Real Estate - Houses for Sale
- Property Type (select) - Required
- Bedrooms (number) - Required
- Bathrooms (number) - Required
- Land Size (number)
- Built Area (number)
- Parking Spaces (number)
- Furnishing (select)
- Year Built (number)
- Features (multiselect) - Pool, Garden, Security, etc.

### ✅ Fashion - Men's Clothing
- Brand (text)
- Size (select) - Required
- Condition (select) - Required
- Color (text)
- Material (text)

## 🎨 React Native Component

### Usage Example

```tsx
import { CategoryAttributesForm } from '@/components/CategoryAttributesForm';

function CreateListingScreen() {
  const [attributes, setAttributes] = useState({});
  const [errors, setErrors] = useState({});

  const handleAttributeChange = (slug: string, value: any) => {
    setAttributes(prev => ({
      ...prev,
      [slug]: value
    }));
    // Clear error when user types
    if (errors[slug]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[slug];
        return newErrors;
      });
    }
  };

  return (
    <ScrollView>
      {/* ... other form fields ... */}
      
      <CategoryAttributesForm
        categoryId={selectedCategoryId}
        values={attributes}
        onChange={handleAttributeChange}
        errors={errors}
      />
      
      {/* ... submit button ... */}
    </ScrollView>
  );
}
```

### Field Types Supported

1. **Text** - Single line text input
2. **Number** - Numeric input with validation
3. **Select** - Dropdown with predefined options
4. **Multiselect** - Checkboxes for multiple selections
5. **Boolean** - Single checkbox (yes/no)
6. **Range** - Min/Max numeric inputs

## 🔧 Database Functions

### `get_category_attributes(p_category_id UUID)`
Fetches all attributes for a category, including inherited attributes from parent categories.

**Example:**
```sql
SELECT * FROM get_category_attributes('11000000-0000-4001-8000-000000000001');
```

### `validate_listing_attributes()` (Trigger - Optional)
Validates listing attributes against category schema before insert/update.

## 🚀 Migration Steps

### 1. Run Remove Risky Categories SQL
```bash
# Connect to your database and run:
supabase db reset --local
```

### 2. Run New Migrations
The migrations will be applied automatically when you reset the database:
- `23_category_attributes.sql` - Creates the schema
- `24_seed_category_attributes.sql` - Seeds initial attributes

## 📝 Adding New Attributes

### Option 1: Via SQL
```sql
INSERT INTO category_attributes (
  category_id, 
  name, 
  slug, 
  label, 
  field_type, 
  data_type, 
  is_required, 
  options, 
  sort_order
) VALUES (
  '10000000-0000-4000-8000-000000000001', -- Mobile Phones
  'Screen Size',
  'screen_size',
  'Screen Size (inches)',
  'select',
  'string',
  false,
  '[
    {"value": "5.5", "label": "5.5\""},
    {"value": "6.1", "label": "6.1\""},
    {"value": "6.7", "label": "6.7\""}
  ]'::jsonb,
  10
);
```

### Option 2: Via Admin Panel (Future)
You can build an admin panel to manage attributes through a UI.

## 🔍 Searching & Filtering

Attributes marked with `show_in_search: true` should be:
1. Displayed as filters on search pages
2. Indexed for performance
3. Used in search queries

**Example Search Query:**
```sql
SELECT * FROM listings
WHERE category_id = 'xxx'
  AND attributes->>'brand' = 'apple'
  AND (attributes->>'storage')::text IN ('128gb', '256gb')
  AND (attributes->>'condition') = 'brand_new';
```

## 📱 Display on Cards

Attributes marked with `show_in_card: true` should be displayed on listing preview cards.

**Example:**
```
iPhone 15 Pro
Apple • 256GB • Brand New
GHS 8,500
```

## ✅ Validation

### Client-side (React Native)
- Required field validation
- Min/max value validation
- Pattern matching
- Custom error messages

### Server-side (Optional Trigger)
Enable the validation trigger for database-level enforcement:

```sql
CREATE TRIGGER validate_listing_attributes_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION validate_listing_attributes();
```

## 🎯 Benefits

1. **Structured Data** - Consistent, queryable attribute data
2. **Better Search** - Filter by specific attributes (brand, year, size, etc.)
3. **Improved UX** - Relevant fields for each category
4. **Flexibility** - Add/modify attributes without code changes
5. **Validation** - Enforce data quality
6. **Analytics** - Better insights into listings

## 📊 Next Steps

1. ✅ Database schema created
2. ✅ Attributes seeded for major categories
3. ✅ React Native component created
4. 🔄 Update create/edit listing screens (next)
5. 🔄 Add search filters for attributes
6. 🔄 Display attributes on listing cards
7. 🔄 Build admin panel for attribute management

## 🛠️ Maintenance

### Adding Attributes for New Categories
When you add new categories, also add their specific attributes to maintain consistency.

### Updating Existing Attributes
Use `UPDATE` statements or build an admin interface to modify attribute definitions.

### Performance Optimization
- Index commonly searched attributes
- Use JSONB operators efficiently
- Consider materialized views for complex queries

## 🔐 Security

- RLS enabled on `category_attributes`
- Only admins can manage attributes
- All users can read active attributes
- Listing attributes are public (part of listings table)

---

**Need Help?** The system is flexible and extensible. Add attributes as needed for your marketplace!

