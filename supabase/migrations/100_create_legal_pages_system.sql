-- Create legal pages system for Terms, Privacy Policy, About, etc.
-- This allows updating legal content without code deployment

CREATE TABLE IF NOT EXISTS public.legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type VARCHAR(50) NOT NULL UNIQUE, -- 'terms', 'privacy', 'about', 'community_guidelines', 'safety_tips'
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL, -- Structured content with sections
  version VARCHAR(20) NOT NULL, -- e.g., "1.0", "1.1", "2.0"
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_acceptance BOOLEAN NOT NULL DEFAULT false, -- For critical updates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Track user acceptances of legal documents
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_page_id UUID NOT NULL REFERENCES public.legal_pages(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  UNIQUE(user_id, legal_page_id, version)
);

-- Create indexes for performance
CREATE INDEX idx_legal_pages_type ON public.legal_pages(page_type);
CREATE INDEX idx_legal_pages_active ON public.legal_pages(is_active);
CREATE INDEX idx_legal_acceptances_user ON public.legal_acceptances(user_id);
CREATE INDEX idx_legal_acceptances_page ON public.legal_acceptances(legal_page_id);

-- Enable RLS
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_pages (public read)
CREATE POLICY "Legal pages are publicly readable"
  ON public.legal_pages FOR SELECT
  USING (is_active = true);

-- RLS Policies for legal_acceptances
CREATE POLICY "Users can view their own acceptances"
  ON public.legal_acceptances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own acceptances"
  ON public.legal_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_legal_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_pages_timestamp
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_pages_updated_at();

-- Function to get latest version of a legal page
CREATE OR REPLACE FUNCTION get_latest_legal_page(p_page_type VARCHAR)
RETURNS TABLE (
  id UUID,
  page_type VARCHAR,
  title VARCHAR,
  content JSONB,
  version VARCHAR,
  effective_date TIMESTAMP WITH TIME ZONE,
  requires_acceptance BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lp.id,
    lp.page_type,
    lp.title,
    lp.content,
    lp.version,
    lp.effective_date,
    lp.requires_acceptance
  FROM public.legal_pages lp
  WHERE lp.page_type = p_page_type
    AND lp.is_active = true
  ORDER BY lp.effective_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has accepted latest version
CREATE OR REPLACE FUNCTION has_accepted_latest_legal(p_user_id UUID, p_page_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_latest_version VARCHAR;
  v_user_accepted BOOLEAN;
BEGIN
  -- Get latest version
  SELECT version INTO v_latest_version
  FROM public.legal_pages
  WHERE page_type = p_page_type
    AND is_active = true
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Check if user accepted this version
  SELECT EXISTS(
    SELECT 1
    FROM public.legal_acceptances la
    JOIN public.legal_pages lp ON la.legal_page_id = lp.id
    WHERE la.user_id = p_user_id
      AND lp.page_type = p_page_type
      AND la.version = v_latest_version
  ) INTO v_user_accepted;

  RETURN COALESCE(v_user_accepted, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed initial legal pages
INSERT INTO public.legal_pages (page_type, title, version, content, requires_acceptance) VALUES
('terms', 'Terms and Conditions', '1.0', 
  '[
    {
      "section": 1,
      "heading": "Acceptance of Terms",
      "content": "By accessing and using the Sellar mobile application, you accept and agree to be bound by the terms and provision of this agreement."
    },
    {
      "section": 2,
      "heading": "Use License",
      "content": "Permission is granted to temporarily download one copy of Sellar for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title."
    },
    {
      "section": 3,
      "heading": "User Accounts",
      "content": "When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account."
    },
    {
      "section": 4,
      "heading": "Marketplace Rules",
      "content": "Users must comply with all applicable laws when buying or selling items. Prohibited items include but are not limited to illegal goods, counterfeit items, and items that violate intellectual property rights."
    },
    {
      "section": 5,
      "heading": "Payment and Transactions",
      "content": "All transactions are conducted between users. Sellar facilitates the platform but is not responsible for the completion of transactions between users."
    },
    {
      "section": 6,
      "heading": "Privacy and Data Protection",
      "content": "Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices."
    },
    {
      "section": 7,
      "heading": "Limitation of Liability",
      "content": "In no event shall Sellar or its suppliers be liable for any damages arising out of the use or inability to use the materials on Sellar''s platform."
    },
    {
      "section": 8,
      "heading": "Contact Information",
      "content": "If you have any questions about these Terms and Conditions, please contact us at support@sellar.app"
    }
  ]'::jsonb, 
  true
),
('privacy', 'Privacy Policy', '1.0',
  '[
    {
      "section": 1,
      "heading": "Information We Collect",
      "content": "We collect information you provide directly to us, such as when you create an account, make a purchase, or communicate with us."
    },
    {
      "section": 2,
      "heading": "How We Use Your Information",
      "content": "We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you."
    },
    {
      "section": 3,
      "heading": "Information Sharing",
      "content": "We do not share your personal information with third parties except as described in this privacy policy or with your consent."
    },
    {
      "section": 4,
      "heading": "Data Security",
      "content": "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction."
    },
    {
      "section": 5,
      "heading": "Your Rights",
      "content": "You have the right to access, update, or delete your personal information. You can do this through your account settings or by contacting us."
    },
    {
      "section": 6,
      "heading": "Cookies",
      "content": "We use cookies and similar tracking technologies to track activity on our service and hold certain information to improve and analyze our service."
    },
    {
      "section": 7,
      "heading": "Changes to This Policy",
      "content": "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page."
    },
    {
      "section": 8,
      "heading": "Contact Us",
      "content": "If you have any questions about this Privacy Policy, please contact us at privacy@sellar.app"
    }
  ]'::jsonb,
  true
),
('about', 'About Sellar', '1.0',
  '[
    {
      "section": 1,
      "heading": "Our Mission",
      "content": "Sellar is dedicated to creating a safe, reliable, and efficient marketplace where people can buy and sell items with confidence."
    },
    {
      "section": 2,
      "heading": "What We Do",
      "content": "We connect buyers and sellers through an intuitive mobile and web platform, facilitating thousands of transactions every day across Ghana."
    },
    {
      "section": 3,
      "heading": "Our Values",
      "content": "Trust, Transparency, and Community are at the heart of everything we do. We strive to build lasting relationships with our users."
    },
    {
      "section": 4,
      "heading": "Safety First",
      "content": "Your safety is our priority. We implement robust verification systems, secure payment processing, and comprehensive user guidelines."
    },
    {
      "section": 5,
      "heading": "Join Our Community",
      "content": "Whether you''re a buyer looking for great deals or a seller growing your business, Sellar is here to support your journey."
    },
    {
      "section": 6,
      "heading": "Contact Us",
      "content": "Have questions or feedback? Reach out to us at info@sellar.app or through our in-app support system."
    }
  ]'::jsonb,
  false
);

-- Grant access
GRANT SELECT ON public.legal_pages TO anon, authenticated;
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT USAGE ON SEQUENCE legal_pages_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE legal_acceptances_id_seq TO authenticated;

COMMENT ON TABLE public.legal_pages IS 'Stores legal documents (Terms, Privacy, etc.) with versioning';
COMMENT ON TABLE public.legal_acceptances IS 'Tracks user acceptances of legal documents';
COMMENT ON FUNCTION get_latest_legal_page IS 'Returns the latest active version of a legal page';
COMMENT ON FUNCTION has_accepted_latest_legal IS 'Checks if user has accepted the latest version of a legal document';

