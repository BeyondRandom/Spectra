// Import the full dictionary data directly
import { FULL_DICTIONARY } from './fullDictionary';

// Interface for a word with start and end positions
export interface WordWithPosition {
  word: string;
  length: number;
}

// Interface for the result of finding multiple words with secondaries
export interface WordHierarchyResult {
  primaryWords: string[];
  secondaryWords: Map<string, string[]>; // Map of primary word -> its secondary words
}

// Interface for tagged words with level information
export interface TaggedWord {
  word: string;
  level: number; // 1=primary, 2=secondary, 3=tertiary
  parent?: string; // Parent word (for secondary/tertiary)
  sourceType: string; // 'row' or 'column'
  sourceIndex: number; // Row or column index
}

// Dictionary set for fast lookups - initialize immediately from imported data
let dictionary: Set<string> = new Set(FULL_DICTIONARY.map(word => word.toUpperCase()));
console.log(`📚 DICTIONARY LOADED: ${dictionary.size} words available for word finding`);

// Promise-based delay function
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Finds and tags words in a 3-stage parallelized process.
 * Stage 1: Find primary words from rows/columns (parallel)
 * Stage 2: Find secondary words from primary words (parallel)
 * Stage 3: Find tertiary words from secondary words (parallel)
 * 
 * @param sequences Array of letter sequences (rows or columns)
 * @param sourceType 'row' or 'column'
 * @returns Promise resolving to array of tagged words
 */
// Timeout constants based on measured averages + generous buffer to prevent chain breaks
const PRIMARY_PARALLEL_TIMEOUT = 500; // Primary words: generous timeout to prevent failures
const SECONDARY_PARALLEL_TIMEOUT = 600; // Secondary words: generous timeout to prevent failures
// Tertiary never needs sequential fallback - always parallel

/**
 * Create a timeout wrapper for promises
 */
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, taskName: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${taskName} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

/**
 * TIERED TIMEOUT SYSTEM: Find primary words with parallel processing + sequential fallback
 */
const findPrimaryWordsWithTimeout = async (sequences: string[][], sourceType: 'row' | 'column'): Promise<TaggedWord[]> => {
  console.log(`🚀 PRIMARY STAGE: Attempting parallel processing for ${sequences.length} ${sourceType}s (timeout: ${PRIMARY_PARALLEL_TIMEOUT}ms)`);
  
  try {
    // Try parallel processing first with timeout
    const primaryWordsPromises = sequences.map(async (letters, i) => {
      const primaryWords = findMultipleWords(letters);
      return primaryWords.map(word => ({
        word,
        level: 1,
        sourceType,
        sourceIndex: i
      }));
    });
    
    const primaryWordsArrays = await withTimeout(Promise.all(primaryWordsPromises), PRIMARY_PARALLEL_TIMEOUT, 'Primary word finding');
    
    const primaryWords = primaryWordsArrays.flat();
    console.log(`🚀 PRIMARY SUCCESS: Parallel processing completed - found ${primaryWords.length} primary words`);
    return primaryWords;
    
  } catch (error) {
    console.warn(`🚀 PRIMARY TIMEOUT: Parallel processing failed (${error.message}), falling back to sequential`);
    
    // Sequential fallback
    const primaryWords: TaggedWord[] = [];
    for (let i = 0; i < sequences.length; i++) {
      try {
        const words = findMultipleWords(sequences[i]);
        words.forEach(word => {
          primaryWords.push({
            word,
            level: 1,
            sourceType,
            sourceIndex: i
          });
        });
      } catch (seqError) {
        console.warn(`Sequential processing failed for ${sourceType} ${i}:`, seqError);
      }
    }
    
    console.log(`🚀 PRIMARY FALLBACK: Sequential processing completed - found ${primaryWords.length} primary words`);
    return primaryWords;
  }
};

/**
 * TIERED TIMEOUT SYSTEM: Find secondary words with parallel processing + sequential fallback
 */
