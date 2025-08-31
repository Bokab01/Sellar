/*
  # User Profiles and Categories Setup

  1. New Tables
    - `profiles` - Extended user profiles with marketplace-specific fields
      - `id` (uuid, primary key, references auth.users)
      - `first_name`, `last_name` (text, required)
      - `phone` (text, optional)
      - `avatar_url` (text, optional)
      - `location` (text, default: 'Accra, Greater Accra')
      - `bio` (text, optional)
      - `rating` (numeric, 0-5 scale)
      - `total_sales`, `total_reviews` (integer counters)
      - `credit_balance` (numeric, for marketplace transactions)
      - `is_verified`, `is_online` (boolean flags)
      - `last_seen`, `response_time` (user activity tracking)
      - `created_at`, `updated_at` (timestamps)

    - `categories` - Product categories with hierarchical support
      - `id` (uuid, primary key)
      - `name`, `slug` (text, unique identifiers)
      - `parent_id` (uuid, self-reference for subcategories)
      - `icon` (text, icon name)
      - `is_active`, `sort_order` (management fields)

  2. Security
    - Enable RLS on all tables
    - Users can manage their own profiles
    - Categories are publicly readable when active
    - Automatic profile creation trigger on user signup

  3. Functions & Triggers
    - `handle_new_user()` - Creates profile on auth signup
    - `update_updated_at_column()` - Auto-updates timestamps
    - `create_user_settings()` - Creates default user settings
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  avatar_url text,
  location text DEFAULT 'Accra, Greater Accra' NOT NULL,
  bio text,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_sales integer DEFAULT 0 CHECK (total_sales >= 0),
  total_reviews integer DEFAULT 0 CHECK (total_reviews >= 0),
  credit_balance numeric DEFAULT 0 CHECK (credit_balance >= 0),
  is_verified boolean DEFAULT false,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  response_time text DEFAULT 'within hours',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  icon text DEFAULT 'package' NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Categories policies
CREATE POLICY "Categories are publicly readable"
  ON categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, phone, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'location', 'Accra, Greater Accra')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user_settings creation function
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER create_user_settings_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_settings();

-- Insert default categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Electronics', 'electronics', 'smartphone', 1),
  ('Fashion', 'fashion', 'shirt', 2),
  ('Home & Garden', 'home-garden', 'home', 3),
  ('Vehicles', 'vehicles', 'car', 4),
  ('Books & Media', 'books-media', 'book', 5),
  ('Sports', 'sports', 'dumbbell', 6),
  ('Services', 'services', 'briefcase', 7),
  ('Other', 'other', 'more-horizontal', 8)
ON CONFLICT (name) DO NOTHING;