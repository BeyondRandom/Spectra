// Grid utilities for letter generation and word finding

// Define grid dimensions
export const GRID_SIZE = 20;
export const ROWS = GRID_SIZE;
export const COLS = GRID_SIZE;

// Global array to store our 65,000 repeating letters
let globalLetterArray: string[] = [];

// Function to initialize our letter array - called once at the start
const initGlobalLetterArray = (): void => {
  if (globalLetterArray.length > 0) return; // Already initialized
  
  console.log("Initializing global letter array with exactly 500 cycles of the alphabet...");
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Each letter repeats 5 times in a cycle
  // A full cycle is 26 letters × 5 repetitions = 130 letters
  // 500 cycles = 65,000 letters total
  globalLetterArray = [];
  
  // Create exactly 500 cycles
  for (let cycle = 0; cycle < 500; cycle++) {
    for (const letter of alphabet) {
      // Add each letter 5 times
      for (let i = 0; i < 5; i++) {
        globalLetterArray.push(letter);
      }
    }
  }
  
  console.log(`Global letter array initialized with ${globalLetterArray.length} entries (${500} cycles)`);
  console.log(`Sample sequence: ${globalLetterArray.slice(0, 30).join('')}`);
  console.log(`Cycles verified: Each cycle is ${26 * 5} letters, total of ${500} complete cycles`);
};

// Initialize the array on module load
initGlobalLetterArray();

// Function to generate a random letter by selecting a random index from our pre-generated array
export const getRandomLetter = (): string => {
  try {
    if (globalLetterArray.length === 0) {
      console.error("⚠️ Letter array not initialized!");
      initGlobalLetterArray();
    }
    
    // Generate cryptographically secure random index
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    
    // Get a random index from our 65,000 entries
    const randomIndex = randomBuffer[0] % globalLetterArray.length;
    
    // Return the letter at that index
    return globalLetterArray[randomIndex];
  } catch (error) {
    console.error("⚠️ ERROR in getRandomLetter:", error);
    return 'E'; // Fallback in case of error
  }
};

// Generate 3 parallel strands of 20 letters each (60 total letters)
export const generateThreeStrands = async (): Promise<string[]> => {
  console.log("🎲 Starting 3-strand parallel generation using crypto.random...");
  console.log(`🚀 3-STRAND PARALLEL: Generating 3 strands of 20 letters each (60 total) with Promise.all`);
  
  const strandLength = 20;
  const strandCount = 3;
  
  try {
    // Create 3 strand generation promises
    const strandPromises = Array.from({ length: strandCount }, async (_, strandIndex) => {
      console.log(`🧬 STRAND ${strandIndex + 1}: Starting generation of 20 letters`);
      
      // Create 20 letter promises for this strand
      const letterPromises = Array.from({ length: strandLength }, async (_, letterIndex) => {
        try {
          if (globalLetterArray.length === 0) {
            console.error("⚠️ Letter array not initialized!");
            initGlobalLetterArray();
          }
          
          // Generate cryptographically secure random index
          const randomBuffer = new Uint32Array(1);
          window.crypto.getRandomValues(randomBuffer);
          
          // Get a random index from our 65,000 entries
          const randomIndex = randomBuffer[0] % globalLetterArray.length;
          
          // Return the letter at that index
          const letter = globalLetterArray[randomIndex];
          
          return {
            position: letterIndex,
            letter: letter || 'E' // Fallback if somehow empty
          };
        } catch (error) {
          console.warn(`Error generating letter for strand ${strandIndex + 1}, position ${letterIndex}:`, error);
          return {
            position: letterIndex,
            letter: 'E' // Fallback letter
          };
        }
      });
      
      // Execute all 20 letters for this strand in parallel
      const letterResults = await Promise.all(letterPromises);
      
      // Sort by position and create strand
      letterResults.sort((a, b) => a.position - b.position);
      const strand = letterResults.map(result => result.letter).join('');
      
      console.log(`🧬 STRAND ${strandIndex + 1}: Generated "${strand}"`);
      return strand;
    });
    
    // Execute ALL 3 strand generations in parallel
    console.log(`🚀 EXECUTING ${strandCount} STRAND GENERATIONS IN PARALLEL...`);
    const allStrands = await Promise.all(strandPromises);
    
    console.log(`🚀 PARALLEL SUCCESS: Generated 3 strands (${allStrands.length * strandLength} total letters)`);
    allStrands.forEach((strand, index) => {
      console.log(`🧬 FINAL STRAND ${index + 1}: "${strand}"`);
    });
    
    return allStrands;
    
  } catch (error) {
    console.error('🚀 PARALLEL FAILURE: Error in 3-strand generation:', error);
    
    // Fallback to sequential generation if parallel fails
    console.log('🚀 FALLBACK: Using sequential 3-strand generation due to parallel failure');
    
    const fallbackStrands: string[] = [];
    for (let strandIndex = 0; strandIndex < strandCount; strandIndex++) {
      let strand = '';
      for (let letterIndex = 0; letterIndex < strandLength; letterIndex++) {
        try {
          const letter = getRandomLetter();
          strand += letter || 'E'; // Fallback
        } catch (error) {
          console.warn(`Fallback error at strand ${strandIndex + 1}, position ${letterIndex}:`, error);
          strand += 'E'; // Safe fallback
        }
      }
      fallbackStrands.push(strand);
      console.log(`🚀 FALLBACK STRAND ${strandIndex + 1}: "${strand}"`);
    }
    
    console.log(`🚀 FALLBACK SUCCESS: Sequential 3-strand generation complete`);
    return fallbackStrands;
  }
};

/**
 * Generate 5 parallel strands of 20 letters each (100 total letters)
 * Improved version for higher message quality
 */
