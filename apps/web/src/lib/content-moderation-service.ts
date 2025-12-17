// Content Moderation Service for SoundBridge
// Uses OpenAI Moderation API (FREE: 2M requests/month) + custom spam detection

import OpenAI from 'openai';

/**
 * OpenAI Moderation Categories
 */
export interface ModerationCategories {
  sexual: boolean;
  hate: boolean;
  harassment: boolean;
  'self-harm': boolean;
  'sexual/minors': boolean;
  'hate/threatening': boolean;
  'violence/graphic': boolean;
  violence: boolean;
}

/**
 * OpenAI Moderation Category Scores (0.0-1.0)
 */
export interface ModerationCategoryScores {
  sexual: number;
  hate: number;
  harassment: number;
  'self-harm': number;
  'sexual/minors': number;
  'hate/threatening': number;
  'violence/graphic': number;
  violence: number;
}

/**
 * Moderation result from OpenAI
 */
export interface OpenAIModerationResult {
  flagged: boolean;
  categories: ModerationCategories;
  category_scores: ModerationCategoryScores;
}

/**
 * Spam detection result
 */
export interface SpamDetectionResult {
  isSpam: boolean;
  spamScore: number; // 0.0-1.0
  reasons: string[];
}

/**
 * Combined moderation result
 */
export interface ModerationResult {
  isFlagged: boolean;
  confidence: number; // 0.0-1.0
  flagReasons: string[];
  harmfulContent?: OpenAIModerationResult;
  spamDetection?: SpamDetectionResult;
  moderationStatus: 'clean' | 'flagged';
  recommendedAction: 'approve' | 'review' | 'reject';
}

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Get your free API key at https://platform.openai.com/api-keys'
    );
  }

  return new OpenAI({ apiKey });
}

/**
 * Check content for harmful material using OpenAI Moderation API
 * FREE: 2M requests/month
 *
 * @param text - Text to moderate (transcription)
 * @returns Moderation result from OpenAI
 */