const findSecondaryWordsWithTimeout = async (primaryWords: TaggedWord[]): Promise<TaggedWord[]> => {
  console.log(`🚀 SECONDARY STAGE: Attempting parallel processing for ${primaryWords.length} primary words (timeout: ${SECONDARY_PARALLEL_TIMEOUT}ms)`);
  
  try {
    // Try parallel processing first with timeout
    const secondaryWordsPromises = primaryWords.map(async (primaryWordObj) => {
      const secondaryWords = findSecondaryWords(primaryWordObj.word);
      return secondaryWords.map(word => ({
        word,
        level: 2,
        parent: primaryWordObj.word,
        sourceType: primaryWordObj.sourceType,
        sourceIndex: primaryWordObj.sourceIndex
      }));
    });
    
    const secondaryWordsArrays = await withTimeout(Promise.all(secondaryWordsPromises), SECONDARY_PARALLEL_TIMEOUT, 'Secondary word finding');
    
    const secondaryWords = secondaryWordsArrays.flat();
    console.log(`🚀 SECONDARY SUCCESS: Parallel processing completed - found ${secondaryWords.length} secondary words`);
    return secondaryWords;
    
  } catch (error) {
    console.warn(`🚀 SECONDARY TIMEOUT: Parallel processing failed (${error.message}), falling back to sequential`);
    
    // Sequential fallback
    const secondaryWords: TaggedWord[] = [];
    for (const primaryWordObj of primaryWords) {
      try {
        const words = findSecondaryWords(primaryWordObj.word);
        words.forEach(word => {
          secondaryWords.push({
            word,
            level: 2,
            parent: primaryWordObj.word,
            sourceType: primaryWordObj.sourceType,
            sourceIndex: primaryWordObj.sourceIndex
          });
        });
      } catch (seqError) {
        console.warn(`Sequential secondary processing failed for ${primaryWordObj.word}:`, seqError);
      }
    }
    
    console.log(`🚀 SECONDARY FALLBACK: Sequential processing completed - found ${secondaryWords.length} secondary words`);
    return secondaryWords;
  }
};

export const findAndTagWordsParallel = async (
  sequences: string[][],
  sourceType: 'row' | 'column'
): Promise<TaggedWord[]> => {
  console.log(`🚀 TIERED PROCESSING: Starting 3-stage word finding for ${sequences.length} ${sourceType}s with timeout fallbacks`);
  
  // STAGE 1: Primary words with timeout + fallback
  const primaryWords = await findPrimaryWordsWithTimeout(sequences, sourceType);
  
  // STAGE 2: Secondary words with timeout + fallback
  const secondaryWords = await findSecondaryWordsWithTimeout(primaryWords);
  
  // STAGE 3: Tertiary words - always parallel (no timeout needed - single word per parent)
  console.log(`🚀 TERTIARY STAGE: Processing ${secondaryWords.length} secondary words (always parallel - no timeout)`);
  
  const tertiaryWordsPromises = secondaryWords.map(async (secondaryWordObj) => {
    try {
      // For tertiary words, find exactly 1 "next longest" word from each secondary word
      const tertiaryWord = findTertiaryWord(secondaryWordObj.word);
      if (tertiaryWord) {
        return [{
          word: tertiaryWord,
          level: 3,
          parent: secondaryWordObj.word,
          sourceType: secondaryWordObj.sourceType,
          sourceIndex: secondaryWordObj.sourceIndex
        }];
      }
      return [];
    } catch (error) {
      console.warn(`Tertiary processing failed for ${secondaryWordObj.word}:`, error);
      return [];
    }
  });
  
  const tertiaryWordsArrays = await Promise.all(tertiaryWordsPromises);
  const tertiaryWords = tertiaryWordsArrays.flat();
  
  console.log(`🚀 TERTIARY SUCCESS: Found ${tertiaryWords.length} tertiary words`);
  
  // Combine all words from all three stages
  const allTaggedWords = [...primaryWords, ...secondaryWords, ...tertiaryWords];
  
  console.log(`🚀 TIERED PROCESSING COMPLETE: Found ${allTaggedWords.length} total words across all 3 stages`);
  console.log(`  - ${primaryWords.length} primary words (level 1)`);
  console.log(`  - ${secondaryWords.length} secondary words (level 2)`);
  console.log(`  - ${tertiaryWords.length} tertiary words (level 3)`);
  
  return allTaggedWords;
};

// Function to initialize dictionary with all 9000+ words from our imported data
export const initializeDictionary = async (): Promise<void> => {
  console.log("Starting dictionary initialization with complete word list...");
    
  // Start with an empty dictionary
  dictionary = new Set();
  
  // FULL_DICTIONARY is already an array since it has .split('\n') at the end of the file
  const words = FULL_DICTIONARY;
  console.log(`Processing ${words.length} words from the full dictionary...`);
  
  // Add each word to our dictionary Set
  for (const word of words) {
    if (word && word.trim().length > 0) {
      dictionary.add(word.trim());
    }
  }
  
  console.log(`Successfully loaded ${dictionary.size} words from complete dictionary`);
  
  // Log dictionary statistics
  console.log(`Dictionary loaded with total of ${dictionary.size} words`);
  
  // Debug: Sample some words from across the dictionary
  const dictArray = Array.from(dictionary);
  const sampleWords = dictArray.length >= 10 ? 
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => dictArray[Math.floor(i * dictArray.length / 10)]) : 
    dictArray;
  
  console.log(`Sample dictionary words: ${sampleWords.join(', ')}`);
};

