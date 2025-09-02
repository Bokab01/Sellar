/**
 * Content Moderation Service
 * Automated and manual content moderation system
 */

import { supabase } from './supabase';
import { ContentModerator } from '../utils/security';

export interface ModerationResult {
  isApproved: boolean;
  confidence: number;
  flags: ModerationFlag[];
  requiresManualReview: boolean;
  suggestedAction: 'approve' | 'reject' | 'review' | 'flag';
}

export interface ModerationFlag {
  type: 'profanity' | 'spam' | 'inappropriate' | 'suspicious_links' | 'personal_info' | 'copyright' | 'harassment' | 'fake';
  confidence: number;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ContentItem {
  id: string;
  type: 'listing' | 'post' | 'comment' | 'message' | 'profile';
  content: string;
  images?: string[];
  userId: string;
  metadata?: any;
}

export interface ModerationQueueItem {
  id: string;
  contentId: string;
  contentType: string;
  userId: string;
  content: string;
  images: string[];
  flags: ModerationFlag[];
  priority: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  autoFlagged: boolean;
  manualReviewRequired: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
}

class ContentModerationService {
  private profanityWords: Set<string>;
  private spamPatterns: RegExp[];
  private suspiciousPatterns: RegExp[];

  constructor() {
    // Initialize moderation patterns
    this.profanityWords = new Set([
      // Basic profanity list - in production, use a comprehensive database
      'damn', 'hell', 'shit', 'fuck', 'bitch', 'ass', 'bastard', 'crap',
      'idiot', 'stupid', 'moron', 'dumb', 'retard', 'gay', 'fag',
      // Add more words as needed
    ]);

    this.spamPatterns = [
      /\b(buy now|click here|limited time|act now|free money|make money fast)\b/gi,
      /\b(viagra|cialis|pharmacy|casino|lottery|winner)\b/gi,
      /\b(urgent|congratulations|selected|winner|prize)\b/gi,
      /\$\d+|\d+\$|USD\d+|\d+USD/gi,
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card patterns
      /\b(whatsapp|telegram|signal)\s*:?\s*\+?\d{10,}/gi, // Contact sharing
    ];

    this.suspiciousPatterns = [
      /\b(fake|replica|copy|stolen|illegal|drugs|weapon)\b/gi,
      /\b(meet me|private message|contact me outside)\b/gi,
      /\b(bitcoin|crypto|investment|trading|forex)\b/gi,
      /\b(adult|escort|massage|dating)\b/gi,
    ];
  }

