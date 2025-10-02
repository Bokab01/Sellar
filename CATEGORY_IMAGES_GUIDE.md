# 📸 Category Images Setup Guide

## Overview
This guide explains how to add and manage category images in your Sellar app.

---

## 🎯 Two Approaches

### **Approach 1: Database URLs (Recommended)**
Store image URLs in the database. Best for:
- Dynamic image updates
- CDN-hosted images
- Web-compatible images
- Remote management

### **Approach 2: Local Assets**
Bundle images with the app. Best for:
- Offline functionality
- Faster initial load
- No external dependencies

---

## 📦 Approach 1: Database URLs (We've Implemented This)

### Step 1: Run the Migration

```bash
npx supabase migration up --local
# or for production:
npx supabase db push
```

This adds:
- `image_url` column (TEXT)
- `color` column (VARCHAR)
- `description` column (TEXT)

### Step 2: Upload Images to Storage

You have several options:

#### **Option A: Supabase Storage (Recommended)**

1. **Create a storage bucket:**
```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true);

-- Set storage policy
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');
```

2. **Upload images via Supabase Dashboard:**
   - Go to Storage → category-images
   - Upload your category images (PNG/JPG, recommended size: 256x256px)
   - Get the public URL

3. **Update categories with URLs:**
```sql
UPDATE categories 
SET image_url = 'https://your-project.supabase.co/storage/v1/object/public/category-images/electronics.png'
WHERE id = '00000000-0000-4000-8000-000000000001';
```

#### **Option B: Cloudinary**

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Upload category images
3. Get public URLs
4. Update database:
```sql
UPDATE categories 
SET image_url = 'https://res.cloudinary.com/your-cloud/image/upload/v1/categories/electronics.png'
WHERE slug = 'electronics-gadgets';
```

#### **Option C: AWS S3 / Other CDN**

Similar process - upload images, get public URLs, update database.

### Step 3: Image Specifications

**Recommended:**
- Format: PNG with transparency (or JPG)
- Size: 256x256px (or 512x512px for high-res)
- File size: < 50KB per image
- Style: Consistent flat design or 3D icons

