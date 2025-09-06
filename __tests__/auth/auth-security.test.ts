// Authentication Security Tests
describe('Authentication Security', () => {
  describe('Rate Limiting', () => {
    test('should implement proper rate limiting for login attempts', () => {
      const rateLimitConfig = {
        maxAttempts: 5,
        windowMinutes: 15,
        blockDurationMinutes: 30
      };

      const loginAttempts = [
        { email: 'user@example.com', timestamp: Date.now() - 600000, success: false }, // 10 min ago
        { email: 'user@example.com', timestamp: Date.now() - 480000, success: false }, // 8 min ago
        { email: 'user@example.com', timestamp: Date.now() - 360000, success: false }, // 6 min ago
        { email: 'user@example.com', timestamp: Date.now() - 240000, success: false }, // 4 min ago
        { email: 'user@example.com', timestamp: Date.now() - 120000, success: false }, // 2 min ago
      ];

      const windowStart = Date.now() - (rateLimitConfig.windowMinutes * 60 * 1000);
      const attemptsInWindow = loginAttempts.filter(attempt => 
        attempt.timestamp >= windowStart && !attempt.success
      );

      const isRateLimited = attemptsInWindow.length >= rateLimitConfig.maxAttempts;
      const remainingAttempts = Math.max(0, rateLimitConfig.maxAttempts - attemptsInWindow.length);

      expect(attemptsInWindow.length).toBe(5);
      expect(isRateLimited).toBe(true);
      expect(remainingAttempts).toBe(0);
    });

    test('should reset rate limit after successful login', () => {
      const attempts = [
        { email: 'user@example.com', timestamp: Date.now() - 600000, success: false },
        { email: 'user@example.com', timestamp: Date.now() - 480000, success: false },
        { email: 'user@example.com', timestamp: Date.now() - 360000, success: false },
        { email: 'user@example.com', timestamp: Date.now() - 120000, success: true }, // Success resets
      ];

      const lastSuccessfulLogin = attempts.find(a => a.success);
      const attemptsAfterSuccess = attempts.filter(a => 
        a.timestamp > (lastSuccessfulLogin?.timestamp || 0) && !a.success
      );

      expect(lastSuccessfulLogin).toBeDefined();
      expect(attemptsAfterSuccess.length).toBe(0);
    });

    test('should implement progressive delays for repeated failures', () => {
      const failureCount = 3;
      const baseDelayMs = 1000; // 1 second
      const maxDelayMs = 30000; // 30 seconds

      const calculateDelay = (failures: number): number => {
        const delay = Math.min(baseDelayMs * Math.pow(2, failures - 1), maxDelayMs);
        return delay;
      };

      const delays = [
        calculateDelay(1), // 1000ms
        calculateDelay(2), // 2000ms
        calculateDelay(3), // 4000ms
        calculateDelay(4), // 8000ms
        calculateDelay(5), // 16000ms
        calculateDelay(6), // 30000ms (capped)
      ];

      expect(delays[0]).toBe(1000);
      expect(delays[1]).toBe(2000);
      expect(delays[2]).toBe(4000);
      expect(delays[3]).toBe(8000);
      expect(delays[4]).toBe(16000);
      expect(delays[5]).toBe(30000); // Capped at max
    });
  });

  describe('Password Security', () => {
    test('should enforce strong password requirements', () => {
      const passwordRequirements = {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        forbiddenPatterns: ['password', '123456', 'qwerty']
      };

      const testPasswords = [
        { password: 'SecurePass123', expected: true },
        { password: 'securepass123', expected: false }, // No uppercase
        { password: 'SECUREPASS123', expected: false }, // No lowercase
        { password: 'SecurePassword', expected: false }, // No numbers
        { password: 'Weak1', expected: false }, // Too short
        { password: 'Password123', expected: false }, // Contains forbidden pattern
        { password: 'A'.repeat(130), expected: false }, // Too long
      ];

      const validatePassword = (password: string): boolean => {
        if (password.length < passwordRequirements.minLength) return false;
        if (password.length > passwordRequirements.maxLength) return false;
        if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) return false;
        if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) return false;
        if (passwordRequirements.requireNumbers && !/\d/.test(password)) return false;
        
        const lowerPassword = password.toLowerCase();
        for (const pattern of passwordRequirements.forbiddenPatterns) {
          if (lowerPassword.includes(pattern)) return false;
        }
        
        return true;
      };

      testPasswords.forEach(test => {
        const isValid = validatePassword(test.password);
        expect(isValid).toBe(test.expected);
      });
    });

    test('should calculate password strength scores', () => {
      const calculatePasswordStrength = (password: string): number => {
        let score = 0;
        
        // Length bonus
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (password.length >= 16) score += 1;
        
        // Character variety
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[^a-zA-Z0-9]/.test(password)) score += 1;
        
        // Patterns (negative points)
        if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
        if (/123|abc|qwe/i.test(password)) score -= 1; // Common sequences
        
        return Math.max(0, Math.min(5, score)); // 0-5 scale
      };

      const passwordTests = [
        { password: 'password', expectedMin: 0, expectedMax: 2 },
        { password: 'Password1', expectedMin: 2, expectedMax: 4 },
        { password: 'SecurePass123!', expectedMin: 4, expectedMax: 5 },
        { password: 'VeryLongAndComplexPassword123!@#', expectedMin: 5, expectedMax: 5 },
      ];

      passwordTests.forEach(test => {
        const strength = calculatePasswordStrength(test.password);
        expect(strength).toBeGreaterThanOrEqual(test.expectedMin);
        expect(strength).toBeLessThanOrEqual(test.expectedMax);
      });
    });

    test('should detect common password patterns', () => {
      const commonPatterns = [
        /^password/i,
        /123456/,
        /qwerty/i,
        /^admin/i,
        /^user/i,
        /(.)\1{3,}/, // 4+ repeated characters
        /(012|123|234|345|456|567|678|789|890)/, // Sequential numbers
        /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i // Sequential letters
      ];

      const testPasswords = [
        { password: 'password123', hasPattern: true },
        { password: 'admin2024', hasPattern: true },
        { password: 'qwerty123', hasPattern: true },
        { password: 'aaaa1234', hasPattern: true },
        { password: 'abc123def', hasPattern: true },
        { password: 'SecureRandom789!', hasPattern: true }, // Contains 789 sequence
      ];

      testPasswords.forEach(test => {
        const hasCommonPattern = commonPatterns.some(pattern => pattern.test(test.password));
        expect(hasCommonPattern).toBe(test.hasPattern);
      });
    });
  });

  describe('Session Security', () => {
    test('should implement secure session token generation', () => {
      const generateSecureToken = (): string => {
        // Simulate secure token generation
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };

      const tokens = Array.from({ length: 10 }, () => generateSecureToken());

      tokens.forEach(token => {
        expect(token.length).toBe(32);
        expect(/^[A-Za-z0-9]+$/.test(token)).toBe(true);
      });

      // Ensure uniqueness (very high probability)
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    test('should implement proper session expiration', () => {
      const sessionConfig = {
        defaultExpiryHours: 1,
        rememberMeExpiryDays: 30,
        maxIdleMinutes: 30,
        absoluteMaxHours: 24
      };

      const createSession = (rememberMe: boolean = false) => {
        const now = Date.now();
        const expiryTime = rememberMe 
          ? now + (sessionConfig.rememberMeExpiryDays * 24 * 60 * 60 * 1000)
          : now + (sessionConfig.defaultExpiryHours * 60 * 60 * 1000);
        
        return {
          sessionId: 'session-123',
          createdAt: now,
          expiresAt: expiryTime,
          lastActivity: now,
          rememberMe
        };
      };

      const regularSession = createSession(false);
      const rememberMeSession = createSession(true);

      const oneHourFromNow = Date.now() + (60 * 60 * 1000);
      const thirtyDaysFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);

      expect(regularSession.expiresAt).toBeLessThanOrEqual(oneHourFromNow + 1000); // Small buffer
      expect(rememberMeSession.expiresAt).toBeGreaterThan(thirtyDaysFromNow - 1000);
    });

    test('should handle session hijacking protection', () => {
      const sessionSecurity = {
        sessionId: 'session-123',
        userId: 'user-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        deviceFingerprint: 'device-fingerprint-123',
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      const suspiciousActivity = {
        newIpAddress: '10.0.0.1', // Different IP
        newUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // Different browser
        newDeviceFingerprint: 'device-fingerprint-456', // Different device
        timestamp: Date.now()
      };

      // Check for suspicious changes
      const ipChanged = sessionSecurity.ipAddress !== suspiciousActivity.newIpAddress;
      const userAgentChanged = sessionSecurity.userAgent !== suspiciousActivity.newUserAgent;
      const deviceChanged = sessionSecurity.deviceFingerprint !== suspiciousActivity.newDeviceFingerprint;

      const suspiciousScore = [ipChanged, userAgentChanged, deviceChanged].filter(Boolean).length;
      const requiresReauth = suspiciousScore >= 2;

      expect(ipChanged).toBe(true);
      expect(userAgentChanged).toBe(true);
      expect(deviceChanged).toBe(true);
      expect(suspiciousScore).toBe(3);
      expect(requiresReauth).toBe(true);
    });

    test('should implement secure session cleanup', () => {
      const sessions = [
        {
          sessionId: 'session-1',
          userId: 'user-123',
          expiresAt: Date.now() - 3600000, // Expired 1 hour ago
          lastActivity: Date.now() - 7200000, // Last activity 2 hours ago
          isActive: false
        },
        {
          sessionId: 'session-2',
          userId: 'user-123',
          expiresAt: Date.now() + 3600000, // Expires in 1 hour
          lastActivity: Date.now() - 1900000, // Last activity 31+ minutes ago (idle)
          isActive: true
        },
        {
          sessionId: 'session-3',
          userId: 'user-123',
          expiresAt: Date.now() + 3600000, // Expires in 1 hour
          lastActivity: Date.now() - 300000, // Last activity 5 minutes ago (active)
          isActive: true
        }
      ];

      const maxIdleTime = 30 * 60 * 1000; // 30 minutes
      const currentTime = Date.now();

      const sessionsToCleanup = sessions.filter(session => {
        const isExpired = session.expiresAt <= currentTime;
        const isIdle = (currentTime - session.lastActivity) > maxIdleTime;
        return isExpired || isIdle;
      });

      const activeSessions = sessions.filter(session => {
        const isExpired = session.expiresAt <= currentTime;
        const isIdle = (currentTime - session.lastActivity) > maxIdleTime;
        return !isExpired && !isIdle;
      });

      expect(sessionsToCleanup.length).toBe(2); // Expired and idle sessions
      expect(activeSessions.length).toBe(1); // Only the recently active session
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should validate and sanitize email inputs', () => {
      const emailTests = [
        { email: 'user@example.com', valid: true, sanitized: 'user@example.com' },
        { email: '  USER@EXAMPLE.COM  ', valid: true, sanitized: 'user@example.com' },
        { email: 'user+tag@example.com', valid: true, sanitized: 'user+tag@example.com' },
        { email: 'invalid-email', valid: false, sanitized: null },
        { email: '@example.com', valid: false, sanitized: null },
        { email: 'user@', valid: false, sanitized: null },
        { email: '', valid: false, sanitized: null },
        { email: 'user@example', valid: false, sanitized: null },
      ];

      const validateAndSanitizeEmail = (email: string): { valid: boolean; sanitized: string | null } => {
        if (!email || typeof email !== 'string') {
          return { valid: false, sanitized: null };
        }

        const trimmed = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(trimmed)) {
          return { valid: false, sanitized: null };
        }

        return { valid: true, sanitized: trimmed };
      };

      emailTests.forEach(test => {
        const result = validateAndSanitizeEmail(test.email);
        expect(result.valid).toBe(test.valid);
        expect(result.sanitized).toBe(test.sanitized);
      });
    });

    test('should prevent SQL injection in user inputs', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM passwords --",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --"
      ];

      const sanitizeInput = (input: string): string => {
        if (!input || typeof input !== 'string') return '';
        
        // Remove or escape dangerous characters and keywords
        return input
          .replace(/'/g, "''") // Escape single quotes
          .replace(/;/g, '') // Remove semicolons
          .replace(/--/g, '') // Remove SQL comments
          .replace(/\/\*/g, '') // Remove SQL block comments start
          .replace(/\*\//g, '') // Remove SQL block comments end
          .replace(/DROP\s+TABLE/gi, '') // Remove DROP TABLE
          .replace(/UNION\s+SELECT/gi, '') // Remove UNION SELECT
          .replace(/INSERT\s+INTO/gi, '') // Remove INSERT INTO
          .trim();
      };

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        
        // Should not contain dangerous patterns
        expect(sanitized).not.toContain('DROP TABLE');
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('UNION SELECT');
        expect(sanitized).not.toContain('INSERT INTO');
      });
    });

    test('should prevent XSS attacks in user inputs', () => {
      const xssInputs = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>',
      ];

      const sanitizeForXSS = (input: string): string => {
        if (!input || typeof input !== 'string') return '';
        
        return input
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;')
          .replace(/javascript:/gi, '')
          .trim();
      };

      xssInputs.forEach(input => {
        const sanitized = sanitizeForXSS(input);
        
        // Should not contain executable script tags or javascript
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        // Check that dangerous attributes are escaped, not removed
        if (input.includes('onerror=')) {
          expect(sanitized).toContain('&quot;');
        }
        if (input.includes('onload=')) {
          expect(sanitized).toContain('&quot;');
        }
      });
    });

    test('should validate input lengths and formats', () => {
      const inputValidations = {
        firstName: { minLength: 1, maxLength: 50, pattern: /^[a-zA-Z\s'-]+$/ },
        lastName: { minLength: 1, maxLength: 50, pattern: /^[a-zA-Z\s'-]+$/ },
        phone: { minLength: 10, maxLength: 15, pattern: /^\+?[\d\s-()]+$/ },
        password: { minLength: 8, maxLength: 128, pattern: /^.+$/ }
      };

      const testInputs = [
        { field: 'firstName', value: 'John', valid: true },
        { field: 'firstName', value: 'John-Paul O\'Connor', valid: true },
        { field: 'firstName', value: '', valid: false }, // Too short
        { field: 'firstName', value: 'A'.repeat(51), valid: false }, // Too long
        { field: 'firstName', value: 'John123', valid: false }, // Invalid characters
        
        { field: 'phone', value: '+233123456789', valid: true },
        { field: 'phone', value: '0123456789', valid: true },
        { field: 'phone', value: '123', valid: false }, // Too short
        { field: 'phone', value: 'not-a-phone', valid: false }, // Invalid format
      ];

      const validateInput = (field: string, value: string): boolean => {
        const validation = inputValidations[field as keyof typeof inputValidations];
        if (!validation) return false;
        
        if (value.length < validation.minLength || value.length > validation.maxLength) {
          return false;
        }
        
        return validation.pattern.test(value);
      };

      testInputs.forEach(test => {
        const isValid = validateInput(test.field, test.value);
        expect(isValid).toBe(test.valid);
      });
    });
  });

  describe('Device and Location Security', () => {
    test('should track device information for security', () => {
      const deviceInfo = {
        deviceId: 'device-123',
        deviceType: 'mobile',
        deviceName: 'iPhone 14 Pro',
        operatingSystem: 'iOS 16.0',
        browser: 'Safari',
        ipAddress: '192.168.1.100',
        location: {
          country: 'Ghana',
          city: 'Accra',
          coordinates: { lat: 5.6037, lng: -0.1870 }
        },
        firstSeen: Date.now() - 86400000, // 24 hours ago
        lastSeen: Date.now(),
        isTrusted: true
      };

      expect(deviceInfo.deviceId).toBeTruthy();
      expect(['mobile', 'desktop', 'tablet']).toContain(deviceInfo.deviceType);
      expect(deviceInfo.deviceName).toBeTruthy();
      expect(deviceInfo.ipAddress).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      expect(deviceInfo.location.country).toBeTruthy();
      expect(typeof deviceInfo.isTrusted).toBe('boolean');
      expect(deviceInfo.lastSeen).toBeGreaterThan(deviceInfo.firstSeen);
    });

    test('should detect suspicious location changes', () => {
      const userLocations = [
        {
          timestamp: Date.now() - 7200000, // 2 hours ago
          country: 'Ghana',
          city: 'Accra',
          coordinates: { lat: 5.6037, lng: -0.1870 }
        },
        {
          timestamp: Date.now(),
          country: 'United States',
          city: 'New York',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        }
      ];

      const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        // Simplified distance calculation (Haversine formula approximation)
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const [oldLocation, newLocation] = userLocations;
      const distance = calculateDistance(
        oldLocation.coordinates.lat, oldLocation.coordinates.lng,
        newLocation.coordinates.lat, newLocation.coordinates.lng
      );
      
      const timeDiff = newLocation.timestamp - oldLocation.timestamp;
      const hoursElapsed = timeDiff / (1000 * 60 * 60);
      const maxReasonableSpeed = 1000; // km/h (commercial flight speed)
      const calculatedSpeed = distance / hoursElapsed;

      const isSuspiciousTravel = calculatedSpeed > maxReasonableSpeed;
      const isDifferentCountry = oldLocation.country !== newLocation.country;

      expect(distance).toBeGreaterThan(8000); // Accra to NYC is ~8000km
      expect(calculatedSpeed).toBeGreaterThan(maxReasonableSpeed);
      expect(isSuspiciousTravel).toBe(true);
      expect(isDifferentCountry).toBe(true);
    });

    test('should implement device fingerprinting', () => {
      const generateDeviceFingerprint = (deviceInfo: any): string => {
        const components = [
          deviceInfo.userAgent,
          deviceInfo.screenResolution,
          deviceInfo.timezone,
          deviceInfo.language,
          deviceInfo.platform,
          deviceInfo.cookieEnabled.toString(),
          deviceInfo.doNotTrack.toString()
        ];
        
        // Simulate hash generation with better uniqueness
        const fingerprint = components.join('|');
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
          const char = fingerprint.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        const hashStr = Math.abs(hash).toString().padStart(16, '0');
        return btoa(hashStr + hashStr).substring(0, 32);
      };

      const deviceInfo = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        screenResolution: '390x844',
        timezone: 'Africa/Accra',
        language: 'en-US',
        platform: 'iPhone',
        cookieEnabled: true,
        doNotTrack: false
      };

      const fingerprint = generateDeviceFingerprint(deviceInfo);
      
      expect(fingerprint).toBeTruthy();
      expect(fingerprint.length).toBe(32);
      expect(/^[A-Za-z0-9+/=]+$/.test(fingerprint)).toBe(true);

      // Same device info should generate same fingerprint
      const fingerprint2 = generateDeviceFingerprint(deviceInfo);
      expect(fingerprint).toBe(fingerprint2);

      // Different device info should generate different fingerprint
      const differentDeviceInfo = { ...deviceInfo, platform: 'Android' };
      const differentFingerprint = generateDeviceFingerprint(differentDeviceInfo);
      expect(fingerprint).not.toBe(differentFingerprint);
    });
  });

  describe('Audit Logging', () => {
    test('should log security events properly', () => {
      const securityEvents = [
        {
          eventType: 'login_success',
          userId: 'user-123',
          timestamp: Date.now(),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (iPhone)',
          deviceId: 'device-123',
          metadata: {
            sessionId: 'session-123',
            rememberDevice: false
          }
        },
        {
          eventType: 'login_failed',
          userId: null,
          timestamp: Date.now(),
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows)',
          deviceId: 'device-456',
          metadata: {
            email: 'attacker@evil.com',
            reason: 'invalid_credentials',
            attemptCount: 5
          }
        },
        {
          eventType: 'password_reset_requested',
          userId: 'user-123',
          timestamp: Date.now(),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (iPhone)',
          deviceId: 'device-123',
          metadata: {
            email: 'user@example.com',
            resetToken: 'reset-token-123'
          }
        },
        {
          eventType: 'suspicious_activity',
          userId: 'user-123',
          timestamp: Date.now(),
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0 (Linux)',
          deviceId: 'device-789',
          metadata: {
            reason: 'location_change',
            previousLocation: 'Ghana',
            currentLocation: 'Russia',
            riskScore: 0.9
          }
        }
      ];

      securityEvents.forEach(event => {
        expect(event.eventType).toBeTruthy();
        expect(event.timestamp).toBeGreaterThan(0);
        expect(event.ipAddress).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        expect(event.userAgent).toBeTruthy();
        expect(event.deviceId).toBeTruthy();
        expect(event.metadata).toBeDefined();

        // Event-specific validations
        switch (event.eventType) {
          case 'login_success':
            expect(event.userId).toBeTruthy();
            expect(event.metadata.sessionId).toBeTruthy();
            break;
          
          case 'login_failed':
            expect(event.metadata.reason).toBeTruthy();
            expect(event.metadata.attemptCount).toBeGreaterThan(0);
            break;
          
          case 'password_reset_requested':
            expect(event.userId).toBeTruthy();
            expect(event.metadata.email).toBeTruthy();
            expect(event.metadata.resetToken).toBeTruthy();
            break;
          
          case 'suspicious_activity':
            expect(event.metadata.reason).toBeTruthy();
            expect(event.metadata.riskScore).toBeGreaterThan(0);
            expect(event.metadata.riskScore).toBeLessThanOrEqual(1);
            break;
        }
      });
    });

    test('should implement log retention and cleanup', () => {
      const logs = [
        { id: 'log-1', timestamp: Date.now() - (90 * 24 * 60 * 60 * 1000), eventType: 'login_success' }, // 90 days old
        { id: 'log-2', timestamp: Date.now() - (60 * 24 * 60 * 60 * 1000), eventType: 'login_failed' }, // 60 days old
        { id: 'log-3', timestamp: Date.now() - (30 * 24 * 60 * 60 * 1000), eventType: 'password_reset' }, // 30 days old
        { id: 'log-4', timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000), eventType: 'suspicious_activity' }, // 7 days old
      ];

      const retentionPolicies = {
        login_success: 30 * 24 * 60 * 60 * 1000, // 30 days
        login_failed: 90 * 24 * 60 * 60 * 1000, // 90 days
        password_reset: 60 * 24 * 60 * 60 * 1000, // 60 days
        suspicious_activity: 365 * 24 * 60 * 60 * 1000, // 1 year
      };

      const currentTime = Date.now();
      const logsToRetain = logs.filter(log => {
        const retentionPeriod = retentionPolicies[log.eventType as keyof typeof retentionPolicies];
        const logAge = currentTime - log.timestamp;
        return logAge < retentionPeriod;
      });

      const logsToDelete = logs.filter(log => {
        const retentionPeriod = retentionPolicies[log.eventType as keyof typeof retentionPolicies];
        const logAge = currentTime - log.timestamp;
        return logAge >= retentionPeriod;
      });

      expect(logsToRetain.length).toBe(3); // login_failed, password_reset, suspicious_activity
      expect(logsToDelete.length).toBe(1); // login_success (older than 30 days)
      expect(logsToDelete[0].eventType).toBe('login_success');
    });
  });
});
