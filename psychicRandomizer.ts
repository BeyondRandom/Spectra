/**
 * Ultimate Randomized Fifty-Pass File Generator
 * Creates a structured 65,000 entry binary file on application startup
 */

// Library of cryptographic functions for enhanced randomness
import { useEffect } from 'react';

// Global store for the psychic binary array 
// Pre-generate a static array of 65,000 binary values in a fixed pattern of 5 ones, 5 zeros
let globalPsychicBinaryArray: number[] = [];

// Initialize the binary array immediately with a fixed pattern
// This is a hardcoded pattern, not dynamically generated
for (let i = 0; i < 6500; i++) { // 6500 cycles of 10 values
  // Add 5 ones followed by 5 zeros for each cycle
  globalPsychicBinaryArray.push(1, 1, 1, 1, 1, 0, 0, 0, 0, 0);
}

// Global cosmic threshold that can be updated by slider - ensure it's consistently 66 everywhere (scaled for 0-100)
export let COSMIC_THRESHOLD = 66; // Default value set to 66 on startup (equivalent to 33/50 scaled to 100)

// Listen for window-level updates to the cosmic threshold
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'COSMIC_THRESHOLD_VALUE', {
    set: function(value) {
      if (typeof value === 'number' && value >= 40 && value <= 100) {
        console.log(`🔮 psychicRandomizer: Updated global COSMIC_THRESHOLD to ${value}/100`);
        COSMIC_THRESHOLD = value;
      }
    },
    get: function() {
      return COSMIC_THRESHOLD;
    }
  });
}

// Listen for threshold changes
if (typeof window !== 'undefined') {
  window.addEventListener('cosmic-threshold-change', (e: any) => {
    if (e.detail && typeof e.detail.threshold === 'number') {
      COSMIC_THRESHOLD = e.detail.threshold;
      console.log(`🔮 psychicRandomizer: Updated global COSMIC_THRESHOLD to ${COSMIC_THRESHOLD}/100`);
    }
  });
}

// Log information about our static binary array
console.log("Static binary array ready with 65,000 values in a repeating pattern (5 ones, 5 zeros)");
console.log("Sample binary pattern:", globalPsychicBinaryArray.slice(0, 30).join(''));

// Verify we have exactly 50% ones and 50% zeros in our static array
const onesCount = globalPsychicBinaryArray.reduce((sum, val) => sum + val, 0);
const zerosCount = globalPsychicBinaryArray.length - onesCount;
console.log(`Distribution check: ${onesCount} ones (${(onesCount/globalPsychicBinaryArray.length*100).toFixed(2)}%) and ${zerosCount} zeros (${(zerosCount/globalPsychicBinaryArray.length*100).toFixed(2)}%)`);

/**
 * Calculates attention score by sampling 50 random positions from the 65k binary array
 * in parallel using crypto.getRandomValues.
 * @returns A Promise resolving to a score between 0-50
 */
export const calculateAttentionScore = (): Promise<number> => {
  if (globalPsychicBinaryArray.length === 0) {
    console.warn("Cannot calculate attention score - binary array not initialized");
    return Promise.resolve(0);
  }
  
  console.log(`🔍 Calculating attention score with 50 samples (instant parallel processing)`);
  
  // TRUE PARALLEL: Get all 50 random values in a single crypto.getRandomValues call
  const randomBuffer = new Uint32Array(50);
  window.crypto.getRandomValues(randomBuffer);
  
  // Initialize score counter
  let totalScore = 0;
  
  // Process all 50 samples simultaneously
  for (let i = 0; i < 50; i++) {
    // Scale each random value to our array length
    const randomPosition = randomBuffer[i] % globalPsychicBinaryArray.length;
    const binaryValue = globalPsychicBinaryArray[randomPosition];
    
    // Add to the running total
    totalScore += binaryValue;
    
    // Only log every 10th sample to reduce console spam
    if (i % 10 === 0 || i === 49) {
      console.log(`  Sample ${i+1}: Position ${randomPosition} = ${binaryValue} (running total: ${totalScore})`);
    }
  }
  
  console.log(`🔍 Final attention score: ${totalScore}/50`);
  return Promise.resolve(totalScore);
};

