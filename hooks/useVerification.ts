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
  verification_level: 'none' | 'phone' | 'email' | 'identity' | 'business' | 'premium';
  verification_badges: string[];
  phone_verified: boolean;
  phone_verified_at?: string;
  email_verified: boolean;
  email_verified_at?: string;
  identity_verified: boolean;
  identity_verified_at?: string;
  business_verified: boolean;
  business_verified_at?: string;
  trust_score: number;
  trust_score_updated_at: string;
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
      // Sync email verification status from auth first
      await supabase.rpc('sync_email_verification_from_auth', {
        user_uuid: user.id
      });

      const { data, error: fetchError } = await supabase
        .from('user_verification')
        .select(`
          *,
          documents:verification_documents(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRequests(data || []);
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
      
      // Calculate expiry date based on template
      const { data: template } = await supabase
        .from('verification_templates')
        .select('expiry_days')
        .eq('verification_type', data.verification_type)
        .single();

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (template?.expiry_days || 30));

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

      // Add to history
      await supabase
        .from('verification_history')
        .insert({
          verification_id: request.id,
          user_id: user.id,
          action: 'submitted',
          actor_id: user.id,
          actor_type: 'user',
          details: { verification_type: data.verification_type },
          user_agent: userAgent,
        });

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

      // Save document record
      const { data: document, error: saveError } = await supabase
        .from('verification_documents')
        .insert({
          verification_id: verificationId,
          user_id: user.id,
          document_type: documentType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Add to history
      await supabase
        .from('verification_history')
        .insert({
          verification_id: verificationId,
          user_id: user.id,
          action: 'document_uploaded',
          actor_id: user.id,
          actor_type: 'user',
          details: { document_type: documentType, file_name: file.name },
        });

      return document as VerificationDocument;
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
      // Get document info first
      const { data: document, error: fetchError } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const fileName = document.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('verification-documents')
          .remove([fileName]);
      }

      // Delete document record
      const { error: deleteError } = await supabase
        .from('verification_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Add to history
      await supabase
        .from('verification_history')
        .insert({
          verification_id: document.verification_id,
          user_id: user.id,
          action: 'document_removed',
          actor_id: user.id,
          actor_type: 'user',
          details: { document_type: document.document_type, file_name: document.file_name },
        });

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

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('verification_templates')
        .select('*')
        .eq('is_active', true)
        .order('verification_type');

      if (fetchError) throw fetchError;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching verification templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch verification templates');
    } finally {
      setLoading(false);
    }
  };

  const getTemplate = async (verificationType: string) => {
    try {
      const { data, error } = await supabase
        .from('verification_templates')
        .select('*')
        .eq('verification_type', verificationType)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as VerificationTemplate;
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
      // First sync email verification status from auth if this is the current user
      if (targetUserId === user?.id) {
        await supabase.rpc('sync_email_verification_from_auth', {
          user_uuid: targetUserId
        });
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          is_verified,
          verification_level,
          verification_badges,
          phone_verified,
          phone_verified_at,
          email_verified,
          email_verified_at,
          identity_verified,
          identity_verified_at,
          business_verified,
          business_verified_at,
          trust_score,
          trust_score_updated_at
        `)
        .eq('id', targetUserId)
        .single();

      if (fetchError) throw fetchError;
      setStatus(data as UserVerificationStatus);
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
      let query = supabase
        .from('verification_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (verificationId) {
        query = query.eq('verification_id', verificationId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setHistory(data || []);
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
        // Email is already verified through auth, sync the status
        await supabase.rpc('sync_email_verification_from_auth', {
          user_uuid: user.id
        });
        throw new Error('Email is already verified through your account signup');
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
