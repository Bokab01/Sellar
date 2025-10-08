/**
 * Ghanaian-specific profanity and inappropriate words
 * Includes Twi, Ga, Ewe, Hausa, and Ghanaian English slang
 * 
 * Special characters used:
 * ɛ (open e) - common in Twi and Ewe
 * ɔ (open o) - common in Twi and Ewe
 * ƒ (f with hook) - common in Ewe
 * ɖ (d with tail) - common in Ewe
 */

/**
 * Normalize Ghanaian text to handle special characters
 * Converts special characters to their ASCII equivalents for matching
 */
export function normalizeGhanaianText(text: string): string {
  return text
    .replace(/ɛ/g, 'e')  // Open e → e
    .replace(/Ɛ/g, 'E')
    .replace(/ɔ/g, 'o')  // Open o → o
    .replace(/Ɔ/g, 'O')
    .replace(/ƒ/g, 'f')  // F with hook → f
    .replace(/Ƒ/g, 'F')
    .replace(/ɖ/g, 'd')  // D with tail → d
    .replace(/Ɖ/g, 'D')
    .toLowerCase();
}

export const ghanaianProfanityWords = [
  // Twi profanity (with ɛ and ɔ characters)
  'kwasia', 'kwasea', 'kwasɛa', 'sia', 'gyimi', 'gyimii', 'aboa', 'kwaseampanin',
  'obaa kwasia', 'ɔbaa kwasia', 'tw3', 'twɛ', 'wotwɛ', 'wo maame twɛ', 'kasee', 'kokoo', 'kokɔɔ',
  'abrabo', 'abrabɔ', 'abodam', 'abɔdam', 'kente', 'ashawo', 'ashewo',
  'serwaa', 'ntoro', 'ntɔrɔ', 'kwasɛa', 'gyimifɔ', 'gyimifo', 'gyimifoɔ',
  'aboɔ', 'ɔkwasea', 'ɔgyimii', 'ɔbaa', 'ɔbarima kwasia', 'ɔkraman', 'wo maame aboa',
  'kwaseafoɔ', 'kwaseafoo', 'ɔkwaseani', 'kwaseani', 'yarefo', 'yarefoɔ', 'wo nkontonkon', 'yaafoɔ',
  
  // More Twi insults with special characters
  'ɔtɛ', 'ote', 'ɔdwan', 'odwan', 'ɔkraman', 'okraman',
  'ɔbonsam', 'obonsam', 'ɔsɔfo', 'osofo', 'ɔsɔreɛ', 'osoree', 'ɔsoreɛ',
  
  // Ga profanity
  'tsotsoo', 'gbemi', 'kpakpakpa', 'oshishi', 'kpokpoi', 'kpokpɔi',
  'gbeshie', 'otafo', 'obroni fos', 'ɔbrɔni fos',
  
  // Ewe profanity (with special characters)
  'nyateƒe', 'nyatefe', 'avu', 'gbevu', 'tsotso', 'dome', 'ɔdome',
  'ɖevi', 'devi', 'agɔdzila', 'agodzila', 'ƒoƒo', 'fofo', 'ɔfofo',
  
  // Hausa profanity (used in Northern Ghana)
  'wawa', 'jarumi', 'banza', 'shege', 'dan iska',
  
  // Ghanaian English slang (inappropriate)
  'boga', 'slay queen', 'borga', 'sakawa', 'wee', 'tramadol',
  'aboboyaa', 'ashaiman', 'chorkor', 'borla', 'goro',
  'gari', 'kontomire', 'chaskele', 'kpekpe', 'akpeteshie',
  
  // Insults and derogatory terms
  'fool', 'idiot', 'stupid', 'mumu', 'olodo', 'ode',
  'useless', 'nonsense', 'foolish', 'senseless',
  
  // Sexual/Adult terms
  'bortos', 'totoe', 'kokonsa', 'kwaku ananse', 'ti',
  'ashawo boy', 'hookup', 'one night',
  
  // Drug-related
  'wee smoker', 'drug addict', 'junkie', 'ganja', 'marijuana',
  'cocaine', 'heroin', 'tramadol boy',
  
  // Scam/fraud related
  'sakawa boy', 'yahoo boy', '419', 'scammer', 'fraudster',
  'chopping money', 'chop chop',
  
  // Derogatory tribal references (context-sensitive, but flagged for review)
  'villager', 'bushman', 'bush person', 'uncivilized',
  
  // Body shaming
  'obolo', 'fatso', 'mpenpen', 'skinny', 'bones',
  
  // Common variations and misspellings
  'kwassia', 'kwasya', 'kwasiya', 'gyimie', 'gyimiii',
  'kwasampanyin', 'ashewo girl', 'ashawo woman',
];