/**
 * Returns the static binary array as a virtual file URL (for backward compatibility)
 * This creates a temporary blob URL that represents our static binary array
 * @returns Binary Blob URL
 */
export const savePsychicBinaryFile = (): string => {
  // Convert static array to string
  const binaryString = globalPsychicBinaryArray.join('');
  
  // Create a Blob representation for compatibility with existing code
  const blob = new Blob([binaryString], { type: 'application/octet-stream' });
  
  // Create a virtual file URL (temporary, will be released when page unloads)
  const blobUrl = URL.createObjectURL(blob);
  console.log("Psychic binary file created at:", blobUrl);
  
  return blobUrl;
};

/**
 * Gets a random value from the psychic binary array using crypto.getRandomValues
 * @returns A random binary value (0 or 1)
 */
export const getRandomPsychicValue = (): number => {
  // Create a cryptographically secure random index
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);
  const randIndex = randomBuffer[0] % globalPsychicBinaryArray.length;
  return globalPsychicBinaryArray[randIndex] || 0;
};

/**
 * A helper function for delay
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Evaluates a word's cosmic significance by performing 100 random lookups
 * in the psychic binary array using TRUE parallel crypto.random operations.
 * Gets all 100 random values in a single crypto.getRandomValues call.
 * @param word The word to evaluate
 * @returns A Promise resolving to a score between 0-100 representing cosmic significance
 */
export const evaluateWordCosmicScore = (word: string): Promise<number> => {
  if (!word || globalPsychicBinaryArray.length === 0) {
    console.warn("Cannot evaluate word cosmic score - binary array not initialized");
    return Promise.resolve(0);
  }
  
  console.log(`🔮 Evaluating cosmic score for word: "${word}" with 100 passes (instant parallel processing)`);
  
  // TRUE PARALLEL: Get all 100 random values in a single crypto.getRandomValues call
  const randomBuffer = new Uint32Array(100);
  window.crypto.getRandomValues(randomBuffer);
  
  // Process all 100 values simultaneously
  let runningTotal = 0;
  const passResults = [];
  
  for (let i = 0; i < 100; i++) {
    // Scale each random value to our array length
    const randomPosition = randomBuffer[i] % globalPsychicBinaryArray.length;
    const binaryValue = globalPsychicBinaryArray[randomPosition];
    runningTotal += binaryValue;
    
    passResults.push({
      passNumber: i + 1,
      randomPosition,
      binaryValue
    });
    
    // Only log every 20th pass to reduce console spam when processing many words
    if ((i + 1) % 20 === 0 || i === 99) {
      console.log(`  Pass ${i + 1}: Position ${randomPosition} = ${binaryValue} (running total: ${runningTotal})`);
    }
  }
  
  console.log(`🔮 Final cosmic score for "${word}": ${runningTotal}/100`);
  return Promise.resolve(runningTotal);
};

/**
 * Filter words based on their cosmic significance scores
 * @param words Array of words to filter
 * @param minimumScore Minimum score required to be included (default: 6)
 * @returns Array of words and their scores, sorted by score (highest first)
 */
export interface CosmicWord {
  word: string;
  score: number;
  childWords?: CosmicWord[]; // For secondary words derived from this word (one per primary word)
  gridGeneration?: number; // Track which grid generation this word came from
  replacedWord?: string; // The word that was replaced by this word (when score is higher)
  isSecondary?: boolean; // Flag to identify if this is a secondary word (derived from a primary word)
  parent?: string; // The parent word this was derived from (for secondary words)
  sourceType?: string; // The type of source (row or column)
  sourceIndex?: number; // The index of the source (row or column number)
  forcedDerivation?: boolean; // Flag to indicate this is a forced derivation (added to maintain parent-child relationship)
  level?: number; // The level of the word (1 for primary, 2 for secondary, 3 for tertiary)
}

/**
 * Analyzes second-tier words derived from a cosmically significant first-tier word.
 * Refactored to use Promise.then() for better UI responsiveness.
 * @param parentWord The parent word object
 * @param secondTierWord The derived second-tier word to analyze
 * @param minimumScore Minimum score required to be significant
 * @returns Promise resolving to a CosmicWord object if the word is significant, undefined otherwise
 */
