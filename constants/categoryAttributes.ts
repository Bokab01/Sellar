// ⚠️ DEPRECATED WARNING ⚠️
// This file is kept for legacy validation fallback only.
// Category attributes are now stored in the database (category_attributes table)
// and fetched dynamically via get_category_attributes() RPC function.
// 
// New code should fetch attributes from the database, not from this file.
// This will be removed in a future version once validation is fully migrated.
// See: supabase/migrations/23_category_attributes.sql & 24_seed_category_attributes.sql

export interface AttributeOption {
  value: string;
  label: string;
}

export interface CategoryAttribute {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'text' | 'number';
  required: boolean;
  placeholder?: string;
  options?: AttributeOption[];
  unit?: string;
}

export const CATEGORY_ATTRIBUTES: Record<string, CategoryAttribute[]> = {
  // =============================================
  // ELECTRONICS & TECHNOLOGY
  // =============================================
  
  // Phones & Tablets
  'smartphones': [
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'apple', label: 'Apple' },
        { value: 'samsung', label: 'Samsung' },
        { value: 'google', label: 'Google' },
        { value: 'oneplus', label: 'OnePlus' },
        { value: 'xiaomi', label: 'Xiaomi' },
        { value: 'huawei', label: 'Huawei' },
        { value: 'oppo', label: 'Oppo' },
        { value: 'vivo', label: 'Vivo' },
        { value: 'tecno', label: 'Tecno' },
        { value: 'infinix', label: 'Infinix' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. iPhone 14 Pro Max, Galaxy S23 Ultra'
    },
    {
      id: 'storage',
      name: 'Storage',
      type: 'select',
      required: true,
      options: [
        { value: '64gb', label: '64GB' },
        { value: '128gb', label: '128GB' },
        { value: '256gb', label: '256GB' },
        { value: '512gb', label: '512GB' },
        { value: '1tb', label: '1TB' },
      ]
    },
    {
      id: 'color',
      name: 'Color',
      type: 'select',
      required: false,
      options: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
        { value: 'gold', label: 'Gold' },
        { value: 'silver', label: 'Silver' },
        { value: 'blue', label: 'Blue' },
        { value: 'red', label: 'Red' },
        { value: 'green', label: 'Green' },
        { value: 'purple', label: 'Purple' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'network',
      name: 'Network',
      type: 'select',
      required: false,
      options: [
        { value: '4g', label: '4G LTE' },
        { value: '5g', label: '5G' },
        { value: '3g', label: '3G' },
      ]
    }
  ],

  // Electronics - Laptops
  'laptops': [
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'apple', label: 'Apple' },
        { value: 'dell', label: 'Dell' },
        { value: 'hp', label: 'HP' },
        { value: 'lenovo', label: 'Lenovo' },
        { value: 'asus', label: 'ASUS' },
        { value: 'acer', label: 'Acer' },
        { value: 'microsoft', label: 'Microsoft' },
        { value: 'msi', label: 'MSI' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'processor',
      name: 'Processor',
      type: 'select',
      required: true,
      options: [
        { value: 'intel-i3', label: 'Intel Core i3' },
        { value: 'intel-i5', label: 'Intel Core i5' },
        { value: 'intel-i7', label: 'Intel Core i7' },
        { value: 'intel-i9', label: 'Intel Core i9' },
        { value: 'amd-ryzen-3', label: 'AMD Ryzen 3' },
        { value: 'amd-ryzen-5', label: 'AMD Ryzen 5' },
        { value: 'amd-ryzen-7', label: 'AMD Ryzen 7' },
        { value: 'amd-ryzen-9', label: 'AMD Ryzen 9' },
        { value: 'apple-m1', label: 'Apple M1' },
        { value: 'apple-m2', label: 'Apple M2' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'ram',
      name: 'RAM',
      type: 'select',
      required: true,
      options: [
        { value: '4gb', label: '4GB' },
        { value: '8gb', label: '8GB' },
        { value: '16gb', label: '16GB' },
        { value: '32gb', label: '32GB' },
        { value: '64gb', label: '64GB' },
      ]
    },
    {
      id: 'storage',
      name: 'Storage',
      type: 'select',
      required: true,
      options: [
        { value: '128gb-ssd', label: '128GB SSD' },
        { value: '256gb-ssd', label: '256GB SSD' },
        { value: '512gb-ssd', label: '512GB SSD' },
        { value: '1tb-ssd', label: '1TB SSD' },
        { value: '2tb-ssd', label: '2TB SSD' },
        { value: '500gb-hdd', label: '500GB HDD' },
        { value: '1tb-hdd', label: '1TB HDD' },
        { value: '2tb-hdd', label: '2TB HDD' },
      ]
    },
    {
      id: 'screen_size',
      name: 'Screen Size',
      type: 'select',
      required: false,
      options: [
        { value: '11-inch', label: '11 inch' },
        { value: '13-inch', label: '13 inch' },
        { value: '14-inch', label: '14 inch' },
        { value: '15-inch', label: '15 inch' },
        { value: '16-inch', label: '16 inch' },
        { value: '17-inch', label: '17 inch' },
      ]
    }
  ],

  // Gaming - Gaming Consoles
  'gaming-consoles': [
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'sony', label: 'Sony PlayStation' },
        { value: 'microsoft', label: 'Microsoft Xbox' },
        { value: 'nintendo', label: 'Nintendo' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'select',
      required: true,
      options: [
        { value: 'ps5', label: 'PlayStation 5' },
        { value: 'ps4', label: 'PlayStation 4' },
        { value: 'ps4-pro', label: 'PlayStation 4 Pro' },
        { value: 'xbox-series-x', label: 'Xbox Series X' },
        { value: 'xbox-series-s', label: 'Xbox Series S' },
        { value: 'xbox-one', label: 'Xbox One' },
        { value: 'nintendo-switch', label: 'Nintendo Switch' },
        { value: 'nintendo-switch-lite', label: 'Nintendo Switch Lite' },
        { value: 'nintendo-switch-oled', label: 'Nintendo Switch OLED' },
      ]
    },
    {
      id: 'storage',
      name: 'Storage',
      type: 'select',
      required: false,
      options: [
        { value: '500gb', label: '500GB' },
        { value: '1tb', label: '1TB' },
        { value: '2tb', label: '2TB' },
      ]
    },
    {
      id: 'includes',
      name: 'Includes',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'controller', label: 'Controller(s)' },
        { value: 'cables', label: 'Cables' },
        { value: 'box', label: 'Original Box' },
        { value: 'manual', label: 'Manual' },
        { value: 'games', label: 'Games' },
      ]
    }
  ],

  // Fashion - Men's Clothing
  'mens-clothing': [
    {
      id: 'clothing_type',
      name: 'Clothing Type',
      type: 'select',
      required: true,
      options: [
        { value: 'shirt', label: 'Shirt' },
        { value: 't-shirt', label: 'T-Shirt' },
        { value: 'polo', label: 'Polo' },
        { value: 'hoodie', label: 'Hoodie' },
        { value: 'sweater', label: 'Sweater' },
        { value: 'jacket', label: 'Jacket' },
        { value: 'jeans', label: 'Jeans' },
        { value: 'trousers', label: 'Trousers' },
        { value: 'shorts', label: 'Shorts' },
        { value: 'suit', label: 'Suit' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: true,
      options: [
        { value: 'xs', label: 'XS' },
        { value: 's', label: 'S' },
        { value: 'm', label: 'M' },
        { value: 'l', label: 'L' },
        { value: 'xl', label: 'XL' },
        { value: 'xxl', label: 'XXL' },
        { value: 'xxxl', label: '3XL' },
      ]
    },
    {
      id: 'color',
      name: 'Color',
      type: 'select',
      required: false,
      options: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
        { value: 'blue', label: 'Blue' },
        { value: 'red', label: 'Red' },
        { value: 'green', label: 'Green' },
        { value: 'yellow', label: 'Yellow' },
        { value: 'gray', label: 'Gray' },
        { value: 'brown', label: 'Brown' },
        { value: 'navy', label: 'Navy' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'text',
      required: false,
      placeholder: 'e.g. Nike, Adidas, Zara'
    }
  ],

  // Fashion - Women's Clothing
  'womens-clothing': [
    {
      id: 'clothing_type',
      name: 'Clothing Type',
      type: 'select',
      required: true,
      options: [
        { value: 'dress', label: 'Dress' },
        { value: 'top', label: 'Top' },
        { value: 'blouse', label: 'Blouse' },
        { value: 't-shirt', label: 'T-Shirt' },
        { value: 'sweater', label: 'Sweater' },
        { value: 'cardigan', label: 'Cardigan' },
        { value: 'jacket', label: 'Jacket' },
        { value: 'jeans', label: 'Jeans' },
        { value: 'trousers', label: 'Trousers' },
        { value: 'skirt', label: 'Skirt' },
        { value: 'shorts', label: 'Shorts' },
        { value: 'jumpsuit', label: 'Jumpsuit' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: true,
      options: [
        { value: 'xs', label: 'XS' },
        { value: 's', label: 'S' },
        { value: 'm', label: 'M' },
        { value: 'l', label: 'L' },
        { value: 'xl', label: 'XL' },
        { value: 'xxl', label: 'XXL' },
        { value: '6', label: 'Size 6' },
        { value: '8', label: 'Size 8' },
        { value: '10', label: 'Size 10' },
        { value: '12', label: 'Size 12' },
        { value: '14', label: 'Size 14' },
        { value: '16', label: 'Size 16' },
        { value: '18', label: 'Size 18' },
      ]
    },
    {
      id: 'color',
      name: 'Color',
      type: 'select',
      required: false,
      options: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
        { value: 'blue', label: 'Blue' },
        { value: 'red', label: 'Red' },
        { value: 'green', label: 'Green' },
        { value: 'pink', label: 'Pink' },
        { value: 'purple', label: 'Purple' },
        { value: 'yellow', label: 'Yellow' },
        { value: 'gray', label: 'Gray' },
        { value: 'brown', label: 'Brown' },
        { value: 'navy', label: 'Navy' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'text',
      required: false,
      placeholder: 'e.g. Zara, H&M, Forever 21'
    }
  ],

  // Fashion - Shoes (Men's and Women's)
  'mens-shoes': [
    {
      id: 'shoe_type',
      name: 'Shoe Type',
      type: 'select',
      required: true,
      options: [
        { value: 'sneakers', label: 'Sneakers' },
        { value: 'dress-shoes', label: 'Dress Shoes' },
        { value: 'boots', label: 'Boots' },
        { value: 'sandals', label: 'Sandals' },
        { value: 'loafers', label: 'Loafers' },
        { value: 'athletic', label: 'Athletic Shoes' },
        { value: 'casual', label: 'Casual Shoes' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: true,
      options: [
        { value: '6', label: 'Size 6' },
        { value: '6.5', label: 'Size 6.5' },
        { value: '7', label: 'Size 7' },
        { value: '7.5', label: 'Size 7.5' },
        { value: '8', label: 'Size 8' },
        { value: '8.5', label: 'Size 8.5' },
        { value: '9', label: 'Size 9' },
        { value: '9.5', label: 'Size 9.5' },
        { value: '10', label: 'Size 10' },
        { value: '10.5', label: 'Size 10.5' },
        { value: '11', label: 'Size 11' },
        { value: '11.5', label: 'Size 11.5' },
        { value: '12', label: 'Size 12' },
        { value: '13', label: 'Size 13' },
        { value: '14', label: 'Size 14' },
      ]
    },
    {
      id: 'color',
      name: 'Color',
      type: 'select',
      required: false,
      options: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
        { value: 'brown', label: 'Brown' },
        { value: 'blue', label: 'Blue' },
        { value: 'red', label: 'Red' },
        { value: 'gray', label: 'Gray' },
        { value: 'navy', label: 'Navy' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'text',
      required: false,
      placeholder: 'e.g. Nike, Adidas, Clarks'
    }
  ],

  'womens-shoes': [
    {
      id: 'shoe_type',
      name: 'Shoe Type',
      type: 'select',
      required: true,
      options: [
        { value: 'heels', label: 'Heels' },
        { value: 'flats', label: 'Flats' },
        { value: 'sneakers', label: 'Sneakers' },
        { value: 'boots', label: 'Boots' },
        { value: 'sandals', label: 'Sandals' },
        { value: 'wedges', label: 'Wedges' },
        { value: 'athletic', label: 'Athletic Shoes' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: true,
      options: [
        { value: '5', label: 'Size 5' },
        { value: '5.5', label: 'Size 5.5' },
        { value: '6', label: 'Size 6' },
        { value: '6.5', label: 'Size 6.5' },
        { value: '7', label: 'Size 7' },
        { value: '7.5', label: 'Size 7.5' },
        { value: '8', label: 'Size 8' },
        { value: '8.5', label: 'Size 8.5' },
        { value: '9', label: 'Size 9' },
        { value: '9.5', label: 'Size 9.5' },
        { value: '10', label: 'Size 10' },
        { value: '11', label: 'Size 11' },
      ]
    },
    {
      id: 'heel_height',
      name: 'Heel Height',
      type: 'select',
      required: false,
      options: [
        { value: 'flat', label: 'Flat (0-1cm)' },
        { value: 'low', label: 'Low (1-3cm)' },
        { value: 'medium', label: 'Medium (3-7cm)' },
        { value: 'high', label: 'High (7-10cm)' },
        { value: 'very-high', label: 'Very High (10cm+)' },
      ]
    },
    {
      id: 'color',
      name: 'Color',
      type: 'select',
      required: false,
      options: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
        { value: 'brown', label: 'Brown' },
        { value: 'nude', label: 'Nude' },
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
        { value: 'pink', label: 'Pink' },
        { value: 'gold', label: 'Gold' },
        { value: 'silver', label: 'Silver' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'text',
      required: false,
      placeholder: 'e.g. Zara, Aldo, Christian Louboutin'
    }
  ],

  // Vehicles - Cars
  'sedans': [
    {
      id: 'make',
      name: 'Make',
      type: 'select',
      required: true,
      options: [
        { value: 'toyota', label: 'Toyota' },
        { value: 'honda', label: 'Honda' },
        { value: 'nissan', label: 'Nissan' },
        { value: 'hyundai', label: 'Hyundai' },
        { value: 'kia', label: 'Kia' },
        { value: 'mercedes', label: 'Mercedes-Benz' },
        { value: 'bmw', label: 'BMW' },
        { value: 'audi', label: 'Audi' },
        { value: 'volkswagen', label: 'Volkswagen' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. Camry, Accord, Altima'
    },
    {
      id: 'year',
      name: 'Year',
      type: 'select',
      required: true,
      options: Array.from({ length: 30 }, (_, i) => {
        const year = new Date().getFullYear() - i;
        return { value: year.toString(), label: year.toString() };
      })
    },
    {
      id: 'mileage',
      name: 'Mileage',
      type: 'number',
      required: true,
      placeholder: 'Enter mileage',
      unit: 'km'
    },
    {
      id: 'fuel_type',
      name: 'Fuel Type',
      type: 'select',
      required: true,
      options: [
        { value: 'petrol', label: 'Petrol' },
        { value: 'diesel', label: 'Diesel' },
        { value: 'hybrid', label: 'Hybrid' },
        { value: 'electric', label: 'Electric' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'transmission',
      name: 'Transmission',
      type: 'select',
      required: true,
      options: [
        { value: 'automatic', label: 'Automatic' },
        { value: 'manual', label: 'Manual' },
        { value: 'cvt', label: 'CVT' },
      ]
    },
    {
      id: 'color',
      name: 'Color',
      type: 'select',
      required: false,
      options: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
        { value: 'silver', label: 'Silver' },
        { value: 'gray', label: 'Gray' },
        { value: 'blue', label: 'Blue' },
        { value: 'red', label: 'Red' },
        { value: 'gold', label: 'Gold' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Home & Garden - Furniture
  'living-room': [
    {
      id: 'furniture_type',
      name: 'Furniture Type',
      type: 'select',
      required: true,
      options: [
        { value: 'sofa', label: 'Sofa' },
        { value: 'armchair', label: 'Armchair' },
        { value: 'coffee-table', label: 'Coffee Table' },
        { value: 'tv-stand', label: 'TV Stand' },
        { value: 'bookshelf', label: 'Bookshelf' },
        { value: 'side-table', label: 'Side Table' },
        { value: 'ottoman', label: 'Ottoman' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: false,
      options: [
        { value: 'leather', label: 'Leather' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'wood', label: 'Wood' },
        { value: 'metal', label: 'Metal' },
        { value: 'glass', label: 'Glass' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'color',
      name: 'Color',
      type: 'select',
      required: false,
      options: [
        { value: 'black', label: 'Black' },
        { value: 'white', label: 'White' },
        { value: 'brown', label: 'Brown' },
        { value: 'gray', label: 'Gray' },
        { value: 'beige', label: 'Beige' },
        { value: 'blue', label: 'Blue' },
        { value: 'red', label: 'Red' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'dimensions',
      name: 'Dimensions (L x W x H)',
      type: 'text',
      required: false,
      placeholder: 'e.g. 200cm x 90cm x 85cm'
    }
  ],

  // =============================================
  // MISSING ELECTRONICS SUBCATEGORIES
  // =============================================

  // Feature Phones
  'feature-phones': [
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'nokia', label: 'Nokia' },
        { value: 'samsung', label: 'Samsung' },
        { value: 'tecno', label: 'Tecno' },
        { value: 'infinix', label: 'Infinix' },
        { value: 'itel', label: 'Itel' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. Nokia 3310, Samsung Guru'
    },
    {
      id: 'network',
      name: 'Network',
      type: 'select',
      required: false,
      options: [
        { value: '2g', label: '2G' },
        { value: '3g', label: '3G' },
        { value: '4g', label: '4G' },
      ]
    },
    {
      id: 'battery_life',
      name: 'Battery Life',
      type: 'select',
      required: false,
      options: [
        { value: 'up-to-7-days', label: 'Up to 7 days' },
        { value: 'up-to-14-days', label: 'Up to 14 days' },
        { value: 'up-to-30-days', label: 'Up to 30 days' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Tablets
  'tablets': [
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'apple', label: 'Apple' },
        { value: 'samsung', label: 'Samsung' },
        { value: 'huawei', label: 'Huawei' },
        { value: 'lenovo', label: 'Lenovo' },
        { value: 'xiaomi', label: 'Xiaomi' },
        { value: 'tecno', label: 'Tecno' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. iPad Air, Galaxy Tab S9'
    },
    {
      id: 'screen_size',
      name: 'Screen Size',
      type: 'select',
      required: true,
      options: [
        { value: '7-8-inch', label: '7-8 inch' },
        { value: '9-10-inch', label: '9-10 inch' },
        { value: '11-12-inch', label: '11-12 inch' },
        { value: '13-inch-plus', label: '13 inch+' },
      ]
    },
    {
      id: 'storage',
      name: 'Storage',
      type: 'select',
      required: true,
      options: [
        { value: '32gb', label: '32GB' },
        { value: '64gb', label: '64GB' },
        { value: '128gb', label: '128GB' },
        { value: '256gb', label: '256GB' },
        { value: '512gb', label: '512GB' },
        { value: '1tb', label: '1TB' },
      ]
    },
    {
      id: 'connectivity',
      name: 'Connectivity',
      type: 'select',
      required: false,
      options: [
        { value: 'wifi-only', label: 'Wi-Fi Only' },
        { value: 'wifi-cellular', label: 'Wi-Fi + Cellular' },
      ]
    }
  ],

  // Phone Accessories
  'phone-accessories': [
    {
      id: 'accessory_type',
      name: 'Accessory Type',
      type: 'select',
      required: true,
      options: [
        { value: 'case-cover', label: 'Case/Cover' },
        { value: 'screen-protector', label: 'Screen Protector' },
        { value: 'charger', label: 'Charger' },
        { value: 'power-bank', label: 'Power Bank' },
        { value: 'headphones', label: 'Headphones' },
        { value: 'car-mount', label: 'Car Mount' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'compatible_brands',
      name: 'Compatible Brands',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'apple', label: 'Apple' },
        { value: 'samsung', label: 'Samsung' },
        { value: 'huawei', label: 'Huawei' },
        { value: 'xiaomi', label: 'Xiaomi' },
        { value: 'universal', label: 'Universal' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: false,
      options: [
        { value: 'silicone', label: 'Silicone' },
        { value: 'leather', label: 'Leather' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'metal', label: 'Metal' },
        { value: 'glass', label: 'Glass' },
        { value: 'fabric', label: 'Fabric' },
      ]
    }
  ],

  // Smartwatches
  'smartwatches': [
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'apple', label: 'Apple' },
        { value: 'samsung', label: 'Samsung' },
        { value: 'huawei', label: 'Huawei' },
        { value: 'xiaomi', label: 'Xiaomi' },
        { value: 'fitbit', label: 'Fitbit' },
        { value: 'garmin', label: 'Garmin' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. Apple Watch Series 9, Galaxy Watch 6'
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: false,
      options: [
        { value: '38mm', label: '38mm' },
        { value: '40mm', label: '40mm' },
        { value: '41mm', label: '41mm' },
        { value: '42mm', label: '42mm' },
        { value: '44mm', label: '44mm' },
        { value: '45mm', label: '45mm' },
        { value: '49mm', label: '49mm' },
      ]
    },
    {
      id: 'features',
      name: 'Key Features',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'gps', label: 'GPS' },
        { value: 'cellular', label: 'Cellular' },
        { value: 'heart-rate', label: 'Heart Rate Monitor' },
        { value: 'sleep-tracking', label: 'Sleep Tracking' },
        { value: 'waterproof', label: 'Waterproof' },
        { value: 'nfc-payment', label: 'NFC Payment' },
      ]
    }
  ],

  // Desktop Computers
  'desktops': [
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'dell', label: 'Dell' },
        { value: 'hp', label: 'HP' },
        { value: 'lenovo', label: 'Lenovo' },
        { value: 'asus', label: 'ASUS' },
        { value: 'acer', label: 'Acer' },
        { value: 'apple', label: 'Apple' },
        { value: 'custom-built', label: 'Custom Built' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'processor',
      name: 'Processor',
      type: 'select',
      required: true,
      options: [
        { value: 'intel-i3', label: 'Intel Core i3' },
        { value: 'intel-i5', label: 'Intel Core i5' },
        { value: 'intel-i7', label: 'Intel Core i7' },
        { value: 'intel-i9', label: 'Intel Core i9' },
        { value: 'amd-ryzen-3', label: 'AMD Ryzen 3' },
        { value: 'amd-ryzen-5', label: 'AMD Ryzen 5' },
        { value: 'amd-ryzen-7', label: 'AMD Ryzen 7' },
        { value: 'amd-ryzen-9', label: 'AMD Ryzen 9' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'ram',
      name: 'RAM',
      type: 'select',
      required: true,
      options: [
        { value: '4gb', label: '4GB' },
        { value: '8gb', label: '8GB' },
        { value: '16gb', label: '16GB' },
        { value: '32gb', label: '32GB' },
        { value: '64gb', label: '64GB' },
      ]
    },
    {
      id: 'storage_type',
      name: 'Storage Type',
      type: 'select',
      required: true,
      options: [
        { value: 'hdd', label: 'HDD' },
        { value: 'ssd', label: 'SSD' },
        { value: 'hybrid', label: 'Hybrid (HDD + SSD)' },
      ]
    },
    {
      id: 'storage_capacity',
      name: 'Storage Capacity',
      type: 'select',
      required: true,
      options: [
        { value: '256gb', label: '256GB' },
        { value: '512gb', label: '512GB' },
        { value: '1tb', label: '1TB' },
        { value: '2tb', label: '2TB' },
        { value: '4tb', label: '4TB' },
      ]
    },
    {
      id: 'graphics_card',
      name: 'Graphics Card',
      type: 'select',
      required: false,
      options: [
        { value: 'integrated', label: 'Integrated Graphics' },
        { value: 'nvidia-gtx', label: 'NVIDIA GTX Series' },
        { value: 'nvidia-rtx', label: 'NVIDIA RTX Series' },
        { value: 'amd-radeon', label: 'AMD Radeon' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Computer Accessories
  'computer-accessories': [
    {
      id: 'accessory_type',
      name: 'Accessory Type',
      type: 'select',
      required: true,
      options: [
        { value: 'keyboard', label: 'Keyboard' },
        { value: 'mouse', label: 'Mouse' },
        { value: 'monitor', label: 'Monitor' },
        { value: 'webcam', label: 'Webcam' },
        { value: 'printer', label: 'Printer' },
        { value: 'external-drive', label: 'External Drive' },
        { value: 'cables', label: 'Cables' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'logitech', label: 'Logitech' },
        { value: 'microsoft', label: 'Microsoft' },
        { value: 'dell', label: 'Dell' },
        { value: 'hp', label: 'HP' },
        { value: 'razer', label: 'Razer' },
        { value: 'corsair', label: 'Corsair' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'connectivity',
      name: 'Connectivity',
      type: 'select',
      required: false,
      options: [
        { value: 'wired-usb', label: 'Wired (USB)' },
        { value: 'wireless-bluetooth', label: 'Wireless (Bluetooth)' },
        { value: 'wireless-2.4ghz', label: 'Wireless (2.4GHz)' },
        { value: 'both', label: 'Both Wired & Wireless' },
      ]
    }
  ],

  // Software
  'software': [
    {
      id: 'software_type',
      name: 'Software Type',
      type: 'select',
      required: true,
      options: [
        { value: 'operating-system', label: 'Operating System' },
        { value: 'office-suite', label: 'Office Suite' },
        { value: 'antivirus', label: 'Antivirus' },
        { value: 'design-software', label: 'Design Software' },
        { value: 'games', label: 'Games' },
        { value: 'productivity', label: 'Productivity' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'platform',
      name: 'Platform',
      type: 'multiselect',
      required: true,
      options: [
        { value: 'windows', label: 'Windows' },
        { value: 'macos', label: 'macOS' },
        { value: 'linux', label: 'Linux' },
        { value: 'android', label: 'Android' },
        { value: 'ios', label: 'iOS' },
      ]
    },
    {
      id: 'license_type',
      name: 'License Type',
      type: 'select',
      required: true,
      options: [
        { value: 'original', label: 'Original License' },
        { value: 'oem', label: 'OEM License' },
        { value: 'subscription', label: 'Subscription' },
        { value: 'free', label: 'Free/Open Source' },
      ]
    }
  ],

  // =============================================
  // AUDIO & VIDEO SUBCATEGORIES
  // =============================================

  // Headphones & Earphones
  'headphones-earphones': [
    {
      id: 'type',
      name: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'over-ear', label: 'Over-Ear Headphones' },
        { value: 'on-ear', label: 'On-Ear Headphones' },
        { value: 'in-ear', label: 'In-Ear Earphones' },
        { value: 'earbuds', label: 'Earbuds' },
        { value: 'gaming-headset', label: 'Gaming Headset' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'apple', label: 'Apple' },
        { value: 'samsung', label: 'Samsung' },
        { value: 'sony', label: 'Sony' },
        { value: 'bose', label: 'Bose' },
        { value: 'jbl', label: 'JBL' },
        { value: 'beats', label: 'Beats' },
        { value: 'sennheiser', label: 'Sennheiser' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'connectivity',
      name: 'Connectivity',
      type: 'select',
      required: true,
      options: [
        { value: 'wired', label: 'Wired (3.5mm/USB)' },
        { value: 'bluetooth', label: 'Bluetooth' },
        { value: 'both', label: 'Both Wired & Bluetooth' },
      ]
    },
    {
      id: 'features',
      name: 'Features',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'noise-cancelling', label: 'Noise Cancelling' },
        { value: 'waterproof', label: 'Waterproof' },
        { value: 'microphone', label: 'Built-in Microphone' },
        { value: 'fast-charging', label: 'Fast Charging' },
        { value: 'wireless-charging', label: 'Wireless Charging Case' },
      ]
    }
  ],

  // Speakers
  'speakers': [
    {
      id: 'type',
      name: 'Speaker Type',
      type: 'select',
      required: true,
      options: [
        { value: 'bluetooth-portable', label: 'Bluetooth Portable' },
        { value: 'home-theater', label: 'Home Theater System' },
        { value: 'soundbar', label: 'Soundbar' },
        { value: 'bookshelf', label: 'Bookshelf Speakers' },
        { value: 'computer-speakers', label: 'Computer Speakers' },
        { value: 'smart-speaker', label: 'Smart Speaker' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'jbl', label: 'JBL' },
        { value: 'bose', label: 'Bose' },
        { value: 'sony', label: 'Sony' },
        { value: 'harman-kardon', label: 'Harman Kardon' },
        { value: 'beats', label: 'Beats' },
        { value: 'amazon', label: 'Amazon (Echo)' },
        { value: 'google', label: 'Google (Nest)' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'power_output',
      name: 'Power Output',
      type: 'select',
      required: false,
      options: [
        { value: 'under-10w', label: 'Under 10W' },
        { value: '10-30w', label: '10-30W' },
        { value: '30-50w', label: '30-50W' },
        { value: '50-100w', label: '50-100W' },
        { value: 'over-100w', label: 'Over 100W' },
      ]
    },
    {
      id: 'connectivity',
      name: 'Connectivity',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'bluetooth', label: 'Bluetooth' },
        { value: 'wifi', label: 'Wi-Fi' },
        { value: 'aux', label: 'AUX (3.5mm)' },
        { value: 'usb', label: 'USB' },
        { value: 'hdmi', label: 'HDMI' },
      ]
    }
  ],

  // TVs & Monitors
  'tv-monitors': [
    {
      id: 'type',
      name: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'smart-tv', label: 'Smart TV' },
        { value: 'led-tv', label: 'LED TV' },
        { value: 'computer-monitor', label: 'Computer Monitor' },
        { value: 'gaming-monitor', label: 'Gaming Monitor' },
        { value: 'projector', label: 'Projector' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'samsung', label: 'Samsung' },
        { value: 'lg', label: 'LG' },
        { value: 'sony', label: 'Sony' },
        { value: 'tcl', label: 'TCL' },
        { value: 'hisense', label: 'Hisense' },
        { value: 'dell', label: 'Dell' },
        { value: 'hp', label: 'HP' },
        { value: 'asus', label: 'ASUS' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'screen_size',
      name: 'Screen Size',
      type: 'select',
      required: true,
      options: [
        { value: '24-inch', label: '24 inch' },
        { value: '27-inch', label: '27 inch' },
        { value: '32-inch', label: '32 inch' },
        { value: '40-43-inch', label: '40-43 inch' },
        { value: '50-55-inch', label: '50-55 inch' },
        { value: '65-inch', label: '65 inch' },
        { value: '75-inch-plus', label: '75 inch+' },
      ]
    },
    {
      id: 'resolution',
      name: 'Resolution',
      type: 'select',
      required: true,
      options: [
        { value: 'hd-720p', label: 'HD (720p)' },
        { value: 'full-hd-1080p', label: 'Full HD (1080p)' },
        { value: '4k-uhd', label: '4K UHD' },
        { value: '8k', label: '8K' },
      ]
    },
    {
      id: 'features',
      name: 'Features',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'smart-tv', label: 'Smart TV' },
        { value: 'hdr', label: 'HDR Support' },
        { value: 'curved', label: 'Curved Screen' },
        { value: 'high-refresh-rate', label: 'High Refresh Rate' },
        { value: 'voice-control', label: 'Voice Control' },
      ]
    }
  ],

  // Cameras
  'cameras': [
    {
      id: 'type',
      name: 'Camera Type',
      type: 'select',
      required: true,
      options: [
        { value: 'dslr', label: 'DSLR' },
        { value: 'mirrorless', label: 'Mirrorless' },
        { value: 'point-and-shoot', label: 'Point & Shoot' },
        { value: 'action-camera', label: 'Action Camera' },
        { value: 'instant-camera', label: 'Instant Camera' },
        { value: 'security-camera', label: 'Security Camera' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'canon', label: 'Canon' },
        { value: 'nikon', label: 'Nikon' },
        { value: 'sony', label: 'Sony' },
        { value: 'fujifilm', label: 'Fujifilm' },
        { value: 'gopro', label: 'GoPro' },
        { value: 'panasonic', label: 'Panasonic' },
        { value: 'olympus', label: 'Olympus' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'megapixels',
      name: 'Megapixels',
      type: 'select',
      required: false,
      options: [
        { value: 'under-12mp', label: 'Under 12MP' },
        { value: '12-20mp', label: '12-20MP' },
        { value: '20-30mp', label: '20-30MP' },
        { value: '30-50mp', label: '30-50MP' },
        { value: 'over-50mp', label: 'Over 50MP' },
      ]
    },
    {
      id: 'features',
      name: 'Features',
      type: 'multiselect',
      required: false,
      options: [
        { value: '4k-video', label: '4K Video' },
        { value: 'image-stabilization', label: 'Image Stabilization' },
        { value: 'wifi-bluetooth', label: 'Wi-Fi/Bluetooth' },
        { value: 'touchscreen', label: 'Touchscreen' },
        { value: 'waterproof', label: 'Waterproof' },
      ]
    }
  ],

  // =============================================
  // GAMING SUBCATEGORIES
  // =============================================

  // Video Games
  'video-games': [
    {
      id: 'platform',
      name: 'Platform',
      type: 'select',
      required: true,
      options: [
        { value: 'playstation-5', label: 'PlayStation 5' },
        { value: 'playstation-4', label: 'PlayStation 4' },
        { value: 'xbox-series', label: 'Xbox Series X/S' },
        { value: 'xbox-one', label: 'Xbox One' },
        { value: 'nintendo-switch', label: 'Nintendo Switch' },
        { value: 'pc', label: 'PC' },
        { value: 'mobile', label: 'Mobile' },
      ]
    },
    {
      id: 'genre',
      name: 'Genre',
      type: 'select',
      required: false,
      options: [
        { value: 'action', label: 'Action' },
        { value: 'adventure', label: 'Adventure' },
        { value: 'rpg', label: 'RPG' },
        { value: 'sports', label: 'Sports' },
        { value: 'racing', label: 'Racing' },
        { value: 'shooter', label: 'Shooter' },
        { value: 'strategy', label: 'Strategy' },
        { value: 'simulation', label: 'Simulation' },
      ]
    },
    {
      id: 'age_rating',
      name: 'Age Rating',
      type: 'select',
      required: false,
      options: [
        { value: 'everyone', label: 'Everyone (E)' },
        { value: 'teen', label: 'Teen (T)' },
        { value: 'mature', label: 'Mature (M)' },
        { value: 'adults-only', label: 'Adults Only (AO)' },
      ]
    },
    {
      id: 'format',
      name: 'Format',
      type: 'select',
      required: true,
      options: [
        { value: 'physical-disc', label: 'Physical Disc' },
        { value: 'digital-code', label: 'Digital Code' },
        { value: 'cartridge', label: 'Cartridge' },
      ]
    }
  ],

  // Gaming Accessories
  'gaming-accessories': [
    {
      id: 'accessory_type',
      name: 'Accessory Type',
      type: 'select',
      required: true,
      options: [
        { value: 'controller', label: 'Controller' },
        { value: 'headset', label: 'Gaming Headset' },
        { value: 'keyboard', label: 'Gaming Keyboard' },
        { value: 'mouse', label: 'Gaming Mouse' },
        { value: 'chair', label: 'Gaming Chair' },
        { value: 'steering-wheel', label: 'Steering Wheel' },
        { value: 'vr-headset', label: 'VR Headset' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'compatible_platforms',
      name: 'Compatible Platforms',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'playstation', label: 'PlayStation' },
        { value: 'xbox', label: 'Xbox' },
        { value: 'nintendo-switch', label: 'Nintendo Switch' },
        { value: 'pc', label: 'PC' },
        { value: 'mobile', label: 'Mobile' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'sony', label: 'Sony' },
        { value: 'microsoft', label: 'Microsoft' },
        { value: 'nintendo', label: 'Nintendo' },
        { value: 'razer', label: 'Razer' },
        { value: 'logitech', label: 'Logitech' },
        { value: 'corsair', label: 'Corsair' },
        { value: 'steelseries', label: 'SteelSeries' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // =============================================
  // HOME APPLIANCES SUBCATEGORIES
  // =============================================

  // Kitchen Appliances
  'kitchen-appliances': [
    {
      id: 'appliance_type',
      name: 'Appliance Type',
      type: 'select',
      required: true,
      options: [
        { value: 'refrigerator', label: 'Refrigerator' },
        { value: 'microwave', label: 'Microwave' },
        { value: 'blender', label: 'Blender' },
        { value: 'rice-cooker', label: 'Rice Cooker' },
        { value: 'gas-cooker', label: 'Gas Cooker' },
        { value: 'electric-kettle', label: 'Electric Kettle' },
        { value: 'toaster', label: 'Toaster' },
        { value: 'food-processor', label: 'Food Processor' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'samsung', label: 'Samsung' },
        { value: 'lg', label: 'LG' },
        { value: 'whirlpool', label: 'Whirlpool' },
        { value: 'bosch', label: 'Bosch' },
        { value: 'philips', label: 'Philips' },
        { value: 'panasonic', label: 'Panasonic' },
        { value: 'binatone', label: 'Binatone' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'capacity',
      name: 'Capacity/Size',
      type: 'text',
      required: false,
      placeholder: 'e.g. 1.5L, 200L, 4 burners'
    },
    {
      id: 'energy_rating',
      name: 'Energy Rating',
      type: 'select',
      required: false,
      options: [
        { value: 'a+++', label: 'A+++' },
        { value: 'a++', label: 'A++' },
        { value: 'a+', label: 'A+' },
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'not-rated', label: 'Not Rated' },
      ]
    }
  ],

  // Cleaning Appliances
  'cleaning-appliances': [
    {
      id: 'appliance_type',
      name: 'Appliance Type',
      type: 'select',
      required: true,
      options: [
        { value: 'vacuum-cleaner', label: 'Vacuum Cleaner' },
        { value: 'washing-machine', label: 'Washing Machine' },
        { value: 'dryer', label: 'Dryer' },
        { value: 'iron', label: 'Iron' },
        { value: 'steam-cleaner', label: 'Steam Cleaner' },
        { value: 'pressure-washer', label: 'Pressure Washer' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'samsung', label: 'Samsung' },
        { value: 'lg', label: 'LG' },
        { value: 'whirlpool', label: 'Whirlpool' },
        { value: 'bosch', label: 'Bosch' },
        { value: 'philips', label: 'Philips' },
        { value: 'dyson', label: 'Dyson' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'capacity',
      name: 'Capacity',
      type: 'select',
      required: false,
      options: [
        { value: 'under-5kg', label: 'Under 5kg' },
        { value: '5-7kg', label: '5-7kg' },
        { value: '7-10kg', label: '7-10kg' },
        { value: 'over-10kg', label: 'Over 10kg' },
      ]
    }
  ],

  // Air Conditioning
  'air-conditioning': [
    {
      id: 'type',
      name: 'AC Type',
      type: 'select',
      required: true,
      options: [
        { value: 'split-unit', label: 'Split Unit' },
        { value: 'window-unit', label: 'Window Unit' },
        { value: 'portable', label: 'Portable AC' },
        { value: 'central-ac', label: 'Central AC' },
        { value: 'ceiling-fan', label: 'Ceiling Fan' },
        { value: 'standing-fan', label: 'Standing Fan' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: true,
      options: [
        { value: 'samsung', label: 'Samsung' },
        { value: 'lg', label: 'LG' },
        { value: 'daikin', label: 'Daikin' },
        { value: 'carrier', label: 'Carrier' },
        { value: 'midea', label: 'Midea' },
        { value: 'hisense', label: 'Hisense' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'capacity',
      name: 'Cooling Capacity',
      type: 'select',
      required: false,
      options: [
        { value: '0.5-hp', label: '0.5 HP' },
        { value: '1-hp', label: '1 HP' },
        { value: '1.5-hp', label: '1.5 HP' },
        { value: '2-hp', label: '2 HP' },
        { value: '2.5-hp', label: '2.5 HP' },
        { value: '3-hp-plus', label: '3 HP+' },
      ]
    },
    {
      id: 'energy_rating',
      name: 'Energy Rating',
      type: 'select',
      required: false,
      options: [
        { value: '5-star', label: '5 Star' },
        { value: '4-star', label: '4 Star' },
        { value: '3-star', label: '3 Star' },
        { value: '2-star', label: '2 Star' },
        { value: '1-star', label: '1 Star' },
      ]
    }
  ],

  // =============================================
  // FASHION SUBCATEGORIES (MISSING ONES)
  // =============================================

  // Men's Accessories
  'mens-accessories': [
    {
      id: 'accessory_type',
      name: 'Accessory Type',
      type: 'select',
      required: true,
      options: [
        { value: 'watch', label: 'Watch' },
        { value: 'belt', label: 'Belt' },
        { value: 'wallet', label: 'Wallet' },
        { value: 'sunglasses', label: 'Sunglasses' },
        { value: 'tie', label: 'Tie/Bow Tie' },
        { value: 'cufflinks', label: 'Cufflinks' },
        { value: 'hat-cap', label: 'Hat/Cap' },
        { value: 'jewelry', label: 'Jewelry' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: false,
      options: [
        { value: 'leather', label: 'Leather' },
        { value: 'metal', label: 'Metal' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'wood', label: 'Wood' },
        { value: 'gold', label: 'Gold' },
        { value: 'silver', label: 'Silver' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'rolex', label: 'Rolex' },
        { value: 'casio', label: 'Casio' },
        { value: 'fossil', label: 'Fossil' },
        { value: 'ray-ban', label: 'Ray-Ban' },
        { value: 'gucci', label: 'Gucci' },
        { value: 'louis-vuitton', label: 'Louis Vuitton' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Women's Accessories
  'womens-accessories': [
    {
      id: 'accessory_type',
      name: 'Accessory Type',
      type: 'select',
      required: true,
      options: [
        { value: 'jewelry', label: 'Jewelry' },
        { value: 'watch', label: 'Watch' },
        { value: 'sunglasses', label: 'Sunglasses' },
        { value: 'scarf', label: 'Scarf' },
        { value: 'belt', label: 'Belt' },
        { value: 'hair-accessories', label: 'Hair Accessories' },
        { value: 'wallet-purse', label: 'Wallet/Purse' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: false,
      options: [
        { value: 'gold', label: 'Gold' },
        { value: 'silver', label: 'Silver' },
        { value: 'leather', label: 'Leather' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'metal', label: 'Metal' },
        { value: 'beads', label: 'Beads' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'pandora', label: 'Pandora' },
        { value: 'tiffany', label: 'Tiffany & Co' },
        { value: 'chanel', label: 'Chanel' },
        { value: 'gucci', label: 'Gucci' },
        { value: 'louis-vuitton', label: 'Louis Vuitton' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Bags & Handbags
  'bags-handbags': [
    {
      id: 'bag_type',
      name: 'Bag Type',
      type: 'select',
      required: true,
      options: [
        { value: 'handbag', label: 'Handbag' },
        { value: 'shoulder-bag', label: 'Shoulder Bag' },
        { value: 'crossbody-bag', label: 'Crossbody Bag' },
        { value: 'tote-bag', label: 'Tote Bag' },
        { value: 'clutch', label: 'Clutch' },
        { value: 'backpack', label: 'Backpack' },
        { value: 'evening-bag', label: 'Evening Bag' },
        { value: 'travel-bag', label: 'Travel Bag' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: true,
      options: [
        { value: 'leather', label: 'Leather' },
        { value: 'synthetic-leather', label: 'Synthetic Leather' },
        { value: 'canvas', label: 'Canvas' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'nylon', label: 'Nylon' },
        { value: 'suede', label: 'Suede' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'louis-vuitton', label: 'Louis Vuitton' },
        { value: 'gucci', label: 'Gucci' },
        { value: 'chanel', label: 'Chanel' },
        { value: 'prada', label: 'Prada' },
        { value: 'coach', label: 'Coach' },
        { value: 'michael-kors', label: 'Michael Kors' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: false,
      options: [
        { value: 'mini', label: 'Mini' },
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
        { value: 'extra-large', label: 'Extra Large' },
      ]
    }
  ],

  // Boys Clothing
  'boys-clothing': [
    {
      id: 'clothing_type',
      name: 'Clothing Type',
      type: 'select',
      required: true,
      options: [
        { value: 'shirts', label: 'Shirts' },
        { value: 'pants-trousers', label: 'Pants/Trousers' },
        { value: 'shorts', label: 'Shorts' },
        { value: 'jeans', label: 'Jeans' },
        { value: 'jackets', label: 'Jackets' },
        { value: 'sweaters', label: 'Sweaters' },
        { value: 'underwear', label: 'Underwear' },
        { value: 'sleepwear', label: 'Sleepwear' },
        { value: 'sportswear', label: 'Sportswear' },
      ]
    },
    {
      id: 'age_group',
      name: 'Age Group',
      type: 'select',
      required: true,
      options: [
        { value: 'baby-0-2', label: 'Baby (0-2 years)' },
        { value: 'toddler-2-4', label: 'Toddler (2-4 years)' },
        { value: 'kids-4-8', label: 'Kids (4-8 years)' },
        { value: 'pre-teen-8-12', label: 'Pre-teen (8-12 years)' },
        { value: 'teen-12-16', label: 'Teen (12-16 years)' },
      ]
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: true,
      options: [
        { value: '0-3m', label: '0-3 months' },
        { value: '3-6m', label: '3-6 months' },
        { value: '6-12m', label: '6-12 months' },
        { value: '12-18m', label: '12-18 months' },
        { value: '18-24m', label: '18-24 months' },
        { value: '2t', label: '2T' },
        { value: '3t', label: '3T' },
        { value: '4t', label: '4T' },
        { value: '5', label: '5' },
        { value: '6', label: '6' },
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '10', label: '10' },
        { value: '12', label: '12' },
        { value: '14', label: '14' },
        { value: '16', label: '16' },
      ]
    }
  ],

  // Girls Clothing
  'girls-clothing': [
    {
      id: 'clothing_type',
      name: 'Clothing Type',
      type: 'select',
      required: true,
      options: [
        { value: 'dresses', label: 'Dresses' },
        { value: 'shirts-tops', label: 'Shirts/Tops' },
        { value: 'pants-trousers', label: 'Pants/Trousers' },
        { value: 'skirts', label: 'Skirts' },
        { value: 'shorts', label: 'Shorts' },
        { value: 'jeans', label: 'Jeans' },
        { value: 'jackets', label: 'Jackets' },
        { value: 'sweaters', label: 'Sweaters' },
        { value: 'underwear', label: 'Underwear' },
        { value: 'sleepwear', label: 'Sleepwear' },
        { value: 'sportswear', label: 'Sportswear' },
      ]
    },
    {
      id: 'age_group',
      name: 'Age Group',
      type: 'select',
      required: true,
      options: [
        { value: 'baby-0-2', label: 'Baby (0-2 years)' },
        { value: 'toddler-2-4', label: 'Toddler (2-4 years)' },
        { value: 'kids-4-8', label: 'Kids (4-8 years)' },
        { value: 'pre-teen-8-12', label: 'Pre-teen (8-12 years)' },
        { value: 'teen-12-16', label: 'Teen (12-16 years)' },
      ]
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: true,
      options: [
        { value: '0-3m', label: '0-3 months' },
        { value: '3-6m', label: '3-6 months' },
        { value: '6-12m', label: '6-12 months' },
        { value: '12-18m', label: '12-18 months' },
        { value: '18-24m', label: '18-24 months' },
        { value: '2t', label: '2T' },
        { value: '3t', label: '3T' },
        { value: '4t', label: '4T' },
        { value: '5', label: '5' },
        { value: '6', label: '6' },
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '10', label: '10' },
        { value: '12', label: '12' },
        { value: '14', label: '14' },
        { value: '16', label: '16' },
      ]
    }
  ],

  // Kids Shoes
  'kids-shoes': [
    {
      id: 'shoe_type',
      name: 'Shoe Type',
      type: 'select',
      required: true,
      options: [
        { value: 'sneakers', label: 'Sneakers' },
        { value: 'sandals', label: 'Sandals' },
        { value: 'boots', label: 'Boots' },
        { value: 'dress-shoes', label: 'Dress Shoes' },
        { value: 'slippers', label: 'Slippers' },
        { value: 'sports-shoes', label: 'Sports Shoes' },
        { value: 'school-shoes', label: 'School Shoes' },
      ]
    },
    {
      id: 'age_group',
      name: 'Age Group',
      type: 'select',
      required: true,
      options: [
        { value: 'baby-0-2', label: 'Baby (0-2 years)' },
        { value: 'toddler-2-4', label: 'Toddler (2-4 years)' },
        { value: 'kids-4-8', label: 'Kids (4-8 years)' },
        { value: 'pre-teen-8-12', label: 'Pre-teen (8-12 years)' },
        { value: 'teen-12-16', label: 'Teen (12-16 years)' },
      ]
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: true,
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5' },
        { value: '6', label: '6' },
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '9', label: '9' },
        { value: '10', label: '10' },
        { value: '11', label: '11' },
        { value: '12', label: '12' },
        { value: '13', label: '13' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'nike', label: 'Nike' },
        { value: 'adidas', label: 'Adidas' },
        { value: 'converse', label: 'Converse' },
        { value: 'vans', label: 'Vans' },
        { value: 'puma', label: 'Puma' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // =============================================
  // VEHICLES SUBCATEGORIES
  // =============================================

  // SUVs
  'suvs': [
    {
      id: 'make',
      name: 'Make',
      type: 'select',
      required: true,
      options: [
        { value: 'toyota', label: 'Toyota' },
        { value: 'honda', label: 'Honda' },
        { value: 'nissan', label: 'Nissan' },
        { value: 'hyundai', label: 'Hyundai' },
        { value: 'kia', label: 'Kia' },
        { value: 'ford', label: 'Ford' },
        { value: 'chevrolet', label: 'Chevrolet' },
        { value: 'mercedes-benz', label: 'Mercedes-Benz' },
        { value: 'bmw', label: 'BMW' },
        { value: 'audi', label: 'Audi' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. RAV4, CR-V, X-Trail'
    },
    {
      id: 'year',
      name: 'Year',
      type: 'select',
      required: true,
      options: [
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
        { value: '2021', label: '2021' },
        { value: '2020', label: '2020' },
        { value: '2019', label: '2019' },
        { value: '2018', label: '2018' },
        { value: '2017', label: '2017' },
        { value: '2016', label: '2016' },
        { value: '2015', label: '2015' },
        { value: 'older', label: 'Older than 2015' },
      ]
    },
    {
      id: 'fuel_type',
      name: 'Fuel Type',
      type: 'select',
      required: true,
      options: [
        { value: 'petrol', label: 'Petrol' },
        { value: 'diesel', label: 'Diesel' },
        { value: 'hybrid', label: 'Hybrid' },
        { value: 'electric', label: 'Electric' },
        { value: 'lpg', label: 'LPG' },
      ]
    },
    {
      id: 'transmission',
      name: 'Transmission',
      type: 'select',
      required: true,
      options: [
        { value: 'automatic', label: 'Automatic' },
        { value: 'manual', label: 'Manual' },
        { value: 'cvt', label: 'CVT' },
      ]
    },
    {
      id: 'mileage',
      name: 'Mileage',
      type: 'number',
      required: false,
      placeholder: 'Kilometers driven',
      unit: 'km'
    },
    {
      id: 'engine_size',
      name: 'Engine Size',
      type: 'text',
      required: false,
      placeholder: 'e.g. 2.0L, 1.8L',
      unit: 'L'
    }
  ],

  // Hatchbacks
  'hatchbacks': [
    {
      id: 'make',
      name: 'Make',
      type: 'select',
      required: true,
      options: [
        { value: 'toyota', label: 'Toyota' },
        { value: 'honda', label: 'Honda' },
        { value: 'nissan', label: 'Nissan' },
        { value: 'hyundai', label: 'Hyundai' },
        { value: 'kia', label: 'Kia' },
        { value: 'volkswagen', label: 'Volkswagen' },
        { value: 'peugeot', label: 'Peugeot' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. Yaris, Fit, March'
    },
    {
      id: 'year',
      name: 'Year',
      type: 'select',
      required: true,
      options: [
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
        { value: '2021', label: '2021' },
        { value: '2020', label: '2020' },
        { value: '2019', label: '2019' },
        { value: '2018', label: '2018' },
        { value: '2017', label: '2017' },
        { value: '2016', label: '2016' },
        { value: '2015', label: '2015' },
        { value: 'older', label: 'Older than 2015' },
      ]
    },
    {
      id: 'fuel_type',
      name: 'Fuel Type',
      type: 'select',
      required: true,
      options: [
        { value: 'petrol', label: 'Petrol' },
        { value: 'diesel', label: 'Diesel' },
        { value: 'hybrid', label: 'Hybrid' },
        { value: 'electric', label: 'Electric' },
      ]
    },
    {
      id: 'transmission',
      name: 'Transmission',
      type: 'select',
      required: true,
      options: [
        { value: 'automatic', label: 'Automatic' },
        { value: 'manual', label: 'Manual' },
        { value: 'cvt', label: 'CVT' },
      ]
    },
    {
      id: 'mileage',
      name: 'Mileage',
      type: 'number',
      required: false,
      placeholder: 'Kilometers driven',
      unit: 'km'
    }
  ],

  // Luxury Cars
  'luxury-cars': [
    {
      id: 'make',
      name: 'Make',
      type: 'select',
      required: true,
      options: [
        { value: 'mercedes-benz', label: 'Mercedes-Benz' },
        { value: 'bmw', label: 'BMW' },
        { value: 'audi', label: 'Audi' },
        { value: 'lexus', label: 'Lexus' },
        { value: 'jaguar', label: 'Jaguar' },
        { value: 'porsche', label: 'Porsche' },
        { value: 'bentley', label: 'Bentley' },
        { value: 'rolls-royce', label: 'Rolls-Royce' },
        { value: 'ferrari', label: 'Ferrari' },
        { value: 'lamborghini', label: 'Lamborghini' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. S-Class, 7 Series, A8'
    },
    {
      id: 'year',
      name: 'Year',
      type: 'select',
      required: true,
      options: [
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
        { value: '2021', label: '2021' },
        { value: '2020', label: '2020' },
        { value: '2019', label: '2019' },
        { value: '2018', label: '2018' },
        { value: '2017', label: '2017' },
        { value: '2016', label: '2016' },
        { value: '2015', label: '2015' },
        { value: 'older', label: 'Older than 2015' },
      ]
    },
    {
      id: 'fuel_type',
      name: 'Fuel Type',
      type: 'select',
      required: true,
      options: [
        { value: 'petrol', label: 'Petrol' },
        { value: 'diesel', label: 'Diesel' },
        { value: 'hybrid', label: 'Hybrid' },
        { value: 'electric', label: 'Electric' },
      ]
    },
    {
      id: 'transmission',
      name: 'Transmission',
      type: 'select',
      required: true,
      options: [
        { value: 'automatic', label: 'Automatic' },
        { value: 'manual', label: 'Manual' },
      ]
    },
    {
      id: 'mileage',
      name: 'Mileage',
      type: 'number',
      required: false,
      placeholder: 'Kilometers driven',
      unit: 'km'
    },
    {
      id: 'features',
      name: 'Luxury Features',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'leather-seats', label: 'Leather Seats' },
        { value: 'sunroof', label: 'Sunroof' },
        { value: 'navigation', label: 'Navigation System' },
        { value: 'premium-sound', label: 'Premium Sound System' },
        { value: 'heated-seats', label: 'Heated Seats' },
        { value: 'parking-sensors', label: 'Parking Sensors' },
        { value: 'backup-camera', label: 'Backup Camera' },
      ]
    }
  ],

  // Sport Bikes
  'sport-bikes': [
    {
      id: 'make',
      name: 'Make',
      type: 'select',
      required: true,
      options: [
        { value: 'yamaha', label: 'Yamaha' },
        { value: 'honda', label: 'Honda' },
        { value: 'kawasaki', label: 'Kawasaki' },
        { value: 'suzuki', label: 'Suzuki' },
        { value: 'ducati', label: 'Ducati' },
        { value: 'bmw', label: 'BMW' },
        { value: 'ktm', label: 'KTM' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. R1, CBR1000RR, Ninja ZX-10R'
    },
    {
      id: 'year',
      name: 'Year',
      type: 'select',
      required: true,
      options: [
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
        { value: '2021', label: '2021' },
        { value: '2020', label: '2020' },
        { value: '2019', label: '2019' },
        { value: '2018', label: '2018' },
        { value: '2017', label: '2017' },
        { value: '2016', label: '2016' },
        { value: '2015', label: '2015' },
        { value: 'older', label: 'Older than 2015' },
      ]
    },
    {
      id: 'engine_size',
      name: 'Engine Size',
      type: 'select',
      required: true,
      options: [
        { value: '125cc', label: '125cc' },
        { value: '250cc', label: '250cc' },
        { value: '400cc', label: '400cc' },
        { value: '600cc', label: '600cc' },
        { value: '750cc', label: '750cc' },
        { value: '1000cc', label: '1000cc' },
        { value: '1200cc-plus', label: '1200cc+' },
      ]
    },
    {
      id: 'mileage',
      name: 'Mileage',
      type: 'number',
      required: false,
      placeholder: 'Kilometers driven',
      unit: 'km'
    }
  ],

  // Cruiser Bikes
  'cruiser-bikes': [
    {
      id: 'make',
      name: 'Make',
      type: 'select',
      required: true,
      options: [
        { value: 'harley-davidson', label: 'Harley-Davidson' },
        { value: 'indian', label: 'Indian' },
        { value: 'yamaha', label: 'Yamaha' },
        { value: 'honda', label: 'Honda' },
        { value: 'kawasaki', label: 'Kawasaki' },
        { value: 'suzuki', label: 'Suzuki' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. Street Glide, Shadow, Vulcan'
    },
    {
      id: 'year',
      name: 'Year',
      type: 'select',
      required: true,
      options: [
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
        { value: '2021', label: '2021' },
        { value: '2020', label: '2020' },
        { value: '2019', label: '2019' },
        { value: '2018', label: '2018' },
        { value: '2017', label: '2017' },
        { value: '2016', label: '2016' },
        { value: '2015', label: '2015' },
        { value: 'older', label: 'Older than 2015' },
      ]
    },
    {
      id: 'engine_size',
      name: 'Engine Size',
      type: 'select',
      required: true,
      options: [
        { value: '500cc', label: '500cc' },
        { value: '750cc', label: '750cc' },
        { value: '883cc', label: '883cc' },
        { value: '1200cc', label: '1200cc' },
        { value: '1600cc', label: '1600cc' },
        { value: '1800cc-plus', label: '1800cc+' },
      ]
    },
    {
      id: 'mileage',
      name: 'Mileage',
      type: 'number',
      required: false,
      placeholder: 'Kilometers driven',
      unit: 'km'
    }
  ],

  // Scooters
  'scooters': [
    {
      id: 'make',
      name: 'Make',
      type: 'select',
      required: true,
      options: [
        { value: 'yamaha', label: 'Yamaha' },
        { value: 'honda', label: 'Honda' },
        { value: 'vespa', label: 'Vespa' },
        { value: 'piaggio', label: 'Piaggio' },
        { value: 'kymco', label: 'Kymco' },
        { value: 'sym', label: 'SYM' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'model',
      name: 'Model',
      type: 'text',
      required: true,
      placeholder: 'e.g. NMAX, PCX, Primavera'
    },
    {
      id: 'year',
      name: 'Year',
      type: 'select',
      required: true,
      options: [
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
        { value: '2021', label: '2021' },
        { value: '2020', label: '2020' },
        { value: '2019', label: '2019' },
        { value: '2018', label: '2018' },
        { value: '2017', label: '2017' },
        { value: '2016', label: '2016' },
        { value: '2015', label: '2015' },
        { value: 'older', label: 'Older than 2015' },
      ]
    },
    {
      id: 'engine_size',
      name: 'Engine Size',
      type: 'select',
      required: true,
      options: [
        { value: '50cc', label: '50cc' },
        { value: '125cc', label: '125cc' },
        { value: '150cc', label: '150cc' },
        { value: '200cc', label: '200cc' },
        { value: '250cc', label: '250cc' },
        { value: '300cc-plus', label: '300cc+' },
      ]
    },
    {
      id: 'mileage',
      name: 'Mileage',
      type: 'number',
      required: false,
      placeholder: 'Kilometers driven',
      unit: 'km'
    }
  ],

  // Car Parts
  'car-parts': [
    {
      id: 'part_type',
      name: 'Part Type',
      type: 'select',
      required: true,
      options: [
        { value: 'engine-parts', label: 'Engine Parts' },
        { value: 'brake-parts', label: 'Brake Parts' },
        { value: 'suspension', label: 'Suspension' },
        { value: 'electrical', label: 'Electrical Parts' },
        { value: 'body-parts', label: 'Body Parts' },
        { value: 'interior-parts', label: 'Interior Parts' },
        { value: 'filters', label: 'Filters' },
        { value: 'belts-hoses', label: 'Belts & Hoses' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'compatible_makes',
      name: 'Compatible Makes',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'toyota', label: 'Toyota' },
        { value: 'honda', label: 'Honda' },
        { value: 'nissan', label: 'Nissan' },
        { value: 'hyundai', label: 'Hyundai' },
        { value: 'kia', label: 'Kia' },
        { value: 'mercedes-benz', label: 'Mercedes-Benz' },
        { value: 'bmw', label: 'BMW' },
        { value: 'audi', label: 'Audi' },
        { value: 'universal', label: 'Universal' },
      ]
    },
    {
      id: 'part_condition',
      name: 'Part Condition',
      type: 'select',
      required: true,
      options: [
        { value: 'new', label: 'New' },
        { value: 'used-excellent', label: 'Used - Excellent' },
        { value: 'used-good', label: 'Used - Good' },
        { value: 'used-fair', label: 'Used - Fair' },
        { value: 'refurbished', label: 'Refurbished' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'oem', label: 'OEM (Original)' },
        { value: 'bosch', label: 'Bosch' },
        { value: 'denso', label: 'Denso' },
        { value: 'ngk', label: 'NGK' },
        { value: 'mann-filter', label: 'Mann Filter' },
        { value: 'aftermarket', label: 'Aftermarket' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Car Accessories
  'car-accessories': [
    {
      id: 'accessory_type',
      name: 'Accessory Type',
      type: 'select',
      required: true,
      options: [
        { value: 'car-audio', label: 'Car Audio' },
        { value: 'navigation', label: 'Navigation System' },
        { value: 'dash-cam', label: 'Dash Cam' },
        { value: 'seat-covers', label: 'Seat Covers' },
        { value: 'floor-mats', label: 'Floor Mats' },
        { value: 'phone-holders', label: 'Phone Holders' },
        { value: 'air-fresheners', label: 'Air Fresheners' },
        { value: 'car-chargers', label: 'Car Chargers' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'compatibility',
      name: 'Compatibility',
      type: 'select',
      required: false,
      options: [
        { value: 'universal', label: 'Universal' },
        { value: 'specific-model', label: 'Specific Car Model' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'pioneer', label: 'Pioneer' },
        { value: 'kenwood', label: 'Kenwood' },
        { value: 'sony', label: 'Sony' },
        { value: 'jvc', label: 'JVC' },
        { value: 'garmin', label: 'Garmin' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Tires & Wheels
  'tires-wheels': [
    {
      id: 'product_type',
      name: 'Product Type',
      type: 'select',
      required: true,
      options: [
        { value: 'tires', label: 'Tires' },
        { value: 'wheels-rims', label: 'Wheels/Rims' },
        { value: 'tire-wheel-set', label: 'Tire & Wheel Set' },
      ]
    },
    {
      id: 'tire_size',
      name: 'Tire Size',
      type: 'text',
      required: false,
      placeholder: 'e.g. 225/65R17, 195/60R15'
    },
    {
      id: 'wheel_size',
      name: 'Wheel Size',
      type: 'select',
      required: false,
      options: [
        { value: '14-inch', label: '14 inch' },
        { value: '15-inch', label: '15 inch' },
        { value: '16-inch', label: '16 inch' },
        { value: '17-inch', label: '17 inch' },
        { value: '18-inch', label: '18 inch' },
        { value: '19-inch', label: '19 inch' },
        { value: '20-inch-plus', label: '20 inch+' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'michelin', label: 'Michelin' },
        { value: 'bridgestone', label: 'Bridgestone' },
        { value: 'goodyear', label: 'Goodyear' },
        { value: 'continental', label: 'Continental' },
        { value: 'pirelli', label: 'Pirelli' },
        { value: 'dunlop', label: 'Dunlop' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'tire_condition',
      name: 'Condition',
      type: 'select',
      required: true,
      options: [
        { value: 'new', label: 'New' },
        { value: 'used-excellent', label: 'Used - Excellent (90%+ tread)' },
        { value: 'used-good', label: 'Used - Good (70-90% tread)' },
        { value: 'used-fair', label: 'Used - Fair (50-70% tread)' },
      ]
    }
  ],

  // =============================================
  // HOME & GARDEN SUBCATEGORIES
  // =============================================

  // Home Decor
  'home-decor': [
    {
      id: 'decor_type',
      name: 'Decor Type',
      type: 'select',
      required: true,
      options: [
        { value: 'wall-art', label: 'Wall Art & Paintings' },
        { value: 'mirrors', label: 'Mirrors' },
        { value: 'lighting', label: 'Lighting' },
        { value: 'curtains-blinds', label: 'Curtains & Blinds' },
        { value: 'rugs-carpets', label: 'Rugs & Carpets' },
        { value: 'vases-planters', label: 'Vases & Planters' },
        { value: 'candles-holders', label: 'Candles & Holders' },
        { value: 'clocks', label: 'Clocks' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'style',
      name: 'Style',
      type: 'select',
      required: false,
      options: [
        { value: 'modern', label: 'Modern' },
        { value: 'traditional', label: 'Traditional' },
        { value: 'minimalist', label: 'Minimalist' },
        { value: 'vintage', label: 'Vintage' },
        { value: 'rustic', label: 'Rustic' },
        { value: 'contemporary', label: 'Contemporary' },
        { value: 'bohemian', label: 'Bohemian' },
        { value: 'industrial', label: 'Industrial' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: false,
      options: [
        { value: 'wood', label: 'Wood' },
        { value: 'metal', label: 'Metal' },
        { value: 'glass', label: 'Glass' },
        { value: 'ceramic', label: 'Ceramic' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'stone', label: 'Stone' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'room',
      name: 'Suitable Room',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'living-room', label: 'Living Room' },
        { value: 'bedroom', label: 'Bedroom' },
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'bathroom', label: 'Bathroom' },
        { value: 'dining-room', label: 'Dining Room' },
        { value: 'office', label: 'Office' },
        { value: 'hallway', label: 'Hallway' },
        { value: 'outdoor', label: 'Outdoor' },
      ]
    }
  ],

  // Garden & Outdoor
  'garden': [
    {
      id: 'garden_type',
      name: 'Garden Type',
      type: 'select',
      required: true,
      options: [
        { value: 'plants-flowers', label: 'Plants & Flowers' },
        { value: 'garden-tools', label: 'Garden Tools' },
        { value: 'outdoor-furniture', label: 'Outdoor Furniture' },
        { value: 'lawn-care', label: 'Lawn Care Equipment' },
        { value: 'irrigation', label: 'Irrigation & Watering' },
        { value: 'fertilizers', label: 'Fertilizers & Soil' },
        { value: 'pots-planters', label: 'Pots & Planters' },
        { value: 'outdoor-lighting', label: 'Outdoor Lighting' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'plant_type',
      name: 'Plant Type',
      type: 'select',
      required: false,
      options: [
        { value: 'indoor-plants', label: 'Indoor Plants' },
        { value: 'outdoor-plants', label: 'Outdoor Plants' },
        { value: 'flowering-plants', label: 'Flowering Plants' },
        { value: 'fruit-trees', label: 'Fruit Trees' },
        { value: 'vegetables', label: 'Vegetables' },
        { value: 'herbs', label: 'Herbs' },
        { value: 'succulents', label: 'Succulents' },
        { value: 'trees-shrubs', label: 'Trees & Shrubs' },
      ]
    },
    {
      id: 'care_level',
      name: 'Care Level',
      type: 'select',
      required: false,
      options: [
        { value: 'low-maintenance', label: 'Low Maintenance' },
        { value: 'moderate-care', label: 'Moderate Care' },
        { value: 'high-maintenance', label: 'High Maintenance' },
      ]
    },
    {
      id: 'sunlight_needs',
      name: 'Sunlight Needs',
      type: 'select',
      required: false,
      options: [
        { value: 'full-sun', label: 'Full Sun' },
        { value: 'partial-sun', label: 'Partial Sun' },
        { value: 'shade', label: 'Shade' },
        { value: 'indirect-light', label: 'Indirect Light' },
      ]
    }
  ],

  // =============================================
  // SPORTS & FITNESS SUBCATEGORIES
  // =============================================

  // Gym Equipment
  'gym-equipment': [
    {
      id: 'equipment_type',
      name: 'Equipment Type',
      type: 'select',
      required: true,
      options: [
        { value: 'cardio', label: 'Cardio Equipment' },
        { value: 'strength-training', label: 'Strength Training' },
        { value: 'free-weights', label: 'Free Weights' },
        { value: 'yoga-pilates', label: 'Yoga & Pilates' },
        { value: 'accessories', label: 'Fitness Accessories' },
        { value: 'home-gym', label: 'Home Gym Systems' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'specific_equipment',
      name: 'Specific Equipment',
      type: 'select',
      required: false,
      options: [
        { value: 'treadmill', label: 'Treadmill' },
        { value: 'exercise-bike', label: 'Exercise Bike' },
        { value: 'elliptical', label: 'Elliptical' },
        { value: 'rowing-machine', label: 'Rowing Machine' },
        { value: 'dumbbells', label: 'Dumbbells' },
        { value: 'barbells', label: 'Barbells' },
        { value: 'weight-plates', label: 'Weight Plates' },
        { value: 'bench', label: 'Weight Bench' },
        { value: 'yoga-mat', label: 'Yoga Mat' },
        { value: 'resistance-bands', label: 'Resistance Bands' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'bowflex', label: 'Bowflex' },
        { value: 'nordictrack', label: 'NordicTrack' },
        { value: 'life-fitness', label: 'Life Fitness' },
        { value: 'technogym', label: 'Technogym' },
        { value: 'precor', label: 'Precor' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'weight_capacity',
      name: 'Weight Capacity',
      type: 'select',
      required: false,
      options: [
        { value: 'under-100kg', label: 'Under 100kg' },
        { value: '100-150kg', label: '100-150kg' },
        { value: '150-200kg', label: '150-200kg' },
        { value: 'over-200kg', label: 'Over 200kg' },
      ]
    }
  ],

  // Sports Equipment
  'sports-equipment': [
    {
      id: 'sport_type',
      name: 'Sport Type',
      type: 'select',
      required: true,
      options: [
        { value: 'football-soccer', label: 'Football/Soccer' },
        { value: 'basketball', label: 'Basketball' },
        { value: 'tennis', label: 'Tennis' },
        { value: 'badminton', label: 'Badminton' },
        { value: 'volleyball', label: 'Volleyball' },
        { value: 'table-tennis', label: 'Table Tennis' },
        { value: 'swimming', label: 'Swimming' },
        { value: 'cycling', label: 'Cycling' },
        { value: 'running', label: 'Running' },
        { value: 'boxing', label: 'Boxing/MMA' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'equipment_category',
      name: 'Equipment Category',
      type: 'select',
      required: true,
      options: [
        { value: 'balls', label: 'Balls' },
        { value: 'rackets-bats', label: 'Rackets & Bats' },
        { value: 'protective-gear', label: 'Protective Gear' },
        { value: 'clothing', label: 'Sports Clothing' },
        { value: 'footwear', label: 'Sports Footwear' },
        { value: 'accessories', label: 'Accessories' },
        { value: 'training-aids', label: 'Training Aids' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'nike', label: 'Nike' },
        { value: 'adidas', label: 'Adidas' },
        { value: 'puma', label: 'Puma' },
        { value: 'under-armour', label: 'Under Armour' },
        { value: 'wilson', label: 'Wilson' },
        { value: 'spalding', label: 'Spalding' },
        { value: 'yonex', label: 'Yonex' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      required: false,
      options: [
        { value: 'xs', label: 'XS' },
        { value: 's', label: 'S' },
        { value: 'm', label: 'M' },
        { value: 'l', label: 'L' },
        { value: 'xl', label: 'XL' },
        { value: 'xxl', label: 'XXL' },
        { value: 'one-size', label: 'One Size' },
      ]
    }
  ],

  // =============================================
  // BOOKS & MEDIA SUBCATEGORIES
  // =============================================

  // Books
  'books': [
    {
      id: 'book_type',
      name: 'Book Type',
      type: 'select',
      required: true,
      options: [
        { value: 'fiction', label: 'Fiction' },
        { value: 'non-fiction', label: 'Non-Fiction' },
        { value: 'textbooks', label: 'Textbooks' },
        { value: 'children-books', label: 'Children\'s Books' },
        { value: 'religious', label: 'Religious Books' },
        { value: 'self-help', label: 'Self-Help' },
        { value: 'biography', label: 'Biography' },
        { value: 'history', label: 'History' },
        { value: 'science', label: 'Science' },
        { value: 'business', label: 'Business' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'format',
      name: 'Format',
      type: 'select',
      required: true,
      options: [
        { value: 'paperback', label: 'Paperback' },
        { value: 'hardcover', label: 'Hardcover' },
        { value: 'ebook', label: 'E-book' },
        { value: 'audiobook', label: 'Audiobook' },
      ]
    },
    {
      id: 'language',
      name: 'Language',
      type: 'select',
      required: true,
      options: [
        { value: 'english', label: 'English' },
        { value: 'twi', label: 'Twi' },
        { value: 'ga', label: 'Ga' },
        { value: 'ewe', label: 'Ewe' },
        { value: 'french', label: 'French' },
        { value: 'arabic', label: 'Arabic' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'author',
      name: 'Author',
      type: 'text',
      required: false,
      placeholder: 'Author name'
    },
    {
      id: 'publisher',
      name: 'Publisher',
      type: 'text',
      required: false,
      placeholder: 'Publisher name'
    },
    {
      id: 'isbn',
      name: 'ISBN',
      type: 'text',
      required: false,
      placeholder: 'ISBN number'
    }
  ],

  // Educational Materials
  'educational-materials': [
    {
      id: 'material_type',
      name: 'Material Type',
      type: 'select',
      required: true,
      options: [
        { value: 'textbooks', label: 'Textbooks' },
        { value: 'workbooks', label: 'Workbooks' },
        { value: 'reference-books', label: 'Reference Books' },
        { value: 'study-guides', label: 'Study Guides' },
        { value: 'past-questions', label: 'Past Questions' },
        { value: 'educational-software', label: 'Educational Software' },
        { value: 'learning-aids', label: 'Learning Aids' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'education_level',
      name: 'Education Level',
      type: 'select',
      required: true,
      options: [
        { value: 'primary', label: 'Primary School' },
        { value: 'jhs', label: 'Junior High School (JHS)' },
        { value: 'shs', label: 'Senior High School (SHS)' },
        { value: 'university', label: 'University' },
        { value: 'professional', label: 'Professional/Certification' },
        { value: 'adult-education', label: 'Adult Education' },
      ]
    },
    {
      id: 'subject',
      name: 'Subject',
      type: 'select',
      required: false,
      options: [
        { value: 'mathematics', label: 'Mathematics' },
        { value: 'english', label: 'English' },
        { value: 'science', label: 'Science' },
        { value: 'social-studies', label: 'Social Studies' },
        { value: 'history', label: 'History' },
        { value: 'geography', label: 'Geography' },
        { value: 'economics', label: 'Economics' },
        { value: 'business', label: 'Business Studies' },
        { value: 'computer-science', label: 'Computer Science' },
        { value: 'languages', label: 'Languages' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'curriculum',
      name: 'Curriculum',
      type: 'select',
      required: false,
      options: [
        { value: 'ghana-curriculum', label: 'Ghana National Curriculum' },
        { value: 'waec', label: 'WAEC' },
        { value: 'cambridge', label: 'Cambridge' },
        { value: 'ib', label: 'International Baccalaureate' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // =============================================
  // BABY & KIDS SUBCATEGORIES
  // =============================================

  // Baby Gear
  'baby-gear': [
    {
      id: 'gear_type',
      name: 'Baby Gear Type',
      type: 'select',
      required: true,
      options: [
        { value: 'strollers', label: 'Strollers & Pushchairs' },
        { value: 'car-seats', label: 'Car Seats' },
        { value: 'high-chairs', label: 'High Chairs' },
        { value: 'baby-carriers', label: 'Baby Carriers' },
        { value: 'cribs-cots', label: 'Cribs & Cots' },
        { value: 'changing-tables', label: 'Changing Tables' },
        { value: 'baby-monitors', label: 'Baby Monitors' },
        { value: 'playpens', label: 'Playpens' },
        { value: 'baby-swings', label: 'Baby Swings' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'age_range',
      name: 'Age Range',
      type: 'select',
      required: true,
      options: [
        { value: '0-6-months', label: '0-6 months' },
        { value: '6-12-months', label: '6-12 months' },
        { value: '1-2-years', label: '1-2 years' },
        { value: '2-3-years', label: '2-3 years' },
        { value: '3-5-years', label: '3-5 years' },
        { value: 'multi-age', label: 'Multi-age' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'chicco', label: 'Chicco' },
        { value: 'graco', label: 'Graco' },
        { value: 'fisher-price', label: 'Fisher-Price' },
        { value: 'britax', label: 'Britax' },
        { value: 'maxi-cosi', label: 'Maxi-Cosi' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'safety_features',
      name: 'Safety Features',
      type: 'multiselect',
      required: false,
      options: [
        { value: '5-point-harness', label: '5-Point Harness' },
        { value: 'safety-certified', label: 'Safety Certified' },
        { value: 'adjustable', label: 'Adjustable' },
        { value: 'foldable', label: 'Foldable' },
        { value: 'washable', label: 'Washable' },
      ]
    }
  ],

  // Toys
  'toys': [
    {
      id: 'toy_type',
      name: 'Toy Type',
      type: 'select',
      required: true,
      options: [
        { value: 'educational-toys', label: 'Educational Toys' },
        { value: 'action-figures', label: 'Action Figures' },
        { value: 'dolls', label: 'Dolls' },
        { value: 'building-blocks', label: 'Building Blocks' },
        { value: 'puzzles', label: 'Puzzles' },
        { value: 'board-games', label: 'Board Games' },
        { value: 'outdoor-toys', label: 'Outdoor Toys' },
        { value: 'electronic-toys', label: 'Electronic Toys' },
        { value: 'stuffed-animals', label: 'Stuffed Animals' },
        { value: 'art-crafts', label: 'Art & Crafts' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'age_range',
      name: 'Age Range',
      type: 'select',
      required: true,
      options: [
        { value: '0-12-months', label: '0-12 months' },
        { value: '1-2-years', label: '1-2 years' },
        { value: '3-5-years', label: '3-5 years' },
        { value: '6-8-years', label: '6-8 years' },
        { value: '9-12-years', label: '9-12 years' },
        { value: '13-plus', label: '13+ years' },
        { value: 'all-ages', label: 'All Ages' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'lego', label: 'LEGO' },
        { value: 'fisher-price', label: 'Fisher-Price' },
        { value: 'mattel', label: 'Mattel' },
        { value: 'hasbro', label: 'Hasbro' },
        { value: 'vtech', label: 'VTech' },
        { value: 'melissa-doug', label: 'Melissa & Doug' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'educational_value',
      name: 'Educational Value',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'motor-skills', label: 'Motor Skills' },
        { value: 'cognitive-development', label: 'Cognitive Development' },
        { value: 'creativity', label: 'Creativity' },
        { value: 'problem-solving', label: 'Problem Solving' },
        { value: 'language-skills', label: 'Language Skills' },
        { value: 'social-skills', label: 'Social Skills' },
        { value: 'stem', label: 'STEM Learning' },
      ]
    }
  ],

  // =============================================
  // REMAINING IMPORTANT SUBCATEGORIES
  // =============================================

  // Bedroom Furniture
  'bedroom': [
    {
      id: 'furniture_type',
      name: 'Furniture Type',
      type: 'select',
      required: true,
      options: [
        { value: 'beds', label: 'Beds' },
        { value: 'mattresses', label: 'Mattresses' },
        { value: 'wardrobes', label: 'Wardrobes' },
        { value: 'dressers', label: 'Dressers' },
        { value: 'nightstands', label: 'Nightstands' },
        { value: 'bedroom-sets', label: 'Bedroom Sets' },
        { value: 'mirrors', label: 'Mirrors' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'bed_size',
      name: 'Bed Size',
      type: 'select',
      required: false,
      options: [
        { value: 'single', label: 'Single' },
        { value: 'double', label: 'Double' },
        { value: 'queen', label: 'Queen' },
        { value: 'king', label: 'King' },
        { value: 'super-king', label: 'Super King' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: false,
      options: [
        { value: 'wood', label: 'Wood' },
        { value: 'metal', label: 'Metal' },
        { value: 'upholstered', label: 'Upholstered' },
        { value: 'leather', label: 'Leather' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Dining Room Furniture
  'dining-room': [
    {
      id: 'furniture_type',
      name: 'Furniture Type',
      type: 'select',
      required: true,
      options: [
        { value: 'dining-tables', label: 'Dining Tables' },
        { value: 'dining-chairs', label: 'Dining Chairs' },
        { value: 'dining-sets', label: 'Dining Sets' },
        { value: 'buffets-sideboards', label: 'Buffets & Sideboards' },
        { value: 'bar-stools', label: 'Bar Stools' },
        { value: 'china-cabinets', label: 'China Cabinets' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'seating_capacity',
      name: 'Seating Capacity',
      type: 'select',
      required: false,
      options: [
        { value: '2-seater', label: '2 Seater' },
        { value: '4-seater', label: '4 Seater' },
        { value: '6-seater', label: '6 Seater' },
        { value: '8-seater', label: '8 Seater' },
        { value: '10-plus-seater', label: '10+ Seater' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: false,
      options: [
        { value: 'wood', label: 'Wood' },
        { value: 'glass', label: 'Glass' },
        { value: 'metal', label: 'Metal' },
        { value: 'marble', label: 'Marble' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Office Furniture
  'office-furniture': [
    {
      id: 'furniture_type',
      name: 'Furniture Type',
      type: 'select',
      required: true,
      options: [
        { value: 'office-chairs', label: 'Office Chairs' },
        { value: 'desks', label: 'Desks' },
        { value: 'filing-cabinets', label: 'Filing Cabinets' },
        { value: 'bookcases', label: 'Bookcases' },
        { value: 'conference-tables', label: 'Conference Tables' },
        { value: 'office-sets', label: 'Office Sets' },
        { value: 'storage', label: 'Storage Solutions' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: false,
      options: [
        { value: 'wood', label: 'Wood' },
        { value: 'metal', label: 'Metal' },
        { value: 'glass', label: 'Glass' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'leather', label: 'Leather' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'features',
      name: 'Features',
      type: 'multiselect',
      required: false,
      options: [
        { value: 'adjustable-height', label: 'Adjustable Height' },
        { value: 'ergonomic', label: 'Ergonomic' },
        { value: 'wheels', label: 'Wheels/Casters' },
        { value: 'storage-drawers', label: 'Storage Drawers' },
        { value: 'cable-management', label: 'Cable Management' },
        { value: 'lockable', label: 'Lockable' },
      ]
    }
  ],

  // Plants
  'plants': [
    {
      id: 'plant_type',
      name: 'Plant Type',
      type: 'select',
      required: true,
      options: [
        { value: 'indoor-plants', label: 'Indoor Plants' },
        { value: 'outdoor-plants', label: 'Outdoor Plants' },
        { value: 'flowering-plants', label: 'Flowering Plants' },
        { value: 'fruit-trees', label: 'Fruit Trees' },
        { value: 'vegetables', label: 'Vegetables' },
        { value: 'herbs', label: 'Herbs' },
        { value: 'succulents', label: 'Succulents' },
        { value: 'trees-shrubs', label: 'Trees & Shrubs' },
        { value: 'seeds', label: 'Seeds' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'care_level',
      name: 'Care Level',
      type: 'select',
      required: false,
      options: [
        { value: 'low-maintenance', label: 'Low Maintenance' },
        { value: 'moderate-care', label: 'Moderate Care' },
        { value: 'high-maintenance', label: 'High Maintenance' },
      ]
    },
    {
      id: 'sunlight_needs',
      name: 'Sunlight Needs',
      type: 'select',
      required: false,
      options: [
        { value: 'full-sun', label: 'Full Sun' },
        { value: 'partial-sun', label: 'Partial Sun' },
        { value: 'shade', label: 'Shade' },
        { value: 'indirect-light', label: 'Indirect Light' },
      ]
    },
    {
      id: 'plant_size',
      name: 'Plant Size',
      type: 'select',
      required: false,
      options: [
        { value: 'small', label: 'Small (under 30cm)' },
        { value: 'medium', label: 'Medium (30-100cm)' },
        { value: 'large', label: 'Large (over 100cm)' },
        { value: 'tree', label: 'Tree' },
      ]
    }
  ],

  // Garden Tools
  'garden-tools': [
    {
      id: 'tool_type',
      name: 'Tool Type',
      type: 'select',
      required: true,
      options: [
        { value: 'hand-tools', label: 'Hand Tools' },
        { value: 'power-tools', label: 'Power Tools' },
        { value: 'watering-tools', label: 'Watering Tools' },
        { value: 'pruning-tools', label: 'Pruning Tools' },
        { value: 'lawn-mowers', label: 'Lawn Mowers' },
        { value: 'leaf-blowers', label: 'Leaf Blowers' },
        { value: 'hedge-trimmers', label: 'Hedge Trimmers' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'power_source',
      name: 'Power Source',
      type: 'select',
      required: false,
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'electric', label: 'Electric' },
        { value: 'battery', label: 'Battery' },
        { value: 'petrol', label: 'Petrol' },
        { value: 'solar', label: 'Solar' },
      ]
    },
    {
      id: 'brand',
      name: 'Brand',
      type: 'select',
      required: false,
      options: [
        { value: 'bosch', label: 'Bosch' },
        { value: 'black-decker', label: 'Black & Decker' },
        { value: 'makita', label: 'Makita' },
        { value: 'ryobi', label: 'Ryobi' },
        { value: 'husqvarna', label: 'Husqvarna' },
        { value: 'other', label: 'Other' },
      ]
    }
  ],

  // Outdoor Furniture
  'outdoor-furniture': [
    {
      id: 'furniture_type',
      name: 'Furniture Type',
      type: 'select',
      required: true,
      options: [
        { value: 'patio-sets', label: 'Patio Sets' },
        { value: 'outdoor-chairs', label: 'Outdoor Chairs' },
        { value: 'outdoor-tables', label: 'Outdoor Tables' },
        { value: 'loungers', label: 'Loungers' },
        { value: 'umbrellas', label: 'Umbrellas' },
        { value: 'gazebos', label: 'Gazebos' },
        { value: 'swings', label: 'Garden Swings' },
        { value: 'benches', label: 'Garden Benches' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'material',
      name: 'Material',
      type: 'select',
      required: false,
      options: [
        { value: 'wood', label: 'Wood' },
        { value: 'metal', label: 'Metal' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'rattan', label: 'Rattan' },
        { value: 'wicker', label: 'Wicker' },
        { value: 'aluminum', label: 'Aluminum' },
        { value: 'teak', label: 'Teak' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'weather_resistance',
      name: 'Weather Resistance',
      type: 'select',
      required: false,
      options: [
        { value: 'weather-resistant', label: 'Weather Resistant' },
        { value: 'waterproof', label: 'Waterproof' },
        { value: 'uv-resistant', label: 'UV Resistant' },
        { value: 'rust-resistant', label: 'Rust Resistant' },
        { value: 'requires-cover', label: 'Requires Cover' },
      ]
    }
  ],

  // Movies
  'movies': [
    {
      id: 'format',
      name: 'Format',
      type: 'select',
      required: true,
      options: [
        { value: 'dvd', label: 'DVD' },
        { value: 'blu-ray', label: 'Blu-ray' },
        { value: '4k-uhd', label: '4K UHD' },
        { value: 'digital', label: 'Digital Download' },
        { value: 'vhs', label: 'VHS (Vintage)' },
      ]
    },
    {
      id: 'genre',
      name: 'Genre',
      type: 'select',
      required: false,
      options: [
        { value: 'action', label: 'Action' },
        { value: 'comedy', label: 'Comedy' },
        { value: 'drama', label: 'Drama' },
        { value: 'horror', label: 'Horror' },
        { value: 'romance', label: 'Romance' },
        { value: 'sci-fi', label: 'Sci-Fi' },
        { value: 'thriller', label: 'Thriller' },
        { value: 'documentary', label: 'Documentary' },
        { value: 'animation', label: 'Animation' },
        { value: 'family', label: 'Family' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'language',
      name: 'Language',
      type: 'select',
      required: false,
      options: [
        { value: 'english', label: 'English' },
        { value: 'french', label: 'French' },
        { value: 'spanish', label: 'Spanish' },
        { value: 'hindi', label: 'Hindi' },
        { value: 'chinese', label: 'Chinese' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'age_rating',
      name: 'Age Rating',
      type: 'select',
      required: false,
      options: [
        { value: 'g', label: 'G (General)' },
        { value: 'pg', label: 'PG (Parental Guidance)' },
        { value: 'pg-13', label: 'PG-13' },
        { value: 'r', label: 'R (Restricted)' },
        { value: '18', label: '18+' },
      ]
    }
  ],

  // Music
  'music': [
    {
      id: 'format',
      name: 'Format',
      type: 'select',
      required: true,
      options: [
        { value: 'cd', label: 'CD' },
        { value: 'vinyl', label: 'Vinyl Record' },
        { value: 'digital', label: 'Digital Download' },
        { value: 'cassette', label: 'Cassette Tape' },
        { value: 'mp3-player', label: 'MP3 Player' },
      ]
    },
    {
      id: 'genre',
      name: 'Genre',
      type: 'select',
      required: false,
      options: [
        { value: 'afrobeats', label: 'Afrobeats' },
        { value: 'highlife', label: 'Highlife' },
        { value: 'gospel', label: 'Gospel' },
        { value: 'hip-hop', label: 'Hip-Hop' },
        { value: 'r-and-b', label: 'R&B' },
        { value: 'pop', label: 'Pop' },
        { value: 'rock', label: 'Rock' },
        { value: 'jazz', label: 'Jazz' },
        { value: 'classical', label: 'Classical' },
        { value: 'reggae', label: 'Reggae' },
        { value: 'country', label: 'Country' },
        { value: 'electronic', label: 'Electronic' },
        { value: 'other', label: 'Other' },
      ]
    },
    {
      id: 'artist',
      name: 'Artist',
      type: 'text',
      required: false,
      placeholder: 'Artist or band name'
    },
    {
      id: 'record_label',
      name: 'Record Label',
      type: 'text',
      required: false,
      placeholder: 'Record label'
    }
  ]
};

// Helper function to get attributes for a category
export function getCategoryAttributes(categoryId: string): CategoryAttribute[] {
  return CATEGORY_ATTRIBUTES[categoryId] || [];
}

// Helper function to check if a category has attributes
export function hasCategoryAttributes(categoryId: string): boolean {
  return categoryId in CATEGORY_ATTRIBUTES && CATEGORY_ATTRIBUTES[categoryId].length > 0;
}