export const generateFiveStrands = async (): Promise<string[]> => {
  const strandCount = 5;
  const strandLength = 20;
  
  console.log(`🚀 PARALLEL PROCESSING: Starting 5-strand generation (${strandCount * strandLength} total letters)`);
  
  try {
    // Create 5 strand generation promises
    const strandPromises = Array.from({ length: strandCount }, async (_, strandIndex) => {
      // For each strand, create 20 letter generation promises
      const letterPromises = Array.from({ length: strandLength }, async (_, letterIndex) => {
        try {
          const letter = getRandomLetter();
          return {
            position: letterIndex,
            letter
          };
        } catch (error) {
          console.warn(`Error generating letter for strand ${strandIndex + 1}, position ${letterIndex}:`, error);
          return {
            position: letterIndex,
            letter: 'E' // Fallback letter
          };
        }
      });
      
      // Execute all 20 letters for this strand in parallel
      const letterResults = await Promise.all(letterPromises);
      
      // Sort by position and create strand
      letterResults.sort((a, b) => a.position - b.position);
      const strand = letterResults.map(result => result.letter).join('');
      
      console.log(`🧬 STRAND ${strandIndex + 1}: Generated "${strand}"`);
      return strand;
    });
    
    // Execute ALL 5 strand generations in parallel
    console.log(`🚀 EXECUTING ${strandCount} STRAND GENERATIONS IN PARALLEL...`);
    const allStrands = await Promise.all(strandPromises);
    
    console.log(`🚀 PARALLEL SUCCESS: Generated 5 strands (${allStrands.length * strandLength} total letters)`);
    allStrands.forEach((strand, index) => {
      console.log(`🧬 FINAL STRAND ${index + 1}: "${strand}"`);
    });
    
    return allStrands;
    
  } catch (error) {
    console.error('🚀 PARALLEL FAILURE: Error in 5-strand generation:', error);
    
    // Fallback to sequential generation if parallel fails
    console.log('🚀 FALLBACK: Using sequential 5-strand generation due to parallel failure');
    
    const fallbackStrands: string[] = [];
    for (let strandIndex = 0; strandIndex < strandCount; strandIndex++) {
      let strand = '';
      for (let letterIndex = 0; letterIndex < strandLength; letterIndex++) {
        try {
          const letter = getRandomLetter();
          strand += letter || 'E'; // Fallback
        } catch (error) {
          console.warn(`Fallback error at strand ${strandIndex + 1}, position ${letterIndex}:`, error);
          strand += 'E'; // Safe fallback
        }
      }
      fallbackStrands.push(strand);
      console.log(`🚀 FALLBACK STRAND ${strandIndex + 1}: "${strand}"`);
    }
    
    console.log(`🚀 FALLBACK SUCCESS: Sequential 5-strand generation complete`);
    return fallbackStrands;
  }
};

// Keep single strand function for backward compatibility
export const generateRandomStrand = async (): Promise<string> => {
  const fiveStrands = await generateFiveStrands();
  return fiveStrands[0]; // Return first strand for compatibility
};

// Keep the old function for backward compatibility during transition
export const generateRandomGrid = async (): Promise<string[][]> => {
  // Convert strand to grid format for compatibility
  const strand = await generateRandomStrand();
  const grid: string[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(''));
  
  // Fill first row with the strand, rest with empty strings for now
  for (let i = 0; i < Math.min(strand.length, COLS); i++) {
    grid[0][i] = strand[i];
  }
  
  return grid;
};

// Get all horizontal words (rows)
export const getHorizontalWords = (grid: string[][]): string[][] => {
  if (!grid || grid.length === 0) {
    console.error("⚠️ GRID ERROR: Empty grid passed to getHorizontalWords");
    return [];
  }
  
  console.log(`Starting horizontal word extraction from ${grid.length} rows...`);
  
  // Check the first few rows to debug
  for (let i = 0; i < Math.min(3, grid.length); i++) {
    console.log(`Row ${i+1} sample: ${grid[i].slice(0, 5).join('')}...`);
  }
  
  const horizontalWords = grid.map(row => row.map(letter => letter));
  
  console.log(`Completed horizontal word extraction: ${horizontalWords.length} rows processed`);
  return horizontalWords;
};

// Get all vertical words (columns)
export const getVerticalWords = (grid: string[][]): string[][] => {
  if (!grid || grid.length === 0) {
    console.error("⚠️ GRID ERROR: Empty grid passed to getVerticalWords");
    return [];
  }
  
  console.log(`Starting vertical word extraction from grid with ${grid.length} rows...`);
  
  const columns: string[][] = [];
  
  for (let col = 0; col < COLS; col++) {
    const column: string[] = [];
    for (let row = 0; row < ROWS; row++) {
      if (!grid[row]) {
        console.error(`⚠️ GRID ERROR: Missing row ${row} in grid when accessing column ${col}`);
        continue;
      }
      
      if (grid[row][col] === undefined) {
        console.error(`⚠️ GRID ERROR: Missing cell at row ${row}, column ${col}`);
        column.push(''); // Push empty string as a fallback
      } else {
        column.push(grid[row][col]);
      }
    }
    columns.push(column);
    
    // Log a few sample columns for debugging
    if (col < 3) {
      console.log(`Column ${col+1} sample: ${column.slice(0, 5).join('')}...`);
    }
  }
  
  console.log(`Completed vertical word extraction: ${columns.length} columns processed`);
  return columns;
};

// Get the letter at a specific position
export const getLetterAt = (grid: string[][], row: number, col: number): string => {
  if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
    return grid[row][col];
  }
  return '';
};

// Delay helper function (for animations)
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};