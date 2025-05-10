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

// Generate a full grid of random letters with 3ms delay between each letter
export const generateRandomGrid = (): Promise<string[][]> => {
  console.log("🎲 Starting random grid generation with 3ms delay between each letter...");
  
  // Initialize empty grid
  const grid: string[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(''));
  
  // Counter to track total letters generated
  let totalLettersGenerated = 0;
  const totalLetters = ROWS * COLS;
  
  // Create a function that returns a promise to generate the next letter
  const generateNextLetter = (row: number, col: number): Promise<void> => {
    return (totalLettersGenerated > 0 ? delay(3) : Promise.resolve())
      .then(() => {
        // Generate a random letter
        const letter = getRandomLetter();
        totalLettersGenerated++;
        
        if (!letter) {
          console.error(`⚠️ GRID ERROR: Empty letter generated at row ${row}, column ${col}`);
          grid[row][col] = 'E'; // Use fallback letter if empty
        } else {
          grid[row][col] = letter;
        }
        
        // Log progress occasionally
        if (totalLettersGenerated % 40 === 0 || totalLettersGenerated === totalLetters) {
          console.log(`🎲 Generated ${totalLettersGenerated} of ${totalLetters} letters with 3ms delay between each (${Math.floor((totalLettersGenerated/totalLetters)*100)}%)`);
        }
      });
  };
  
  // Create a chain of promises to generate all letters in the grid
  let promise = Promise.resolve();
  
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      promise = promise.then(() => generateNextLetter(row, col));
    }
  }
  
  // After all letters are generated, return the grid
  return promise.then(() => {
    console.log(`🎲 Grid generation complete: ${grid.length} rows x ${grid[0]?.length || 0} columns`);
    
    // Verify the grid for completeness
    if (grid.length !== ROWS) {
      console.error(`⚠️ GRID ERROR: Generated grid has ${grid.length} rows, expected ${ROWS}`);
    }
    
    return grid;
  });
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