  /**
   * Moderate content automatically
   */
  async moderateContent(content: ContentItem): Promise<ModerationResult> {
    const flags: ModerationFlag[] = [];
    let totalConfidence = 0;
    let requiresManualReview = false;

    try {
      // 1. Profanity detection
      const profanityResult = this.detectProfanity(content.content);
      if (profanityResult.detected) {
        flags.push({
          type: 'profanity',
          confidence: profanityResult.confidence,
          details: `Contains profanity: ${profanityResult.words.join(', ')}`,
          severity: profanityResult.severity,
        });
        totalConfidence += profanityResult.confidence;
      }

      // 2. Spam detection
      const spamResult = this.detectSpam(content.content);
      if (spamResult.detected) {
        flags.push({
          type: 'spam',
          confidence: spamResult.confidence,
          details: spamResult.reasons.join(', '),
          severity: spamResult.severity,
        });
        totalConfidence += spamResult.confidence;
      }

      // 3. Inappropriate content detection
      const inappropriateResult = this.detectInappropriateContent(content.content);
      if (inappropriateResult.detected) {
        flags.push({
          type: 'inappropriate',
          confidence: inappropriateResult.confidence,
          details: inappropriateResult.reasons.join(', '),
          severity: inappropriateResult.severity,
        });
        totalConfidence += inappropriateResult.confidence;
      }

      // 4. Personal information detection
      const personalInfoResult = this.detectPersonalInformation(content.content);
      if (personalInfoResult.detected) {
        flags.push({
          type: 'personal_info',
          confidence: personalInfoResult.confidence,
          details: personalInfoResult.types.join(', '),
          severity: 'medium',
        });
        totalConfidence += personalInfoResult.confidence;
      }

      // 5. Suspicious links detection
      const linksResult = this.detectSuspiciousLinks(content.content);
      if (linksResult.detected) {
        flags.push({
          type: 'suspicious_links',
          confidence: linksResult.confidence,
          details: `Suspicious links: ${linksResult.links.join(', ')}`,
          severity: 'high',
        });
        totalConfidence += linksResult.confidence;
        requiresManualReview = true;
      }

      // 6. Image moderation (if images present)
      if (content.images && content.images.length > 0) {
        const imageResult = await this.moderateImages(content.images);
        if (imageResult.flagged) {
          flags.push({
            type: 'inappropriate',
            confidence: imageResult.confidence,
            details: 'Inappropriate image content detected',
            severity: imageResult.severity,
          });
          totalConfidence += imageResult.confidence;
          requiresManualReview = true;
        }
      }

      // Calculate overall confidence and determine action
      const averageConfidence = flags.length > 0 ? totalConfidence / flags.length : 0;
      const highSeverityFlags = flags.filter(flag => flag.severity === 'high' || flag.severity === 'critical');
      
      // Determine if manual review is required
      if (highSeverityFlags.length > 0 || averageConfidence > 0.7) {
        requiresManualReview = true;
      }

      // Determine suggested action
      let suggestedAction: 'approve' | 'reject' | 'review' | 'flag' = 'approve';
      
      if (flags.length === 0) {
        suggestedAction = 'approve';
      } else if (requiresManualReview) {
        suggestedAction = 'review';
      } else if (averageConfidence > 0.8) {
        suggestedAction = 'reject';
      } else if (averageConfidence > 0.5) {
        suggestedAction = 'flag';
      }

      const result: ModerationResult = {
        isApproved: suggestedAction === 'approve',
        confidence: averageConfidence,
        flags,
        requiresManualReview,
        suggestedAction,
      };

      // Log the moderation result
      await this.logModerationResult(content, result);

      // Add to moderation queue if needed
      if (requiresManualReview || suggestedAction !== 'approve') {
        await this.addToModerationQueue(content, flags, requiresManualReview);
      }

      return result;

    } catch (error) {
      console.error('Content moderation error:', error);
      
      // Default to manual review on error
      return {
        isApproved: false,
        confidence: 0,
        flags: [],
        requiresManualReview: true,
        suggestedAction: 'review',
      };
    }
  }

  /**
   * Detect profanity in content
   */
  private detectProfanity(content: string): {
    detected: boolean;
    confidence: number;
    words: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    const lowerContent = content.toLowerCase();
    const foundWords: string[] = [];
    
    for (const word of this.profanityWords) {
      if (lowerContent.includes(word)) {
        foundWords.push(word);
      }
    }

    // Check for variations and obfuscations
    const obfuscatedPatterns = [
      /f[\*\-_]?u[\*\-_]?c[\*\-_]?k/gi,
      /s[\*\-_]?h[\*\-_]?i[\*\-_]?t/gi,
      /b[\*\-_]?i[\*\-_]?t[\*\-_]?c[\*\-_]?h/gi,
    ];

    for (const pattern of obfuscatedPatterns) {
      if (pattern.test(content)) {
        foundWords.push('obfuscated profanity');
      }
    }

    const detected = foundWords.length > 0;
    const confidence = detected ? Math.min(0.9, foundWords.length * 0.3) : 0;
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (foundWords.length > 3) severity = 'high';
    else if (foundWords.length > 1) severity = 'medium';

    return { detected, confidence, words: foundWords, severity };
  }

  /**
   * Detect spam content
   */
  private detectSpam(content: string): {
    detected: boolean;
    confidence: number;
    reasons: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    const reasons: string[] = [];
    let confidence = 0;

    // Check spam patterns
    for (const pattern of this.spamPatterns) {
      if (pattern.test(content)) {
        reasons.push('Contains spam keywords');
        confidence += 0.3;
        break;
      }
    }

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 20) {
      reasons.push('Excessive capitalization');
      confidence += 0.2;
    }

    // Check for excessive punctuation
    const punctuationCount = (content.match(/[!?]{2,}/g) || []).length;
    if (punctuationCount > 3) {
      reasons.push('Excessive punctuation');
      confidence += 0.2;
    }

    // Check for repeated words
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    const maxRepeats = Math.max(...Array.from(wordCounts.values()));
    if (maxRepeats > 5) {
      reasons.push('Repeated words');
      confidence += 0.3;
    }

    // Check for excessive emojis
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    if (emojiCount > content.length * 0.1) {
      reasons.push('Excessive emojis');
      confidence += 0.2;
    }