// Check if a word exists in the dictionary
export const isValidWord = (word: string): boolean => {
  return dictionary.has(word.toUpperCase());
};

/**
 * ENHANCED SYSTEM: Find multiple independent words from a set of letters
 * This function finds up to 3 non-overlapping words from a set of letters
 * For each of these independent words, it also tries to find 1 secondary word
 * @param letters Array of letters to form words from
 * @returns Array of non-overlapping words (up to 3)
 */

export const findMultipleWords = (letters: string[]): string[] => {
  console.log(`Finding multiple independent words using letters: ${letters.join('')}`);
  
  // Check if we have valid input
  if (!letters || letters.length === 0) {
    console.error("⚠️ WORD ERROR: Empty letter array passed to findMultipleWords");
    return [];
  }
  
  // Check if the letters are valid (not empty)
  const validLetters = letters.filter(l => l && l.trim().length > 0);
  if (validLetters.length === 0) {
    console.error("⚠️ WORD ERROR: No valid letters in array passed to findMultipleWords");
    return [];
  }
  
  // Create a letter frequency map from the input letters
  const letterCount = new Map<string, number>();
  for (const letter of validLetters) {
    letterCount.set(letter, (letterCount.get(letter) || 0) + 1);
  }
  
  console.log(`Letter counts:`, Object.fromEntries(letterCount));
  
  // Dictionary is always loaded globally - no need to check or reload
  
  // Get all valid words that can be formed from these letters
  const validWords: WordWithPosition[] = [];
  
  // Get all words from our dictionary, sorted by length (longest first)
  const allDictionaryWords = Array.from(dictionary);
  console.log(`Dictionary size: ${allDictionaryWords.length} words`);
  const sortedWords = allDictionaryWords.sort((a, b) => b.length - a.length);
  
  let wordsChecked = 0;
  
  // Try to find ALL words from our dictionary that can be formed with these letters
  for (const word of sortedWords) {
    // No length restrictions - use "next longest" principle for all valid dictionary words
    
    wordsChecked++;
    
    // Clone our letter count for this word check
    const availableLetters = new Map(letterCount);
    let canForm = true;
    
    // Check if we can form this word with the available letters
    for (const char of word) {
      const count = availableLetters.get(char) || 0;
      if (count <= 0) {
        canForm = false;
        break;
      }
      availableLetters.set(char, count - 1);
    }
    
    if (canForm) {
      // Add to our list of valid words
      validWords.push({
        word,
        length: word.length
      });
    }
    
    // Log progress every 1000 words
    if (wordsChecked % 1000 === 0) {
      console.log(`Checked ${wordsChecked} words from dictionary...`);
    }
    
    // Once we have enough potential words, we can stop searching
    if (validWords.length >= 50) { // Increased from 20 to 50 to have more options for secondary words
      console.log(`Found 50+ valid words, stopping early for efficiency`);
      break;
    }
  }
  
  console.log(`Found ${validWords.length} valid words that can be formed from these letters`);
  
  // Sort valid words by length (longest first)
  validWords.sort((a, b) => b.length - a.length);
  
  // Debug log the top words found
  if (validWords.length > 0) {
    console.log("Top words found:");
    validWords.slice(0, Math.min(10, validWords.length)).forEach(({ word, length }) => {
      console.log(`- "${word}" (length: ${length})`);
    });
  }
  
  // Now, we need to select up to 3 independent words
  // We prefer longer words, but they must not overlap
  // We use a greedy approach: take the longest word first, then the next longest that doesn't conflict
  
  const selectedWords: string[] = [];
  const usedLetters = new Map<string, number>(); // Track letters that have been used
  
  // Function to check if a word can be formed with the remaining letters
  const canFormWord = (word: string, usedLetters: Map<string, number>): boolean => {
    // Clone the current letter frequency map
    const remainingLetters = new Map(letterCount);
    
    // Remove already used letters
    for (const [letter, count] of usedLetters.entries()) {
      const available = remainingLetters.get(letter) || 0;
      remainingLetters.set(letter, Math.max(0, available - count));
    }
    
    // Check if we can form the word with remaining letters
    for (const char of word) {
      const count = remainingLetters.get(char) || 0;
      if (count <= 0) return false;
      remainingLetters.set(char, count - 1);
    }
    
    return true;
  };
  
  // Try to find up to 3 non-overlapping words
  for (const { word } of validWords) {
    // Skip if we already have 3 words
    if (selectedWords.length >= 3) break;
    
    // Check if this word can be formed with the remaining letters
    if (canFormWord(word, usedLetters)) {
      // Add this word to our selected words
      selectedWords.push(word);
      console.log(`✅ Selected word ${selectedWords.length}: "${word}"`);
      
      // Update the used letters
      for (const char of word) {
        usedLetters.set(char, (usedLetters.get(char) || 0) + 1);
      }
    }
  }
  
  console.log(`Final selection: ${selectedWords.length} independent words`);
  selectedWords.forEach((word, i) => {
    console.log(`Word ${i+1}: "${word}" (length: ${word.length})`);
  });
  
  return selectedWords;
};

