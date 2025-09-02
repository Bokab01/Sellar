export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id?: string;
  subcategories?: Category[];
  sort_order: number;
}

export const COMPREHENSIVE_CATEGORIES: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics & Technology',
    slug: 'electronics',
    icon: 'smartphone',
    sort_order: 1,
    subcategories: [
      {
        id: 'phones-tablets',
        name: 'Phones & Tablets',
        slug: 'phones-tablets',
        icon: 'smartphone',
        parent_id: 'electronics',
        sort_order: 1,
        subcategories: [
          { id: 'smartphones', name: 'Smartphones', slug: 'smartphones', icon: 'smartphone', parent_id: 'phones-tablets', sort_order: 1 },
          { id: 'feature-phones', name: 'Feature Phones', slug: 'feature-phones', icon: 'phone', parent_id: 'phones-tablets', sort_order: 2 },
          { id: 'tablets', name: 'Tablets & iPads', slug: 'tablets', icon: 'tablet', parent_id: 'phones-tablets', sort_order: 3 },
          { id: 'phone-accessories', name: 'Phone Accessories', slug: 'phone-accessories', icon: 'headphones', parent_id: 'phones-tablets', sort_order: 4 },
          { id: 'smartwatches', name: 'Smartwatches & Wearables', slug: 'smartwatches', icon: 'watch', parent_id: 'phones-tablets', sort_order: 5 },
        ]
      },
      {
        id: 'computers',
        name: 'Computers & Laptops',
        slug: 'computers',
        icon: 'laptop',
        parent_id: 'electronics',
        sort_order: 2,
        subcategories: [
          { id: 'laptops', name: 'Laptops', slug: 'laptops', icon: 'laptop', parent_id: 'computers', sort_order: 1 },
          { id: 'desktops', name: 'Desktop Computers', slug: 'desktops', icon: 'monitor', parent_id: 'computers', sort_order: 2 },
          { id: 'computer-accessories', name: 'Computer Accessories', slug: 'computer-accessories', icon: 'mouse', parent_id: 'computers', sort_order: 3 },
          { id: 'software', name: 'Software', slug: 'software', icon: 'hard-drive', parent_id: 'computers', sort_order: 4 },
        ]
      },
      {
        id: 'audio-video',
        name: 'Audio & Video',
        slug: 'audio-video',
        icon: 'headphones',
        parent_id: 'electronics',
        sort_order: 3,
        subcategories: [
          { id: 'headphones-earphones', name: 'Headphones & Earphones', slug: 'headphones-earphones', icon: 'headphones', parent_id: 'audio-video', sort_order: 1 },
          { id: 'speakers', name: 'Speakers', slug: 'speakers', icon: 'volume-2', parent_id: 'audio-video', sort_order: 2 },
          { id: 'tv-monitors', name: 'TVs & Monitors', slug: 'tv-monitors', icon: 'tv', parent_id: 'audio-video', sort_order: 3 },
          { id: 'cameras', name: 'Cameras', slug: 'cameras', icon: 'camera', parent_id: 'audio-video', sort_order: 4 },
        ]
      },
      {
        id: 'gaming',
        name: 'Gaming',
        slug: 'gaming',
        icon: 'gamepad-2',
        parent_id: 'electronics',
        sort_order: 4,
        subcategories: [
          { id: 'gaming-consoles', name: 'Gaming Consoles', slug: 'gaming-consoles', icon: 'gamepad-2', parent_id: 'gaming', sort_order: 1 },
          { id: 'video-games', name: 'Video Games', slug: 'video-games', icon: 'disc', parent_id: 'gaming', sort_order: 2 },
          { id: 'gaming-accessories', name: 'Gaming Accessories', slug: 'gaming-accessories', icon: 'joystick', parent_id: 'gaming', sort_order: 3 },
        ]
      },
      {
        id: 'home-appliances',
        name: 'Home Appliances',
        slug: 'home-appliances',
        icon: 'refrigerator',
        parent_id: 'electronics',
        sort_order: 5,
        subcategories: [
          { id: 'kitchen-appliances', name: 'Kitchen Appliances', slug: 'kitchen-appliances', icon: 'chef-hat', parent_id: 'home-appliances', sort_order: 1 },
          { id: 'cleaning-appliances', name: 'Cleaning Appliances', slug: 'cleaning-appliances', icon: 'vacuum', parent_id: 'home-appliances', sort_order: 2 },
          { id: 'air-conditioning', name: 'Air Conditioning', slug: 'air-conditioning', icon: 'air-vent', parent_id: 'home-appliances', sort_order: 3 },
        ]
      }
    ]
  },
  {
    id: 'fashion',
    name: 'Fashion',
    slug: 'fashion',
    icon: 'shirt',
    sort_order: 2,
    subcategories: [
      {
        id: 'mens-fashion',
        name: "Men's Fashion",
        slug: 'mens-fashion',
        icon: 'user',
        parent_id: 'fashion',
        sort_order: 1,
        subcategories: [
          { id: 'mens-clothing', name: 'Clothing', slug: 'mens-clothing', icon: 'shirt', parent_id: 'mens-fashion', sort_order: 1 },
          { id: 'mens-shoes', name: 'Shoes', slug: 'mens-shoes', icon: 'footprints', parent_id: 'mens-fashion', sort_order: 2 },
          { id: 'mens-accessories', name: 'Accessories', slug: 'mens-accessories', icon: 'watch', parent_id: 'mens-fashion', sort_order: 3 },
        ]
      },
      {
        id: 'womens-fashion',
        name: "Women's Fashion",
        slug: 'womens-fashion',
        icon: 'user',
        parent_id: 'fashion',
        sort_order: 2,
        subcategories: [
          { id: 'womens-clothing', name: 'Clothing', slug: 'womens-clothing', icon: 'shirt', parent_id: 'womens-fashion', sort_order: 1 },
          { id: 'womens-shoes', name: 'Shoes', slug: 'womens-shoes', icon: 'footprints', parent_id: 'womens-fashion', sort_order: 2 },
          { id: 'womens-accessories', name: 'Accessories', slug: 'womens-accessories', icon: 'gem', parent_id: 'womens-fashion', sort_order: 3 },
          { id: 'bags-handbags', name: 'Bags & Handbags', slug: 'bags-handbags', icon: 'shopping-bag', parent_id: 'womens-fashion', sort_order: 4 },
        ]
      },
      {
        id: 'kids-fashion',
        name: "Kids' Fashion",
        slug: 'kids-fashion',
        icon: 'baby',
        parent_id: 'fashion',
        sort_order: 3,
        subcategories: [
          { id: 'boys-clothing', name: 'Boys Clothing', slug: 'boys-clothing', icon: 'shirt', parent_id: 'kids-fashion', sort_order: 1 },
          { id: 'girls-clothing', name: 'Girls Clothing', slug: 'girls-clothing', icon: 'shirt', parent_id: 'kids-fashion', sort_order: 2 },
          { id: 'kids-shoes', name: 'Kids Shoes', slug: 'kids-shoes', icon: 'footprints', parent_id: 'kids-fashion', sort_order: 3 },
        ]
      }
    ]
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    slug: 'vehicles',
    icon: 'car',
    sort_order: 3,
    subcategories: [
      {
        id: 'cars',
        name: 'Cars',
        slug: 'cars',
        icon: 'car',
        parent_id: 'vehicles',
        sort_order: 1,
        subcategories: [
          { id: 'sedans', name: 'Sedans', slug: 'sedans', icon: 'car', parent_id: 'cars', sort_order: 1 },
          { id: 'suvs', name: 'SUVs', slug: 'suvs', icon: 'truck', parent_id: 'cars', sort_order: 2 },
          { id: 'hatchbacks', name: 'Hatchbacks', slug: 'hatchbacks', icon: 'car', parent_id: 'cars', sort_order: 3 },
          { id: 'luxury-cars', name: 'Luxury Cars', slug: 'luxury-cars', icon: 'crown', parent_id: 'cars', sort_order: 4 },
        ]
      },
      {
        id: 'motorcycles',
        name: 'Motorcycles',
        slug: 'motorcycles',
        icon: 'bike',
        parent_id: 'vehicles',
        sort_order: 2,
        subcategories: [
          { id: 'sport-bikes', name: 'Sport Bikes', slug: 'sport-bikes', icon: 'zap', parent_id: 'motorcycles', sort_order: 1 },
          { id: 'cruiser-bikes', name: 'Cruiser Bikes', slug: 'cruiser-bikes', icon: 'bike', parent_id: 'motorcycles', sort_order: 2 },
          { id: 'scooters', name: 'Scooters', slug: 'scooters', icon: 'bike', parent_id: 'motorcycles', sort_order: 3 },
        ]
      },
      {
        id: 'auto-parts',
        name: 'Auto Parts & Accessories',
        slug: 'auto-parts',
        icon: 'settings',
        parent_id: 'vehicles',
        sort_order: 3,
        subcategories: [
          { id: 'car-parts', name: 'Car Parts', slug: 'car-parts', icon: 'settings', parent_id: 'auto-parts', sort_order: 1 },
          { id: 'car-accessories', name: 'Car Accessories', slug: 'car-accessories', icon: 'wrench', parent_id: 'auto-parts', sort_order: 2 },
          { id: 'tires-wheels', name: 'Tires & Wheels', slug: 'tires-wheels', icon: 'circle', parent_id: 'auto-parts', sort_order: 3 },
        ]
      }
    ]
  },
  {
    id: 'home-garden',
    name: 'Home & Garden',
    slug: 'home-garden',
    icon: 'home',
    sort_order: 4,
    subcategories: [
      {
        id: 'furniture',
        name: 'Furniture',
        slug: 'furniture',
        icon: 'armchair',
        parent_id: 'home-garden',
        sort_order: 1,
        subcategories: [
          { id: 'living-room', name: 'Living Room', slug: 'living-room', icon: 'sofa', parent_id: 'furniture', sort_order: 1 },
          { id: 'bedroom', name: 'Bedroom', slug: 'bedroom', icon: 'bed', parent_id: 'furniture', sort_order: 2 },
          { id: 'dining-room', name: 'Dining Room', slug: 'dining-room', icon: 'utensils', parent_id: 'furniture', sort_order: 3 },
          { id: 'office-furniture', name: 'Office Furniture', slug: 'office-furniture', icon: 'briefcase', parent_id: 'furniture', sort_order: 4 },
        ]
      },
      {
        id: 'home-decor',
        name: 'Home Decor',
        slug: 'home-decor',
        icon: 'palette',
        parent_id: 'home-garden',
        sort_order: 2,
        subcategories: [
          { id: 'wall-art', name: 'Wall Art', slug: 'wall-art', icon: 'image', parent_id: 'home-decor', sort_order: 1 },
          { id: 'lighting', name: 'Lighting', slug: 'lighting', icon: 'lightbulb', parent_id: 'home-decor', sort_order: 2 },
          { id: 'rugs-carpets', name: 'Rugs & Carpets', slug: 'rugs-carpets', icon: 'square', parent_id: 'home-decor', sort_order: 3 },
        ]
      },
      {
        id: 'garden',
        name: 'Garden & Outdoor',
        slug: 'garden',
        icon: 'flower',
        parent_id: 'home-garden',
        sort_order: 3,
        subcategories: [
          { id: 'plants', name: 'Plants', slug: 'plants', icon: 'flower', parent_id: 'garden', sort_order: 1 },
          { id: 'garden-tools', name: 'Garden Tools', slug: 'garden-tools', icon: 'shovel', parent_id: 'garden', sort_order: 2 },
          { id: 'outdoor-furniture', name: 'Outdoor Furniture', slug: 'outdoor-furniture', icon: 'sun', parent_id: 'garden', sort_order: 3 },
        ]
      }
    ]
  },
  {
    id: 'sports-fitness',
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    icon: 'dumbbell',
    sort_order: 5,
    subcategories: [
      {
        id: 'fitness-equipment',
        name: 'Fitness Equipment',
        slug: 'fitness-equipment',
        icon: 'dumbbell',
        parent_id: 'sports-fitness',
        sort_order: 1,
        subcategories: [
          { id: 'weights', name: 'Weights', slug: 'weights', icon: 'dumbbell', parent_id: 'fitness-equipment', sort_order: 1 },
          { id: 'cardio-equipment', name: 'Cardio Equipment', slug: 'cardio-equipment', icon: 'activity', parent_id: 'fitness-equipment', sort_order: 2 },
          { id: 'yoga-pilates', name: 'Yoga & Pilates', slug: 'yoga-pilates', icon: 'heart', parent_id: 'fitness-equipment', sort_order: 3 },
        ]
      },
      {
        id: 'sports-equipment',
        name: 'Sports Equipment',
        slug: 'sports-equipment',
        icon: 'trophy',
        parent_id: 'sports-fitness',
        sort_order: 2,
        subcategories: [
          { id: 'football', name: 'Football', slug: 'football', icon: 'circle', parent_id: 'sports-equipment', sort_order: 1 },
          { id: 'basketball', name: 'Basketball', slug: 'basketball', icon: 'circle', parent_id: 'sports-equipment', sort_order: 2 },
          { id: 'tennis', name: 'Tennis', slug: 'tennis', icon: 'circle', parent_id: 'sports-equipment', sort_order: 3 },
        ]
      }
    ]
  },
  {
    id: 'books-media',
    name: 'Books & Media',
    slug: 'books-media',
    icon: 'book',
    sort_order: 6,
    subcategories: [
      {
        id: 'books',
        name: 'Books',
        slug: 'books',
        icon: 'book',
        parent_id: 'books-media',
        sort_order: 1,
        subcategories: [
          { id: 'textbooks', name: 'Textbooks', slug: 'textbooks', icon: 'graduation-cap', parent_id: 'books', sort_order: 1 },
          { id: 'fiction', name: 'Fiction', slug: 'fiction', icon: 'book-open', parent_id: 'books', sort_order: 2 },
          { id: 'non-fiction', name: 'Non-Fiction', slug: 'non-fiction', icon: 'book', parent_id: 'books', sort_order: 3 },
        ]
      },
      {
        id: 'media',
        name: 'Movies & Music',
        slug: 'media',
        icon: 'disc',
        parent_id: 'books-media',
        sort_order: 2,
        subcategories: [
          { id: 'movies', name: 'Movies', slug: 'movies', icon: 'film', parent_id: 'media', sort_order: 1 },
          { id: 'music', name: 'Music', slug: 'music', icon: 'music', parent_id: 'media', sort_order: 2 },
        ]
      }
    ]
  },
  {
    id: 'services',
    name: 'Services',
    slug: 'services',
    icon: 'briefcase',
    sort_order: 7,
    subcategories: [
      {
        id: 'professional-services',
        name: 'Professional Services',
        slug: 'professional-services',
        icon: 'briefcase',
        parent_id: 'services',
        sort_order: 1,
        subcategories: [
          { id: 'consulting', name: 'Consulting', slug: 'consulting', icon: 'users', parent_id: 'professional-services', sort_order: 1 },
          { id: 'legal', name: 'Legal Services', slug: 'legal', icon: 'scale', parent_id: 'professional-services', sort_order: 2 },
          { id: 'accounting', name: 'Accounting', slug: 'accounting', icon: 'calculator', parent_id: 'professional-services', sort_order: 3 },
        ]
      },
      {
        id: 'home-services',
        name: 'Home Services',
        slug: 'home-services',
        icon: 'home',
        parent_id: 'services',
        sort_order: 2,
        subcategories: [
          { id: 'cleaning', name: 'Cleaning', slug: 'cleaning', icon: 'spray-can', parent_id: 'home-services', sort_order: 1 },
          { id: 'repairs', name: 'Repairs & Maintenance', slug: 'repairs', icon: 'wrench', parent_id: 'home-services', sort_order: 2 },
          { id: 'gardening-services', name: 'Gardening', slug: 'gardening-services', icon: 'flower', parent_id: 'home-services', sort_order: 3 },
        ]
      }
    ]
  },
  {
    id: 'baby-kids',
    name: 'Baby & Kids',
    slug: 'baby-kids',
    icon: 'baby',
    sort_order: 8,
    subcategories: [
      {
        id: 'baby-gear',
        name: 'Baby Gear',
        slug: 'baby-gear',
        icon: 'baby',
        parent_id: 'baby-kids',
        sort_order: 1,
        subcategories: [
          { id: 'strollers', name: 'Strollers & Car Seats', slug: 'strollers', icon: 'baby', parent_id: 'baby-gear', sort_order: 1 },
          { id: 'baby-furniture', name: 'Baby Furniture', slug: 'baby-furniture', icon: 'bed', parent_id: 'baby-gear', sort_order: 2 },
          { id: 'feeding', name: 'Feeding & Nursing', slug: 'feeding', icon: 'baby', parent_id: 'baby-gear', sort_order: 3 },
        ]
      },
      {
        id: 'toys-games',
        name: 'Toys & Games',
        slug: 'toys-games',
        icon: 'gamepad-2',
        parent_id: 'baby-kids',
        sort_order: 2,
        subcategories: [
          { id: 'educational-toys', name: 'Educational Toys', slug: 'educational-toys', icon: 'graduation-cap', parent_id: 'toys-games', sort_order: 1 },
          { id: 'outdoor-toys', name: 'Outdoor Toys', slug: 'outdoor-toys', icon: 'sun', parent_id: 'toys-games', sort_order: 2 },
          { id: 'board-games', name: 'Board Games & Puzzles', slug: 'board-games', icon: 'gamepad-2', parent_id: 'toys-games', sort_order: 3 },
        ]
      }
    ]
  },
  {
    id: 'beauty-health',
    name: 'Beauty & Health',
    slug: 'beauty-health',
    icon: 'heart',
    sort_order: 9,
    subcategories: [
      {
        id: 'skincare',
        name: 'Skincare & Cosmetics',
        slug: 'skincare',
        icon: 'heart',
        parent_id: 'beauty-health',
        sort_order: 1,
        subcategories: [
          { id: 'makeup', name: 'Makeup', slug: 'makeup', icon: 'palette', parent_id: 'skincare', sort_order: 1 },
          { id: 'skincare-products', name: 'Skincare Products', slug: 'skincare-products', icon: 'heart', parent_id: 'skincare', sort_order: 2 },
          { id: 'fragrances', name: 'Fragrances', slug: 'fragrances', icon: 'flower', parent_id: 'skincare', sort_order: 3 },
        ]
      },
      {
        id: 'health-wellness',
        name: 'Health & Wellness',
        slug: 'health-wellness',
        icon: 'activity',
        parent_id: 'beauty-health',
        sort_order: 2,
        subcategories: [
          { id: 'supplements', name: 'Supplements & Vitamins', slug: 'supplements', icon: 'heart', parent_id: 'health-wellness', sort_order: 1 },
          { id: 'medical-devices', name: 'Medical Devices', slug: 'medical-devices', icon: 'activity', parent_id: 'health-wellness', sort_order: 2 },
        ]
      }
    ]
  },
  {
    id: 'food-beverages',
    name: 'Food & Beverages',
    slug: 'food-beverages',
    icon: 'utensils',
    sort_order: 10,
    subcategories: [
      {
        id: 'local-food',
        name: 'Local Food & Snacks',
        slug: 'local-food',
        icon: 'utensils',
        parent_id: 'food-beverages',
        sort_order: 1,
      },
      {
        id: 'beverages',
        name: 'Beverages',
        slug: 'beverages',
        icon: 'coffee',
        parent_id: 'food-beverages',
        sort_order: 2,
      },
      {
        id: 'specialty-foods',
        name: 'Specialty & Organic Foods',
        slug: 'specialty-foods',
        icon: 'leaf',
        parent_id: 'food-beverages',
        sort_order: 3,
      }
    ]
  },
  {
    id: 'pets-animals',
    name: 'Pets & Animals',
    slug: 'pets-animals',
    icon: 'heart',
    sort_order: 11,
    subcategories: [
      {
        id: 'pet-supplies',
        name: 'Pet Supplies',
        slug: 'pet-supplies',
        icon: 'heart',
        parent_id: 'pets-animals',
        sort_order: 1,
        subcategories: [
          { id: 'dog-supplies', name: 'Dog Supplies', slug: 'dog-supplies', icon: 'heart', parent_id: 'pet-supplies', sort_order: 1 },
          { id: 'cat-supplies', name: 'Cat Supplies', slug: 'cat-supplies', icon: 'heart', parent_id: 'pet-supplies', sort_order: 2 },
          { id: 'pet-food', name: 'Pet Food & Treats', slug: 'pet-food', icon: 'utensils', parent_id: 'pet-supplies', sort_order: 3 },
        ]
      },
      {
        id: 'pets-for-sale',
        name: 'Pets for Sale',
        slug: 'pets-for-sale',
        icon: 'heart',
        parent_id: 'pets-animals',
        sort_order: 2,
        subcategories: [
          { id: 'dogs', name: 'Dogs', slug: 'dogs', icon: 'heart', parent_id: 'pets-for-sale', sort_order: 1 },
          { id: 'cats', name: 'Cats', slug: 'cats', icon: 'heart', parent_id: 'pets-for-sale', sort_order: 2 },
          { id: 'birds', name: 'Birds', slug: 'birds', icon: 'feather', parent_id: 'pets-for-sale', sort_order: 3 },
          { id: 'fish-aquarium', name: 'Fish & Aquarium', slug: 'fish-aquarium', icon: 'waves', parent_id: 'pets-for-sale', sort_order: 4 },
        ]
      }
    ]
  },
  {
    id: 'art-crafts',
    name: 'Art & Crafts',
    slug: 'art-crafts',
    icon: 'palette',
    sort_order: 12,
    subcategories: [
      {
        id: 'artwork',
        name: 'Artwork & Paintings',
        slug: 'artwork',
        icon: 'image',
        parent_id: 'art-crafts',
        sort_order: 1,
      },
      {
        id: 'craft-supplies',
        name: 'Craft Supplies',
        slug: 'craft-supplies',
        icon: 'palette',
        parent_id: 'art-crafts',
        sort_order: 2,
      },
      {
        id: 'handmade-items',
        name: 'Handmade Items',
        slug: 'handmade-items',
        icon: 'heart',
        parent_id: 'art-crafts',
        sort_order: 3,
      }
    ]
  },
  {
    id: 'business-industrial',
    name: 'Business & Industrial',
    slug: 'business-industrial',
    icon: 'briefcase',
    sort_order: 13,
    subcategories: [
      {
        id: 'office-equipment',
        name: 'Office Equipment',
        slug: 'office-equipment',
        icon: 'briefcase',
        parent_id: 'business-industrial',
        sort_order: 1,
        subcategories: [
          { id: 'printers-scanners', name: 'Printers & Scanners', slug: 'printers-scanners', icon: 'printer', parent_id: 'office-equipment', sort_order: 1 },
          { id: 'office-supplies', name: 'Office Supplies', slug: 'office-supplies', icon: 'briefcase', parent_id: 'office-equipment', sort_order: 2 },
        ]
      },
      {
        id: 'industrial-equipment',
        name: 'Industrial Equipment',
        slug: 'industrial-equipment',
        icon: 'settings',
        parent_id: 'business-industrial',
        sort_order: 2,
      },
      {
        id: 'restaurant-equipment',
        name: 'Restaurant & Food Service',
        slug: 'restaurant-equipment',
        icon: 'utensils',
        parent_id: 'business-industrial',
        sort_order: 3,
      }
    ]
  },
  {
    id: 'tickets-events',
    name: 'Tickets & Events',
    slug: 'tickets-events',
    icon: 'ticket',
    sort_order: 14,
    subcategories: [
      {
        id: 'event-tickets',
        name: 'Event Tickets',
        slug: 'event-tickets',
        icon: 'ticket',
        parent_id: 'tickets-events',
        sort_order: 1,
        subcategories: [
          { id: 'concerts', name: 'Concerts & Music', slug: 'concerts', icon: 'music', parent_id: 'event-tickets', sort_order: 1 },
          { id: 'sports-tickets', name: 'Sports Events', slug: 'sports-tickets', icon: 'trophy', parent_id: 'event-tickets', sort_order: 2 },
          { id: 'theater-shows', name: 'Theater & Shows', slug: 'theater-shows', icon: 'film', parent_id: 'event-tickets', sort_order: 3 },
        ]
      },
      {
        id: 'gift-vouchers',
        name: 'Gift Cards & Vouchers',
        slug: 'gift-vouchers',
        icon: 'gift',
        parent_id: 'tickets-events',
        sort_order: 2,
      }
    ]
  },
  {
    id: 'other',
    name: 'Other',
    slug: 'other',
    icon: 'more-horizontal',
    sort_order: 15,
    subcategories: [
      {
        id: 'collectibles',
        name: 'Collectibles & Antiques',
        slug: 'collectibles',
        icon: 'star',
        parent_id: 'other',
        sort_order: 1,
        subcategories: [
          { id: 'coins-stamps', name: 'Coins & Stamps', slug: 'coins-stamps', icon: 'star', parent_id: 'collectibles', sort_order: 1 },
          { id: 'vintage-items', name: 'Vintage Items', slug: 'vintage-items', icon: 'clock', parent_id: 'collectibles', sort_order: 2 },
          { id: 'memorabilia', name: 'Memorabilia', slug: 'memorabilia', icon: 'star', parent_id: 'collectibles', sort_order: 3 },
        ]
      },
      {
        id: 'lost-found',
        name: 'Lost & Found',
        slug: 'lost-found',
        icon: 'search',
        parent_id: 'other',
        sort_order: 2,
      },
      {
        id: 'miscellaneous',
        name: 'Miscellaneous',
        slug: 'miscellaneous',
        icon: 'package',
        parent_id: 'other',
        sort_order: 3,
      }
    ]
  }
];

export function findCategoryById(categories: Category[], id: string): Category | null {
  for (const category of categories) {
    if (category.id === id) {
      return category;
    }
    if (category.subcategories) {
      const found = findCategoryById(category.subcategories, id);
      if (found) return found;
    }
  }
  return null;
}

export function getCategoryPath(categories: Category[], targetId: string): Category[] {
  function findPath(cats: Category[], path: Category[] = []): Category[] | null {
    for (const category of cats) {
      const currentPath = [...path, category];
      if (category.id === targetId) {
        return currentPath;
      }
      if (category.subcategories) {
        const found = findPath(category.subcategories, currentPath);
        if (found) return found;
      }
    }
    return null;
  }
  return findPath(categories) || [];
}