export const analyzeSecondTierWord = (
  parentWord: string,
  secondTierWord: string,
  minimumScore: number = COSMIC_THRESHOLD  // Use global cosmic threshold
): Promise<CosmicWord | undefined> => {
  if (!secondTierWord || secondTierWord.length === 0) {
    return Promise.resolve(undefined);
  }
  
  console.log(`🔮 Analyzing second-tier word "${secondTierWord}" derived from "${parentWord}"...`);
  
  // Use Promise.then() chain for better performance
  return evaluateWordCosmicScore(secondTierWord)
    .then(score => {
      // After getting the second-tier word score, get the parent word score
      return evaluateWordCosmicScore(parentWord)
        .then(parentScore => {
          // Add very prominent logging specifically for the 100-pass filter results
          console.log(`\n========== 100-PASS FILTER RESULT FOR SECONDARY WORD ==========`);
          console.log(`SECONDARY WORD: "${secondTierWord}" | SCORE: ${score}/100`);
          console.log(`PRIMARY WORD: "${parentWord}" | SCORE: ${parentScore}/100`);
          console.log(`THRESHOLD: ${minimumScore}/100`);
          console.log(`RESULT: ${score >= minimumScore ? 'PASS ✅' : 'FAIL ❌'}`);
          console.log(`==========================================================\n`);
          
          console.log(`  - Comparing scores: ${secondTierWord}=${score}/100 vs ${parentWord}=${parentScore}/100`);
          
          // For streaming mode: require BOTH criteria:
          // 1. Meet the minimum score threshold, AND
          // 2. Have a higher score than the parent word
          // 
          // For regular mode: only require the minimum score threshold
          
          // Log detailed secondary word score information
          console.log(`  🔍 SECONDARY WORD SCORE: "${secondTierWord}" = ${score}/100`);
          console.log(`  🔍 PRIMARY WORD SCORE: "${parentWord}" = ${parentScore}/100`);
          console.log(`  🔍 THRESHOLD: ${minimumScore}/100`);
          
          const isHigherThanParent = score > parentScore;
          const meetsThreshold = score >= minimumScore;
          
          // Add a very clear indicator of whether this word passes the 100-pass filter
          if (meetsThreshold) {
            console.log(`  ✅ PASSES 100-PASS FILTER: "${secondTierWord}" (${score}/100) meets or exceeds threshold of ${minimumScore}/100`);
          } else {
            console.log(`  ❌ FAILS 100-PASS FILTER: "${secondTierWord}" (${score}/100) does not meet threshold of ${minimumScore}/100`);
          }
          
          // Check if the word meets the minimum score threshold
          if (meetsThreshold) {
            // For regular mode, we want to show all secondary words that meet the threshold
            console.log(`  ✨ ACCEPTED: Second-tier word "${secondTierWord}" is cosmically significant with score: ${score}/100`);
            console.log(`  ${isHigherThanParent ? '🔄 REPLACING primary word' : '➡️ KEEPING as secondary word'}`);
            
            // Add a very prominent log for the user's query about secondary word scores
            console.log(`\n🌟🌟🌟 SECONDARY WORD SCORES: "${secondTierWord}" PASSED with ${score}/100 (THRESHOLD: ${minimumScore}) 🌟🌟🌟\n`);
            
            return {
              word: secondTierWord,
              score,
              replacedWord: undefined, // No longer using replacedWord concept for secondary words
              isSecondary: true, // Always mark as secondary word
              parent: parentWord // Always include parent information
            };
          } else {
            console.log(`  ⚡️ REJECTED: Secondary word "${secondTierWord}" does not meet threshold (${score}/${minimumScore})`);
            
            // Add a very prominent log for the user's query about secondary word scores - for failed words too
            console.log(`\n❌❌❌ SECONDARY WORD SCORES: "${secondTierWord}" FAILED with ${score}/100 (THRESHOLD: ${minimumScore}) ❌❌❌\n`);
            
            return undefined;
          }
        });
    });
};

/**
 * Analyzes tertiary (third-tier) words derived from a first-tier word.
 * Refactored to use Promise.then() for better UI responsiveness.
 * @param firstTierWord The first-tier word
 * @param tertiaryWord The derived tertiary word to analyze
 * @param minimumScore Minimum score required to be significant
 * @returns Promise resolving to a CosmicWord object if significant, undefined otherwise
 */