**Free Icon Resources:**
- [Flaticon](https://www.flaticon.com) - Free category icons
- [Icons8](https://icons8.com) - High-quality icon sets
- [Freepik](https://www.freepik.com) - Custom category illustrations
- [Undraw](https://undraw.co) - Customizable illustrations

### Step 4: Update All Categories

Here's a script to update all main categories:

```sql
-- Electronics & Gadgets
UPDATE categories SET 
  image_url = 'YOUR_CDN/electronics.png',
  color = '#4A90E2',
  description = 'Phones, computers, cameras, and more'
WHERE id = '00000000-0000-4000-8000-000000000001';

-- Vehicles
UPDATE categories SET 
  image_url = 'YOUR_CDN/vehicles.png',
  color = '#E74C3C',
  description = 'Cars, motorcycles, and vehicle parts'
WHERE id = '00000000-0000-4000-8000-000000000002';

-- Real Estate & Property
UPDATE categories SET 
  image_url = 'YOUR_CDN/real-estate.png',
  color = '#27AE60',
  description = 'Properties for sale and rent'
WHERE id = '00000000-0000-4000-8000-000000000003';

-- Fashion & Clothing
UPDATE categories SET 
  image_url = 'YOUR_CDN/fashion.png',
  color = '#9B59B6',
  description = 'Clothing, shoes, and accessories'
WHERE id = '00000000-0000-4000-8000-000000000004';

-- Home & Furniture
UPDATE categories SET 
  image_url = 'YOUR_CDN/home-furniture.png',
  color = '#F39C12',
  description = 'Furniture and home decor'
WHERE id = '00000000-0000-4000-8000-000000000005';

-- Health & Beauty
UPDATE categories SET 
  image_url = 'YOUR_CDN/health-beauty.png',
  color = '#E91E63',
  description = 'Skincare, makeup, and wellness'
WHERE id = '00000000-0000-4000-8000-000000000006';

-- Sports & Outdoors
UPDATE categories SET 
  image_url = 'YOUR_CDN/sports.png',
  color = '#FF5722',
  description = 'Fitness gear and outdoor equipment'
WHERE id = '00000000-0000-4000-8000-000000000007';

-- Baby, Kids & Toys
UPDATE categories SET 
  image_url = 'YOUR_CDN/baby-kids.png',
  color = '#FFEB3B',
  description = 'Baby gear, toys, and kids items'
WHERE id = '00000000-0000-4000-8000-000000000008';

-- Books, Media & Education
UPDATE categories SET 
  image_url = 'YOUR_CDN/books-media.png',
  color = '#795548',
  description = 'Books, music, and educational materials'
WHERE id = '00000000-0000-4000-8000-000000000009';

-- Services
UPDATE categories SET 
  image_url = 'YOUR_CDN/services.png',
  color = '#607D8B',
  description = 'Professional and home services'
WHERE id = '00000000-0000-4000-8000-000000000010';

-- Jobs & Freelance
UPDATE categories SET 
  image_url = 'YOUR_CDN/jobs.png',
  color = '#3F51B5',
  description = 'Job listings and freelance opportunities'
WHERE id = '00000000-0000-4000-8000-000000000011';

-- Food & Agriculture
UPDATE categories SET 
  image_url = 'YOUR_CDN/food-agriculture.png',
  color = '#8BC34A',
  description = 'Food items and agricultural products'
WHERE id = '00000000-0000-4000-8000-000000000012';

-- Pets & Animals
UPDATE categories SET 
  image_url = 'YOUR_CDN/pets.png',
  color = '#FF9800',
  description = 'Pets, pet supplies, and livestock'
WHERE id = '00000000-0000-4000-8000-000000000013';

-- Industrial & Business
UPDATE categories SET 
  image_url = 'YOUR_CDN/industrial.png',
  color = '#455A64',
  description = 'Business equipment and industrial supplies'
WHERE id = '00000000-0000-4000-8000-000000000014';

-- Tickets & Events
UPDATE categories SET 
  image_url = 'YOUR_CDN/tickets-events.png',
  color = '#E91E63',
  description = 'Event tickets and experiences'
WHERE id = '00000000-0000-4000-8000-000000000015';

-- Digital Products & Software
UPDATE categories SET 
  image_url = 'YOUR_CDN/digital-products.png',
  color = '#00BCD4',
  description = 'Apps, software, and digital downloads'
WHERE id = '00000000-0000-4000-8000-000000000016';

-- Collectibles & Hobbies
UPDATE categories SET 
  image_url = 'YOUR_CDN/collectibles.png',
  color = '#FFC107',
  description = 'Art, antiques, and collectibles'
WHERE id = '00000000-0000-4000-8000-000000000017';

-- Miscellaneous
UPDATE categories SET 
  image_url = 'YOUR_CDN/miscellaneous.png',
  color = '#9E9E9E',
  description = 'Everything else'
WHERE id = '00000000-0000-4000-8000-000000000018';
```

---

## 🎨 Approach 2: Local Assets (Alternative)

If you prefer to bundle images with your app:

### Step 1: Add Images to Assets

```
assets/
  categories/
    electronics.png
    vehicles.png
    real-estate.png
    fashion.png
    home-furniture.png
    health-beauty.png
    sports.png
    baby-kids.png
    books-media.png
    services.png
    jobs.png
    food-agriculture.png
    pets.png
    industrial.png
    tickets-events.png
    digital-products.png
    collectibles.png
    miscellaneous.png
```

### Step 2: Create Image Map

Create `utils/categoryImages.ts`:

```typescript
export const CATEGORY_IMAGES: Record<string, any> = {
  '00000000-0000-4000-8000-000000000001': require('@/assets/categories/electronics.png'),
  '00000000-0000-4000-8000-000000000002': require('@/assets/categories/vehicles.png'),
  '00000000-0000-4000-8000-000000000003': require('@/assets/categories/real-estate.png'),
  '00000000-0000-4000-8000-000000000004': require('@/assets/categories/fashion.png'),
  '00000000-0000-4000-8000-000000000005': require('@/assets/categories/home-furniture.png'),
  '00000000-0000-4000-8000-000000000006': require('@/assets/categories/health-beauty.png'),
  '00000000-0000-4000-8000-000000000007': require('@/assets/categories/sports.png'),
  '00000000-0000-4000-8000-000000000008': require('@/assets/categories/baby-kids.png'),
  '00000000-0000-4000-8000-000000000009': require('@/assets/categories/books-media.png'),
  '00000000-0000-4000-8000-000000000010': require('@/assets/categories/services.png'),
  '00000000-0000-4000-8000-000000000011': require('@/assets/categories/jobs.png'),
  '00000000-0000-4000-8000-000000000012': require('@/assets/categories/food-agriculture.png'),
  '00000000-0000-4000-8000-000000000013': require('@/assets/categories/pets.png'),
  '00000000-0000-4000-8000-000000000014': require('@/assets/categories/industrial.png'),
  '00000000-0000-4000-8000-000000000015': require('@/assets/categories/tickets-events.png'),
  '00000000-0000-4000-8000-000000000016': require('@/assets/categories/digital-products.png'),
  '00000000-0000-4000-8000-000000000017': require('@/assets/categories/collectibles.png'),
  '00000000-0000-4000-8000-000000000018': require('@/assets/categories/miscellaneous.png'),
};
```

### Step 3: Update CategoryPicker

```typescript
import { CATEGORY_IMAGES } from '@/utils/categoryImages';

// In renderCategoryItem:
<Image
  source={CATEGORY_IMAGES[category.id]}
  style={{ width: '100%', height: '100%' }}
  resizeMode="cover"
/>
```

---

## 🚀 Quick Setup with Supabase Storage

Here's the fastest way to get started:

### 1. Create Storage Bucket (One-time setup)

```bash
npx supabase storage create category-images --public
```

Or via SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true);

CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');
```

### 2. Upload Helper Script

Create `scripts/upload-category-images.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function uploadCategoryImages() {
  const imagesDir = path.join(__dirname, '../assets/categories');
  const files = fs.readdirSync(imagesDir);

  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
      .from('category-images')
      .upload(file, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading ${file}:`, error);
    } else {
      console.log(`✅ Uploaded ${file}`);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('category-images')
        .getPublicUrl(file);
      
      console.log(`   URL: ${urlData.publicUrl}`);
    }
  }
}

uploadCategoryImages();
```

Run it:
```bash
ts-node scripts/upload-category-images.ts
```

---

## ✅ Testing

After adding images:

1. **Open the app**
2. **Navigate to Create Listing**
3. **Click "Select a category"**
4. **You should see:**
   - Category images (if URLs are set)
   - Custom colors for each category
   - Category descriptions below names
   - Fallback to emojis if no image

---

## 🎨 Design Tips

**For Professional Look:**
1. Use consistent icon style (flat, 3D, or line art)
2. Keep colors vibrant but not overwhelming
3. Use PNG with transparency
4. Maintain consistent sizing
5. Consider dark mode compatibility

**Color Palette Suggestions:**
- Blue tones: Tech, Digital, Professional
- Green tones: Nature, Health, Food
- Red/Orange: Vehicles, Sports, Energy
- Purple/Pink: Fashion, Beauty, Lifestyle
- Yellow: Kids, Entertainment, Events
- Gray: Services, Business, Miscellaneous

---

## 📱 Result

Your categories will now display as:

```
┌─────────────────────────────────────┐
│ [🖼️ Image] Electronics & Gadgets   │
│             Phones, computers...    │
├─────────────────────────────────────┤
│ [🖼️ Image] Vehicles                │
│             Cars, motorcycles...    │
├─────────────────────────────────────┤
│ [🖼️ Image] Fashion & Clothing      │
│             Clothing, shoes...      │
└─────────────────────────────────────┘
```

Much more professional than emojis! 🎉

