/**
 * Data Protection Service
 * Handles data encryption, anonymization, and GDPR compliance
 */

import CryptoJS from 'react-native-crypto-js';
import { supabase } from './supabase';
import { generateSecureToken } from '../utils/security';

interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  iterations: number;
}

interface DataExportRequest {
  userId: string;
  requestedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
}

interface DataDeletionRequest {
  userId: string;
  requestedAt: Date;
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  reason?: string;
}

class DataProtectionService {
  private encryptionConfig: EncryptionConfig = {
    algorithm: 'AES',
    keySize: 256,
    iterations: 10000,
  };

  private encryptionKey: string;

  constructor() {
    // In production, this should come from secure environment variables
    this.encryptionKey = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string, customKey?: string): string {
    try {
      const key = customKey || this.encryptionKey;
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string, customKey?: string): string {
    try {
      const key = customKey || this.encryptionKey;
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hashData(data: string, salt?: string): string {
    try {
      const saltToUse = salt || generateSecureToken(16);
      const hashed = CryptoJS.PBKDF2(data, saltToUse, {
        keySize: this.encryptionConfig.keySize / 32,
        iterations: this.encryptionConfig.iterations,
      });
      return saltToUse + ':' + hashed.toString();
    } catch (error) {
      console.error('Hashing error:', error);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const newHash = CryptoJS.PBKDF2(data, salt, {
        keySize: this.encryptionConfig.keySize / 32,
        iterations: this.encryptionConfig.iterations,
      });
      return hash === newHash.toString();
    } catch (error) {
      console.error('Hash verification error:', error);
      return false;
    }
  }

  /**
   * Anonymize personal data
   */
  anonymizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return this.anonymizeValue(data);
    }

    const anonymized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        anonymized[key] = this.anonymizeValue(value);
      } else if (typeof value === 'object' && value !== null) {
        anonymized[key] = this.anonymizeData(value);
      } else {
        anonymized[key] = value;
      }
    }

