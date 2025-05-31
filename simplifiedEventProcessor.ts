// Simplified event processor that bypasses the complex 3-stage pipeline
// Directly connects 5-strand word finding to cosmic scoring

import { generateFiveStrands } from './gridUtils';
import { findAllWordsFromStrand } from './simplifiedWordFinder';
import { evaluateWordCosmicScore, calculateAttentionScore } from './psychicRandomizer';

export interface SimplifiedWord {
  word: string;
  score: number;
  frequency: number;
  sourceType: 'strand';
  sourceIndex: 0;
  level: 1;
}

/**
 * Process a strand and fire the cosmicScoringComplete event
 * This bypasses the entire 3-stage pipeline and goes directly to cosmic scoring
 */
export const processStrandDirectly = async (gridNumber: number): Promise<void> => {
  console.log(`🎯 SIMPLIFIED PIPELINE: Starting 5-strand parallel processing for grid #${gridNumber}`);
  
  try {
    // Generate 5 strands of 20 letters each (100 total letters)
    const fiveStrands = await generateFiveStrands();
    console.log(`🎯 STRANDS: Generated 5 strands for grid #${gridNumber}:`);
    fiveStrands.forEach((strand: string, index: number) => {
      console.log(`🎯   STRAND ${index + 1}: "${strand}"`);
    });
    
    // Process all 5 strands in parallel
    console.log(`🎯 WORDS: Finding words from all 5 strands in parallel`);
    const strandWordPromises = fiveStrands.map(async (strand: string, strandIndex: number) => {
      const words = findAllWordsFromStrand(strand);
      console.log(`🎯 STRAND ${strandIndex + 1}: Found ${words.length} words`);
      return words;
    });
    
    // Wait for all strand processing to complete
    const strandResults = await Promise.all(strandWordPromises);
    
    // Combine all words from all strands
    const allWords = strandResults.flat();
    
    // Count word frequencies across all strands
    const wordFrequencyMap = new Map<string, number>();
    allWords.forEach((wordInfo: any) => {
      const currentCount = wordFrequencyMap.get(wordInfo.word) || 0;
      wordFrequencyMap.set(wordInfo.word, currentCount + 1);
    });
    
    // Filter to include:
    // 1. Words that appear 2 or more times (any length)
    // 2. Words that appear once but are 4+ letters long
    const filteredWords = allWords.filter((wordInfo: any) => {
      const frequency = wordFrequencyMap.get(wordInfo.word) || 0;
      const wordLength = wordInfo.word ? wordInfo.word.length : 0;
      
      // Include if frequency >= 2 OR (frequency = 1 AND length >= 4)
      return frequency >= 2 || (frequency === 1 && wordLength >= 4);
    });
    
    // Remove duplicates while preserving frequency data
    const uniqueWordMap = new Map();
    filteredWords.forEach((wordInfo: any) => {
      if (!uniqueWordMap.has(wordInfo.word)) {
        const frequency = wordFrequencyMap.get(wordInfo.word) || 0;
        uniqueWordMap.set(wordInfo.word, {
          ...wordInfo,
          frequency: frequency
        });
      }
    });
    const foundWords = Array.from(uniqueWordMap.values());
    
    console.log(`🎯 WORDS: Combined ${allWords.length} total words, filtered to ${foundWords.length} words appearing 2+ times from 5 strands`);
    console.log(`🎯 FREQUENCY: Word frequency breakdown:`, Object.fromEntries(wordFrequencyMap));
    
    // Apply cosmic scoring to all unique words in parallel
    console.log(`🎯 COSMIC: Starting parallel cosmic scoring for ${foundWords.length} words`);
    
    const cosmicScoredWords = await Promise.all(
      foundWords.map(async (wordInfo: any) => {
        const score = await evaluateWordCosmicScore(wordInfo.word);
        return {
          word: wordInfo.word,
          score: score,
          frequency: wordInfo.frequency,
          sourceType: 'strand' as const,
          sourceIndex: 0,
          level: 1
        };
      })
    );
    
    console.log(`🎯 COSMIC: Completed scoring ${cosmicScoredWords.length} words from 5-strand processing`);
    
    // Calculate attention score using proper binary array sampling (100 parallel crypto.random operations)
    const attentionScore = await calculateAttentionScore();
    
    // Generate emoji for this grid using the global alphabet array
    const gridEmoji = (window as any).getEmoji ? (window as any).getEmoji() : '😶';
    console.log(`🎭 EMOJI: Generated emoji ${gridEmoji} for grid #${gridNumber}`);
    
    // Fire the cosmicScoringComplete event that the existing system listens for
    // This will trigger GRID_CACHE storage and gridPostedToCache event
    console.log(`🎯 EVENT: Firing cosmicScoringComplete event for grid #${gridNumber}`);
    
    window.dispatchEvent(new CustomEvent("cosmicScoringComplete", {
      detail: {
        cosmicWords: cosmicScoredWords,
        gridNumber: gridNumber,
        attentionScore: attentionScore,
        emoji: gridEmoji,
        timestamp: Date.now(),
        wordBreakdown: {
          total: foundWords.length
        },
        source: 'simplified-pipeline'
      }
    }));
    
    console.log(`🎯 SUCCESS: Simplified pipeline complete for grid #${gridNumber}`);
    
  } catch (error) {
    console.error(`🎯 ERROR: Simplified pipeline failed for grid #${gridNumber}:`, error);
    
    // Fire event with empty words to maintain event flow
    const fallbackEmoji = (window as any).getEmoji ? (window as any).getEmoji() : '😶';
    window.dispatchEvent(new CustomEvent("cosmicScoringComplete", {
      detail: {
        cosmicWords: [],
        gridNumber: gridNumber,
        attentionScore: 0,
        emoji: fallbackEmoji,
        timestamp: Date.now(),
        wordBreakdown: {
          primary: 0,
          secondary: 0,
          tertiary: 0,
          total: 0
        },
        source: 'simplified-pipeline-error'
      }
    }));
  }
};

/**
 * Initialize the simplified event processor
 * This replaces the complex eventDrivenWordProcessor
 */
export function initializeSimplifiedEventProcessor() {
  console.log('🎯 SIMPLIFIED EVENT SYSTEM: Initializing direct strand processor');
  
  // Listen for requests to process strands directly
  window.addEventListener("processStrandDirectly", async (e: Event) => {
    const customEvent = e as CustomEvent;
    const { gridNumber } = customEvent.detail;
    console.log(`🎯 SIMPLIFIED: Received processStrandDirectly event for grid #${gridNumber}`);
    
    await processStrandDirectly(gridNumber);
  });
  
  console.log('🎯 SIMPLIFIED EVENT SYSTEM: Initialized and listening for processStrandDirectly events');
}