export async function checkHarmfulContent(text: string): Promise<OpenAIModerationResult> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        flagged: false,
        categories: {
          sexual: false,
          hate: false,
          harassment: false,
          'self-harm': false,
          'sexual/minors': false,
          'hate/threatening': false,
          'violence/graphic': false,
          violence: false
        },
        category_scores: {
          sexual: 0,
          hate: 0,
          harassment: 0,
          'self-harm': 0,
          'sexual/minors': 0,
          'hate/threatening': 0,
          'violence/graphic': 0,
          violence: 0
        }
      };
    }

    const openai = getOpenAIClient();

    console.log('Checking content with OpenAI Moderation API...');

    const moderation = await openai.moderations.create({
      input: text
    });

    const result = moderation.results[0];

    if (result.flagged) {
      console.warn('⚠️ Content flagged by OpenAI Moderation:', result.categories);
    } else {
      console.log('✅ Content passed OpenAI Moderation check');
    }

    return {
      flagged: result.flagged,
      categories: result.categories as ModerationCategories,
      category_scores: result.category_scores as ModerationCategoryScores
    };

  } catch (error) {
    console.error('Error checking harmful content:', error);
    throw new Error(`Moderation API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect spam patterns in transcription text
 *
 * @param text - Transcription text
 * @param metadata - Optional track metadata
 * @returns Spam detection result
 */
export async function detectSpam(
  text: string,
  metadata?: {
    title?: string;
    description?: string;
    artistName?: string;
  }
): Promise<SpamDetectionResult> {
  const reasons: string[] = [];
  let spamScore = 0;

  if (!text || text.trim().length === 0) {
    return { isSpam: false, spamScore: 0, reasons: [] };
  }

  const lowerText = text.toLowerCase();
  const combinedText = [
    lowerText,
    metadata?.title?.toLowerCase() || '',
    metadata?.description?.toLowerCase() || '',
    metadata?.artistName?.toLowerCase() || ''
  ].join(' ');

  // Spam Pattern 1: Excessive URLs or links
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const urls = combinedText.match(urlPattern) || [];
  if (urls.length > 5) {
    reasons.push(`Excessive URLs detected (${urls.length} links)`);
    spamScore += 0.3;
  }

  // Spam Pattern 2: Excessive capitalization (>50% caps in a 100+ char text)
  if (text.length > 100) {
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const capsRatio = capsCount / text.length;
    if (capsRatio > 0.5) {
      reasons.push('Excessive capitalization detected');
      spamScore += 0.2;
    }
  }

  // Spam Pattern 3: Repeated words/phrases
  const words = lowerText.split(/\s+/);
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    if (word.length > 3) { // Only count words longer than 3 chars
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const maxRepeat = Math.max(...Object.values(wordFreq));
  if (maxRepeat > 10) {
    const repeatedWord = Object.keys(wordFreq).find(k => wordFreq[k] === maxRepeat);
    reasons.push(`Word "${repeatedWord}" repeated ${maxRepeat} times`);
    spamScore += 0.25;
  }

  // Spam Pattern 4: Common spam keywords
  const spamKeywords = [
    'click here', 'buy now', 'limited time', 'act now', 'call now',
    'free money', 'make money fast', 'get rich', 'weight loss',
    'viagra', 'cialis', 'crypto', 'bitcoin investment',
    'download here', 'subscribe now', 'follow for more',
    'link in bio', 'check description', 'promo code'
  ];

  const foundSpamKeywords = spamKeywords.filter(keyword =>
    combinedText.includes(keyword)
  );

  if (foundSpamKeywords.length > 3) {
    reasons.push(`Spam keywords found: ${foundSpamKeywords.slice(0, 3).join(', ')}`);
    spamScore += 0.3;
  }

  // Spam Pattern 5: Excessive emojis (more than 20% of text)
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojis = text.match(emojiPattern) || [];
  const emojiRatio = emojis.length / Math.max(text.length, 1);

  if (emojiRatio > 0.2) {
    reasons.push('Excessive emoji usage');
    spamScore += 0.15;
  }

  // Spam Pattern 6: Phone numbers
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = combinedText.match(phonePattern) || [];
  if (phones.length > 2) {
    reasons.push('Multiple phone numbers detected');
    spamScore += 0.2;
  }

  // Spam Pattern 7: Email addresses (multiple)
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = combinedText.match(emailPattern) || [];
  if (emails.length > 3) {
    reasons.push('Multiple email addresses detected');
    spamScore += 0.2;
  }

  // Cap spam score at 1.0
  spamScore = Math.min(spamScore, 1.0);

  const isSpam = spamScore >= 0.5; // Threshold: 50%

  if (isSpam) {
    console.warn(`⚠️ Spam detected (score: ${spamScore.toFixed(2)}):`, reasons);
  } else {
    console.log(`✅ Spam check passed (score: ${spamScore.toFixed(2)})`);
  }

  return {
    isSpam,
    spamScore,
    reasons
  };
}

/**
 * Comprehensive content moderation
 * Combines OpenAI Moderation + Spam Detection
 *
 * @param transcription - Audio transcription text
 * @param metadata - Optional track metadata
 * @param strictness - Moderation strictness level
 * @returns Complete moderation result
 */
export async function moderateContent(
  transcription: string,
  metadata?: {
    title?: string;
    description?: string;
    artistName?: string;
  },
  strictness: 'low' | 'medium' | 'high' = 'medium'
): Promise<ModerationResult> {
  try {
    const flagReasons: string[] = [];
    let maxConfidence = 0;

    // Step 1: Check for harmful content with OpenAI
    const harmfulContentCheck = await checkHarmfulContent(transcription);

    if (harmfulContentCheck.flagged) {
      // Get highest scoring category
      const scores = harmfulContentCheck.category_scores;
      const categories = harmfulContentCheck.categories;

      Object.keys(categories).forEach(key => {
        const typedKey = key as keyof ModerationCategories;
        if (categories[typedKey]) {
          const score = scores[typedKey];
          const categoryName = key.replace(/\//g, ' / ').replace(/-/g, ' ');
          flagReasons.push(
            `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} content detected (confidence: ${(score * 100).toFixed(1)}%)`
          );

          maxConfidence = Math.max(maxConfidence, score);
        }
      });
    }

    // Step 2: Detect spam patterns
    const spamCheck = await detectSpam(transcription, metadata);

    if (spamCheck.isSpam) {
      flagReasons.push(...spamCheck.reasons.map(r => `Spam: ${r}`));
      maxConfidence = Math.max(maxConfidence, spamCheck.spamScore);
    }

    // Step 3: Apply strictness threshold
    const thresholds = {
      low: 0.8,    // Only flag very high confidence violations
      medium: 0.6, // Flag medium-high confidence violations
      high: 0.4    // Flag even low-medium confidence violations
    };

    const threshold = thresholds[strictness];
    const isFlagged = flagReasons.length > 0 && maxConfidence >= threshold;

    // Step 4: Determine recommended action
    let recommendedAction: 'approve' | 'review' | 'reject' = 'approve';

    if (isFlagged) {
      if (maxConfidence >= 0.9 || harmfulContentCheck.categories['sexual/minors']) {
        recommendedAction = 'reject'; // Urgent: auto-reject
      } else if (maxConfidence >= 0.7) {
        recommendedAction = 'review'; // High priority review
      } else {
        recommendedAction = 'review'; // Normal review
      }
    }

    const moderationStatus = isFlagged ? 'flagged' : 'clean';

    console.log(`Moderation result: ${moderationStatus} (confidence: ${(maxConfidence * 100).toFixed(1)}%, action: ${recommendedAction})`);

    return {
      isFlagged,
      confidence: maxConfidence,
      flagReasons,
      harmfulContent: harmfulContentCheck,
      spamDetection: spamCheck,
      moderationStatus,
      recommendedAction
    };

  } catch (error) {
    console.error('Error in moderateContent:', error);
    throw error;
  }
}

/**
 * Get moderation statistics for a given period
 * @param results - Array of moderation results
 * @returns Statistics summary
 */
export function getModerationStats(results: ModerationResult[]) {
  const total = results.length;
  const flagged = results.filter(r => r.isFlagged).length;
  const clean = total - flagged;

  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / total;

  const actionCounts = results.reduce((acc, r) => {
    acc[r.recommendedAction] = (acc[r.recommendedAction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total,
    flagged,
    clean,
    flagRate: (flagged / total) * 100,
    avgConfidence,
    actionCounts
  };
}
