import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

// Types for verification system
export interface VerificationRequest {
  id: string;
  user_id: string;
  verification_type: 'phone' | 'email' | 'identity' | 'business' | 'address';
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  submitted_data: Record<string, any>;
  documents: VerificationDocument[];
  verification_code?: string;
  verification_token?: string;
  reviewer_id?: string;
  reviewer_notes?: string;
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  approved_at?: string;
  expires_at?: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface VerificationDocument {
  id: string;
  verification_id: string;
  user_id: string;
  document_type: 'national_id' | 'passport' | 'drivers_license' | 'voters_id' | 
                 'business_registration' | 'tax_certificate' | 'utility_bill' | 
                 'bank_statement' | 'selfie' | 'selfie_with_id';
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  is_encrypted?: boolean;
  encryption_key?: string;
  uploaded_at: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationTemplate {
  id: string;
  verification_type: string;
  title: string;
  description?: string;
  instructions: string[];
  required_documents: string[];
  optional_documents: string[];
  required_fields: string[];
  auto_approve: boolean;
  review_required: boolean;
  expiry_days: number;
  max_attempts: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VerificationHistory {
  id: string;
  verification_id: string;
  user_id: string;
  action: 'submitted' | 'updated' | 'reviewed' | 'approved' | 'rejected' | 
          'expired' | 'cancelled' | 'document_uploaded' | 'document_removed';
  actor_id?: string;
  actor_type: 'user' | 'admin' | 'system';
  details: Record<string, any>;
  notes?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface UserVerificationStatus {
  is_verified: boolean;
  verification_status: string; // 'unverified' | 'verified' | 'pending' etc.
  // Derived fields (calculated from user_verification records)
  verification_level?: 'none' | 'phone' | 'email' | 'identity' | 'business' | 'premium';
  verification_badges?: string[];
  phone_verified?: boolean;
  phone_verified_at?: string;
  email_verified?: boolean;
  email_verified_at?: string;
  identity_verified?: boolean;
  identity_verified_at?: string;
  business_verified?: boolean;
  business_verified_at?: string;
  trust_score?: number;
  trust_score_updated_at?: string;
}

// Hook for managing user verification requests
export function useVerificationRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_verification')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      let requests = data || [];

      // Check if user has verified email through auth but no email verification record
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const hasEmailRecord = requests.some(r => r.verification_type === 'email');
      
      if (authUser?.email_confirmed_at && !hasEmailRecord) {
        // Create a virtual email verification record to show in the UI
        const emailVerificationRecord = {
          id: 'auth-email-verification',
          user_id: user.id,
          verification_type: 'email' as const,
          status: 'approved' as const,
          submitted_at: authUser.email_confirmed_at,
          reviewed_at: authUser.email_confirmed_at,
          reviewer_id: null,
          review_notes: 'Email verified through signup process',
          rejection_reason: null,
          documents: [],
          created_at: authUser.email_confirmed_at,
          updated_at: authUser.email_confirmed_at,
        };
        
        // Add the virtual record to the beginning of the array
        requests = [emailVerificationRecord, ...requests];
      }

      setRequests(requests);
    } catch (err) {
      console.error('Error fetching verification requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch verification requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
  };
}

// Hook for creating verification requests
export function useCreateVerificationRequest() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = async (data: {
    verification_type: VerificationRequest['verification_type'];
    submitted_data: Record<string, any>;
    device_info?: Record<string, any>;
  }) => {
    if (!user) {
      throw new Error('User must be authenticated to create verification requests');
    }

    setLoading(true);
    setError(null);

    try {
      // Get user agent and IP (IP will be handled by RLS/triggers)
      const userAgent = navigator.userAgent;
      
      // Calculate expiry date based on hardcoded template defaults
      const templateDefaults: Record<string, number> = {
        phone: 1,
        email: 1,
        identity: 30,
        business: 30,
        address: 30,
      };

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (templateDefaults[data.verification_type] || 30));

      // Create the verification request
      const { data: request, error: createError } = await supabase
        .from('user_verification')
        .insert({
          user_id: user.id,
          verification_type: data.verification_type,
          submitted_data: data.submitted_data,
          user_agent: userAgent,
          device_info: data.device_info || {},
          expires_at: expiryDate.toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;

      // Note: History tracking removed as verification_history table doesn't exist in current schema

      return request as VerificationRequest;
    } catch (err) {
      console.error('Error creating verification request:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create verification request';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createRequest,
    loading,
    error,
  };
}

// Hook for uploading verification documents
export function useVerificationDocuments() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = async (
    verificationId: string,
    file: File,
    documentType: VerificationDocument['document_type']
  ) => {
    if (!user) {
      throw new Error('User must be authenticated to upload documents');
    }

    setLoading(true);
    setError(null);

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${verificationId}/${documentType}_${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      // Create document record to add to JSONB array
      const documentRecord = {
        id: crypto.randomUUID(),
        document_type: documentType,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        status: 'pending',
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Get current verification record to update documents array
      const { data: currentVerification, error: fetchError } = await supabase
        .from('user_verification')
        .select('documents')
        .eq('id', verificationId)
        .single();

      if (fetchError) throw fetchError;

      // Update documents array
      const currentDocuments = Array.isArray(currentVerification.documents) ? currentVerification.documents : [];
      const updatedDocuments = [...currentDocuments, documentRecord];

      // Save updated documents array
      const { error: saveError } = await supabase
        .from('user_verification')
        .update({ 
          documents: updatedDocuments,
          updated_at: new Date().toISOString()
        })
        .eq('id', verificationId);

      if (saveError) throw saveError;

      return documentRecord as VerificationDocument;
    } catch (err) {
      console.error('Error uploading verification document:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeDocument = async (documentId: string) => {
    if (!user) {
      throw new Error('User must be authenticated to remove documents');
    }

    setLoading(true);
    setError(null);

    try {
      // Find the verification record and document
      const { data: verifications, error: fetchError } = await supabase
        .from('user_verification')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      let targetVerification = null;
      let targetDocument = null;

      // Find the document in the JSONB arrays
      for (const verification of verifications) {
        if (Array.isArray(verification.documents)) {
          const foundDoc = verification.documents.find((doc: any) => doc.id === documentId);
          if (foundDoc) {
            targetVerification = verification;
            targetDocument = foundDoc;
            break;
          }
        }
      }

      if (!targetDocument || !targetVerification) {
        throw new Error('Document not found');
      }

      // Delete from storage
      const fileName = targetDocument.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('verification-documents')
          .remove([fileName]);
      }

      // Remove document from JSONB array
      const updatedDocuments = targetVerification.documents.filter((doc: any) => doc.id !== documentId);
      
      const { error: updateError } = await supabase
        .from('user_verification')
        .update({ 
          documents: updatedDocuments,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetVerification.id);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error('Error removing verification document:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove document';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadDocument,
    removeDocument,
    loading,
    error,
  };
}

// Hook for verification templates
export function useVerificationTemplates() {
  const [templates, setTemplates] = useState<VerificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded templates since verification_templates table doesn't exist
  const defaultTemplates: VerificationTemplate[] = [
    {
      id: 'phone-template',
      verification_type: 'phone',
      title: 'Phone Verification',
      description: 'Verify your phone number to increase trust',
      instructions: ['Enter your phone number', 'Receive SMS code', 'Enter verification code'],
      required_documents: [],
      optional_documents: [],
      required_fields: ['phone_number'],
      auto_approve: false,
      review_required: false,
      expiry_days: 1,
      max_attempts: 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'email-template',
      verification_type: 'email',
      title: 'Email Verification',
      description: 'Verify your email address',
      instructions: ['Enter your email address', 'Check your email', 'Click verification link'],
      required_documents: [],
      optional_documents: [],
      required_fields: ['email_address'],
      auto_approve: false,
      review_required: false,
      expiry_days: 1,
      max_attempts: 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'identity-template',
      verification_type: 'identity',
      title: 'Identity Verification',
      description: 'Verify your identity with government ID',
      instructions: ['Upload government ID', 'Take selfie', 'Wait for review'],
      required_documents: ['national_id', 'selfie'],
      optional_documents: ['passport', 'drivers_license'],
      required_fields: ['full_name', 'date_of_birth'],
      auto_approve: false,
      review_required: true,
      expiry_days: 30,
      max_attempts: 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'business-template',
      verification_type: 'business',
      title: 'Business Verification',
      description: 'Verify your business registration',
      instructions: ['Upload business registration', 'Provide business details', 'Wait for review'],
      required_documents: ['business_registration'],
      optional_documents: ['tax_certificate'],
      required_fields: ['business_name', 'business_type', 'registration_number'],
      auto_approve: false,
      review_required: true,
      expiry_days: 30,
      max_attempts: 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'address-template',
      verification_type: 'address',
      title: 'Address Verification',
      description: 'Verify your residential address',
      instructions: ['Upload utility bill or bank statement', 'Ensure address is visible', 'Wait for review'],
      required_documents: ['utility_bill'],
      optional_documents: ['bank_statement'],
      required_fields: ['street_address', 'city', 'postal_code'],
      auto_approve: false,
      review_required: true,
      expiry_days: 30,
      max_attempts: 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      // Return hardcoded templates since verification_templates table doesn't exist
      setTemplates(defaultTemplates);
    } catch (err) {
      console.error('Error fetching verification templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch verification templates');
    } finally {
      setLoading(false);
    }
  };

  const getTemplate = async (verificationType: string) => {
    try {
      const template = defaultTemplates.find(t => t.verification_type === verificationType);
      if (!template) {
        throw new Error(`Template not found for verification type: ${verificationType}`);
      }
      return template;
    } catch (err) {
      console.error('Error fetching verification template:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    error,
    getTemplate,
    refetch: fetchTemplates,
  };
}

// Hook for user verification status
export function useUserVerificationStatus(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [status, setStatus] = useState<UserVerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!targetUserId) return;

    setLoading(true);
    setError(null);

    try {
      // Note: Email verification sync removed as function doesn't exist

      // Get basic profile verification info
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          is_verified,
          verification_status
        `)
        .eq('id', targetUserId)
        .single();

      if (fetchError) throw fetchError;

      // Get detailed verification records
      const { data: verificationRecords } = await supabase
        .from('user_verification')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'approved');

      // Check if user's email is verified through Supabase Auth
      let authEmailVerified = false;
      let authEmailVerifiedAt = null;
      
      if (targetUserId === user?.id) {
        // For current user, check auth status
        const { data: { user: authUser } } = await supabase.auth.getUser();
        authEmailVerified = !!authUser?.email_confirmed_at;
        authEmailVerifiedAt = authUser?.email_confirmed_at;
      } else {
        // For other users, assume email is verified if they can log in
        // (This is a reasonable assumption since Supabase requires email verification for login)
        authEmailVerified = true;
        authEmailVerifiedAt = new Date().toISOString(); // Use current time as fallback
      }

      // Calculate derived verification status
      const verifications = verificationRecords || [];
      const phoneVerified = verifications.some(v => v.verification_type === 'phone');
      const emailVerifiedFromRecords = verifications.some(v => v.verification_type === 'email');
      const emailVerified = authEmailVerified || emailVerifiedFromRecords; // Email is verified if auth says so OR if there's a verification record
      const identityVerified = verifications.some(v => v.verification_type === 'identity');
      const businessVerified = verifications.some(v => v.verification_type === 'business');

      // Determine verification level
      let verificationLevel: UserVerificationStatus['verification_level'] = 'none';
      if (businessVerified) verificationLevel = 'business';
      else if (identityVerified) verificationLevel = 'identity';
      else if (emailVerified) verificationLevel = 'email';
      else if (phoneVerified) verificationLevel = 'phone';

      // Create verification badges
      const badges: string[] = [];
      if (phoneVerified) badges.push('phone');
      if (emailVerified) badges.push('email');
      if (identityVerified) badges.push('identity');
      if (businessVerified) badges.push('business');

      // Build complete status object
      const status: UserVerificationStatus = {
        is_verified: profileData.is_verified,
        verification_status: profileData.verification_status,
        verification_level: verificationLevel,
        verification_badges: badges,
        phone_verified: phoneVerified,
        phone_verified_at: verifications.find(v => v.verification_type === 'phone')?.reviewed_at,
        email_verified: emailVerified,
        email_verified_at: authEmailVerifiedAt || verifications.find(v => v.verification_type === 'email')?.reviewed_at,
        identity_verified: identityVerified,
        identity_verified_at: verifications.find(v => v.verification_type === 'identity')?.reviewed_at,
        business_verified: businessVerified,
        business_verified_at: verifications.find(v => v.verification_type === 'business')?.reviewed_at,
        trust_score: badges.length * 25, // Simple trust score calculation
        trust_score_updated_at: new Date().toISOString(),
      };

      setStatus(status);
    } catch (err) {
      console.error('Error fetching verification status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [targetUserId]);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
  };
}

// Hook for verification history
export function useVerificationHistory(verificationId?: string) {
  const { user } = useAuth();
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Note: verification_history table doesn't exist in current schema
      // Return empty array for now
      setHistory([]);
    } catch (err) {
      console.error('Error fetching verification history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch verification history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, verificationId]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
  };
}

// Hook for phone verification
export function usePhoneVerification() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendVerificationCode = async (phoneNumber: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Create or update verification request
      const { data: request, error: createError } = await supabase
        .from('user_verification')
        .upsert({
          user_id: user.id,
          verification_type: 'phone',
          status: 'pending',
          submitted_data: { phone_number: phoneNumber },
          verification_code: code,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        })
        .select()
        .single();

      if (createError) throw createError;

      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      // For now, we'll just log the code (in production, send via SMS)
      console.log(`Verification code for ${phoneNumber}: ${code}`);

      return request;
    } catch (err) {
      console.error('Error sending verification code:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Find pending phone verification
      const { data: request, error: fetchError } = await supabase
        .from('user_verification')
        .select('*')
        .eq('user_id', user.id)
        .eq('verification_type', 'phone')
        .eq('status', 'pending')
        .single();

      if (fetchError) throw fetchError;

      // Check if code matches and hasn't expired
      if (request.verification_code !== code) {
        throw new Error('Invalid verification code');
      }

      if (new Date() > new Date(request.expires_at)) {
        throw new Error('Verification code has expired');
      }

      // Approve the verification
      const { error: approveError } = await supabase
        .rpc('approve_verification', {
          verification_uuid: request.id,
          reviewer_uuid: null,
          notes: 'Auto-approved via SMS verification'
        });

      if (approveError) throw approveError;

      return true;
    } catch (err) {
      console.error('Error verifying code:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify code';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    sendVerificationCode,
    verifyCode,
    loading,
    error,
  };
}

// Hook for email verification
export function useEmailVerification() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendVerificationEmail = async (email: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // First check if email is already verified through Supabase Auth
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user?.email_confirmed_at) {
        // Email is already verified through auth
        throw new Error('Your email is already verified! You verified it when you signed up for your account.');
      }

      // Generate verification token
      const token = crypto.randomUUID();
      
      // Create or update verification request
      const { data: request, error: createError } = await supabase
        .from('user_verification')
        .upsert({
          user_id: user.id,
          verification_type: 'email',
          status: 'pending',
          submitted_data: { email_address: email },
          verification_token: token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        })
        .select()
        .single();

      if (createError) throw createError;

      // TODO: Send verification email
      // For now, we'll just log the token (in production, send via email service)
      console.log(`Verification link for ${email}: /verify-email?token=${token}`);

      return request;
    } catch (err) {
      console.error('Error sending verification email:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification email';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      // Find pending email verification
      const { data: request, error: fetchError } = await supabase
        .from('user_verification')
        .select('*')
        .eq('verification_token', token)
        .eq('verification_type', 'email')
        .eq('status', 'pending')
        .single();

      if (fetchError) throw fetchError;

      // Check if token hasn't expired
      if (new Date() > new Date(request.expires_at)) {
        throw new Error('Verification link has expired');
      }

      // Approve the verification
      const { error: approveError } = await supabase
        .rpc('approve_verification', {
          verification_uuid: request.id,
          reviewer_uuid: null,
          notes: 'Auto-approved via email verification'
        });

      if (approveError) throw approveError;

      return true;
    } catch (err) {
      console.error('Error verifying token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify email';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    sendVerificationEmail,
    verifyToken,
    loading,
    error,
  };
}
