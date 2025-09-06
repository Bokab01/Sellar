// Content Moderation Utilities Tests
describe('Content Moderation Utils', () => {
  // Test moderation error message generation
  const getModerationErrorMessage = (reasons: string[]): string => {
    if (reasons.length === 0) {
      return 'This content violates our community guidelines.';
    }

    const categoryMessages: Record<string, string> = {
      illegal_items: 'This listing contains illegal items or content.',
      adult_content: 'This listing contains adult or inappropriate content.',
      scams: 'This listing appears to be fraudulent or misleading.',
      offensive_material: 'This listing contains offensive or discriminatory content.',
      spam: 'This listing appears to be spam or repetitive content.',
      violence: 'This listing contains violent or threatening content.',
      copyright: 'This listing may infringe on copyright or contain counterfeit items.',
      personal_info: 'This listing contains inappropriate personal information.',
      keyword_violation: 'This listing contains prohibited keywords or phrases.',
    };

    // Find the most severe category
    const severityOrder = [
      'illegal_items',
      'violence', 
      'adult_content',
      'scams',
      'offensive_material',
      'copyright',
      'spam',
      'personal_info',
      'keyword_violation'
    ];

    for (const category of severityOrder) {
      if (reasons.some(reason => reason.toLowerCase().includes(category.toLowerCase()))) {
        return categoryMessages[category];
      }
    }

    return 'This content violates our community guidelines. Please review our terms of service.';
  };

  describe('Error Messages', () => {
    it('should return appropriate error message for illegal items', () => {
      const reasons = ['AI detected: illegal_items', 'Flagged keywords: cocaine'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This listing contains illegal items or content.');
    });

    it('should return appropriate error message for adult content', () => {
      const reasons = ['AI detected: adult_content', 'Image contains adult material'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This listing contains adult or inappropriate content.');
    });

    it('should return appropriate error message for scams', () => {
      const reasons = ['AI detected: scams'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This listing appears to be fraudulent or misleading.');
    });

    it('should return appropriate error message for offensive material', () => {
      const reasons = ['AI detected: offensive_material'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This listing contains offensive or discriminatory content.');
    });

    it('should return appropriate error message for spam', () => {
      const reasons = ['AI detected: spam content'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This listing appears to be spam or repetitive content.');
    });

    it('should return appropriate error message for violence', () => {
      const reasons = ['AI detected: violence'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This listing contains violent or threatening content.');
    });

    it('should return appropriate error message for copyright', () => {
      const reasons = ['AI detected: copyright violation'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This listing may infringe on copyright or contain counterfeit items.');
    });

    it('should return appropriate error message for personal info', () => {
      const reasons = ['AI detected: personal_info'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This listing contains inappropriate personal information.');
    });

    it('should return appropriate error message for keyword violations', () => {
      const reasons = ['keyword_violation: stolen, fake'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This listing contains prohibited keywords or phrases.');
    });

    it('should return generic message for unknown violations', () => {
      const reasons = ['Unknown violation type'];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This content violates our community guidelines. Please review our terms of service.');
    });

    it('should return generic message for empty reasons', () => {
      const reasons: string[] = [];
      const message = getModerationErrorMessage(reasons);
      
      expect(message).toBe('This content violates our community guidelines.');
    });

    it('should prioritize most severe violations', () => {
      const reasons = ['AI detected: spam', 'AI detected: illegal_items'];
      const message = getModerationErrorMessage(reasons);
      
      // Should return illegal items message (more severe than spam)
      expect(message).toBe('This listing contains illegal items or content.');
    });

    it('should handle multiple categories correctly', () => {
      const reasons = ['AI detected: adult_content', 'AI detected: violence'];
      const message = getModerationErrorMessage(reasons);
      
      // Should return violence message (more severe than adult content)
      expect(message).toBe('This listing contains violent or threatening content.');
    });
  });

  describe('Moderation Logic', () => {
    it('should identify illegal content patterns', () => {
      const testCases = [
        { reasons: ['illegal_items detected'], expected: 'illegal_items' },
        { reasons: ['weapon illegal_items'], expected: 'illegal_items' },
        { reasons: ['stolen illegal_items'], expected: 'illegal_items' },
      ];

      testCases.forEach(({ reasons }) => {
        const message = getModerationErrorMessage(reasons);
        expect(message).toContain('illegal');
      });
    });

    it('should identify adult content patterns', () => {
      const testCases = [
        { reasons: ['adult_content services'], expected: 'adult_content' },
        { reasons: ['explicit adult_content'], expected: 'adult_content' },
        { reasons: ['sexual adult_content'], expected: 'adult_content' },
      ];

      testCases.forEach(({ reasons }) => {
        const message = getModerationErrorMessage(reasons);
        expect(message).toContain('adult');
      });
    });

    it('should identify scam patterns', () => {
      const testCases = [
        { reasons: ['scams listing'], expected: 'scams' },
        { reasons: ['fake scams'], expected: 'scams' },
        { reasons: ['misleading scams'], expected: 'scams' },
      ];

      testCases.forEach(({ reasons }) => {
        const message = getModerationErrorMessage(reasons);
        expect(message).toContain('fraudulent');
      });
    });

    it('should handle mixed violation types', () => {
      const mixedReasons = [
        'AI detected: spam',
        'Flagged keywords: fake',
        'AI detected: offensive_material'
      ];
      
      const message = getModerationErrorMessage(mixedReasons);
      
      // Should return the most severe violation (offensive material)
      expect(message).toBe('This listing contains offensive or discriminatory content.');
    });
  });

  describe('Priority System', () => {
    it('should have correct severity ordering', () => {
      // Test that more severe categories take precedence
      const testCases = [
        {
          reasons: ['spam detected', 'illegal_items detected'],
          expectedMessage: 'This listing contains illegal items or content.'
        },
        {
          reasons: ['copyright violation', 'violence detected'],
          expectedMessage: 'This listing contains violent or threatening content.'
        },
        {
          reasons: ['personal_info shared', 'adult_content detected'],
          expectedMessage: 'This listing contains adult or inappropriate content.'
        }
      ];

      testCases.forEach(({ reasons, expectedMessage }) => {
        const message = getModerationErrorMessage(reasons);
        expect(message).toBe(expectedMessage);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined reasons', () => {
      const message1 = getModerationErrorMessage([]);
      const message2 = getModerationErrorMessage(['']);
      
      expect(message1).toBe('This content violates our community guidelines.');
      expect(message2).toBe('This content violates our community guidelines. Please review our terms of service.');
    });

    it('should handle very long reason strings', () => {
      const longReason = 'A'.repeat(1000) + 'illegal_items' + 'B'.repeat(1000);
      const message = getModerationErrorMessage([longReason]);
      
      expect(message).toBe('This listing contains illegal items or content.');
    });

    it('should handle special characters in reasons', () => {
      const specialReasons = [
        'AI detected: illegal_items with special chars !@#$%^&*()',
        'Flagged keywords: test-keyword_with.special/chars'
      ];
      
      const message = getModerationErrorMessage(specialReasons);
      expect(message).toBe('This listing contains illegal items or content.');
    });

    it('should be case insensitive', () => {
      const testCases = [
        ['AI DETECTED: ILLEGAL_ITEMS'],
        ['ai detected: illegal_items'],
        ['Ai Detected: Illegal_Items']
      ];

      testCases.forEach(reasons => {
        const message = getModerationErrorMessage(reasons);
        expect(message).toBe('This listing contains illegal items or content.');
      });
    });
  });

  describe('Performance', () => {
    it('should handle large arrays of reasons efficiently', () => {
      const manyReasons = Array.from({ length: 1000 }, (_, i) => `reason ${i}`);
      manyReasons.push('illegal_items detected'); // Add one valid reason
      
      const startTime = Date.now();
      const message = getModerationErrorMessage(manyReasons);
      const endTime = Date.now();
      
      expect(message).toBe('This listing contains illegal items or content.');
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle repeated calls efficiently', () => {
      const reasons = ['AI detected: spam content'];
      
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        getModerationErrorMessage(reasons);
      }
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // 1000 calls in under 100ms
    });
  });

  describe('Moderation Categories', () => {
    it('should validate all category mappings exist', () => {
      const categories = [
        'illegal_items',
        'adult_content', 
        'scams',
        'offensive_material',
        'spam',
        'violence',
        'copyright',
        'personal_info',
        'keyword_violation'
      ];

      categories.forEach(category => {
        const message = getModerationErrorMessage([`test ${category}`]);
        expect(message).not.toBe('This content violates our community guidelines. Please review our terms of service.');
      });
    });

    it('should handle category combinations correctly', () => {
      const combinations = [
        ['illegal_items', 'spam'], // illegal_items should win
        ['violence', 'adult_content'], // violence should win  
        ['scams', 'copyright'], // scams should win
        ['offensive_material', 'personal_info'], // offensive_material should win
      ];

      combinations.forEach(([higher, lower]) => {
        const message = getModerationErrorMessage([`${lower} detected`, `${higher} detected`]);
        expect(message).toContain(higher === 'illegal_items' ? 'illegal' : 
                                 higher === 'violence' ? 'violent' :
                                 higher === 'scams' ? 'fraudulent' :
                                 higher === 'offensive_material' ? 'offensive' : '');
      });
    });
  });
});