/**
 * Context-sensitive words that might be acceptable in some contexts
 * These require manual review rather than automatic blocking
 */
export const ghanaianSensitiveWords = [
  // Food/cultural items that could be used as insults
  'gari', 'fufu', 'kenkey', 'banku', 'waakye',
  
  // Places that might be used derogatively
  'nima', 'jamestown', 'chorkor', 'ashaiman',
  
  // Common Ghanaian terms that might be misused
  'charlie', 'chale', 'my guy', 'boss', 'chief',
  
  // Religious terms sometimes used inappropriately
  'juju', 'mallam', 'pastor', 'prophet',
];

/**
 * Ghanaian scam/fraud patterns
 */
export const ghanaianScamPatterns = [
  /\b(sakawa|yahoo|419)\s+(boy|guy|man)\b/gi,
  /\b(send|transfer|pay)\s+(money|cash|cedis|dollars|euros)\b/gi,
  /\b(whatsapp|telegram|signal)\s+(\+233|0\d{9})\b/gi,
  /\b(bank|mobile\s+money|momo|mtn|vodafone)\s+(account|number|details)\b/gi,
  /\b(invest|double|triple)\s+(your\s+)?money\b/gi,
  /\b(spiritual|juju|mallam)\s+(power|help|money)\b/gi,
  /\b(send|pay)\s+\d+\s*(cedis|ghana\s+cedis|GHS)\b/gi,
];

/**
 * Ghanaian cultural context checker
 * Helps determine if a word is being used appropriately
 */
export function isGhanaianCulturalContext(content: string, word: string): boolean {
  const lowerContent = content.toLowerCase();
  const lowerWord = word.toLowerCase();
  
  // Check if discussing food/culture positively
  if (['gari', 'fufu', 'kenkey', 'banku', 'waakye'].includes(lowerWord)) {
    const positiveContext = /(sell|buy|cook|eat|delicious|tasty|fresh|market)/i;
    return positiveContext.test(lowerContent);
  }
  
  // Check if discussing location/delivery appropriately
  if (['nima', 'jamestown', 'chorkor', 'ashaiman'].includes(lowerWord)) {
    const locationContext = /(location|area|deliver|pickup|meet|around|near)/i;
    return locationContext.test(lowerContent);
  }
  
  // Charlie/Chale used as friendly address
  if (['charlie', 'chale'].includes(lowerWord)) {
    const friendlyContext = /(bro|brother|friend|please|help|boss|chief)/i;
    return friendlyContext.test(lowerContent);
  }
  
  return false;
}

/**
 * Get severity for Ghanaian profanity
 */
export function getGhanaianProfanitySeverity(word: string): 'low' | 'medium' | 'high' | 'critical' {
  const lowerWord = word.toLowerCase();
  
  // Critical severity - extremely offensive
  const critical = ['kwaseampanin', 'obaa kwasia', 'ntoro', 'tw3'];
  if (critical.includes(lowerWord)) return 'critical';
  
  // High severity - strong profanity
  const high = ['kwasia', 'kwasea', 'gyimi', 'gyimii', 'aboa', 'ashawo', 'shege', 'dan iska'];
  if (high.includes(lowerWord)) return 'high';
  
  // Medium severity - moderate profanity
  const medium = ['fool', 'idiot', 'stupid', 'mumu', 'wawa', 'borla', 'useless'];
  if (medium.includes(lowerWord)) return 'medium';
  
  // Low severity - mild or context-dependent
  return 'low';
}