    const detected = reasons.length > 0;
    confidence = Math.min(0.9, confidence);
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (confidence > 0.7) severity = 'high';
    else if (confidence > 0.4) severity = 'medium';

    return { detected, confidence, reasons, severity };
  }

  /**
   * Detect inappropriate content
   */
  private detectInappropriateContent(content: string): {
    detected: boolean;
    confidence: number;
    reasons: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    const reasons: string[] = [];
    let confidence = 0;

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        reasons.push('Contains inappropriate keywords');
        confidence += 0.4;
        break;
      }
    }

    // Check for adult content indicators
    const adultPatterns = [
      /\b(sex|porn|nude|naked|adult|xxx)\b/gi,
      /\b(escort|massage|dating|hookup)\b/gi,
    ];

    for (const pattern of adultPatterns) {
      if (pattern.test(content)) {
        reasons.push('Adult content detected');
        confidence += 0.6;
        break;
      }
    }

    // Check for violence indicators
    const violencePatterns = [
      /\b(kill|murder|death|violence|weapon|gun|knife)\b/gi,
      /\b(hurt|harm|attack|fight|beat)\b/gi,
    ];

    for (const pattern of violencePatterns) {
      if (pattern.test(content)) {
        reasons.push('Violence-related content');
        confidence += 0.5;
        break;
      }
    }

    const detected = reasons.length > 0;
    confidence = Math.min(0.9, confidence);
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (confidence > 0.7) severity = 'high';
    else if (confidence > 0.5) severity = 'medium';

    return { detected, confidence, reasons, severity };
  }

  /**
   * Detect personal information
   */
  private detectPersonalInformation(content: string): {
    detected: boolean;
    confidence: number;
    types: string[];
  } {
    const types: string[] = [];
    let confidence = 0;

    // Phone numbers
    const phonePattern = /(\+?\d{1,4}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/g;
    if (phonePattern.test(content)) {
      types.push('Phone number');
      confidence += 0.8;
    }

    // Email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    if (emailPattern.test(content)) {
      types.push('Email address');
      confidence += 0.7;
    }

    // Credit card numbers
    const ccPattern = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g;
    if (ccPattern.test(content)) {
      types.push('Credit card number');
      confidence += 0.9;
    }

    // Social security numbers (US format)
    const ssnPattern = /\b\d{3}[\s\-]?\d{2}[\s\-]?\d{4}\b/g;
    if (ssnPattern.test(content)) {
      types.push('Social security number');
      confidence += 0.9;
    }

    // Addresses (basic detection)
    const addressPattern = /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/gi;
    if (addressPattern.test(content)) {
      types.push('Address');
      confidence += 0.6;
    }

    const detected = types.length > 0;
    confidence = Math.min(0.9, confidence);

    return { detected, confidence, types };
  }

  /**
   * Detect suspicious links
   */
  private detectSuspiciousLinks(content: string): {
    detected: boolean;
    confidence: number;
    links: string[];
  } {
    const links: string[] = [];
    let confidence = 0;

    // Extract URLs
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlPattern) || [];

    for (const url of urls) {
      // Check for suspicious domains
      const suspiciousDomains = [
        'bit.ly', 'tinyurl.com', 'short.link', 't.co',
        'suspicious-site.com', 'phishing-site.com'
      ];

      const domain = url.replace(/https?:\/\//, '').split('/')[0];
      
      if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
        links.push(url);
        confidence += 0.7;
      }

      // Check for URL shorteners (could hide malicious links)
      if (url.length < 30 && (url.includes('bit.ly') || url.includes('tinyurl'))) {
        links.push(url);
        confidence += 0.5;
      }
    }

    const detected = links.length > 0;
    confidence = Math.min(0.9, confidence);

    return { detected, confidence, links };
  }

  /**
   * Moderate images (placeholder - would integrate with image recognition service)
   */
  private async moderateImages(images: string[]): Promise<{
    flagged: boolean;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    // In production, this would integrate with services like:
    // - Google Cloud Vision API
    // - AWS Rekognition
    // - Microsoft Computer Vision
    // - Custom ML models

    // For now, return a placeholder result
    return {
      flagged: false,
      confidence: 0,
      severity: 'low',
    };
  }

  /**
   * Add content to moderation queue
   */
  private async addToModerationQueue(
    content: ContentItem,
    flags: ModerationFlag[],
    manualReviewRequired: boolean
  ): Promise<void> {
    try {
      // Calculate priority based on flags
      let priority = 1;
      const highSeverityFlags = flags.filter(flag => flag.severity === 'high' || flag.severity === 'critical');
      
      if (highSeverityFlags.length > 0) {
        priority = 5; // High priority
      } else if (flags.length > 2) {
        priority = 3; // Medium priority
      }

      const { error } = await supabase
        .from('moderation_queue')
        .insert({
          content_type: content.type,
          content_id: content.id,
          user_id: content.userId,
          content_text: content.content,
          content_images: content.images || [],
          flagged_reason: flags.map(flag => flag.type),
          auto_flagged: true,
          manual_review_required: manualReviewRequired,
          priority_level: priority,
        });

      if (error) {
        console.error('Error adding to moderation queue:', error);
      }

    } catch (error) {
      console.error('Error adding to moderation queue:', error);
    }
  }

  /**
   * Log moderation result
   */
  private async logModerationResult(content: ContentItem, result: ModerationResult): Promise<void> {
    try {
      // Store flags in content_flags table
      for (const flag of result.flags) {
        await supabase
          .from('content_flags')
          .insert({
            content_type: content.type,
            content_id: content.id,
            flag_type: flag.type,
            confidence_score: flag.confidence,
            auto_generated: true,
            metadata: {
              details: flag.details,
              severity: flag.severity,
            },
          });
      }

    } catch (error) {
      console.error('Error logging moderation result:', error);
    }
  }

  /**
   * Get moderation queue items
   */
  async getModerationQueue(filters: {
    status?: string;
    priority?: number;
    contentType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ModerationQueueItem[]> {
    try {
      let query = supabase
        .from('moderation_queue')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .order('priority_level', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.priority) {
        query = query.eq('priority_level', filters.priority);
      }

      if (filters.contentType) {
        query = query.eq('content_type', filters.contentType);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching moderation queue:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        contentId: item.content_id,
        contentType: item.content_type,
        userId: item.user_id,
        content: item.content_text,
        images: item.content_images || [],
        flags: [], // Would need to fetch from content_flags table
        priority: item.priority_level,
        status: item.status,
        autoFlagged: item.auto_flagged,
        manualReviewRequired: item.manual_review_required,
        reviewedBy: item.reviewed_by,
        reviewedAt: item.reviewed_at ? new Date(item.reviewed_at) : undefined,
        reviewNotes: item.review_notes,
        createdAt: new Date(item.created_at),
      }));

    } catch (error) {
      console.error('Error fetching moderation queue:', error);
      return [];
    }
  }

  /**
   * Review moderation queue item
   */
  async reviewModerationItem(
    itemId: string,
    decision: 'approved' | 'rejected' | 'escalated',
    reviewerId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('moderation_queue')
        .update({
          status: decision,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq('id', itemId);

      if (error) {
        console.error('Error reviewing moderation item:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error reviewing moderation item:', error);
      return false;
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalItems: number;
    pendingItems: number;
    approvedItems: number;
    rejectedItems: number;
    flagsByType: Record<string, number>;
  }> {
    try {
      const startDate = new Date();
      switch (timeframe) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      const { data: queueStats } = await supabase
        .from('moderation_queue')
        .select('status')
        .gte('created_at', startDate.toISOString());

      const { data: flagStats } = await supabase
        .from('content_flags')
        .select('flag_type')
        .gte('created_at', startDate.toISOString());

      const totalItems = queueStats?.length || 0;
      const pendingItems = queueStats?.filter(item => item.status === 'pending').length || 0;
      const approvedItems = queueStats?.filter(item => item.status === 'approved').length || 0;
      const rejectedItems = queueStats?.filter(item => item.status === 'rejected').length || 0;

      const flagsByType: Record<string, number> = {};
      flagStats?.forEach(flag => {
        flagsByType[flag.flag_type] = (flagsByType[flag.flag_type] || 0) + 1;
      });

      return {
        totalItems,
        pendingItems,
        approvedItems,
        rejectedItems,
        flagsByType,
      };

    } catch (error) {
      console.error('Error fetching moderation stats:', error);
      return {
        totalItems: 0,
        pendingItems: 0,
        approvedItems: 0,
        rejectedItems: 0,
        flagsByType: {},
      };
    }
  }
}

export const contentModerationService = new ContentModerationService();
