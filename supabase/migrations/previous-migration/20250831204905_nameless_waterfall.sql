/*
  # Add Callback Requests System

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
    - Add policies for users to manage their own requests
    - Add policy for sellers to view requests for their listings

  3. Functions
    - Trigger notification when callback is requested
*/

CREATE TABLE IF NOT EXISTS callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  preferred_time text DEFAULT 'anytime',
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;

-- Policies for callback requests
CREATE POLICY "Users can create callback requests"
  ON callback_requests
  FOR INSERT
  TO authenticated
  USING (auth.uid() = requester_id);

CREATE POLICY "Users can view their callback requests"
  ON callback_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update their callback requests"
  ON callback_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = seller_id);

-- Function to create notification for callback request
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
      'listing_id', NEW.listing_id,
      'requester_id', NEW.requester_id,
      'callback_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for callback notifications
CREATE TRIGGER callback_request_notification
  AFTER INSERT ON callback_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_callback_request();