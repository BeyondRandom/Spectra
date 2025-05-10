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

// Dictionary set for fast lookups
let dictionary: Set<string> = new Set();

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
  
  // Verify dictionary has been properly initialized
  if (!dictionary || dictionary.size === 0) {
    console.error("⚠️ WORD ERROR: Dictionary not initialized in findMultipleWords");
    return [];
  }
  
  // Get all valid words that can be formed from these letters
  const validWords: WordWithPosition[] = [];
  
  // Get all words from our dictionary, sorted by length (longest first)
  const allDictionaryWords = Array.from(dictionary);
  console.log(`Dictionary size: ${allDictionaryWords.length} words`);
  const sortedWords = allDictionaryWords.sort((a, b) => b.length - a.length);
  
  let wordsChecked = 0;
  
  // Try to find ALL words from our dictionary that can be formed with these letters
  for (const word of sortedWords) {
    // Skip too short words
    if (word.length < 3) continue;
    
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

export const findSecondaryWords = (primaryWord: string): string[] => {
  // Update global tracking stats
  window.secondaryWordStats.processed++;
  
  if (!primaryWord || primaryWord.length < 4) {
    console.log(`🔍 SECONDARY DEBUG: Primary word "${primaryWord}" rejected - too short (<4 chars)`);
    window.secondaryWordStats.notFound++;
    return []; // Need at least 4 letters to find a meaningful secondary word
  }
  
  console.log(`🔍 SECONDARY DEBUG: Finding secondary words from primary word: "${primaryWord}" (${primaryWord.length} letters)`);
  
  // Convert the word to an array of characters
  const letters = primaryWord.split('');
  
  // Create a letter frequency map from the primary word
  const letterCount = new Map<string, number>();
  for (const letter of letters) {
    letterCount.set(letter, (letterCount.get(letter) || 0) + 1);
  }
  
  // Log letter frequencies for debugging
  console.log(`🔍 SECONDARY DEBUG: Letter frequencies in "${primaryWord}":`, 
    Array.from(letterCount.entries())
      .map(([letter, count]) => `${letter}:${count}`)
      .join(', ')
  );
  
  // Get all valid words that can be formed from these letters
  const validWords: WordWithPosition[] = [];
  
  // Get all words from our dictionary, sorted by length (longest first)
  const allDictionaryWords = Array.from(dictionary);
  console.log(`🔍 SECONDARY DEBUG: Dictionary has ${allDictionaryWords.length} words to check against`);
  const sortedWords = allDictionaryWords.sort((a, b) => b.length - a.length);
  
  let wordsChecked = 0;
  let wordsMatched = 0;
  
  // Try to find ALL words that can be formed with the letters of the primary word
  for (const word of sortedWords) {
    // UPDATED: Now accepting words of length 2 or greater (was 3)
    // Skip too short words and skip the primary word itself
    if (word.length < 2 || word === primaryWord) {
      if (word === primaryWord) {
        console.log(`🔍 SECONDARY DEBUG: Skipping primary word "${word}" itself`);
      }
      continue;
    }
    
    wordsChecked++;
    
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
      wordsMatched++;
      // Add to our list of valid words
      validWords.push({
        word,
        length: word.length
      });
      console.log(`🔍 SECONDARY DEBUG: Found valid secondary word "${word}" (length: ${word.length})`);
    }
    
    // Once we have enough potential words, we can stop searching
    if (validWords.length >= 10) {
      console.log(`🔍 SECONDARY DEBUG: Found ${validWords.length} potential secondary words, stopping search`);
      break;
    }
    
    // Log progress periodically
    if (wordsChecked % 1000 === 0) {
      console.log(`🔍 SECONDARY DEBUG: Checked ${wordsChecked} words, found ${wordsMatched} matches so far`);
    }
  }
  
  console.log(`🔍 SECONDARY DEBUG: Checked total of ${wordsChecked} words, found ${validWords.length} valid secondary words`);
  
  // Sort valid secondary words by length (longest first)
  validWords.sort((a, b) => b.length - a.length);
  
  // Debug: Show all valid secondary words found
  if (validWords.length > 0) {
    console.log(`🔍 SECONDARY DEBUG: All valid secondary words for "${primaryWord}":`);
    validWords.forEach((wordObj, index) => {
      console.log(`  ${index+1}. "${wordObj.word}" (length: ${wordObj.length})`);
    });
  }
  
  // Return all secondary words that tie for the longest length
  if (validWords.length > 0) {
    // Update tracking stats for successful find
    window.secondaryWordStats.found++;
    
    // Get the length of the longest word
    const longestLength = validWords[0].length;
    
    // Find all words that have this same length
    const longestWords = validWords
      .filter(wordObj => wordObj.length === longestLength)
      .map(wordObj => wordObj.word);
    
    console.log(`🔍 SECONDARY DEBUG: Found ${longestWords.length} secondary words with length ${longestLength} from primary word "${primaryWord}":`);
    longestWords.forEach((word, index) => {
      console.log(`  ${index+1}. "${word}"`);
    });
    
    // Log detailed stats about secondary word creation
    console.log(`🔍📊 SECONDARY STATS: Total processed: ${window.secondaryWordStats.processed}, Found: ${window.secondaryWordStats.found}, Success Rate: ${Math.round((window.secondaryWordStats.found/window.secondaryWordStats.processed)*100)}%`);
    
    return longestWords;
  } else {
    // Update tracking stats for no word found
    window.secondaryWordStats.notFound++;
    console.log(`🔍 SECONDARY DEBUG: No valid secondary word found for primary word "${primaryWord}"`);
    console.log(`🔍📊 SECONDARY STATS: Total processed: ${window.secondaryWordStats.processed}, Found: ${window.secondaryWordStats.found}, Success Rate: ${Math.round((window.secondaryWordStats.found/window.secondaryWordStats.processed)*100)}%`);
    return [];
  }
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