// Simplified word finder that exhaustively searches for all possible words from a 20-letter strand

import { FULL_DICTIONARY } from './fullDictionary';

// Create dictionary set for fast lookups
const dictionary: Set<string> = new Set(FULL_DICTIONARY.map(word => word.toUpperCase()));

export interface FoundWord {
  word: string;
  length: number;
}

/**
 * Exhaustively finds all possible words that can be formed from the given letter strand
 * Uses letter frequency counting to verify words can actually be formed
 * Returns a flat list of all valid dictionary words
 */
export const findAllWordsFromStrand = (strand: string): FoundWord[] => {
  console.log(`🔍 SIMPLIFIED WORD FINDER: Starting exhaustive search on strand: "${strand}"`);
  
  if (!strand || strand.length === 0) {
    console.log(`🔍 SIMPLIFIED: Empty strand provided, returning no words`);
    return [];
  }

  // Create letter frequency map from the strand
  const strandLetterCount = new Map<string, number>();
  for (const letter of strand.toUpperCase()) {
    strandLetterCount.set(letter, (strandLetterCount.get(letter) || 0) + 1);
  }

  console.log(`🔍 SIMPLIFIED: Strand letter frequencies:`, Object.fromEntries(strandLetterCount));

  const foundWords: FoundWord[] = [];
  const foundWordSet = new Set<string>(); // For duplicate checking

  // Iterate through entire dictionary sequentially
  console.log(`🔍 SIMPLIFIED: Checking ${dictionary.size} dictionary words sequentially...`);
  
  let wordsChecked = 0;
  let wordsFound = 0;

  for (const dictionaryWord of dictionary) {
    wordsChecked++;
    
    if (wordsChecked % 10000 === 0) {
      console.log(`🔍 SIMPLIFIED: Progress - checked ${wordsChecked} words, found ${wordsFound} valid words`);
    }

    // Skip if we've already found this word
    if (foundWordSet.has(dictionaryWord)) {
      continue;
    }

    // Check if this dictionary word can be formed from our strand letters
    if (canFormWordFromStrand(dictionaryWord, strandLetterCount)) {
      foundWords.push({
        word: dictionaryWord,
        length: dictionaryWord.length
      });
      foundWordSet.add(dictionaryWord);
      wordsFound++;
      
      console.log(`🔍 SIMPLIFIED: Found word #${wordsFound}: "${dictionaryWord}" (${dictionaryWord.length} letters)`);
    }
  }

  console.log(`🔍 SIMPLIFIED: Search complete! Found ${foundWords.length} total words from strand "${strand}"`);
  console.log(`🔍 SIMPLIFIED: Checked ${wordsChecked} dictionary entries`);

  // Sort by length descending, then alphabetically
  foundWords.sort((a, b) => {
    if (a.length !== b.length) {
      return b.length - a.length; // Longer words first
    }
    return a.word.localeCompare(b.word); // Alphabetical for same length
  });

  // Log some examples
  if (foundWords.length > 0) {
    const examples = foundWords.slice(0, 5).map(w => `"${w.word}"(${w.length})`).join(', ');
    console.log(`🔍 SIMPLIFIED: Top 5 words: ${examples}`);
  }

  return foundWords;
};

/**
 * Helper function to check if a word can be formed from the available letters
 * Uses letter frequency counting to ensure sufficient letters are available
 */
function canFormWordFromStrand(word: string, strandLetterCount: Map<string, number>): boolean {
  // Create letter frequency map for the word
  const wordLetterCount = new Map<string, number>();
  for (const letter of word.toUpperCase()) {
    wordLetterCount.set(letter, (wordLetterCount.get(letter) || 0) + 1);
  }

  // Check if we have enough of each letter in the strand
  for (const [letter, neededCount] of wordLetterCount) {
    const availableCount = strandLetterCount.get(letter) || 0;
    if (availableCount < neededCount) {
      return false; // Not enough of this letter available
    }
  }

  return true; // All letters are available in sufficient quantities
}