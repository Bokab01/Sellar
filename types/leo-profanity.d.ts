/**
 * Type definitions for leo-profanity
 * Comprehensive profanity filter library
 */

declare module 'leo-profanity' {
  /**
   * Check if text contains profanity
   * @param text - Text to check
   * @returns true if profanity is found, false otherwise
   */
  export function check(text: string): boolean;

  /**
   * Clean profanity from text by replacing with asterisks
   * @param text - Text to clean
   * @param replaceKey - Optional replacement character (default: '*')
   * @returns Cleaned text
   */
  export function clean(text: string, replaceKey?: string): string;

  /**
   * Add custom words to the profanity list
   * @param words - Array of words to add
   */
  export function add(words: string[]): void;

  /**
   * Remove words from the profanity list
   * @param words - Array of words to remove
   */
  export function remove(words: string[]): void;

  /**
   * Reset the profanity list to default
   */
  export function reset(): void;

  /**
   * Clear all words from the profanity list
   */
  export function clearList(): void;

  /**
   * Get all words in the profanity list
   * @returns Array of profanity words
   */
  export function list(): string[];

  /**
   * Load a dictionary for a specific language
   * @param language - Language code ('en', 'fr', 'de', 'es', 'pt', 'it', etc.)
   */
  export function loadDictionary(language: string): void;

  /**
   * Get the list of available dictionaries
   * @returns Array of available language codes
   */
  export function getDictionaries(): string[];
}