export const analyzeTertiaryWord = (
  firstTierWord: string,
  tertiaryWord: string,
  minimumScore: number = COSMIC_THRESHOLD  // Use global cosmic threshold
): Promise<CosmicWord | undefined> => {
  if (!tertiaryWord || tertiaryWord.length === 0) {
    return Promise.resolve(undefined);
  }
  
  console.log(`🔮 Analyzing tertiary word "${tertiaryWord}" derived from "${firstTierWord}"...`);
  
  // Use Promise.then() chain for better performance
  return evaluateWordCosmicScore(tertiaryWord)
    .then(score => {
      // After getting the tertiary word score, get the parent word score
      return evaluateWordCosmicScore(firstTierWord)
        .then(parentScore => {
          console.log(`  - Comparing scores: ${tertiaryWord}=${score}/100 vs ${firstTierWord}=${parentScore}/100`);
          
          // For streaming mode: require BOTH criteria:
          // 1. Meet the minimum score threshold, AND
          // 2. Have a higher score than the parent word
          // 
          // For regular mode: only require the minimum score threshold
          
          // Check if the word meets the minimum score threshold
          if (score >= minimumScore) {
            // For regular mode, we want to show all tertiary words that meet the threshold
            console.log(`  ✨✨ Tertiary word "${tertiaryWord}" is cosmically significant with score: ${score}/100 (parent: ${parentScore}/100)`);
            return {
              word: tertiaryWord,
              score,
              replacedWord: undefined, // No longer using replacedWord concept
              isSecondary: true, // Always mark as secondary word
              parent: firstTierWord // Always include parent information
            };
          } else {
            console.log(`  ⚡️ Tertiary word "${tertiaryWord}" is not cosmically significant (score: ${score}/100)`);
            return undefined;
          }
        });
    });
};

/**
 * Processes second-tier words for cosmically significant first-tier words
 * with 25ms delay between each word. Refactored to use Promise.then() for better UI responsiveness.
 * @param cosmicWords Array of first-tier CosmicWord objects
 * @param wordHierarchy Array of word hierarchies to search for secondary words
 * @param minimumScore Minimum score required (default: COSMIC_THRESHOLD)
 * @param delayMs Delay between processing each word in ms
 * @returns Promise resolving to updated CosmicWord array with child words added
 */
