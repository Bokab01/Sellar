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
  // Electronics - Smartphones
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