/**
 * NEW FEATURE: Find a secondary longest word from a primary word
 * This function attempts to find a secondary word from the letters of a primary word
 * @param primaryWord The primary word to extract a secondary word from
 * @returns The secondary word, or empty string if none found
 */
// Declare type definition for the global secondaryWordStats object
declare global {
  interface Window {
    secondaryWordStats: {
      processed: number;
      found: number;
      notFound: number;
      scores: { primary: string; secondary: string; score: number }[];
    };
  }
}

// Global tracking vars to monitor secondary word performance
if (typeof window !== 'undefined' && !window.secondaryWordStats) {
  window.secondaryWordStats = {
    processed: 0,
    found: 0,
    notFound: 0,
    scores: [] // Will hold {primary, secondary, score} objects
  };
}

/**
 * Finds exactly 1 tertiary word from a secondary word using the "next longest" principle
 * @param secondaryWord The secondary word to extract a tertiary word from
 * @returns The tertiary word, or empty string if none found
 */
export const findTertiaryWord = (secondaryWord: string): string => {
  if (!secondaryWord || secondaryWord.length < 1) {
    return '';
  }
  
  console.log(`🔍 TERTIARY DEBUG: Finding 1 tertiary word from secondary word: "${secondaryWord}" (${secondaryWord.length} letters)`);
  
  // Create a letter frequency map from the secondary word
  const letterCount = new Map<string, number>();
  for (const letter of secondaryWord) {
    letterCount.set(letter, (letterCount.get(letter) || 0) + 1);
  }
  
  // Start from the longest possible length (secondaryWord.length - 1) and work down
  // Find the first valid word we encounter (next longest principle)
  for (let targetLength = secondaryWord.length - 1; targetLength >= 1; targetLength--) {
    // Get words of this specific length from dictionary
    const wordsOfLength = Array.from(dictionary).filter(word => word.length === targetLength);
    
    for (const word of wordsOfLength) {
      // Check if this word can be formed from the secondary word's letters
      const wordLetterCount = new Map<string, number>();
      for (const letter of word) {
        wordLetterCount.set(letter, (wordLetterCount.get(letter) || 0) + 1);
      }
      
      // Verify all letters in the candidate word are available in sufficient quantity
      let canForm = true;
      for (const [letter, count] of wordLetterCount) {
        if ((letterCount.get(letter) || 0) < count) {
          canForm = false;
          break;
        }
      }
      
      if (canForm) {
        console.log(`🔍 TERTIARY SUCCESS: Found "${word}" (${word.length} letters) from "${secondaryWord}"`);
        return word;
      }
    }
  }
  
  console.log(`🔍 TERTIARY DEBUG: No tertiary word found for "${secondaryWord}"`);
  return '';
};