export const processSecondTierWords = (
  cosmicWords: CosmicWord[],
  wordHierarchy: { main: string; secondary: string; tertiary: string }[],
  minimumScore: number = COSMIC_THRESHOLD,  // Use global cosmic threshold
  delayMs: number = 25
): Promise<CosmicWord[]> => {
  if (!cosmicWords.length || !wordHierarchy.length) {
    return Promise.resolve(cosmicWords);
  }
  
  console.log(`🔮 Processing second-tier words for ${cosmicWords.length} significant first-tier words with ${delayMs}ms delay between each...`);
  console.log(`🔮 DETAILED REPORT: Using minimum cosmic score threshold of ${minimumScore}/100 for secondary words`);
  
  const results: CosmicWord[] = [];
  
  // Process each word with a delay between them using a recursive Promise.then() chain
  return (function processWordAtIndex(index = 0): Promise<CosmicWord[]> {
    // Base case: all words processed
    if (index >= cosmicWords.length) {
      // Create a detailed summary of the secondary words and their scores
      const secondaryWordCount = results.reduce((count, word) => count + (word.childWords?.length || 0), 0);
      
      // Report secondary words with their scores for user reference
      const secondaryWords = results
        .filter(word => word.childWords && word.childWords.length > 0)
        .flatMap(word => 
          word.childWords?.map(childWord => ({
            primaryWord: word.word,
            primaryScore: word.score,
            secondaryWord: childWord.word,
            secondaryScore: childWord.score,
            isReplacement: !!childWord.replacedWord
          })) || []
        );
        
      // Log a detailed summary of all secondary words and their scores
      console.log("🔍 SECONDARY WORDS 50-PASS FILTER RESULTS:");
      secondaryWords.forEach((entry, index) => {
        console.log(`${index + 1}. "${entry.secondaryWord}" (Score: ${entry.secondaryScore}/100) derived from "${entry.primaryWord}" (Score: ${entry.primaryScore}/100) - ${entry.isReplacement ? 'REPLACES PRIMARY' : 'KEPT AS SECONDARY'}`);
      });
      
      console.log(`\n🔮 SECONDARY WORDS REPORT: Found ${secondaryWordCount} qualifying secondary words (scoring >= ${minimumScore}/100):`);
      
      if (secondaryWords.length > 0) {
        secondaryWords.forEach(item => {
          console.log(`  - "${item.secondaryWord}" (${item.secondaryScore}/100) ← derived from "${item.primaryWord}" (${item.primaryScore}/100) ${item.isReplacement ? '🔄 REPLACEMENT' : '➡️ SECONDARY'}`);
        });
        
        // Add a very clear final summary of ALL secondary word scores for the user
        console.log("\n🌟🌟🌟 SECONDARY WORD SCORES FINAL SUMMARY 🌟🌟🌟");
        console.log(`The following secondary words PASSED the 100-pass filter (threshold: ${minimumScore}/100):`);
        secondaryWords.forEach((item, index) => {
          console.log(`${index + 1}. "${item.secondaryWord}" scored ${item.secondaryScore}/100 (Derived from "${item.primaryWord}")`);
        });
        console.log("🌟🌟🌟 END OF SECONDARY WORD SCORES SUMMARY 🌟🌟🌟\n");
      } else {
        console.log(`  No secondary words met the cosmic significance threshold of ${minimumScore}/100`);
        console.log("\n❌❌❌ SECONDARY WORD SCORES FINAL SUMMARY: NO WORDS PASSED THE 50-PASS FILTER ❌❌❌\n");
      }
      console.log('');
      
      return Promise.resolve(results);
    }
    
    const cosmicWord = cosmicWords[index];
    
    // Add delay between words (except for the first word)
    const delayPromise = index > 0 
      ? delay(delayMs)
      : Promise.resolve();
    
    // Process current word with delay, then move to next word
    return delayPromise
      .then(() => {
        // Find the word hierarchy entry for this cosmic word
        const hierarchy = wordHierarchy.find(h => h.main === cosmicWord.word);
        
        if (hierarchy && hierarchy.secondary) {
          // Analyze the second-tier word
          return analyzeSecondTierWord(
            cosmicWord.word,
            hierarchy.secondary,
            minimumScore
          )
          .then(secondTierResult => {
            // If significant, add to child words
            if (secondTierResult) {
              results.push({
                ...cosmicWord,
                childWords: [secondTierResult]
              });
            } else {
              results.push(cosmicWord);
            }
            
            // Log progress occasionally
            if (index % 3 === 0 || index === cosmicWords.length - 1) {
              console.log(`Progress: Processed ${index + 1} of ${cosmicWords.length} second-tier words (with ${delayMs}ms delay)`);
            }
            
            // Process next word
            return processWordAtIndex(index + 1);
          });
        } else {
          // No secondary word to analyze, just add the cosmic word as is
          results.push(cosmicWord);
          
          // Log progress occasionally
          if (index % 3 === 0 || index === cosmicWords.length - 1) {
            console.log(`Progress: Processed ${index + 1} of ${cosmicWords.length} second-tier words (with ${delayMs}ms delay)`);
          }
          
          // Process next word
          return processWordAtIndex(index + 1);
        }
      });
  })();
};

/**
 * REMOVED: We no longer use tertiary words processing
 * This function is kept as a stub for backward compatibility but just returns the input array.
 * Refactored to use Promise.then() for consistency with other functions.
 */
export const processTertiaryWords = (
  cosmicWords: CosmicWord[],
  wordHierarchy: { main: string; secondary: string; tertiary: string }[],
  minimumScore: number = COSMIC_THRESHOLD,
  delayMs: number = 25
): Promise<CosmicWord[]> => {
  // Simply return the input without processing
  console.log(`⚠️ NOTE: Tertiary word processing has been removed, returning original cosmic words array`);
  return Promise.resolve(cosmicWords);
};

/**
 * Helper function to evaluate ALL words in parallel with evaluation steps delayed internally.
 * OPTIMIZED to run all word evaluations simultaneously while maintaining internal 1ms delays.
 * @param words Array of words to evaluate
 * @returns Promise resolving to array of words with their cosmic scores
 */