    return anonymized;
  }

  /**
   * Check if a field contains sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'email', 'phone', 'first_name', 'last_name', 'full_name',
      'address', 'location', 'ip_address', 'device_id', 'user_agent',
      'credit_card', 'bank_account', 'ssn', 'passport', 'license',
    ];

    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * Anonymize a single value
   */
  private anonymizeValue(value: any): any {
    if (typeof value === 'string') {
      if (value.includes('@')) {
        // Email anonymization
        const [local, domain] = value.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      } else if (/^\+?\d{10,}$/.test(value)) {
        // Phone number anonymization
        return value.substring(0, 4) + '***' + value.substring(value.length - 2);
      } else if (value.length > 3) {
        // General string anonymization
        return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
      }
    }
    
    return '***';
  }

  /**
   * Request data export (GDPR Article 20)
   */
  async requestDataExport(userId: string): Promise<{
    success: boolean;
    requestId?: string;
    error?: string;
  }> {
    try {
      // Check if there's already a pending request
      const { data: existingRequest } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        return {
          success: false,
          error: 'A data export request is already pending'
        };
      }

      // Create new export request
      const { data, error } = await supabase
        .from('data_export_requests')
        .insert({
          user_id: userId,
          status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating data export request:', error);
        return { success: false, error: 'Failed to create export request' };
      }

      // Trigger background job to process the export
      await this.scheduleDataExport(data.id);

      return { success: true, requestId: data.id };

    } catch (error) {
      console.error('Data export request error:', error);
      return { success: false, error: 'Failed to request data export' };
    }
  }

  /**
   * Process data export
   */
  async processDataExport(requestId: string): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from('data_export_requests')
        .update({ status: 'processing' })
        .eq('id', requestId);

      // Get the request details
      const { data: request } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) {
        throw new Error('Export request not found');
      }

      // Collect all user data
      const userData = await this.collectUserData(request.user_id);

      // Generate export file (in production, this would be a secure file)
      const exportData = {
        exportedAt: new Date().toISOString(),
        userId: request.user_id,
        data: userData,
      };

      // In production, you would:
      // 1. Create a secure file (PDF, JSON, etc.)
      // 2. Upload to secure storage
      // 3. Generate a time-limited download URL
      // 4. Send email notification to user

      const downloadUrl = await this.createSecureDownloadUrl(exportData);

      // Update request with download URL
      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          download_url: downloadUrl,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .eq('id', requestId);

    } catch (error) {
      console.error('Data export processing error:', error);
      
      // Update status to failed
      await supabase
        .from('data_export_requests')
        .update({ status: 'failed' })
        .eq('id', requestId);
    }
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string): Promise<any> {
    try {
      // Collect data from all relevant tables
      const [
        profile,
        listings,
        messages,
        posts,
        comments,
        transactions,
        notifications,
        settings,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('listings').select('*').eq('user_id', userId),
        supabase.from('messages').select('*').eq('sender_id', userId),
        supabase.from('posts').select('*').eq('user_id', userId),
        supabase.from('comments').select('*').eq('user_id', userId),
        supabase.from('credit_transactions').select('*').eq('user_id', userId),
        supabase.from('notifications').select('*').eq('user_id', userId),
        supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      ]);

      return {
        profile: profile.data,
        listings: listings.data || [],
        messages: messages.data || [],
        posts: posts.data || [],
        comments: comments.data || [],
        transactions: transactions.data || [],
        notifications: notifications.data || [],
        settings: settings.data,
      };

    } catch (error) {
      console.error('Error collecting user data:', error);
      throw error;
    }
  }

  /**
   * Create secure download URL
   */
  private async createSecureDownloadUrl(exportData: any): Promise<string> {
    // In production, this would create a secure, time-limited URL
    // For demo purposes, we'll return a placeholder
    return `https://secure-downloads.example.com/export/${generateSecureToken(32)}`;
  }

  /**
   * Schedule data export processing
   */
  private async scheduleDataExport(requestId: string): Promise<void> {
    // In production, this would queue a background job
    // For demo purposes, we'll process it immediately
    setTimeout(() => {
      this.processDataExport(requestId);
    }, 1000);
  }

  /**
   * Request account deletion (GDPR Article 17 - Right to be forgotten)
   */
  async requestAccountDeletion(userId: string, reason?: string): Promise<{
    success: boolean;
    scheduledFor?: Date;
    error?: string;
  }> {
    try {
      // Check if there's already a pending deletion request
      const { data: existingRequest } = await supabase
        .from('data_deletion_requests')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'processing'])
        .single();

      if (existingRequest) {
        return {
          success: false,
          error: 'An account deletion request is already pending'
        };
      }

      // Schedule deletion for 30 days from now (grace period)
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 30);

      // Create deletion request
      const { data, error } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: userId,
          status: 'pending',
          requested_at: new Date().toISOString(),
          scheduled_for: scheduledFor.toISOString(),
          reason,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating deletion request:', error);
        return { success: false, error: 'Failed to create deletion request' };
      }

      return { success: true, scheduledFor };

    } catch (error) {
      console.error('Account deletion request error:', error);
      return { success: false, error: 'Failed to request account deletion' };
    }
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from('data_deletion_requests')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error cancelling deletion request:', error);
        return { success: false, error: 'Failed to cancel deletion request' };
      }

      return { success: true };

    } catch (error) {
      console.error('Cancel deletion error:', error);
      return { success: false, error: 'Failed to cancel deletion request' };
    }
  }

  /**
   * Process account deletion
   */
  async processAccountDeletion(userId: string): Promise<void> {
    try {
      console.log(`Processing account deletion for user: ${userId}`);

      // 1. Anonymize data that needs to be retained for legal/business reasons
      await this.anonymizeRetainedData(userId);

      // 2. Delete user data from all tables
      await this.deleteUserData(userId);

      // 3. Delete the user account from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.error('Error deleting user from auth:', authError);
      }

      // 4. Update deletion request status
      await supabase
        .from('data_deletion_requests')
        .update({ status: 'completed' })
        .eq('user_id', userId);

      console.log(`Account deletion completed for user: ${userId}`);

    } catch (error) {
      console.error('Account deletion processing error:', error);
      
      // Update status to failed
      await supabase
        .from('data_deletion_requests')
        .update({ status: 'failed' })
        .eq('user_id', userId);
    }
  }

  /**
   * Anonymize data that must be retained
   */
  private async anonymizeRetainedData(userId: string): Promise<void> {
    try {
      // Anonymize profile data
      await supabase
        .from('profiles')
        .update({
          first_name: 'Deleted',
          last_name: 'User',
          email: `deleted-${generateSecureToken(8)}@example.com`,
          phone: null,
          avatar_url: null,
          bio: null,
        })
        .eq('id', userId);

      // Anonymize messages (keep for conversation continuity)
      await supabase
        .from('messages')
        .update({
          content: '[Message deleted by user]',
          attachments: null,
        })
        .eq('sender_id', userId);

      // Anonymize posts and comments
      await supabase
        .from('posts')
        .update({
          title: '[Post deleted by user]',
          content: '[Content deleted by user]',
          images: null,
        })
        .eq('user_id', userId);

      await supabase
        .from('comments')
        .update({
          content: '[Comment deleted by user]',
        })
        .eq('user_id', userId);

    } catch (error) {
      console.error('Error anonymizing retained data:', error);
      throw error;
    }
  }

  /**
   * Delete user data from all tables
   */
  private async deleteUserData(userId: string): Promise<void> {
    try {
      // Delete from tables with CASCADE relationships
      const tablesToDelete = [
        'user_settings',
        'device_tokens',
        'security_events',
        'notifications',
        'credit_transactions',
        'credit_purchases',
        'user_subscriptions',
        'device_tokens',
        'blocked_users',
        'follows',
        'likes',
        'reports',
      ];

      for (const table of tablesToDelete) {
        await supabase
          .from(table)
          .delete()
          .eq('user_id', userId);
      }

      // Delete listings (will cascade to related data)
      await supabase
        .from('listings')
        .delete()
        .eq('user_id', userId);

    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Get data retention policy
   */
  getDataRetentionPolicy(): {
    [dataType: string]: {
      retentionPeriod: string;
      reason: string;
    };
  } {
    return {
      'Profile Data': {
        retentionPeriod: 'Until account deletion',
        reason: 'Account functionality'
      },
      'Messages': {
        retentionPeriod: '7 years after deletion (anonymized)',
        reason: 'Legal compliance and dispute resolution'
      },
      'Transaction Data': {
        retentionPeriod: '7 years',
        reason: 'Financial regulations and tax compliance'
      },
      'Security Logs': {
        retentionPeriod: '2 years',
        reason: 'Security monitoring and fraud prevention'
      },
      'Analytics Data': {
        retentionPeriod: '2 years (anonymized)',
        reason: 'Service improvement and business analytics'
      },
    };
  }

  /**
   * Check data processing consent
   */
  async checkDataProcessingConsent(userId: string): Promise<{
    hasConsent: boolean;
    consentDate?: Date;
    purposes: string[];
  }> {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('data_processing_consent, marketing_consent, analytics_consent, updated_at')
        .eq('user_id', userId)
        .single();

      if (!data) {
        return { hasConsent: false, purposes: [] };
      }

      const purposes: string[] = [];
      if (data.data_processing_consent) purposes.push('Core functionality');
      if (data.marketing_consent) purposes.push('Marketing communications');
      if (data.analytics_consent) purposes.push('Analytics and improvement');

      return {
        hasConsent: data.data_processing_consent || false,
        consentDate: data.updated_at ? new Date(data.updated_at) : undefined,
        purposes,
      };

    } catch (error) {
      console.error('Error checking consent:', error);
      return { hasConsent: false, purposes: [] };
    }
  }
}

export const dataProtectionService = new DataProtectionService();
