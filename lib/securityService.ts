/**
 * Security Service for authentication, session management, and security monitoring
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { generateDeviceFingerprint, generateSecureToken, RateLimiter } from '../utils/security';

export interface SecurityEvent {
  id: string;
  userId: string;
  eventType: 'login' | 'failed_login' | 'password_change' | 'suspicious_activity' | 'device_change' | 'logout';
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  timestamp: Date;
  metadata?: any;
}

export interface DeviceInfo {
  fingerprint: string;
  name: string;
  platform: string;
  lastSeen: Date;
  isCurrentDevice: boolean;
  isTrusted: boolean;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceFingerprint: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

class SecurityService {
  private rateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
  private deviceFingerprint: string | null = null;
  private securityEventListeners: ((event: SecurityEvent) => void)[] = [];

  /**
   * Initialize security service
   */
  async initialize(): Promise<void> {
    try {
      this.deviceFingerprint = await this.getOrCreateDeviceFingerprint();
      await this.cleanupExpiredSessions();
      console.log('Security service initialized successfully');
    } catch (error) {
      console.error('Security service initialization error:', error);
      // Set a fallback fingerprint to prevent complete failure
      this.deviceFingerprint = 'fallback-' + Date.now().toString(36);
      throw error; // Re-throw to let caller handle it
    }
  }

  /**
   * Get or create device fingerprint
   */
  private async getOrCreateDeviceFingerprint(): Promise<string> {
    try {
      let fingerprint = await AsyncStorage.getItem('device_fingerprint');
      
      if (!fingerprint) {
        console.log('Generating new device fingerprint...');
        fingerprint = generateDeviceFingerprint();
        await AsyncStorage.setItem('device_fingerprint', fingerprint);
        console.log('Device fingerprint generated and stored');
      } else {
        console.log('Using existing device fingerprint');
      }
      
      return fingerprint;
    } catch (error) {
      console.error('Error managing device fingerprint:', error);
      // Generate a fallback fingerprint without storing it
      const fallbackFingerprint = generateDeviceFingerprint();
      console.log('Using fallback device fingerprint');
      return fallbackFingerprint;
    }
  }

  /**
   * Enhanced login with security checks
   */
  async secureLogin(email: string, password: string, options: {
    rememberDevice?: boolean;
    skipRateLimit?: boolean;
  } = {}): Promise<{
    success: boolean;
    error?: string;
    requiresMFA?: boolean;
    sessionId?: string;
  }> {
    const { rememberDevice = false, skipRateLimit = false } = options;
    
    // Rate limiting check
    if (!skipRateLimit && !this.rateLimiter.isAllowed(email)) {
      const remainingTime = Math.ceil(this.rateLimiter.getRemainingTime(email) / 1000 / 60);
      await this.logSecurityEvent('failed_login', '', {
        reason: 'rate_limited',
        email,
        remainingTime
      });
      
      return {
        success: false,
        error: `Too many failed attempts. Please try again in ${remainingTime} minutes.`
      };
    }

    try {
      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await this.logSecurityEvent('failed_login', '', {
          reason: 'invalid_credentials',
          email,
          error: error.message
        });
        
        return {
          success: false,
          error: error.message
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Login failed'
        };
      }

      // Reset rate limiter on successful login
      this.rateLimiter.reset(email);

      // Check for suspicious activity
      const isSuspicious = await this.checkSuspiciousActivity(data.user.id);
      
      if (isSuspicious) {
        await this.logSecurityEvent('suspicious_activity', data.user.id, {
          reason: 'unusual_login_pattern'
        });
        
        // Could trigger MFA requirement here
        return {
          success: false,
          requiresMFA: true,
          error: 'Additional verification required due to unusual activity'
        };
      }

      // Create secure session
      const sessionId = await this.createSecureSession(data.user.id, rememberDevice);

      // Log successful login
      await this.logSecurityEvent('login', data.user.id, {
        sessionId,
        rememberDevice
      });

      return {
        success: true,
        sessionId
      };

    } catch (error) {
      console.error('Secure login error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Create secure session with device tracking
   */
  private async createSecureSession(userId: string, rememberDevice: boolean): Promise<string> {
    const sessionId = generateSecureToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (rememberDevice ? 24 * 30 : 24)); // 30 days or 24 hours

    const sessionInfo: SessionInfo = {
      id: sessionId,
      userId,
      deviceFingerprint: this.deviceFingerprint!,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt,
      isActive: true
    };

    // Store session info
    await AsyncStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionInfo));
    await AsyncStorage.setItem('current_session_id', sessionId);

    // Update device info
    await this.updateDeviceInfo(userId, rememberDevice);

    return sessionId;
  }

  /**
   * Update device information
   */
  private async updateDeviceInfo(userId: string, isTrusted: boolean): Promise<void> {
    try {
      // Try to track device in user_devices table, but don't fail if table doesn't exist
      const { error } = await supabase
        .from('user_devices')
        .upsert({
          user_id: userId,
          device_fingerprint: this.deviceFingerprint!,
          device_name: this.getDeviceName(),
          platform: this.getPlatform(),
          last_seen: new Date().toISOString(),
          is_trusted: isTrusted,
          is_active: true
        }, {
          onConflict: 'user_id,device_fingerprint'
        });

      if (error) {
        console.warn('SecurityService: Could not track device in user_devices table:', error.message);
        // This is not critical, continue without failing
      } else {
        console.log('SecurityService: Device tracked successfully');
      }
    } catch (error) {
      console.warn('SecurityService: user_devices table not available for device tracking:', error);
      // This is not critical, continue without failing
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      // Check recent login attempts from different devices
      const { data: recentLogins } = await supabase
        .from('security_events')
        .select('device_fingerprint, created_at')
        .eq('user_id', userId)
        .eq('event_type', 'login')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      if (recentLogins && recentLogins.length > 0) {
        // Check if this is a new device
        const isNewDevice = !recentLogins.some(
          login => login.device_fingerprint === this.deviceFingerprint
        );

        // Check for rapid logins from different devices
        const uniqueDevices = new Set(recentLogins.map(login => login.device_fingerprint));
        
        if (isNewDevice && uniqueDevices.size > 3) {
          return true; // Suspicious: too many different devices
        }

        // Check for rapid succession logins
        if (recentLogins.length > 10) {
          return true; // Suspicious: too many login attempts
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
      return false;
    }
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
    eventType: SecurityEvent['eventType'],
    userId: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      const event: Omit<SecurityEvent, 'id'> = {
        userId,
        eventType,
        deviceFingerprint: this.deviceFingerprint!,
        timestamp: new Date(),
        metadata
      };

      // Store in database - temporarily disabled due to RLS policy issues
      console.log('Security event logging skipped due to RLS policy issues:', { userId, eventType });
      return;
      
      const { error } = await supabase
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          device_fingerprint: this.deviceFingerprint!,
          metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging security event:', error);
      }

      // Notify listeners
      this.securityEventListeners.forEach(listener => {
        listener({ ...event, id: generateSecureToken(16) });
      });

    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<{ isValid: boolean; sessionInfo?: SessionInfo }> {
    try {
      const sessionId = await AsyncStorage.getItem('current_session_id');
      
      if (!sessionId) {
        return { isValid: false };
      }

      const sessionData = await AsyncStorage.getItem(`session_${sessionId}`);
      
      if (!sessionData) {
        return { isValid: false };
      }

      const sessionInfo: SessionInfo = JSON.parse(sessionData);

      // Check if session is expired
      if (new Date() > new Date(sessionInfo.expiresAt)) {
        await this.invalidateSession(sessionId);
        return { isValid: false };
      }

      // Check if device fingerprint matches
      if (sessionInfo.deviceFingerprint !== this.deviceFingerprint) {
        await this.logSecurityEvent('suspicious_activity', sessionInfo.userId, {
          reason: 'device_fingerprint_mismatch',
          expected: sessionInfo.deviceFingerprint,
          actual: this.deviceFingerprint
        });
        
        await this.invalidateSession(sessionId);
        return { isValid: false };
      }

      // Update last activity
      sessionInfo.lastActivity = new Date();
      await AsyncStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionInfo));

      return { isValid: true, sessionInfo };

    } catch (error) {
      console.error('Error validating session:', error);
      return { isValid: false };
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId?: string): Promise<void> {
    try {
      const targetSessionId = sessionId || await AsyncStorage.getItem('current_session_id');
      
      if (targetSessionId) {
        await AsyncStorage.removeItem(`session_${targetSessionId}`);
        
        if (!sessionId) { // Only remove current session if not specified
          await AsyncStorage.removeItem('current_session_id');
        }
      }
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  /**
   * Get user devices
   */
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    try {
      console.log('SecurityService: Fetching devices for user:', userId);
      
      // Try user_devices table first (for proper device tracking)
      try {
        const { data: userDevicesData, error: userDevicesError } = await supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('last_seen', { ascending: false });

        if (!userDevicesError && userDevicesData && userDevicesData.length > 0) {
          console.log('SecurityService: Retrieved devices from user_devices:', userDevicesData.length);
          
          return userDevicesData.map((device: any) => ({
            fingerprint: device.device_fingerprint,
            name: device.device_name || 'Unknown Device',
            platform: device.platform || 'Unknown',
            lastSeen: new Date(device.last_seen),
            isCurrentDevice: device.device_fingerprint === this.deviceFingerprint,
            isTrusted: device.is_trusted || false
          }));
        }
      } catch (userDevicesException) {
        console.log('SecurityService: user_devices table not available:', userDevicesException);
      }

      console.log('SecurityService: Using device_tokens fallback');
      // Fallback to device_tokens table
      return this.getUserDevicesFallback(userId);

    } catch (error) {
      console.error('SecurityService: Exception fetching user devices:', error);
      // Return fallback data
      return this.getUserDevicesFallback(userId);
    }
  }

  private async getUserDevicesFallback(userId: string): Promise<DeviceInfo[]> {
    try {
      console.log('SecurityService: Using fallback device query');
      
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('SecurityService: Fallback query failed:', error);
        return [];
      }

      return (data || []).map((device: any) => ({
        fingerprint: device.device_id || device.token.slice(-8), // Use device_id or last 8 chars of token as fingerprint
        name: device.device_name || `${device.platform} Device`,
        platform: device.platform || 'Unknown',
        lastSeen: new Date(device.last_used_at || device.updated_at),
        isCurrentDevice: false, // We can't determine this from device_tokens alone
        isTrusted: device.is_active || false
      }));

    } catch (error) {
      console.error('SecurityService: Fallback query exception:', error);
      return [];
    }
  }

  /**
   * Revoke device access
   */
  async revokeDeviceAccess(userId: string, deviceFingerprint: string): Promise<boolean> {
    try {
      // Try to remove device from user_devices table
      const { error: deviceError } = await supabase
        .from('user_devices')
        .delete()
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint);

      if (deviceError) {
        console.warn('SecurityService: Could not revoke device from user_devices table:', deviceError.message);
        // Try to revoke from device_tokens table as fallback
        const { error: tokenError } = await supabase
          .from('device_tokens')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('device_id', deviceFingerprint);

        if (tokenError) {
          console.error('Error revoking device access from both tables:', tokenError);
          return false;
        }
      }

      // Log security event
      await this.logSecurityEvent('device_change', userId, {
        action: 'revoke_access',
        deviceFingerprint
      });

      return true;

    } catch (error) {
      console.error('Error revoking device access:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith('session_'));
      
      for (const key of sessionKeys) {
        const sessionData = await AsyncStorage.getItem(key);
        
        if (sessionData) {
          const sessionInfo: SessionInfo = JSON.parse(sessionData);
          
          if (new Date() > new Date(sessionInfo.expiresAt)) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Add security event listener
   */
  addSecurityEventListener(listener: (event: SecurityEvent) => void): void {
    this.securityEventListeners.push(listener);
  }

  /**
   * Remove security event listener
   */
  removeSecurityEventListener(listener: (event: SecurityEvent) => void): void {
    const index = this.securityEventListeners.indexOf(listener);
    if (index > -1) {
      this.securityEventListeners.splice(index, 1);
    }
  }

  /**
   * Get device name
   */
  private getDeviceName(): string {
    // In a real app, you'd use react-native-device-info
    return 'Mobile Device';
  }

  /**
   * Get platform
   */
  private getPlatform(): string {
    // In a real app, you'd use Platform from react-native
    return 'mobile';
  }

  /**
   * Force logout all devices
   */
  async forceLogoutAllDevices(userId: string): Promise<boolean> {
    try {
      // Revoke all refresh tokens
      const { error: authError } = await supabase.auth.admin.signOut(userId, 'global');
      
      if (authError) {
        console.error('Error signing out all devices:', authError);
      }

      // Remove all device records
      const { error: deviceError } = await supabase
        .from('device_tokens')
        .delete()
        .eq('user_id', userId);

      if (deviceError) {
        console.error('Error removing devices:', deviceError);
        return false;
      }

      // Log security event
      await this.logSecurityEvent('device_change', userId, {
        action: 'logout_all_devices'
      });

      return true;

    } catch (error) {
      console.error('Error forcing logout all devices:', error);
      return false;
    }
  }
}

export const securityService = new SecurityService();