export const evaluateWordsWithDelay = async (
  words: string[]
): Promise<CosmicWord[]> => {
  console.log(`🚀 PARALLEL OPTIMIZATION: Evaluating all ${words.length} words simultaneously`);
  console.log(`🚀 Each word will maintain its internal 1ms delays between random number generations`);
  
  // Create an array of promises, one for each word's evaluation - all starting simultaneously
  const wordPromises = words.map((word, wordIndex) => {
    // No staggered delay - start all word evaluations at the same time
    // Each word's internal evaluation still has 1ms delays between each pass
    return evaluateWordCosmicScore(word)
      .then(score => {
        // Log completion of this word's evaluation
        console.log(`✓ Word ${wordIndex+1}/${words.length} "${word}" scored ${score}/100`);
        return { word, score };
      });
  });
  
  // Process all word evaluations sequentially to eliminate final timeout condition
  const results = [];
  for (let i = 0; i < wordPromises.length; i++) {
    try {
      const result = await wordPromises[i];
      results.push(result);
    } catch (error) {
      console.warn(`Failed to process word ${i}, using default score:`, error);
      results.push({ word: words[i], score: 50 });
    }
  }
  
  console.log(`🚀 SEQUENTIAL OPTIMIZATION: All ${words.length} words processed without timeouts`);
  return Promise.resolve(results);
};

/**
 * Filters words based on their cosmic significance scores.
 * Refactored to use Promise.then() for better UI responsiveness.
 * @param words Array of words to filter
 * @param minimumScore Minimum score required (default: COSMIC_THRESHOLD)
 * @returns Promise resolving to filtered and sorted array of cosmically significant words
 */
export const filterWordsByCosmicSignificance = (
  words: string[],
  minimumScore?: number  // Optional parameter - will use global COSMIC_THRESHOLD if not provided
): Promise<CosmicWord[]> => {
  // Always use the latest threshold value from the global variable
  const threshold = minimumScore !== undefined ? minimumScore : COSMIC_THRESHOLD;
  
  // Remove empty words
  const validWords = words.filter(word => word && word.length > 0);
  
  console.log(`🔮 DETAILED FILTERING: Starting cosmic significance analysis for ${validWords.length} words (threshold: ${threshold}/100)`);
  console.log(`🔮 DETAILED FILTERING: Raw input words: ${validWords.join(', ')}`);
  console.log(`🔮 DETAILED FILTERING: Current COSMIC_THRESHOLD value: ${COSMIC_THRESHOLD}/100`);
  
  // Evaluate scores for each word in parallel
  console.log(`🔮 DETAILED FILTERING: Beginning 100-pass scoring evaluation in parallel for all words...`);
  
  // Use optimized parallel evaluation
  return evaluateWordsWithDelay(validWords)
    .then(scoredWords => {
      // Log all word scores before filtering
      console.log("🔮 DETAILED FILTERING: Complete word scores from 100-pass evaluation:");
      scoredWords.forEach(item => console.log(`🔮 WORD: "${item.word}" - SCORE: ${item.score}/100`));
      
      // Filter by minimum score - rechecking the global threshold in case it changed during evaluation
      const finalThreshold = minimumScore !== undefined ? minimumScore : COSMIC_THRESHOLD;
      console.log(`🔮 DETAILED FILTERING: Applying minimum score filter (>= ${finalThreshold}/100)...`);
      const significantWords = scoredWords.filter(item => item.score >= finalThreshold);
      
      // Sort by score (highest first)
      const sortedWords = significantWords.sort((a, b) => b.score - a.score);
      
      console.log(`🔮 DETAILED FILTERING: Final result - Found ${sortedWords.length} cosmically significant words with score >= ${minimumScore}`);
      if (sortedWords.length > 0) {
        console.log(`🔮 DETAILED FILTERING: Top words: ${sortedWords.map(w => `"${w.word}" (${w.score}/100)`).join(', ')}`);
      } else {
        console.log(`🔮 DETAILED FILTERING: No words met the cosmic significance threshold of ${minimumScore}/100`);
      }
      
      return sortedWords;
    });
};