export const findSecondaryWords = (primaryWord: string): string[] => {
  // Update global tracking stats
  window.secondaryWordStats.processed++;
  
  if (!primaryWord || primaryWord.length < 1) {
    console.log(`🔍 SECONDARY DEBUG: Primary word "${primaryWord}" rejected - empty`);
    window.secondaryWordStats.notFound++;
    return []; // Only reject truly empty words
  }
  
  console.log(`🔍 SECONDARY DEBUG: Finding 2 secondary words from primary word: "${primaryWord}" (${primaryWord.length} letters)`);
  
  // Create a letter frequency map from the primary word
  const letterCount = new Map<string, number>();
  for (const letter of primaryWord) {
    letterCount.set(letter, (letterCount.get(letter) || 0) + 1);
  }
  
  const foundWords: string[] = [];
  
  // Start from the longest possible length (primaryWord.length - 1) and work down
  // Find up to 2 words, taking the first 2 valid words we encounter
  // Allow words of any length including 1 and 2 letter words
  for (let targetLength = primaryWord.length - 1; targetLength >= 1 && foundWords.length < 2; targetLength--) {
    // Get words of this specific length from dictionary
    const wordsOfLength = Array.from(dictionary).filter(word => word.length === targetLength);
    
    // Check each word of this length to see if it can be formed
    for (const word of wordsOfLength) {
      if (word === primaryWord) continue; // Skip the primary word itself
      if (foundWords.includes(word)) continue; // Skip duplicates
      
      // Clone our letter count for this word check
      const availableLetters = new Map(letterCount);
      let canForm = true;
      
      // Check if we can form this word with the letters from the primary word
      for (const char of word) {
        const count = availableLetters.get(char) || 0;
        if (count <= 0) {
          canForm = false;
          break;
        }
        availableLetters.set(char, count - 1);
      }
      
      if (canForm) {
        foundWords.push(word);
        console.log(`🔍 SECONDARY DEBUG: Found secondary word ${foundWords.length}: "${word}" (length: ${word.length}) from "${primaryWord}"`);
        
        // Stop when we have 2 words
        if (foundWords.length >= 2) {
          break;
        }
      }
    }
  }
  
  if (foundWords.length > 0) {
    console.log(`🔍 SECONDARY DEBUG: Found ${foundWords.length} secondary words from "${primaryWord}": ${foundWords.join(', ')}`);
    window.secondaryWordStats.found++;
  } else {
    console.log(`🔍 SECONDARY DEBUG: No valid secondary words found for "${primaryWord}"`);
    window.secondaryWordStats.notFound++;
  }
  
  return foundWords;
};

/**
 * ENHANCED SYSTEM: Find multiple independent words and their secondary words
 * @param letters Array of letters to form words from
 * @returns Object containing arrays of primary and secondary words
 */
export const findMultipleWordsWithSecondaries = (letters: string[]): WordHierarchyResult => {
  console.log(`Finding multiple independent words with secondaries using letters: ${letters.join('')}`);
  
  // Get the primary words first
  const primaryWords = findMultipleWords(letters);
  
  // For each primary word, try to find a secondary word
  const secondaryWords = new Map<string, string[]>();
  
  for (const primaryWord of primaryWords) {
    const secondaryWordsArr = findSecondaryWords(primaryWord);
    if (secondaryWordsArr.length > 0) {
      // Store all secondary words that tie for the longest length
      secondaryWords.set(primaryWord, secondaryWordsArr);
      console.log(`Found ${secondaryWordsArr.length} tied secondary words for "${primaryWord}": ${secondaryWordsArr.join(', ')}`);
    }
  }
  
  console.log(`Found ${primaryWords.length} primary words and ${secondaryWords.size} secondary words`);
  
  // Debug: Print all primary words and their secondary words
  primaryWords.forEach(primary => {
    const secondaries = secondaryWords.get(primary) || [];
    console.log(`Primary: "${primary}" → Secondary: [${secondaries.join(', ')}]`);
  });
  
  return {
    primaryWords,
    secondaryWords
  };
};

// Legacy functions maintained for backward compatibility
// These will be replaced in the main processing logic

// Find the longest valid word that can be formed using letters from the input
export const findLongestWord = (letters: string[]): string => {
  // Simply use the first word from our new multiple word finder
  const words = findMultipleWords(letters);
  return words.length > 0 ? words[0] : '';
};

// Find the second longest word using only letters from the first word
export const findSecondLongestWord = (firstWord: string): string => {
  // This is maintained for backward compatibility but will no longer be used
  // in the new processing flow
  if (!firstWord) return '';
  console.log(`DEPRECATED: findSecondLongestWord is no longer used in new system`);
  return '';
};

// Find the third longest word using only letters from the second word
export const findThirdLongestWord = (secondWord: string): string => {
  // This is maintained for backward compatibility but will no longer be used
  // in the new processing flow
  if (!secondWord) return '';
  console.log(`DEPRECATED: findThirdLongestWord is no longer used in new system`);
  return '';
};

/**
 * Backward compatibility wrapper for findSecondaryWords
 * This allows existing code to continue working while we transition to the new array-based approach
 * @param primaryWord The primary word to extract secondary words from
 * @returns The first secondary word from the array, or empty string if none found
 */
export const findSecondaryWord = (primaryWord: string): string => {
  // Call the new function that returns an array
  const words = findSecondaryWords(primaryWord);
  // Return just the first word (or empty string if no words found)
  return words.length > 0 ? words[0] : '';
};