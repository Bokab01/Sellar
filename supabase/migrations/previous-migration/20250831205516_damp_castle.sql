/*
  # Create callback requests table

  1. New Tables
    - `callback_requests`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key to listings)
      - `requester_id` (uuid, foreign key to profiles)
      - `seller_id` (uuid, foreign key to profiles)
      - `phone_number` (text, requester's phone)
      - `preferred_time` (text, when to call)
      - `message` (text, optional message)
      - `status` (text, pending/completed/cancelled)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `callback_requests` table
    - Add policies for users to manage their own callback requests
    - Add policies for sellers to view requests for their listings

  3. Constraints
    - Ensure requester cannot request callback for own listing
    - Valid status values
    - Valid preferred time values
*/

-- Create callback_requests table
CREATE TABLE IF NOT EXISTS callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  preferred_time text DEFAULT 'anytime' CHECK (preferred_time IN ('anytime', 'morning', 'afternoon', 'evening')),
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;

-- Add constraint to prevent self-callback requests
ALTER TABLE callback_requests ADD CONSTRAINT callback_requests_no_self_request 
  CHECK (requester_id != seller_id);

-- Create policies
CREATE POLICY "Users can view their callback requests"
  ON callback_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create callback requests"
  ON callback_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id 
    AND auth.uid() != seller_id
    AND EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = callback_requests.listing_id 
      AND listings.status = 'active'
      AND listings.user_id = callback_requests.seller_id
    )
  );

CREATE POLICY "Users can update their callback requests"
  ON callback_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = seller_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS callback_requests_listing_id_idx ON callback_requests(listing_id);
CREATE INDEX IF NOT EXISTS callback_requests_requester_id_idx ON callback_requests(requester_id);
CREATE INDEX IF NOT EXISTS callback_requests_seller_id_idx ON callback_requests(seller_id);

-- Create function to send notification when callback is requested
CREATE OR REPLACE FUNCTION notify_callback_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for seller
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    data
  ) VALUES (
    NEW.seller_id,
    'callback',
    'Callback Request',
    'Someone requested a callback for your listing',
    json_build_object(
      'callback_id', NEW.id,
      'listing_id', NEW.listing_id,
      'requester_id', NEW.requester_id,
      'phone_number', NEW.phone_number,
      'preferred_time', NEW.preferred_time
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for callback notifications
DROP TRIGGER IF EXISTS callback_request_notification_trigger ON callback_requests;
CREATE TRIGGER callback_request_notification_trigger
  AFTER INSERT ON callback_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_callback_request();