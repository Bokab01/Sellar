import { supabase } from './supabase';

export interface VerificationServiceConfig {
  smsProvider?: 'twilio' | 'aws-sns' | 'local';
  emailProvider?: 'resend' | 'sendgrid' | 'aws-ses' | 'local';
  documentStorage?: 'supabase' | 'aws-s3' | 'cloudinary';
  encryptDocuments?: boolean;
  autoApproveEmail?: boolean;
  autoApprovePhone?: boolean;
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[];
}

export class VerificationService {
  private config: VerificationServiceConfig;

  constructor(config: VerificationServiceConfig = {}) {
    this.config = {
      smsProvider: 'local',
      emailProvider: 'local',
      documentStorage: 'supabase',
      encryptDocuments: false,
      autoApproveEmail: true,
      autoApprovePhone: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
      ...config,
    };
  }

  // Phone Verification Methods
  async sendSMSVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
    try {
      switch (this.config.smsProvider) {
        case 'twilio':
          return await this.sendTwilioSMS(phoneNumber, code);
        case 'aws-sns':
          return await this.sendAWSSMS(phoneNumber, code);
        default:
          // Local/development - just log the code
          console.log(`SMS Verification Code for ${phoneNumber}: ${code}`);
          return true;
      }
    } catch (error) {
      console.error('Error sending SMS verification code:', error);
      return false;
    }
  }

  private async sendTwilioSMS(phoneNumber: string, code: string): Promise<boolean> {
    // TODO: Implement Twilio SMS sending
    // This would require Twilio SDK and credentials
    console.log(`Twilio SMS to ${phoneNumber}: Your Sellar verification code is ${code}`);
    return true;
  }

  private async sendAWSSMS(phoneNumber: string, code: string): Promise<boolean> {
    // TODO: Implement AWS SNS SMS sending
    console.log(`AWS SNS SMS to ${phoneNumber}: Your Sellar verification code is ${code}`);
    return true;
  }

  // Email Verification Methods
  async sendVerificationEmail(email: string, token: string, userName?: string): Promise<boolean> {
    try {
      switch (this.config.emailProvider) {
        case 'resend':
          return await this.sendResendEmail(email, token, userName);
        case 'sendgrid':
          return await this.sendSendGridEmail(email, token, userName);
        case 'aws-ses':
          return await this.sendAWSEmail(email, token, userName);
        default:
          // Local/development - just log the link
          console.log(`Email Verification Link for ${email}: /verify-email?token=${token}`);
          return true;
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  private async sendResendEmail(email: string, token: string, userName?: string): Promise<boolean> {
    // TODO: Implement Resend email sending
    const verificationLink = `${process.env.EXPO_PUBLIC_APP_URL}/verify-email?token=${token}`;
    console.log(`Resend Email to ${email}: Verification link: ${verificationLink}`);
    return true;
  }

  private async sendSendGridEmail(email: string, token: string, userName?: string): Promise<boolean> {
    // TODO: Implement SendGrid email sending
    const verificationLink = `${process.env.EXPO_PUBLIC_APP_URL}/verify-email?token=${token}`;
    console.log(`SendGrid Email to ${email}: Verification link: ${verificationLink}`);
    return true;
  }

  private async sendAWSEmail(email: string, token: string, userName?: string): Promise<boolean> {
    // TODO: Implement AWS SES email sending
    const verificationLink = `${process.env.EXPO_PUBLIC_APP_URL}/verify-email?token=${token}`;
    console.log(`AWS SES Email to ${email}: Verification link: ${verificationLink}`);
    return true;
  }

  // Document Validation Methods
  validateDocumentFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize!) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${this.config.maxFileSize! / (1024 * 1024)}MB`,
      };
    }

    // Check file type
    if (!this.config.allowedFileTypes!.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${this.config.allowedFileTypes!.join(', ')}`,
      };
    }

    // Check if file is not empty
    if (file.size === 0) {
      return {
        isValid: false,
        error: 'File cannot be empty',
      };
    }

    return { isValid: true };
  }

  // Document Processing Methods
  async processDocument(file: File, documentType: string): Promise<{
    processedFile?: File;
    metadata?: Record<string, any>;
    error?: string;
  }> {
    try {
      // Basic validation
      const validation = this.validateDocumentFile(file);
      if (!validation.isValid) {
        return { error: validation.error };
      }

      // TODO: Add image processing (compression, format conversion, etc.)
      // TODO: Add OCR for text extraction from documents
      // TODO: Add document verification (check if ID is valid format, etc.)

      const metadata = {
        originalName: file.name,
        size: file.size,
        type: file.type,
        documentType,
        processedAt: new Date().toISOString(),
      };

      return {
        processedFile: file, // For now, return original file
        metadata,
      };
    } catch (error) {
      console.error('Error processing document:', error);
      return { error: 'Failed to process document' };
    }
  }

  // Trust Score Calculation
  calculateTrustScore(verificationData: {
    emailVerified: boolean;
    phoneVerified: boolean;
    identityVerified: boolean;
    businessVerified: boolean;
    accountAge?: number; // in days
    transactionCount?: number;
    reviewRating?: number;
  }): number {
    let score = 0;

    // Base score for having an account
    score += 10;

    // Email verification: +15 points
    if (verificationData.emailVerified) {
      score += 15;
    }

    // Phone verification: +20 points
    if (verificationData.phoneVerified) {
      score += 20;
    }

    // Identity verification: +35 points
    if (verificationData.identityVerified) {
      score += 35;
    }

    // Business verification: +20 points
    if (verificationData.businessVerified) {
      score += 20;
    }

    // Account age bonus (up to 10 points for accounts older than 30 days)
    if (verificationData.accountAge) {
      const ageBonus = Math.min(10, Math.floor(verificationData.accountAge / 30) * 2);
      score += ageBonus;
    }

    // Transaction history bonus (up to 10 points)
    if (verificationData.transactionCount) {
      const transactionBonus = Math.min(10, Math.floor(verificationData.transactionCount / 5));
      score += transactionBonus;
    }

    // Review rating bonus (up to 5 points for 5-star rating)
    if (verificationData.reviewRating) {
      const reviewBonus = Math.floor(verificationData.reviewRating);
      score += reviewBonus;
    }

    // Ensure score doesn't exceed 100
    return Math.min(100, score);
  }

  // Verification Badge Management
  getVerificationBadges(verificationData: {
    emailVerified: boolean;
    phoneVerified: boolean;
    identityVerified: boolean;
    businessVerified: boolean;
    trustScore: number;
  }): string[] {
    const badges: string[] = [];

    if (verificationData.emailVerified) {
      badges.push('email_verified');
    }

    if (verificationData.phoneVerified) {
      badges.push('phone_verified');
    }

    if (verificationData.identityVerified) {
      badges.push('identity_verified');
    }

    if (verificationData.businessVerified) {
      badges.push('business_verified');
    }

    // Trust level badges based on score
    if (verificationData.trustScore >= 90) {
      badges.push('trusted_seller');
    } else if (verificationData.trustScore >= 70) {
      badges.push('verified_seller');
    } else if (verificationData.trustScore >= 50) {
      badges.push('active_member');
    }

    return badges;
  }

  // Verification Level Calculation
  getVerificationLevel(verificationData: {
    emailVerified: boolean;
    phoneVerified: boolean;
    identityVerified: boolean;
    businessVerified: boolean;
  }): 'none' | 'phone' | 'email' | 'identity' | 'business' | 'premium' {
    if (verificationData.businessVerified && verificationData.identityVerified) {
      return 'premium';
    }
    
    if (verificationData.businessVerified) {
      return 'business';
    }
    
    if (verificationData.identityVerified) {
      return 'identity';
    }
    
    if (verificationData.emailVerified && verificationData.phoneVerified) {
      return 'email';
    }
    
    if (verificationData.phoneVerified) {
      return 'phone';
    }
    
    return 'none';
  }

  // Auto-approval Logic
  shouldAutoApprove(verificationType: string, submittedData: Record<string, any>): boolean {
    switch (verificationType) {
      case 'email':
        return this.config.autoApproveEmail || false;
      case 'phone':
        return this.config.autoApprovePhone || false;
      case 'identity':
        // Identity verification typically requires manual review
        return false;
      case 'business':
        // Business verification typically requires manual review
        return false;
      case 'address':
        // Address verification might be auto-approved based on document quality
        return false;
      default:
        return false;
    }
  }

  // Document Security
  async encryptDocument(file: File, encryptionKey: string): Promise<Blob> {
    // TODO: Implement document encryption using Web Crypto API
    // For now, return the original file
    return file;
  }

  async decryptDocument(encryptedBlob: Blob, encryptionKey: string): Promise<Blob> {
    // TODO: Implement document decryption using Web Crypto API
    // For now, return the original blob
    return encryptedBlob;
  }

  // Verification Analytics
  async getVerificationStats(userId?: string): Promise<{
    totalRequests: number;
    approvedRequests: number;
    pendingRequests: number;
    rejectedRequests: number;
    averageProcessingTime: number; // in hours
    verificationTypes: Record<string, number>;
  }> {
    try {
      let query = supabase
        .from('user_verification')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: requests, error } = await query;

      if (error) throw error;

      const stats = {
        totalRequests: requests?.length || 0,
        approvedRequests: requests?.filter(r => r.status === 'approved').length || 0,
        pendingRequests: requests?.filter(r => ['pending', 'in_review'].includes(r.status)).length || 0,
        rejectedRequests: requests?.filter(r => r.status === 'rejected').length || 0,
        averageProcessingTime: 0,
        verificationTypes: {} as Record<string, number>,
      };

      // Calculate average processing time
      const processedRequests = requests?.filter(r => r.reviewed_at) || [];
      if (processedRequests.length > 0) {
        const totalProcessingTime = processedRequests.reduce((total, request) => {
          const submitted = new Date(request.submitted_at).getTime();
          const reviewed = new Date(request.reviewed_at!).getTime();
          return total + (reviewed - submitted);
        }, 0);
        
        stats.averageProcessingTime = totalProcessingTime / processedRequests.length / (1000 * 60 * 60); // Convert to hours
      }

      // Count verification types
      requests?.forEach(request => {
        stats.verificationTypes[request.verification_type] = 
          (stats.verificationTypes[request.verification_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting verification stats:', error);
      throw error;
    }
  }

  // Notification Methods
  async sendVerificationStatusNotification(
    userId: string, 
    verificationType: string, 
    status: string, 
    notes?: string
  ): Promise<void> {
    try {
      // TODO: Integrate with push notification service
      console.log(`Notification to user ${userId}: ${verificationType} verification ${status}`);
      
      // You could integrate with your existing notification system here
      // await notificationService.send({
      //   userId,
      //   title: `Verification ${status}`,
      //   body: `Your ${verificationType} verification has been ${status}`,
      //   data: { verificationType, status, notes }
      // });
    } catch (error) {
      console.error('Error sending verification notification:', error);
    }
  }
}

// Export singleton instance
export const verificationService = new VerificationService({
  // Configure based on environment
  smsProvider: process.env.NODE_ENV === 'production' ? 'twilio' : 'local',
  emailProvider: process.env.NODE_ENV === 'production' ? 'resend' : 'local',
  documentStorage: 'supabase',
  encryptDocuments: process.env.NODE_ENV === 'production',
  autoApproveEmail: true,
  autoApprovePhone: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
});

// Utility functions
export const formatVerificationType = (type: string): string => {
  const typeMap: Record<string, string> = {
    phone: 'Phone Number',
    email: 'Email Address',
    identity: 'Identity Document',
    business: 'Business Registration',
    address: 'Address Proof',
  };
  return typeMap[type] || type;
};

export const formatDocumentType = (type: string): string => {
  const documentMap: Record<string, string> = {
    national_id: 'National ID',
    passport: 'Passport',
    drivers_license: "Driver's License",
    voters_id: 'Voter ID',
    business_registration: 'Business Registration Certificate',
    tax_certificate: 'Tax Identification Certificate',
    utility_bill: 'Utility Bill (Electricity, Water, Gas)',
    bank_statement: 'Bank Statement',
    selfie: 'Selfie Photo',
    selfie_with_id: 'Selfie with ID Document',
  };
  return documentMap[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const formatVerificationStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pending Review',
    in_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || status;
};

export const getVerificationStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: '#FFA500', // Orange
    in_review: '#2196F3', // Blue
    approved: '#4CAF50', // Green
    rejected: '#F44336', // Red
    expired: '#9E9E9E', // Gray
    cancelled: '#9E9E9E', // Gray
  };
  return colorMap[status] || '#9E9E9E';
};

export const getTrustScoreColor = (score: number): string => {
  if (score >= 90) return '#4CAF50'; // Green
  if (score >= 70) return '#8BC34A'; // Light Green
  if (score >= 50) return '#FFC107'; // Amber
  if (score >= 30) return '#FF9800'; // Orange
  return '#F44336'; // Red
};

export const getTrustScoreLabel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Very Poor';
};
