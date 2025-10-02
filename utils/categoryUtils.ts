import { supabase } from '@/lib/supabase';

// Database category interface matching Supabase schema
export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  image_url?: string; // Image URL for category
  color?: string; // Hex color for category theming
  description?: string; // Category description
}

/**
 * Fetch all categories from the database
 */
export async function fetchAllCategories(): Promise<DbCategory[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all categories:', error);
    return [];
  }
}

/**
 * Fetch main categories (no parent)
 */
export async function fetchMainCategories(): Promise<DbCategory[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching main categories:', error);
    return [];
  }
}

/**
 * Fetch subcategories for a parent category
 */
export async function fetchSubcategories(parentId: string): Promise<DbCategory[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }
}

/**
 * Find a category by ID
 */
export async function findCategoryById(categoryId: string): Promise<DbCategory | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error finding category by ID:', error);
    return null;
  }
}

/**
 * Get the full path of a category (from root to current)
 */
export async function getCategoryPath(categoryId: string): Promise<DbCategory[]> {
  try {
    const path: DbCategory[] = [];
    let currentId: string | null = categoryId;

    while (currentId) {
      const category = await findCategoryById(currentId);
      if (!category) break;
      
      path.unshift(category); // Add to beginning of array
      currentId = category.parent_id;
    }

    return path;
  } catch (error) {
    console.error('Error getting category path:', error);
    return [];
  }
}

/**
 * Get root/main category for a given category ID
 */
export async function getRootCategory(categoryId: string): Promise<DbCategory | null> {
  try {
    const path = await getCategoryPath(categoryId);
    return path.length > 0 ? path[0] : null;
  } catch (error) {
    console.error('Error getting root category:', error);
    return null;
  }
}