/**
 * Hook to create and manage the psychic binary file
 */
/**
 * Initialize the psychicDecoder object on the window
 * This provides easy access to binary and letter files
 */
export const initializePsychicDecoder = (): void => {
  if (typeof window !== 'undefined') {
    // Generate the binary file URL
    const binaryFileUrl = savePsychicBinaryFile();
    console.log("🔮 Psychic binary file created with 65,000 values at:", binaryFileUrl);
    
    // Initialize the psychic decoder interface on the window object for global access
    window.psychicDecoder = {
      getBinaryFile: async (): Promise<string> => {
        // Return our static binary array as a string
        return globalPsychicBinaryArray.join('');
      },
      getPsychicLetters: async (): Promise<string[]> => {
        // For now, just return a placeholder array of letters
        // This is a simplified implementation
        return Array(65000).fill('').map((_, i) => 
          String.fromCharCode(65 + (i % 26))
        );
      }
    };
    
    console.log("🔮 PsychicDecoder interface initialized on window object");
  }
};

/**
 * Calculates grid-level attention score using the same 65k binary system
 * but with grid-specific sampling based on grid content
 * @param gridSample - String identifier for the grid (e.g., "grid_5_240_words")
 * @returns A Promise resolving to a score between 0-50
 */
const evaluateGridAttention = (gridSample: string): Promise<number> => {
  if (globalPsychicBinaryArray.length === 0) {
    console.warn("Cannot calculate grid attention score - binary array not initialized");
    return Promise.resolve(25); // Safe fallback
  }
  
  // Use cryptographically secure random number generation
  const getTrulyRandomPosition = (min: number, max: number): number => {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return min + (randomBuffer[0] % (max - min + 1));
  };
  
  console.log(`🎯 GRID ATTENTION: Calculating attention score for ${gridSample} with 50 samples (instant parallel processing)`);
  
  // Create 50 promises to get all binary values simultaneously with Promise.all
  const samplePromises = Array.from({ length: 50 }, (_, i) => {
    return Promise.resolve().then(() => {
      // Get a truly random position using crypto.getRandomValues
      const randomPosition = getTrulyRandomPosition(0, globalPsychicBinaryArray.length - 1);
      const binaryValue = globalPsychicBinaryArray[randomPosition];
      
      return { sampleNumber: i + 1, randomPosition, binaryValue };
    });
  });
  
  // Get all 50 binary values simultaneously with Promise.all
  return Promise.all(samplePromises).then(sampleResults => {
    // Sum all values to get final attention score and log key samples
    let totalScore = 0;
    sampleResults.forEach((result, index) => {
      totalScore += result.binaryValue;
      
      // Log every 10th sample to reduce console spam
      if (result.sampleNumber % 10 === 0 || result.sampleNumber === 50) {
        console.log(`  Sample ${result.sampleNumber}: Position ${result.randomPosition} = ${result.binaryValue} (running total: ${totalScore})`);
      }
    });
    
    // Attention score is the direct total out of 50 maximum (50 samples, each can be 0 or 1)
    const attentionScore = totalScore;
    
    console.log(`🎯 GRID ATTENTION: Final attention score for ${gridSample}: ${attentionScore}/50 (from ${totalScore}/50 binary samples)`);
    return attentionScore;
  });
};

// Add the grid attention function to the global PsychicDecoder
if (typeof window !== 'undefined') {
  (window as any).PsychicDecoder = {
    ...(window as any).PsychicDecoder,
    evaluateGridAttention
  };
}

// Initialize the decoder as soon as this module is imported
initializePsychicDecoder();

export const usePsychicFile = (): string => {
  // Store the binary file URL
  let binaryFileUrl: string = '';

  useEffect(() => {
    // Use our pre-initialized static binary array
    binaryFileUrl = savePsychicBinaryFile();
    
    console.log("🔮 Psychic binary file initialized from static 65,000-entry binary array");
    
    // Cleanup function to revoke the Blob URL when component unmounts
    return () => {
      console.log("Removing psychic binary file:", binaryFileUrl);
      URL.revokeObjectURL(binaryFileUrl);
      binaryFileUrl = '';
      
      // We don't clear the global binary array since we want to keep our static pattern
    };
  }, []);

  return binaryFileUrl;
};