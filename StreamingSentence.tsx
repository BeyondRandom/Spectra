import { useState, useEffect, useRef, useCallback } from "react";
import { 
  CosmicWord, 
  getRandomPsychicValue, 
  COSMIC_THRESHOLD,
  calculateAttentionScore
} from "../lib/psychicRandomizer";
import { requestGridIncrement, getCurrentGridNumber, isGridAlreadyProcessed } from "../lib/gridManager";

// Define diagnostic functions directly in this file to avoid TypeScript module issues
// These are simplified versions of the ones in debugHelpers.js
const runDiagnostics = {
  // Special diagnostic for tracking specific words and their scores
  trackSpecificWords: (messageLog?: any[], specificWords: string[] = ["DEVIANT", "SOMEWHAT"]) => {
    console.log("\n🔍🔍 SPECIAL DIAGNOSTIC: Tracking specific words 🔍🔍");
    const log = messageLog || (window.messageLogRef?.current || []);
    
    if (!log || log.length === 0) {
      console.log("No message log entries to check");
      return;
    }
    
    // Track all instances of the specific words
    const wordInstances: {[word: string]: Array<{gridNum: number, score: number, timestamp: number}>} = {};
    
    // Initialize tracking for each word
    specificWords.forEach(word => {
      wordInstances[word.toUpperCase()] = [];
    });
    
    // Find all instances of the specific words
    log.forEach(entry => {
      const gridNum = entry.gridNumber;
      const attentionScore = entry.attentionScore;
      const timestamp = entry.timestamp || 0;
      
      entry.words.forEach((wordObj: any) => {
        const word = wordObj.word.toUpperCase();
        if (specificWords.includes(word)) {
          wordInstances[word].push({
            gridNum,
            score: attentionScore,
            timestamp
          });
        }
      });
    });
    
    // Report findings for each word
    specificWords.forEach(word => {
      const instances = wordInstances[word.toUpperCase()];
      console.log(`\nWord "${word.toUpperCase()}" appears in ${instances.length} grids:`);
      
      if (instances.length > 0) {
        // Find unique scores for this word
        const scores = new Set(instances.map(i => i.score));
        
        console.log(`Appears with ${scores.size} different attention scores: ${Array.from(scores).join(', ')}`);
        
        // Log each instance
        instances.forEach((instance, idx) => {
          console.log(`  [${idx+1}] Grid #${instance.gridNum} - Score: ${instance.score}/50 - Time: ${new Date(instance.timestamp).toISOString()}`);
        });
        
        // Alert about different scores
        if (scores.size > 1) {
          console.log(`  ⚠️ WARNING: "${word.toUpperCase()}" has different attention scores in different grids!`);
        }
      } else {
        console.log(`  Not found in any grids`);
      }
    });
    
    // Check if the specific words appear together in any grid
    console.log("\nChecking for grids containing multiple specific words:");
    const gridsWithMultipleWords: {[gridNum: string]: string[]} = {};
    
    log.forEach(entry => {
      const gridNum = entry.gridNumber;
      const wordsInGrid: string[] = [];
      
      entry.words.forEach((wordObj: any) => {
        const word = wordObj.word.toUpperCase();
        if (specificWords.includes(word)) {
          wordsInGrid.push(word);
        }
      });
      
      if (wordsInGrid.length > 1) {
        gridsWithMultipleWords[gridNum] = wordsInGrid;
      }
    });
    
    if (Object.keys(gridsWithMultipleWords).length > 0) {
      console.log(`Found ${Object.keys(gridsWithMultipleWords).length} grids with multiple tracked words:`);
      
      for (const [gridNum, words] of Object.entries(gridsWithMultipleWords)) {
        const entry = log.find(e => e.gridNumber.toString() === gridNum);
        console.log(`  Grid #${gridNum} contains: ${words.join(', ')} - Score: ${entry.attentionScore}/50`);
      }
    } else {
      console.log("  No grids contain multiple tracked words together");
    }
    
    console.log("🔍🔍 END SPECIAL DIAGNOSTIC 🔍🔍\n");
  },
  
  // Find duplicate grid numbers in the message log
  findMessageLogDuplicates: (messageLog?: any[]) => {
    console.log("\n🔍🔍 RUNNING DIAGNOSTIC: Message Log Duplicates 🔍🔍");
    const log = messageLog || (window.messageLogRef?.current || []);
    const gridNumbers = log.map((entry: any) => entry.gridNumber);
    const uniqueGrids = new Set(gridNumbers);
    
    console.log(`Total message log entries: ${log.length}`);
    console.log(`Unique grid numbers: ${uniqueGrids.size}`);
    
    if (gridNumbers.length !== uniqueGrids.size) {
      console.log("⚠️ DUPLICATE GRIDS DETECTED IN MESSAGE LOG");
      
      // Find duplicates
      const counts: {[gridNum: number]: number} = {};
      const duplicates: number[] = [];
      
      gridNumbers.forEach((num: number) => {
        counts[num] = (counts[num] || 0) + 1;
        if (counts[num] > 1 && !duplicates.includes(num)) {
          duplicates.push(num);
        }
      });
      
      console.log(`Duplicate grid numbers: ${duplicates.join(', ')}`);
      
      // Log details for each duplicate
      duplicates.forEach((gridNum: number) => {
        const entries = log.filter((entry: any) => entry.gridNumber === gridNum);
        console.log(`\nGrid #${gridNum} appears ${entries.length} times:`);
        entries.forEach((entry: any, idx: number) => {
          console.log(`  [${idx+1}] Timestamp: ${new Date(entry.timestamp).toISOString()}`);
          console.log(`      Words: ${entry.words.map((w: any) => w.word).join(', ')}`);
          console.log(`      Source: ${entry._source || 'unknown'}`);
        });
      });
    } else {
      console.log("✅ No duplicates found in message log");
    }
    console.log("🔍🔍 END DIAGNOSTIC: Message Log Duplicates 🔍🔍\n");
  },
  
  // Record message log update for diagnostics
  recordMessageLogUpdate: (gridNumber: number, words: any[], source: string) => {
    if (typeof window !== 'undefined') {
      if (!(window as any).MESSAGE_LOG_UPDATES) {
        (window as any).MESSAGE_LOG_UPDATES = [];
      }
      
      (window as any).MESSAGE_LOG_UPDATES.push({
        gridNumber,
        wordCount: words.length,
        words: words.map((w: any) => w.word),
        timestamp: Date.now(),
        source,
        stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
      });
      
      console.log(`📝 DIAGNOSTIC: Recorded message log update for grid #${gridNumber} (${words.length} words)`);
    }
  },
  
  // Run comprehensive diagnostics
  runFullDiagnostics: () => {
    console.log("\n🔬🔬 RUNNING FULL DIAGNOSTICS 🔬🔬");
    
    // Print timestamp
    console.log(`Diagnostic time: ${new Date().toISOString()}`);
    
    // Check for duplicate grids in the message log
    runDiagnostics.findMessageLogDuplicates();
    
    // Check basic performance metrics
    console.log("\nPerformance Info:");
    if (typeof performance !== 'undefined') {
      console.log(`Page load time: ${performance.now().toFixed(2)}ms`);
      
      // Try to get memory info safely (Chrome-only feature)
      try {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          if (memory) {
            console.log(`\nMemory Usage (Chrome only):`);
            console.log(`JS heap size: ${Math.round((memory.usedJSHeapSize || 0) / (1024 * 1024))} MB`);
          }
        }
      } catch (e) {
        console.log("Memory metrics not available in this browser");
      }
    }
    
    // Print diagnostic run info
    if (typeof window !== 'undefined' && (window as any).AUTO_DIAGNOSTICS_RUNS) {
      console.log(`\nAutomatic diagnostic runs: ${(window as any).AUTO_DIAGNOSTICS_RUNS.length}`);
    }
    
    console.log("🔬🔬 END FULL DIAGNOSTICS 🔬🔬\n");
  }
};

interface StreamingSentenceProps {
  active: boolean;
  cosmicWords: CosmicWord[];
  connectionText?: string;
}

// Extend the CosmicWord interface to include tertiaryWords
interface ExtendedCosmicWord extends CosmicWord {
  tertiaryWords?: any[]; // Add this property to avoid type errors
}

// Define types for global window properties
declare global {
  interface Window {
    // Attention tracking
    attentionScore: number;
    attentionScoreLastUpdated: number;
    ATTENTION_THRESHOLD: number;
    COSMIC_THRESHOLD_VALUE: number;
    
    // Grid tracking
    PROCESSED_GRID_NUMBERS: number[];
    FULLY_PROCESSED_GRIDS: number[];
    GRID_ALREADY_MADE: {[gridNum: number]: boolean};
    GRID_NUMBER_INITIALIZATION_TIME: number;
    currentGridBeingDisplayed: number; // Added for StreamingWord component
    
    // Cache systems
    GRID_ATTENTION_SCORES: {[gridNum: number]: number | string}; // Added for cache dumps
    WORD_SCORES_CACHE: {[word: string]: number}; // Added for word score tracking
    GRID_INSTANCES_COUNTER: {[gridNum: number]: number}; // Tracking instances of each grid number
    
    // Timer tracking to prevent memory leaks
    TIMER_IDS: number[];
    TIMER_EXECUTIONS: any[];
    DUPLICATE_SCORE_EVENTS: any[];
    TIMER_EXEC_COUNT: number;
    
    // Feature flags
    alreadyRunBeginCommunication: boolean;
    gridLockDisabledForSubsequentRun: boolean;
    
    // Grid timing synchronization
    streamingModeStartTime: number;
    
    // Diagnostic utilities
    messageLogRef?: { current: any[] };
    AUTO_DIAGNOSTICS_ENABLED?: boolean;
    AUTO_DIAGNOSTICS_INTERVAL?: number;
    AUTO_DIAGNOSTICS_RUNS?: Array<{
      timestamp: number;
      gridNumber: number;
      messageLogLength: number;
    }>;
    
    // Debug function
    recordMessageLogUpdate?: (gridNumber: number, words: any[], source: string) => void;
    
    // Add runDiagnostics to Window interface
    runDiagnostics?: {
      printAttentionScoreCache: (options?: any) => any;
      findDuplicateWordsWithDifferentScores: () => void;
      findDuplicateGridsWithDifferentScores: () => void;
      findMessageLogDuplicates: (messageLog?: any[]) => void;
      recordMessageLogUpdate: (gridNumber: number, words: any[], source: string) => void;
      logPreMessageLogGridInfo: (gridNumber: number, gridContent: any[], attentionScore: number) => void;
      trackGridContent: (gridNumber: number, gridContent: any[], attentionScore: number) => void;
      generateGridContentHash: (words: any[]) => string;
      runComprehensiveGridDiagnostic: () => void;
      runFullDiagnostics: () => void;
      analyzeGridNumbers: () => any;
      findResets: () => any[];
      searchRange: (minGrid: number, maxGrid: number) => any;
    };
  }
}

interface StreamingWord {
  word: string;
  level: number; // 1=primary, 2=secondary, 3=tertiary
  count?: number; // Number of times this word appears
  score?: number; // Cosmic score out of 50
  replacedWord?: string; // The word that was replaced by this word
  parent?: string; // The parent word for secondary words
}

// Time constants
const DISPLAY_DURATION = 5000; // 5 seconds to show words (reduced from 7 seconds)
const GRID_INTERVAL = 7000; // New grid every 7 seconds
// We'll use a dynamic attention threshold value that can be modified by the user
// This is completely independent from the cosmic threshold and only affects the attention check
// Attention threshold should NEVER be affected by cosmic threshold changes
// This is a completely separate value with a different purpose
let DYNAMIC_ATTENTION_THRESHOLD = 20; // Set to 20 for testing
// Force type to number to prevent potential string comparisons
DYNAMIC_ATTENTION_THRESHOLD = Number(DYNAMIC_ATTENTION_THRESHOLD);

/**
 * StreamingWord component - displays a word with tier styling
 */
const StreamingWord = ({ 
  word, 
  level, 
  count = 1, 
  score = 0, 
  replacedWord,
  parent,
  className = '', // Add className prop with default empty string
  gridNumber = -1, // Add gridNumber as a prop with default -1
  attentionScore = "unknown" // Add attentionScore as a prop with default "unknown"
}: { 
  word: string, 
  level: number, 
  count?: number, 
  score?: number, 
  replacedWord?: string,
  parent?: string, // The parent word this was derived from
  className?: string, // Add type for className
  gridNumber?: number, // Grid number this word belongs to
  attentionScore?: number | string // Attention score for this word's grid
}) => {
  // Use provided grid number and attention score from props
  // This ensures each word maintains its own grid context
  
  // Enhanced logging that includes essential debugging information
  console.log(`WORD_DIAGNOSTIC: "${word}" - Grid #${gridNumber} - Attention Score: ${attentionScore}/50 - Level: ${level}`);
  
  // ULTRA-ENHANCED: Maximum possible distinct colors with non-linear jumps for extreme visual difference
  // Every score point from 20-39 gets a dramatically different color using a non-linear jump system
  // Includes text shadows, contrast borders, and uniquely spaced colors
  const getWordColor = (wordScore: number): {color: string, textShadow?: string} => {
    // Handle special cases first
    if (wordScore >= 40) {
      // Scores 40+ get pure white with a gold glow effect
      console.log(`SPECIAL COLOR BAND: Score ${wordScore} → ✨ WHITE WITH GOLD GLOW (scores 40+)`);
      return {
        color: 'rgb(255, 255, 255)', // Pure white
        textShadow: '0 0 8px rgba(255, 215, 0, 0.7), 0 0 15px rgba(255, 215, 0, 0.5)' // Gold glow
      };
    }
    
    if (wordScore < 20) {
      // Scores below 20 (virtually impossible) show as black with a red glow
      console.log(`SPECIAL COLOR BAND: Score ${wordScore} → ⚫ BLACK WITH RED GLOW (scores below 20)`);
      return {
        color: 'rgb(0, 0, 0)', // Pure black
        textShadow: '0 0 8px rgba(255, 0, 0, 0.7), 0 0 15px rgba(255, 0, 0, 0.5)' // Red glow
      };
    }
    
    // For the 20 scores between 20-39, use a non-linear distribution of colors with
    // deliberate jumps to maximize the visual difference between nearby scores
    
    // Use the exact color mapping specified by the user
    // This table maps scores 20-39 to precise HSL hue values
    const jumpTable = [
      // 🌌 20-24: Deep Purple Spectrum (lowest scores)
      0,   // 20: Pure red (low end wrap)
      345, // 21: Red-pink
      330, // 22: Magenta-rose
      315, // 23: Neon pink-purple
      300, // 24: Electric violet
      
      // ❄️ 25-29: Cool Cyan-Blue Range
      280, // 25: Purple-indigo
      260, // 26: Blue-violet
      240, // 27: Royal blue
      220, // 28: Medium blue
      200, // 29: Sky blue
      
      // 🌿 30-34: Distinct Green-Yellow Zone
      180, // 30: Aqua
      160, // 31: Teal-green
      130, // 32: Leaf green
      100, // 33: Lime
      80,  // 34: Yellow-green
      
      // 🔥 35-39: Hot Red Spectrum (highest scores)
      55,  // 35: Yellow
      40,  // 36: Golden yellow
      25,  // 37: Hot orange
      10,  // 38: True red
      340  // 39: Pink-magenta
    ];
    
    // Get the base hue from the jump table
    const index = wordScore - 20; // Convert score to 0-19 index
    const hue = jumpTable[index];
    
    // Use fixed saturation and lightness values exactly as specified
    const saturation = 100; // Maximum saturation for all colors
    
    // Use the exact lightness values specified for each color range
    let lightness = 50; // Default lightness
    
    // Apply specific lightness values based on score range
    if (wordScore >= 35 && wordScore <= 39) {
      // 🔥 35-39: Hot Red Spectrum (50% lightness except for 36-yellow which is 50%)
      lightness = 50;
    } else if (wordScore >= 30 && wordScore <= 34) {
      // 🌿 30-34: Green-Yellow Zone (45% lightness)
      lightness = 45;
    } else if (wordScore >= 25 && wordScore <= 29) {
      // ❄️ 25-29: Cool Blue Range (50-60% lightness)
      // 29-28: 50%, 27: 50%, 26: 55%, 25: 60%
      if (wordScore === 26) {
        lightness = 55;
      } else if (wordScore === 25) {
        lightness = 60;
      } else {
        lightness = 50;
      }
    } else if (wordScore >= 20 && wordScore <= 24) {
      // 🌌 20-24: Deep Purple Spectrum (50-60% lightness)
      // 24: 60%, 23: 55%, 22-20: 50%
      if (wordScore === 24) {
        lightness = 60;
      } else if (wordScore === 23) {
        lightness = 55;
      } else {
        lightness = 50;
      }
    }
    
    // Create a text shadow in a contrasting color for even more visual pop
    // Use a complementary color (opposite on color wheel) for maximum contrast
    const shadowHue = (hue + 180) % 360;
    const shadowStr = `0 0 2px hsla(${shadowHue}, 100%, 20%, 0.8)`;
    
    // Debug log showing the enhanced mapping
    // Add color range label based on score
    let rangeLabel = '';
    if (wordScore >= 35) {
      rangeLabel = '🔥 Hot Red';
    } else if (wordScore >= 30) {
      rangeLabel = '🌿 Green-Yellow';
    } else if (wordScore >= 25) {
      rangeLabel = '❄️ Cyan-Blue';
    } else if (wordScore >= 20) {
      rangeLabel = '🌌 Purple';
    }
    
    console.log(`COLOR MAPPING: Score ${wordScore} → HSL(${hue}, ${saturation}%, ${lightness}%) ${rangeLabel}`);
    
    return {
      color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      textShadow: shadowStr
    };
  };

  const levelLabels = {
    1: '1st',
    2: '2nd',
    3: '3rd'
  };

  // Apply different styles if className contains specific markers 
  // that indicate where this word is displayed
  const isHistoryItem = className.includes('text-sm');
  
  // Scale font size based on count and location (history vs current batch)
  const fontSize = isHistoryItem 
    ? 'text-base' // Smaller for history
    : (count > 1 ? 'text-3xl' : 'text-2xl'); // Larger for current batch
  
  // Get the color based on score - use empty string for both so we can apply custom colors
  const wordColor = '';
  
  return (
    <div className={`flex flex-col items-center mx-2 my-1 ${className}`} 
      style={{
        maxWidth: '200px',
        overflow: 'hidden',
        wordBreak: 'break-word',
        wordWrap: 'break-word',
        textOverflow: 'ellipsis',
        whiteSpace: 'normal'
      }}>
      <div className="flex items-center justify-center w-full">
        <span className={`${fontSize} font-bold ${wordColor} text-center`}
          style={{ 
            maxWidth: '100%', 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: 'break-word',
            wordWrap: 'break-word',
            ...getWordColor(score) // Apply enhanced color styling with text shadow effects
          }}>
          {word}
        </span>
        {count > 1 && (
          <span className="text-xs text-blue-100 ml-1 flex-shrink-0">
            ×{count}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center w-full">
        {/* Show different metadata in history vs current batch */}
        {isHistoryItem ? (
          <>
            <span className="text-[10px] text-blue-300/90 text-center w-full" style={{ maxWidth: '100%' }}>
              {score}/50 - {level === 1 ? '1st' : '2nd'}
            </span>
            {/* Also show parent info in history items if it's a secondary word */}
            {level === 2 && parent && (
              <span className="text-[8px] text-blue-300/80 mt-0.5 text-center w-full" 
                style={{ 
                  maxWidth: '100%', 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                from: {parent}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-xs text-blue-200 text-center w-full">
              {levelLabels[level as keyof typeof levelLabels] || '1st'}
            </span>
            <span className="text-[10px] text-blue-300 text-center w-full">
              {score}/50
            </span>
            {replacedWord && (
              <span className="text-[8px] text-blue-200/70 mt-1 text-center w-full" 
                style={{ 
                  maxWidth: '100%', 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                replaced: {replacedWord}
              </span>
            )}
            {/* Show parent information for secondary words */}
            {level === 2 && parent && (
              <span className="text-[8px] text-blue-300/80 mt-1 text-center w-full" 
                style={{ 
                  maxWidth: '100%', 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                derived from: {parent}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * StreamingSentence component
 * Shows all words from one grid at once for 7 seconds,
 * then they disappear, then words from the next grid appear,
 * repeating this pattern until streaming mode is turned off
 * 
 * Includes scroll position preservation to prevent jarring scroll jumps
 * when content changes in the streaming interface.
 */
const StreamingSentence: React.FC<StreamingSentenceProps> = ({ active, cosmicWords, connectionText }) => {
  // Create a debounced scroll lock reference
  const scrollLockRef = useRef<boolean>(false);
  const scrollLockTimerRef = useRef<number | null>(null);
  const lastScrollPositionRef = useRef<number>(0);
  
  // Enhanced function to preserve scroll position within the history container
  // This function saves the scroll position of the history container before an update
  // and then restores it afterward, preventing jarring scroll jumps
  const preserveScrollPosition = (callback: () => void) => {
    // Get the history container element
    const historyContainer = document.querySelector('.history-container');
    
    // Save the current scroll position if the container exists
    const scrollTop = historyContainer?.scrollTop || 0;
    
    // Execute the callback to update content
    callback();
    
    // Use requestAnimationFrame to restore scroll position after the DOM has updated
    requestAnimationFrame(() => {
      if (historyContainer) {
        historyContainer.scrollTop = scrollTop;
      }
    });
    
    // Log for debugging
    console.log("🔒 SCROLL: Preserved history container scroll position at", scrollTop);
  };

  // Current grid state
  const [currentBatch, setCurrentBatch] = useState<StreamingWord[]>([]);
  const [gridNumber, setGridNumber] = useState<number>(0);
  const [batchIndex, setBatchIndex] = useState<number>(0);
  const [showBatch, setShowBatch] = useState<boolean>(false);
  
  // Message log - doesn't affect processing, just for display to user
  // This doesn't do any comparison/filtering between runs, it just stores messages for display
  const [messageLog, setMessageLog] = useState<{
    gridNumber: number;
    attentionScore: number;
    words: StreamingWord[];
    timestamp: number;
    _source?: string;
    _messageId?: string;
    _stackTrace?: string;
  }[]>([]);
  
  // Add an effect to log whenever messageLog changes
  useEffect(() => {
    console.log(`🔄 MESSAGE LOG STATE CHANGE: Now contains ${messageLog.length} entries`);
    console.log(`🔄 MESSAGE LOG GRID NUMBERS: ${messageLog.map(entry => entry.gridNumber).join(', ')}`);
    
    // Store a copy in window for debugging
    if (typeof window !== 'undefined') {
      (window as any).DEBUG_MESSAGE_LOG_HISTORY = (window as any).DEBUG_MESSAGE_LOG_HISTORY || [];
      (window as any).DEBUG_MESSAGE_LOG_HISTORY.push({
        timestamp: Date.now(),
        count: messageLog.length,
        gridNumbers: messageLog.map(entry => entry.gridNumber),
        stack: new Error().stack
      });
      console.log(`🔄 MESSAGE LOG HISTORY: Saved snapshot #${(window as any).DEBUG_MESSAGE_LOG_HISTORY.length}`);
    }
  }, [messageLog]);
  
  // Create refs to track processed content and prevent duplicates
  const addedToMessageLogRef = useRef<Set<number>>(new Set());
  const processedContentSignaturesRef = useRef<Set<string>>(new Set());
  const gridNumberToContentSignatureRef = useRef<Map<number, string>>(new Map());
  
  // CRITICAL FIX: Make message manager event-driven
  // Listen for gridScoreAdded events instead of being called directly
  useEffect(() => {
    const handleGridScoreAdded = (event: CustomEvent) => {
      const { gridNumber, score, passed, timestamp, words, contentSignature } = event.detail;
      
      // SIMPLIFIED: Allow the same grid number to be added multiple times to message log
      // This change ensures we don't miss grids
      console.log(`🔄 GRID #${gridNumber}: Processing event (duplicate check disabled)`);
      // Note: We're no longer blocking messages with the same grid number
      // if (addedToMessageLogRef.current.has(gridNumber)) {
      //   console.log(`🛑 DUPLICATE PREVENTION: Grid #${gridNumber} already added to message log - skipping duplicate event`);
      //   return;
      // }
      
      // SIMPLIFIED: Removed content signature duplicate check - allow all grids to be processed
      // Log that we're processing a grid, regardless of content
      if (contentSignature) {
        console.log(`🔄 CONTENT TRACKING: Processing grid #${gridNumber} with content signature "${contentSignature.substring(0, 20)}..."`);
      } else {
        console.log(`🔄 CONTENT TRACKING: Processing grid #${gridNumber} (no content signature)`);
      }
      
      // Still track content signatures for diagnostic purposes but don't filter based on them
      if (contentSignature) {
        gridNumberToContentSignatureRef.current.set(gridNumber, contentSignature);
      }
      
      // Add this grid to the processed set
      addedToMessageLogRef.current.add(gridNumber);
      console.log(`✅ GRID TRACKING: Grid #${gridNumber} marked as processed`);
      
      
      console.log(`📊 EVENT HANDLER: gridScoreAdded for grid #${gridNumber} with score ${score}`);
      
      // CRITICAL FIX: Read the score from the cache instead of using the event parameter
      // SIMPLIFIED: Only use the plain grid number for cache lookup - no more cycle-specific keys
      let cachedAttentionScore;
      if (typeof window !== 'undefined' && 
          (window as any).GRID_ATTENTION_SCORES && 
          (window as any).GRID_ATTENTION_SCORES[gridNumber] !== undefined) {
        // Get the entry from cache
        const plainEntry = (window as any).GRID_ATTENTION_SCORES[gridNumber];
        // Check if it's an enhanced data object or just a simple value
        cachedAttentionScore = typeof plainEntry === 'object' && plainEntry !== null && 'score' in plainEntry
          ? plainEntry.score
          : plainEntry;
        console.log(`📊 CACHE LOOKUP: Using cache entry for grid #${gridNumber}`);
      } else {
        // If lookup fails, use the score from the event
        cachedAttentionScore = score;
        console.log(`📊 CACHE LOOKUP: No cache entry found, using event score ${score}`);
      }
      
      // Determine if the grid passed the attention check based on the cached score
      // Handle both number and string types for cachedAttentionScore
      const cachedPassed = cachedAttentionScore !== "FAILED_ATTENTION" && 
                          typeof cachedAttentionScore === 'number' && 
                          cachedAttentionScore >= DYNAMIC_ATTENTION_THRESHOLD;
      
      console.log(`📊 EVENT HANDLER: Grid #${gridNumber} attention check from cache: ${cachedAttentionScore} (passed: ${cachedPassed})`);
      
      // Log if there's a discrepancy between event and cache
      if (cachedAttentionScore !== score) {
        console.log(`⚠️ SCORE MISMATCH: Cache (${cachedAttentionScore}) differs from event (${score}) for grid #${gridNumber}`);
      }
      
      if (cachedPassed !== passed) {
        console.log(`⚠️ PASS STATUS MISMATCH: Cache (${cachedPassed}) differs from event (${passed}) for grid #${gridNumber}`);
      }
      
      // TEMPORARILY DISABLED: Attention score check
      // We're now posting ALL grids regardless of attention score
      // Only filter out "FAILED_ATTENTION" scores
      if ((typeof cachedAttentionScore === 'string' && cachedAttentionScore === "FAILED_ATTENTION")) {
        console.log(`📊 EVENT HANDLER: Grid #${gridNumber} has FAILED_ATTENTION score - not adding to message log`);
        return;
      }
      
      // Log that we're bypassing the normal attention check filter
      if (!cachedPassed) {
        console.log(`⚠️ ATTENTION FILTER BYPASSED: Grid #${gridNumber} has score ${cachedAttentionScore} (below threshold ${DYNAMIC_ATTENTION_THRESHOLD}) but will be posted anyway for debugging`);
      }
      
      // Process the grid and update the message log
      setTimeout(() => {
        console.log(`📊 EVENT HANDLER: Processing grid #${gridNumber} for message log`);
        
        // Get the next batch of words that were generated for this grid
        // This is already calculated during grid generation
        const nextGrid = currentBatch || [];
        
        // Update the message log with the grid data
        setMessageLog(prevLog => {
          // Generate a unique ID for this message log entry
          const stackTrace = new Error().stack;
          const messageId = `grid_${gridNumber}_${timestamp}_event`;
          
          // DEBUG: Record this update for diagnostic tracking
          runDiagnostics.recordMessageLogUpdate(gridNumber, nextGrid, 'gridScoreAdded_event');
          
          // Super detailed diagnostic for this specific path
          console.log(`\n🔍🔍🔍 MESSAGE LOG ENTRY FROM EVENT 🔍🔍🔍`);
          console.log(`📝 MESSAGE LOG EVENT UPDATE [ID:${messageId}]`);
          console.log(`📝 TIMESTAMP: ${new Date(timestamp).toISOString()} (${timestamp})`);
          console.log(`📝 GRID NUMBER: ${gridNumber}`);
          console.log(`📝 WORD COUNT: ${nextGrid ? nextGrid.length : 0}`);
          console.log(`📝 SOURCE: gridScoreAdded event`);
          
          // Follow the same message log update process as before
          // Identical checks to the original message log update
          
          // CRITICAL FIX: GRID DUPLICATION RESOLUTION
          // Initialize the grid instance counter if it doesn't exist
          if (typeof (window as any).GRID_INSTANCES_COUNTER === 'undefined') {
            console.log(`📊 INITIALIZING GRID INSTANCE COUNTER: Creating registry of previously seen grids`);
            (window as any).GRID_INSTANCES_COUNTER = {};
          }
          
          // Check if we've seen this grid number before and how many times
          const instanceCount = (window as any).GRID_INSTANCES_COUNTER[gridNumber] || 0;
          
          // Update the counter for this grid number
          (window as any).GRID_INSTANCES_COUNTER[gridNumber] = instanceCount + 1;
          
          // Check if this is the first instance
          if (instanceCount === 0) {
            // Skip first instances of grid numbers
            // The second instance will be handled when it appears
            console.log(`📊 FIRST INSTANCE: Grid #${gridNumber} is appearing for the first time - SKIPPING`);
            console.log(`📊 GRID INSTANCE POLICY: Will post grid #${gridNumber} on its second appearance`);
            console.log(`🔍🔍🔍 END MESSAGE LOG ENTRY FROM EVENT 🔍🔍🔍\n`);
            return prevLog; // Skip this grid - it's the first instance
          } else {
            // This is the second or later instance - always allow
            console.log(`📊 SECOND+ INSTANCE: Grid #${gridNumber} is appearing for the ${instanceCount+1}${instanceCount === 1 ? 'nd' : 'th'} time - ALLOWING`);
          }
          
          // Run checks on this grid
          // SPECIAL CONDITION CHECK #2: Verify all words meet the cosmic threshold
          const cosmicThreshold = (window as any).COSMIC_THRESHOLD_VALUE || 33; // Default to 33 if not set
          
          // EMPTY GRID CHECK: Skip grids with no words at all
          if (!nextGrid || nextGrid.length === 0) {
            console.log(`📊 MESSAGE LOG POLICY: Grid #${gridNumber} has no words - SKIPPING`);
            return prevLog; // Skip adding this empty grid
          }
          
          // COSMIC THRESHOLD CHECK: Only allow grids with words above cosmic threshold
          const belowThresholdWords: string[] = [];
          const aboveThresholdWords: string[] = [];
          
          // Sort words into above/below threshold
          for (const wordObj of nextGrid) {
            if (!wordObj.score || wordObj.score < cosmicThreshold) {
              if (wordObj.word && typeof wordObj.word === 'string') {
                belowThresholdWords.push(wordObj.word.toUpperCase());
              }
            } else {
              if (wordObj.word && typeof wordObj.word === 'string') {
                aboveThresholdWords.push(wordObj.word.toUpperCase());
              }
            }
          }
          
          // CRITICAL FILTER: Skip grids with NO words above cosmic threshold
          if (aboveThresholdWords.length === 0) {
            console.log(`📊 NO COSMIC WORDS: Grid #${gridNumber} has 0 words above cosmic threshold (${cosmicThreshold}/50) - SKIPPING`);
            if (belowThresholdWords.length > 0) {
              console.log(`📊 BELOW THRESHOLD ONLY: ${belowThresholdWords.length} words (${belowThresholdWords.join(', ')}) all below threshold`);
            }
            return prevLog; // Skip this grid entirely
          }
          
          // Log words below threshold for debugging
          if (belowThresholdWords.length > 0) {
            console.log(`⚠️ MIXED THRESHOLD: Grid #${gridNumber} has ${aboveThresholdWords.length} words above and ${belowThresholdWords.length} below cosmic threshold (${cosmicThreshold}/50)`);
            console.log(`📊 COSMIC WORDS: ${aboveThresholdWords.join(', ')}`);
            console.log(`📊 BELOW THRESHOLD WORDS: ${belowThresholdWords.join(', ')}`);
          } else {
            console.log(`✅ ALL WORDS ABOVE THRESHOLD: Grid #${gridNumber} has ${aboveThresholdWords.length} words all above cosmic threshold (${cosmicThreshold}/50)`);
            console.log(`📊 COSMIC WORDS: ${aboveThresholdWords.join(', ')}`);
          }
          
          // EXACT-MATCH DEBOUNCING: Filter ONLY if words and scores match the previous grid
          // Grid numbers are IGNORED - we only care about consecutive message log entries
          if (prevLog.length > 0) {
            // Get the most recent message log entry (previous grid only)
            const lastEntry = prevLog[prevLog.length - 1];
            
            // Skip duplicate check for empty grids
            if (!nextGrid || nextGrid.length === 0) {
              console.log(`📊 EMPTY GRID: Grid #${gridNumber} has no words - can't be a duplicate`);
            }
            else if (!lastEntry.words || lastEntry.words.length === 0) {
              console.log(`📊 PREVIOUS GRID EMPTY: Previous entry had no words - can't be a duplicate`);
            }
            // Both grids have words - do a simple comparison of words AND scores
            else {
              // First check if they have the same number of words
              if (nextGrid.length !== lastEntry.words.length) {
                console.log(`📊 WORD COUNT: Different number of words from previous entry - not a duplicate`);
              } else {
                // Create arrays of word+score combinations for exact comparison
                const currentWordScores = nextGrid
                  .map(w => `${w?.word?.toUpperCase()}:${w?.score || 0}`)
                  .filter(Boolean)
                  .sort();
                  
                const previousWordScores = lastEntry.words
                  .map(w => `${w?.word?.toUpperCase()}:${w?.score || 0}`)
                  .filter(Boolean)
                  .sort();
                
                // Simple string-based comparison of the entire arrays
                const currentString = currentWordScores.join(',');
                const previousString = previousWordScores.join(',');
                
                if (currentString === previousString) {
                  console.log(`📊 EXACT DUPLICATE: Current grid has identical words AND scores as previous entry`);
                  console.log(`📊 SKIPPING: This grid is an exact duplicate of the previous entry in the message log`);
                  console.log(`📊 WORDS & SCORES: ${currentString}`);
                  return prevLog; // Skip this grid - it's an exact duplicate
                } else {
                  console.log(`📊 UNIQUE CONTENT: Grid has different words or scores than previous entry`);
                }
              }
            }
          }
          
          // If we get here, the grid passed all checks
          console.log(`✅ PASSED ALL CHECKS: Grid #${gridNumber} passed attention check, cosmic threshold, and is not a consecutive duplicate`);
          console.log(`📊 MESSAGE LOG POLICY: Adding grid #${gridNumber} to message log with ${nextGrid.length} words`);
          
          // CRITICAL FIX: Use the same cached score we already looked up earlier at the beginning
          // The single source of truth for the attention score is the cachedAttentionScore
          // variable that we looked up at the start of this function
          console.log(`📊 USING CACHED SCORE: Grid #${gridNumber} attention score: ${cachedAttentionScore}`);
          console.log(`📊 CACHE VS EVENT: Cache: ${cachedAttentionScore}, Event: ${score}`);
          
          if (cachedAttentionScore !== score) {
            console.log(`⚠️ ATTENTION SCORE MISMATCH: Cache (${cachedAttentionScore}) differs from event (${score}) for grid #${gridNumber}`);
          }
          
          const updatedLog = [
            ...prevLog,
            {
              gridNumber: gridNumber,
              attentionScore: cachedAttentionScore, // Using the single cachedAttentionScore from above
              words: [...nextGrid], // Create a copy to avoid reference issues
              timestamp: timestamp,
              // Add tracing information to the log entry itself
              _source: 'gridScoreAdded_event',
              _messageId: messageId,
              _stackTrace: stackTrace?.split('\n')[2] || 'unknown'
            }
          ];
          
          console.log(`🔍🔍🔍 END MESSAGE LOG ENTRY FROM EVENT 🔍🔍🔍\n`);
          
          return updatedLog;
        });
      }, 0); // Use setTimeout to ensure this runs after the current execution
    };
    
    // Add the event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('gridScoreAdded', handleGridScoreAdded as EventListener);
      console.log(`📊 EVENT SYSTEM: Added gridScoreAdded event listener for message log updates`);
    }
    
    // Remove the event listener when the component unmounts
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('gridScoreAdded', handleGridScoreAdded as EventListener);
        console.log(`📊 EVENT SYSTEM: Removed gridScoreAdded event listener`);
      }
    };
  }, [currentBatch]); // depends on currentBatch so it has access to the latest words
  
  // Attention filter state
  const [waitingForAttention, setWaitingForAttention] = useState<boolean>(false);
  const [ellipsisCount, setEllipsisCount] = useState<number>(0);
  // Initialize with a zero value to ensure we display the real attention scores
  // We'll let the natural attention score calculation system update this value
  // Support both numeric scores and the special "FAILED_ATTENTION" string
  const [attentionScore, setAttentionScore] = useState<number | "FAILED_ATTENTION">(0);
  
  // Initialize global tracking variable but don't inflate the score
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Make sure the global variable exists but with initial value of 0
      if (typeof (window as any).attentionScore === 'undefined') {
        console.log(`🔄 STARTUP: Initializing global attention score tracking`);
        (window as any).attentionScore = 0;
        (window as any).attentionScoreLastUpdated = Date.now();
      }
    }
  }, []);
  
  // State to track cosmic threshold - ensure it starts with minimum 20 for testing
  const [cosmicThreshValue, setCosmicThreshValue] = useState<number>(
    // Initialize from window global value if available, otherwise use default
    // For testing, using 20 as minimum value
    Math.max(20, 
      typeof window !== 'undefined' && (window as any).COSMIC_THRESHOLD_VALUE 
        ? (window as any).COSMIC_THRESHOLD_VALUE 
        : COSMIC_THRESHOLD
    )
  );
  
  // Track copy success state for user feedback
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // State to track attention filter value for display - initialize with the global constant
  const [attentionFilterValue, setAttentionFilterValue] = useState<number>(DYNAMIC_ATTENTION_THRESHOLD);
  
  // Ensure the attention filter value is properly initialized
  useEffect(() => {
    // Make sure we're using the global value
    if (attentionFilterValue !== DYNAMIC_ATTENTION_THRESHOLD) {
      setAttentionFilterValue(DYNAMIC_ATTENTION_THRESHOLD);
      console.log(`🔍 Initializing attention filter display value to ${DYNAMIC_ATTENTION_THRESHOLD}/50`);
    }
  }, [attentionFilterValue]);
  
  // REMOVED: Reset handler for streaming sentence component
  // This was causing unwanted component remounts and state resets
  // Now we're maintaining state persistence between streaming activations

  // Update cosmic threshold whenever the global variable changes
  useEffect(() => {
    // Check every 500ms for changes to the global values
    const thresholdCheckInterval = setInterval(() => {
      // Get the current global threshold value
      const globalThreshValue = typeof window !== 'undefined' ? 
        (window as any).COSMIC_THRESHOLD_VALUE : COSMIC_THRESHOLD;
      
      // For testing, using 20 as minimum value
      const currentGlobalThreshold = Math.max(20, globalThreshValue);
      
      // Update if the cosmic threshold value has changed
      if (currentGlobalThreshold !== cosmicThreshValue) {
        console.log(`🔄 Syncing cosmic threshold display: ${currentGlobalThreshold} (was ${cosmicThreshValue})`);
        setCosmicThreshValue(currentGlobalThreshold);
        
        // Make sure other UI elements know about this new value too
        try {
          const thresholdEvent = new CustomEvent('cosmic-threshold-display-update', {
            detail: { threshold: currentGlobalThreshold, timestamp: Date.now() }
          });
          window.dispatchEvent(thresholdEvent);
          console.log(`🔄 Dispatched cosmic threshold display update: ${currentGlobalThreshold}`);
        } catch (e) {
          console.error("Error dispatching threshold display update:", e);
        }
      }
      
      // Also check the attention threshold to make sure everything is in sync
      if (DYNAMIC_ATTENTION_THRESHOLD !== attentionFilterValue) {
        console.log(`\n🚨🚨 ATTENTION THRESHOLD MISMATCH DETECTED 🚨🚨`);
        console.log(`Current display value: ${attentionFilterValue}/50`);
        console.log(`Actual DYNAMIC_ATTENTION_THRESHOLD: ${DYNAMIC_ATTENTION_THRESHOLD}/50`);
        console.log(`Global window.ATTENTION_THRESHOLD: ${(window as any).ATTENTION_THRESHOLD || 'undefined'}/50`);
        console.log(`Streaming mode active: ${streamingModeRef.current ? 'YES' : 'NO'}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`🚨🚨 FIXING MISMATCH NOW 🚨🚨\n`);
        
        // Update our local state
        setAttentionFilterValue(DYNAMIC_ATTENTION_THRESHOLD);
        
        // Also update global variable just to be certain
        if (typeof window !== 'undefined') {
          (window as any).ATTENTION_THRESHOLD = DYNAMIC_ATTENTION_THRESHOLD;
          console.log(`✅ Global window.ATTENTION_THRESHOLD set to ${DYNAMIC_ATTENTION_THRESHOLD}/50`);
        }
      }
    }, 500);
    
    return () => clearInterval(thresholdCheckInterval);
  }, [cosmicThreshValue, attentionFilterValue]);
  
  // The attention filter initialization is now handled in the hook above
  
  // State to track if we're waiting because no words meet the cosmic threshold
  const [waitingForCosmicWords, setWaitingForCosmicWords] = useState<boolean>(false);
  
  // Track the current word grids
  const wordGridQueueRef = useRef<StreamingWord[][]>([]);
  
  // Track previous words for each grid
  const previousWordsRef = useRef<string[]>([]);
  
  // Track previously displayed grid numbers to prevent showing duplicates
  const displayedGridsRef = useRef<Set<number>>(new Set());
  
  // Track the last displayed grid number to prevent showing the same grid twice
  const lastDisplayedGridRef = useRef<number>(0);
  
  // Track the words from the last displayed grid to prevent repeating the same words
  const lastDisplayedWordsRef = useRef<StreamingWord[]>([]);
  
  // Track the true active state to fix desync issues between React state and timers
  const streamingModeRef = useRef<boolean>(active);
  
  // Track the actual grid number being processed in the background (separate from display)
  // Always initialize to 0 for each new instance - this is the only source of truth for grid numbers
  // *****************************************************************
  // CRITICAL: This is now the ONLY source of truth for grid numbers in the application
  // This is the MASTER variable that tracks the current grid number
  // No other variables should be used for grid tracking
  // *****************************************************************
  const gridNumberTrackingRef = useRef<number>(0);
  
  // Track consecutive failed attention checks
  const failedAttentionChecksRef = useRef<number>(0);
  
  // Track timers for cleanup
  const displayTimerRef = useRef<any>(null);
  const gridTimerRef = useRef<any>(null);
  const ellipsisTimerRef = useRef<any>(null);
  const startupTimerRef = useRef<any>(null);
  
  // Track if grid generation is in progress
  const gridProcessingRef = useRef<boolean>(false);
  
  // Track if message sound was played for a particular grid
  const messageSoundPlayedRef = useRef<Set<number>>(new Set());
  
  // *****************************************************************
  // CRITICAL: This is now the ONLY authoritative record of processed grids
  // This replaces ALL global grid tracking with local tracking via this ref
  // *****************************************************************
  const processedGridsRef = useRef<Set<number>>(new Set());
  
  // Track the last time a grid was requested to detect stalls
  const lastGridRequestTimeRef = useRef<number>(0);
  
  // Track the attention update timer
  const attentionUpdateTimerRef = useRef<any>(null);
  
  // Track which 7-second cycle has successfully processed a grid
  // Used to ensure only one grid is processed per cycle
  const gridCycleCompletedRef = useRef<number>(0);
  
  // Track the source of attention check calls (timer, manual, etc.)
  // This ensures we only cache attention scores from the 7-second timer cycles
  const attentionCheckSourceRef = useRef<string>('');
  
  // Track the interval ID for grid completion checks
  const gridCompletionCheckIntervalRef = useRef<any>(null);
  
  // Function to check for completed grid generation and release lock if necessary
  const checkForCompletedGrid = useCallback(() => {
    if (!gridProcessingRef.current) {
      return; // No lock to release
    }
    
    // Check if the current grid has been marked as complete in the global tracker
    const currentGridNum = gridNumberTrackingRef.current;
    
    if (typeof window !== 'undefined' && 
        (window as any).GRID_GENERATION_COMPLETE && 
        (window as any).GRID_GENERATION_COMPLETE[currentGridNum]) {
      
      const completionData = (window as any).GRID_GENERATION_COMPLETE[currentGridNum];
      console.log(`🔍 GENERATION CHECK: Found grid #${currentGridNum} in completion registry`);
      console.log(`🔍 COMPLETION DATA: timestamp=${new Date(completionData.timestamp).toISOString()}, success=${completionData.success}`);
      
      // If the grid was successfully generated, release the lock
      if (completionData.success) {
        console.log(`🔓 LOCK RELEASE: Grid #${currentGridNum} was successfully generated, releasing the lock`);
        gridProcessingRef.current = false;
        
        // Also release other locks that might be stuck
        wordGenerationInProgressRef.current = false;
        isGettingAttentionScoreRef.current = false;
        
        // Clean up the registry to avoid memory leaks
        delete (window as any).GRID_GENERATION_COMPLETE[currentGridNum];
      }
    }
  }, []);
  
  // Set up a periodic check for completed grids every 200ms
  useEffect(() => {
    // Only run when streaming is active
    if (!streamingModeRef?.current) {
      return;
    }
    
    console.log(`🔍 GRID COMPLETION CHECK: Setting up periodic completion check interval`);
    
    // Clear any existing interval
    if (gridCompletionCheckIntervalRef.current) {
      clearInterval(gridCompletionCheckIntervalRef.current);
      gridCompletionCheckIntervalRef.current = null;
    }
    
    // Set up a new interval to check for completed grids
    gridCompletionCheckIntervalRef.current = setInterval(() => {
      checkForCompletedGrid();
    }, 200);
    
    // Clean up on unmount or when streaming mode changes
    return () => {
      if (gridCompletionCheckIntervalRef.current) {
        clearInterval(gridCompletionCheckIntervalRef.current);
        gridCompletionCheckIntervalRef.current = null;
        console.log(`🔍 GRID COMPLETION CHECK: Cleared completion check interval`);
      }
    };
  }, [checkForCompletedGrid, streamingModeRef?.current]);
  

  
  // CRITICAL FIX: Track when word generation is in progress
  // This prevents race conditions between grid numbering and word content generation
  const wordGenerationInProgressRef = useRef<boolean>(false);
  
  // CRITICAL FIX: Track when attention score calculation is in progress
  // This prevents race conditions in attention score calculation and grid number incrementation
  const isGettingAttentionScoreRef = useRef<boolean>(false);
  
  // Track the content hash of the last grid to prevent duplicate content processing
  const lastGridContentHashRef = useRef<string>('');
  
  // Track which cycle was last processed to prevent duplicate processing within the same cycle
  const lastProcessedCycleRef = useRef<number>(0);
  
  // Generate a hash for grid content to prevent duplicate processing
  const generateGridContentHash = (words: StreamingWord[]): string => {
    if (!words || words.length === 0) return '';
    
    // CRITICAL FIX: Use the EXACT SAME hash algorithm as in debugHelpers.js
    // Sort words alphabetically to ensure consistent hashing regardless of original order
    const sortedWords = [...words]
      .map(w => w.word.toLowerCase()) // CONSISTENT: Always use lowercase
      .sort();
    
    // CONSISTENT: Use same separator as debugHelpers.js
    const contentString = sortedWords.join('||');
    
    // IMPROVED: Store this hash in a global map for diagnostics and debugging
    if (typeof window !== 'undefined') {
      if (!(window as any).CONTENT_HASH_TO_GRID_MAP) {
        (window as any).CONTENT_HASH_TO_GRID_MAP = new Map();
      }
      (window as any).CONTENT_HASH_TO_GRID_MAP.set(contentString, gridNumberTrackingRef.current);
      
      // Also maintain reverse lookup
      if (!(window as any).GRID_NUMBER_TO_CONTENT_MAP) {
        (window as any).GRID_NUMBER_TO_CONTENT_MAP = new Map();
      }
      (window as any).GRID_NUMBER_TO_CONTENT_MAP.set(gridNumberTrackingRef.current, contentString);
    }
    
    return contentString;
  };
  
  // REMOVED: No longer tracking word history between grids
  // Instead only tracking current grid's words to prevent any caching
  
  // Track sound enabled/disabled state
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Debug function to dump the current state
  const dumpDebugState = () => {
    console.log("🔍🔍🔍 DEBUG STATE DUMP 🔍🔍🔍");
    console.log(`batchIndex: ${batchIndex}`);
    console.log(`gridNumber: ${gridNumber}`);
    console.log(`streamingMode: ${streamingModeRef.current}`);
    console.log(`lastGridRequestTime: ${lastGridRequestTimeRef.current} (${new Date(lastGridRequestTimeRef.current).toISOString()})`);
    console.log(`displayedGrids: ${Array.from(displayedGridsRef.current).join(', ')}`);
    console.log(`lastDisplayedGrid: ${lastDisplayedGridRef.current}`);
    console.log(`gridProcessingLock: ${gridProcessingRef.current}`);
    
    // Report 7-second cycle tracking information
    const currentCycleNumber = Math.floor(Date.now() / 7000);
    const cycleCompleted = gridCycleCompletedRef.current === currentCycleNumber;
    console.log(`Current 7-second cycle: #${currentCycleNumber}`);
    console.log(`Completed cycle tracker value: ${gridCycleCompletedRef.current}`);
    console.log(`Current cycle completed: ${cycleCompleted ? 'YES' : 'NO'}`);
    console.log(`Time until next cycle: ${7000 - (Date.now() % 7000)}ms`);
    
    console.log(`wordGridQueue length: ${wordGridQueueRef.current.length}`);
    console.log(`consecutive failed attention checks: ${failedAttentionChecksRef.current}`);
    console.log(`attentionThreshold: ${DYNAMIC_ATTENTION_THRESHOLD}`);
    console.log(`cosmicThreshold: ${(window as any).COSMIC_THRESHOLD_VALUE || COSMIC_THRESHOLD}`);
    console.log(`waitingForCosmicWords: ${waitingForCosmicWords}`);
    console.log(`waitingForAttention: ${waitingForAttention}`);
    console.log(`Time since last grid request: ${Date.now() - lastGridRequestTimeRef.current}ms`);
    console.log("🔍🔍🔍 END DEBUG STATE DUMP 🔍🔍🔍");
  };
  
  // Listen for sound enabled/disabled events
  useEffect(() => {
    const handleSoundEnabledChange = (e: CustomEvent) => {
      setSoundEnabled(e.detail.enabled);
      console.log(`🔊 Sound ${e.detail.enabled ? 'enabled' : 'disabled'} in StreamingSentence`);
    };
    
    // First check meta tag (highest priority)
    try {
      const metaTag = document.querySelector('meta[name="sound-enabled"]');
      if (metaTag) {
        const metaValue = metaTag.getAttribute('content') === 'true';
        setSoundEnabled(metaValue);
        console.log(`🔊 Set sound preference from meta tag: ${metaValue ? 'enabled' : 'disabled'}`);
      } 
      // Fall back to sessionStorage if no meta tag
      else {
        const savedSoundPreference = sessionStorage.getItem('soundEnabled');
        if (savedSoundPreference !== null) {
          setSoundEnabled(savedSoundPreference === 'true');
          console.log(`🔊 Loaded sound preference from sessionStorage: ${savedSoundPreference === 'true' ? 'enabled' : 'disabled'}`);
        }
      }
    } catch (error) {
      console.error('Failed to load sound preference:', error);
    }
    
    // Add event listener
    window.addEventListener('soundEnabledChange', handleSoundEnabledChange as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('soundEnabledChange', handleSoundEnabledChange as EventListener);
    };
  }, []);
  
  // Function to play the message bubble sound when new words are displayed
  const playMessageSound = (gridNumber: number) => {
    // Always check the meta tag first (highest priority) to get latest sound setting
    const metaTag = document.querySelector('meta[name="sound-enabled"]');
    const metaValue = metaTag ? metaTag.getAttribute('content') === 'true' : false;
    
    // Use meta tag value if available, otherwise fall back to component state
    const isSoundEnabled = metaTag ? metaValue : soundEnabled;
    
    // Check if sound is disabled
    if (!isSoundEnabled) {
      console.log(`🔇 Sound disabled (via meta tag) - not playing message sound for grid #${gridNumber}`);
      messageSoundPlayedRef.current.add(gridNumber); // Still mark as played
      return;
    }
    
    // Only play the sound once per grid number to avoid duplicate sounds
    if (!messageSoundPlayedRef.current.has(gridNumber)) {
      try {
        // Global window property also provides quick access to sound setting
        if (window.soundEnabled !== undefined && window.soundEnabled === false) {
          console.log(`🔇 Sound disabled (via window property) - not playing message sound for grid #${gridNumber}`);
          messageSoundPlayedRef.current.add(gridNumber);
          return;
        }
        
        // Message sound functionality has been removed
        console.log(`🔇 Message sound disabled for grid #${gridNumber}`);
        messageSoundPlayedRef.current.add(gridNumber);
      } catch (error) {
        console.error("Error with sound system:", error);
        // Message sound functionality has been removed
        messageSoundPlayedRef.current.add(gridNumber);
      }
    }
  };
  
  // Separate fallback method for playing sounds if the cached version fails
  // Message sound functionality has been removed completely as requested
  
  // Initialize attention threshold at startup
  // This ensures the threshold is consistently set across the application
  useEffect(() => {
    // Set the initial attention threshold value to 20 (default)
    DYNAMIC_ATTENTION_THRESHOLD = 20;
    setAttentionFilterValue(20);
    
    // Update global window variable for cross-component consistency
    if (typeof window !== 'undefined') {
      (window as any).ATTENTION_THRESHOLD = 20;
      console.log(`🔍 INITIAL SETUP: Set global window.ATTENTION_THRESHOLD to 20/50`);
    }
    
    // Dispatch an initial event to notify all components
    const initEvent = new CustomEvent('attentionThresholdChanged', { 
      detail: { 
        threshold: 20,
        timestamp: Date.now(),
        source: 'StreamingSentence-initialization'
      }
    });
    window.dispatchEvent(initEvent);
    console.log('🔄 INITIAL SETUP: Dispatched initial attention threshold event with value 20/50');
  }, []);

  // Listen for attention threshold changes via custom event
  // This is COMPLETELY SEPARATE from the cosmic threshold
  useEffect(() => {
    const handleAttentionThresholdChange = (e: CustomEvent) => {
      if (e.detail && typeof e.detail.threshold === 'number') {
        // Log the event source (where it's coming from) and iteration data
        const source = e.detail.source || 'unknown';
        const iteration = e.detail.iteration || 'unknown';
        const timestamp = e.detail.timestamp || Date.now();
        
        console.log(`\n🔍🔍 ATTENTION THRESHOLD CHANGE EVENT 🔍🔍`);
        console.log(`Source: ${source}`);
        console.log(`Time: ${new Date(timestamp).toISOString()}`);
        console.log(`Iteration: ${iteration}`);
        console.log(`Streaming active: ${streamingModeRef.current ? 'YES' : 'NO'}`);
        console.log(`Current threshold: ${DYNAMIC_ATTENTION_THRESHOLD}/50`);
        
        // Parse as number to avoid string comparisons 
        const newThreshold = Number(e.detail.threshold);
        console.log(`New threshold: ${newThreshold}/50 (${typeof newThreshold})`);
        
        // Only update the attention threshold, not affecting cosmic threshold
        DYNAMIC_ATTENTION_THRESHOLD = newThreshold;
        
        // Update our component state with the new value for display purposes
        setAttentionFilterValue(newThreshold);
        
        // Extra logging to verify thresholds are separate and showing correct value
        const cosmicValue = (window as any).COSMIC_THRESHOLD_VALUE || COSMIC_THRESHOLD;
        console.log(`🔍 THRESHOLD VERIFICATION: Attention=${newThreshold}, Global=${DYNAMIC_ATTENTION_THRESHOLD}, Cosmic=${cosmicValue}`);
        
        // Double check that the global variable is updated correctly
        if (DYNAMIC_ATTENTION_THRESHOLD !== newThreshold) {
          console.log(`⚠️ ATTENTION THRESHOLD MISMATCH: Setting ${DYNAMIC_ATTENTION_THRESHOLD} to ${newThreshold}`);
          DYNAMIC_ATTENTION_THRESHOLD = newThreshold;
        }
        
        // Also update global window variable for cross-component consistency
        if (typeof window !== 'undefined') {
          (window as any).ATTENTION_THRESHOLD = newThreshold;
          console.log(`🔍 Updated global window.ATTENTION_THRESHOLD to ${newThreshold}/50`);
        }
        
        console.log(`🔍🔍 END ATTENTION THRESHOLD CHANGE EVENT 🔍🔍\n`);
      }
    };
    
    // Add event listener
    window.addEventListener('attentionThresholdChanged', handleAttentionThresholdChange as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('attentionThresholdChanged', handleAttentionThresholdChange as EventListener);
    };
  }, []);
  
  // REMOVED: Application reset events handler
  // This was causing unwanted resets of streaming state
  // Now we're maintaining complete state persistence between streaming activations
  
  // Listen for attention score updates (separate from threshold changes)
  useEffect(() => {
    const handleAttentionScoreChange = (e: CustomEvent) => {
      if (e.detail && typeof e.detail.score === 'number') {
        const newScore = e.detail.score;
        console.log(`🔔 Attention score updated to ${newScore}/50 (external update)`);
        // Update the attention score in our state
        setAttentionScore(newScore);
      }
    };
    
    // Handle complete attention reset requests
    const handleAttentionReset = (e: CustomEvent) => {
      console.log("🔄 RESET: Received attention reset event");
      
      // Force reset attention score to 0
      setAttentionScore(0);
      
      // Reset waiting state to show ellipsis animation
      setWaitingForAttention(true);
      
      // Reset global attention tracking variables
      if (typeof window !== 'undefined') {
        window.attentionScore = 0;
        window.attentionScoreLastUpdated = Date.now();
        console.log("🔄 RESET: Reset global attention tracking variables");
      }
    };
    
    // Add event listeners
    window.addEventListener('attention-score-change', handleAttentionScoreChange as EventListener);
    window.addEventListener('reset-attention', handleAttentionReset as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('attention-score-change', handleAttentionScoreChange as EventListener);
      window.removeEventListener('reset-attention', handleAttentionReset as EventListener);
    };
  }, []);
  
  // REMOVED: Application-wide state reset handler
  // This was causing unwanted state resets and disrupting communication state
  // Now we're maintaining complete state persistence between streaming activations
  
  // Listen for streaming mode changes
  useEffect(() => {
    // CRITICAL FIX: Adding force deactivate handler
    const handleForceDeactivate = (e: CustomEvent) => {
      console.log(`⚠️ FORCE DEACTIVATE EVENT RECEIVED (StreamingSentence) at ${new Date().toISOString()}`);
      console.log(`⚠️ FORCE DEACTIVATE: Event details:`, e.detail);
      
      // CRITICAL FIX: Set global streaming mode flag to false and clear session tracking
      if (typeof window !== 'undefined') {
        (window as any).STREAMING_MODE_ACTIVE = false;
        (window as any).lastCompletedCycleTimestamp = 0;
        (window as any).lastCompletedCycleNumber = 0;
        console.log(`⚠️ FORCE DEACTIVATE: Set global STREAMING_MODE_ACTIVE = false and reset session tracking`);
      }
      
      // Update our internal streaming mode ref immediately
      streamingModeRef.current = false;
      console.log(`⚠️ FORCE DEACTIVATE: Set streamingModeRef.current = false directly`);
      
      // Cancel any pending grid requests - prevent new grid generation completely
      if (typeof window !== 'undefined') {
        (window as any).CANCEL_PENDING_GRID_REQUESTS = true;
        console.log(`⚠️ FORCE DEACTIVATE: Set global CANCEL_PENDING_GRID_REQUESTS = true`);
        
        // Broadcast a global abort signal that all components should listen for
        try {
          const abortEvent = new CustomEvent('abort-all-grid-processing', {
            detail: { 
              timestamp: Date.now(),
              source: 'force-deactivate',
              complete: true
            }
          });
          window.dispatchEvent(abortEvent);
          document.dispatchEvent(abortEvent);
          console.log(`⚠️ FORCE DEACTIVATE: Dispatched global abort signal for grid processing`);
        } catch (error) {
          console.error('Error dispatching abort event:', error);
        }
      }
      
      // Clear all timers first
      if (gridTimerRef.current) {
        clearInterval(gridTimerRef.current);
        gridTimerRef.current = null;
        console.log(`⚠️ FORCE DEACTIVATE: Cleared grid timer`);
      }
      
      if (displayTimerRef.current) {
        clearTimeout(displayTimerRef.current);
        displayTimerRef.current = null;
        console.log(`⚠️ FORCE DEACTIVATE: Cleared display timer`);
      }
      
      if (ellipsisTimerRef.current) {
        clearInterval(ellipsisTimerRef.current);
        ellipsisTimerRef.current = null;
        console.log(`⚠️ FORCE DEACTIVATE: Cleared ellipsis timer`);
      }
      
      if (attentionUpdateTimerRef.current) {
        clearInterval(attentionUpdateTimerRef.current);
        attentionUpdateTimerRef.current = null;
        console.log(`⚠️ FORCE DEACTIVATE: Cleared attention update timer`);
      }
      
      // CRITICAL FIX: Clean up the attention score cache to prevent duplication
      if (typeof window !== 'undefined' && (window as any).GRID_ATTENTION_SCORES) {
        // Clear the contents of GRID_ATTENTION_SCORES but keep the object reference
        Object.keys((window as any).GRID_ATTENTION_SCORES).forEach(key => {
          delete (window as any).GRID_ATTENTION_SCORES[key];
        });
        console.log(`⚠️ FORCE DEACTIVATE: Cleared GRID_ATTENTION_SCORES cache to prevent duplication`);
      }
      
      // Reset all state EXCEPT grid number counter
      wordGridQueueRef.current = [];
      // REMOVED: No longer resetting gridNumberTrackingRef to ensure continuous grid numbering
      console.log(`🔄 PERSISTENCE: Keeping gridNumberTrackingRef.current at ${gridNumberTrackingRef.current} for continuous numbering`);
      lastDisplayedGridRef.current = -1;
      lastDisplayedWordsRef.current = [];
      // REMOVED: No longer using wordHistory state or ref
      setBatchIndex(0);
      setCurrentBatch([]);
      console.log(`⚠️ FORCE DEACTIVATE: Cleared all state variables including grid number`);
      
      // Reset grid processing lock
      gridProcessingRef.current = false;
      console.log(`⚠️ FORCE DEACTIVATE: Released grid processing lock`);
      
      // Reset the cycle completion tracking
      gridCycleCompletedRef.current = 0;
      console.log(`⚠️ FORCE DEACTIVATE: Reset grid cycle completion tracker`);
    };
    
    const handleStreamingModeChanged = (e: CustomEvent) => {
      const isActive = e.detail?.active === true;
      console.log(`🎮 STREAMING MODE CHANGED: ${isActive ? 'Activated' : 'Deactivated'}`);
      
      // ENHANCED CLEANUP: Reset ALL caches and state when streaming mode changes
      if (typeof window !== 'undefined') {
        console.log(`🧹 FULL RESET: Beginning complete state reset for streaming mode ${isActive ? 'activation' : 'deactivation'}`);
        
        // REMOVED: No longer resetting grid number counter, maintain continuity
        console.log(`🔄 PERSISTENCE: Keeping grid number at ${gridNumberTrackingRef.current} for continuous numbering`);
        
        // Reset local tracking of processed grids
        processedGridsRef.current.clear();
        console.log(`🧹 CLEANUP: Cleared local processed grids tracking`);
        
        // Clear the message log
        setMessageLog([]);
        console.log(`🧹 CLEANUP: Cleared message log - no longer preserving entries`);
        
        // Clear the attention score cache
        if ((window as any).GRID_ATTENTION_SCORES) {
          // Don't delete the object itself, just clear its contents to maintain references
          Object.keys((window as any).GRID_ATTENTION_SCORES).forEach(key => {
            delete (window as any).GRID_ATTENTION_SCORES[key];
          });
          console.log(`🧹 CLEANUP: Cleared GRID_ATTENTION_SCORES cache`);
        }
        
        // Clear the GRID_UNIQUE_PROCESSING Set to force fresh processing
        if ((window as any).GRID_UNIQUE_PROCESSING) {
          // Store the Set size for logging
          const gridCount = (window as any).GRID_UNIQUE_PROCESSING.size;
          
          // Clear the Set
          (window as any).GRID_UNIQUE_PROCESSING.clear();
          console.log(`🧹 CLEANUP: Cleared GRID_UNIQUE_PROCESSING Set (${gridCount} grids)`);
        }
        
        // Reset failed attention checks counter
        failedAttentionChecksRef.current = 0;
        console.log(`🧹 CLEANUP: Reset failed attention checks counter`);
        
        // Reset message sound played tracking
        messageSoundPlayedRef.current.clear();
        console.log(`🧹 CLEANUP: Cleared message sound played tracking`);
        
        // Reset displayed grids tracking
        displayedGridsRef.current.clear();
        console.log(`🧹 CLEANUP: Cleared displayed grids tracking`);
        
        // Reset all batch data
        setCurrentBatch([]);
        setBatchIndex(0);
        console.log(`🧹 CLEANUP: Reset batch display state`);
      }
      
      // Update our internal reference
      streamingModeRef.current = isActive;
      console.log(`🎮 STREAMING MODE REF: Updated to ${isActive}`);
      
      // When activating streaming mode, set global session timestamp
      if (isActive && typeof window !== 'undefined') {
        // Store session start time to identify unique sessions
        (window as any).sessionStartTimestamp = Date.now();
        // REMOVED: No longer tracking streamingModeStartTime for early grid handling
        (window as any).STREAMING_MODE_ACTIVE = true;
        console.log(`🌟 SESSION TRACKING: New session started at ${new Date().toISOString()}`);
        console.log(`🕒 STREAMING TIMING: No early grid handling - using 7-second timer exclusively`);
        
        // Add a debug message to track message log state
        console.log(`📝 MESSAGE LOG DEBUG: Current state has ${messageLog.length} entries at activation time`);
      }
      
      if (!isActive) {
        // Always reset grid processing lock when streaming mode is deactivated
        if (gridProcessingRef.current) {
          gridProcessingRef.current = false;
          console.log("🔓 GRID LOCK: Released due to streaming mode deactivation");
        }
        
        // Mark streaming mode as inactive in global state
        if (typeof window !== 'undefined') {
          (window as any).STREAMING_MODE_ACTIVE = false;
          (window as any).lastCompletedCycleTimestamp = 0;
          (window as any).lastCompletedCycleNumber = 0;
          console.log("🌐 GLOBAL STATE: Set STREAMING_MODE_ACTIVE to false and cleared cycle tracking");
          
          // IMPROVED: No longer using pending early grids mechanism
          console.log("🧹 GRID CLEANUP: Using direct timer-based grid generation without early grid caching");
        }
        
        // Reset the cycle completion tracking when streaming mode deactivates
        gridCycleCompletedRef.current = 0;
        console.log("🔄 CYCLE TRACKING: Reset grid cycle completion tracker on deactivation");
        
        // Clear any existing timers
        if (displayTimerRef.current) {
          clearTimeout(displayTimerRef.current);
          displayTimerRef.current = null;
          console.log("⏱️ TIMERS: Cleared display timer during deactivation");
        }
        
        if (ellipsisTimerRef.current) {
          clearInterval(ellipsisTimerRef.current);
          ellipsisTimerRef.current = null;
          console.log("⏱️ TIMERS: Cleared ellipsis timer during deactivation");
        }
      } else {
        // We already did a complete reset above in the shared cleanup code
        console.log("🔄 STREAMING MODE: Activation-specific initialization");
        
        // Reset UI visual states
        setShowBatch(false);
        
        // Set the waiting states for proper UI display
        setWaitingForCosmicWords(true);
        setWaitingForAttention(true);
        
        // Reset attention score to 0 and broadcast to other components
        setAttentionScore(0);
        if (typeof window !== 'undefined') {
          window.attentionScore = 0;
          window.attentionScoreLastUpdated = Date.now();
          
          try {
            const attentionEvent = new CustomEvent('attention-score-change', {
              detail: { score: 0 }
            });
            window.dispatchEvent(attentionEvent);
            console.log("🔄 STREAMING: Broadcasted attention score reset event");
          } catch (error) {
            console.error("Error dispatching attention score event:", error);
          }
        }
        
        // Remove globalWordHistory if it exists
        if (typeof window !== 'undefined' && (window as any).globalWordHistory) {
          delete (window as any).globalWordHistory;
          console.log(`🧹 CRITICAL FIX: Removed globalWordHistory from window object to prevent word caching`);
        }
        
        // Reset ellipsis animation
        setEllipsisCount(0);
        
        // Log that we're waiting for the next attention check
        console.log("🚀 ACTIVATION: Waiting for first attention check to begin");
        console.log("🔄 STREAMING MODE: Activation initialization completed");
      }
      
      // Update our local ref to stay in sync
      streamingModeRef.current = isActive;
      console.log(`🔄 STREAMING SYNC: Updated streamingModeRef.current to ${isActive} on streaming mode change event`);
    };
    
    // CRITICAL FIX: Add handler for abort signal
    const handleAbortGridProcessing = (e: CustomEvent) => {
      console.log(`⚠️ ABORT SIGNAL RECEIVED: Stopping all grid processing at ${new Date().toISOString()}`);
      console.log(`⚠️ ABORT DETAILS:`, e.detail);
      
      // Set our local streaming mode ref to false
      streamingModeRef.current = false;
      console.log(`⚠️ ABORT: Set streamingModeRef.current = false directly`);
      
      // Clear all timers
      if (gridTimerRef.current) {
        clearInterval(gridTimerRef.current);
        gridTimerRef.current = null;
        console.log(`⚠️ ABORT: Cleared grid timer`);
      }
      
      if (displayTimerRef.current) {
        clearTimeout(displayTimerRef.current);
        displayTimerRef.current = null;
        console.log(`⚠️ ABORT: Cleared display timer`);
      }
      
      if (ellipsisTimerRef.current) {
        clearInterval(ellipsisTimerRef.current);
        ellipsisTimerRef.current = null;
        console.log(`⚠️ ABORT: Cleared ellipsis timer`);
      }
      
      // Release grid processing lock
      gridProcessingRef.current = false;
      console.log(`⚠️ ABORT: Released grid processing lock`);
      
      // Set global flag for other components
      if (typeof window !== 'undefined') {
        (window as any).GRID_PROCESSING_ABORTED = true;
        // Also clear streaming mode and session timestamp
        (window as any).STREAMING_MODE_ACTIVE = false;
        (window as any).sessionStartTimestamp = 0;
        console.log(`⚠️ ABORT: Set global GRID_PROCESSING_ABORTED flag and cleared session tracking`);
        
        // IMPROVED: No longer using pending early grids mechanism
        console.log(`⚠️ ABORT: Using timer-based grid generation without early grid caching`);
      }
    };
    // REMOVED: handleGridProcessingComplete function
    // This event handler was causing potential recursive attention score calculations
    // All message log updates now happen directly in the 7-second cycle with no external events
    
    // COMPLETELY REMOVED: All early grid processing has been eliminated
    // The 7-second timer is now the only mechanism for grid generation
    
    // Add event listeners
    window.addEventListener('streamingModeChanged', handleStreamingModeChanged as EventListener);
    window.addEventListener('forceDeactivateStreamingMode', handleForceDeactivate as EventListener);
    window.addEventListener('abort-all-grid-processing', handleAbortGridProcessing as EventListener);
    
    // Clean up
    return () => {
      // Remove event listeners
      window.removeEventListener('streamingModeChanged', handleStreamingModeChanged as EventListener);
      window.removeEventListener('forceDeactivateStreamingMode', handleForceDeactivate as EventListener);
      window.removeEventListener('abort-all-grid-processing', handleAbortGridProcessing as EventListener);
      
      // Clear all timers
      if (gridTimerRef.current) {
        clearInterval(gridTimerRef.current);
        gridTimerRef.current = null;
      }
      
      if (ellipsisTimerRef.current) {
        clearInterval(ellipsisTimerRef.current);
        ellipsisTimerRef.current = null;
      }
      
      if (attentionUpdateTimerRef.current) {
        clearInterval(attentionUpdateTimerRef.current);
        attentionUpdateTimerRef.current = null;
        console.log("⏰ Cleared attention update timer during component cleanup");
      }
      
      if (displayTimerRef.current) {
        clearTimeout(displayTimerRef.current);
        displayTimerRef.current = null;
      }
    };
  }, []);
  
  // Request new grid generation - simplified with no staggered requests
  // Debug status dump function
  const dumpAttentionSettings = () => {
    console.log(`\n🔮🔮 ATTENTION STATUS DUMP 🔮🔮`);
    console.log(`Local attentionScore state: ${attentionScore}/50`);
    console.log(`Current attention threshold: ${DYNAMIC_ATTENTION_THRESHOLD}/50`);
    console.log(`Global window.attentionScore: ${(window as any).attentionScore || 'undefined'}/50`);
    console.log(`Global cosmic threshold: ${(window as any).COSMIC_THRESHOLD_VALUE || COSMIC_THRESHOLD}/50`);
    console.log(`Grid processing lock: ${gridProcessingRef.current ? 'LOCKED' : 'UNLOCKED'}`);
    console.log(`Failed attention checks: ${failedAttentionChecksRef.current}`);
    console.log(`Streaming mode active: ${streamingModeRef.current ? 'YES' : 'NO'}`);
    console.log(`Current grid number: ${gridNumberTrackingRef.current}`);
    console.log(`Displayed grids: ${Array.from(displayedGridsRef.current).join(', ') || 'None'}`);
    console.log(`Waiting for attention: ${waitingForAttention ? 'YES' : 'NO'}`);
    console.log(`Waiting for cosmic words: ${waitingForCosmicWords ? 'YES' : 'NO'}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`🔮🔮 END STATUS DUMP 🔮🔮\n`);
  };
    
  // REMOVED: The requestNewGrid function has been completely removed
  // It was causing duplicate attention score calculations and creating a second grid processing path.
  // The 7-second timer now exclusively handles grid incrementation and attention checks.
  // This ensures there's only a single path for grid processing, eliminating duplicate calculations.
  // All functionality previously handled by requestNewGrid is now managed by the 7-second timer cycle.
  
  // Listen for cosmic threshold changes via custom event 
  // IMPORTANT: This is completely separate from attention threshold!
  useEffect(() => {
    const handleCosmicThresholdChange = (e: CustomEvent) => {
      if (e.detail && typeof e.detail.threshold === 'number') {
        const newThreshold = e.detail.threshold;
        const timestamp = e.detail.timestamp || Date.now();
        const forceUpdate = e.detail.forceUpdate || false;
        
        // Validate the threshold value
        if (newThreshold < 10 || newThreshold > 40) {
          console.error(`🔮 Invalid cosmic threshold value: ${newThreshold}. Must be between 10-40.`);
          return;
        }
        
        console.log(`🔮 StreamingSentence: Cosmic threshold updated to ${newThreshold}/50 (timestamp: ${timestamp}${forceUpdate ? ', FORCE UPDATE' : ''})`);
        
        try {
          // Always update the global value first to ensure consistency
          if (typeof window !== 'undefined') {
            (window as any).COSMIC_THRESHOLD_VALUE = newThreshold;
          }
          
          // Update our component state for display purposes
          setCosmicThreshValue(newThreshold);
          
          console.log(`🔮 StreamingSentence: Updated global COSMIC_THRESHOLD_VALUE to ${newThreshold}/50`);
          console.log(`⚠️ THRESHOLD CHECK: Cosmic=${newThreshold}, Attention=${DYNAMIC_ATTENTION_THRESHOLD} (these are separate values)`);
          
          // ALWAYS reset the word tracking when threshold changes, 
          // regardless of streaming mode status
          wordGridQueueRef.current = [];
          
          // When cosmic threshold changes while streaming mode is active:
          if (streamingModeRef.current && active) {
            // Clear display immediately to show the waiting state
            setCurrentBatch([]);
            setShowBatch(false);
            
            // Force reset the displayed grids set to allow seeing new qualifying grids
            // This ensures that when lowering the threshold, we'll see words from "old" grids
            // that might now qualify with the new lower threshold
            displayedGridsRef.current.clear();
            // Reset our grid display tracking
            lastDisplayedGridRef.current = 0;
            lastDisplayedWordsRef.current = [];
            // Clear the message sound played tracking to allow playing sounds for new words with the new threshold
            messageSoundPlayedRef.current.clear();
            console.log("🧹 GRID TRACKING: Cleared the grid tracking after cosmic threshold change");
            
            // Reset the waiting state to allow new words to come in
            setWaitingForCosmicWords(true);
            
            // Reset previous words tracking
            previousWordsRef.current = [];
            
            // Reset batch index
            setBatchIndex(0);
            
            // REMOVED: No longer need to request a fresh grid after threshold change
            // The 7-second timer will naturally handle this in the next cycle
            setTimeout(() => {
              try {
                console.log("🔄 Cosmic threshold updated - next 7-second cycle will use new threshold");
                // REMOVED: Call to requestNewGrid() which was causing duplicate attention score calculations
              } catch (error) {
                console.error("Error handling threshold change:", error);
              }
            }, 100);
          }
        } catch (error) {
          console.error(`🔮 Error updating cosmic threshold: ${error}`);
        }
      }
    };
    
    // Add all event listeners to capture threshold changes from multiple sources
    window.addEventListener('cosmic-threshold-change', handleCosmicThresholdChange as EventListener);
    document.addEventListener('cosmic-threshold-update', handleCosmicThresholdChange as EventListener);
    // REMOVED: We no longer listen to forceRefreshGrids in two places
    // This prevents the duplicate processing that was causing multiple attention score calculations
    // document.addEventListener('forceRefreshGrids', handleCosmicThresholdChange as EventListener);
    
    // Add event listener for grid number changes from Home component
    // We'll track the actual backend grid number separately but only update the displayed
    // grid number when new words are shown
    // REMOVED: handleGridNumberChanged event handler is no longer needed
    // We now exclusively use gridNumberTrackingRef.current for tracking the grid number
    // and it only gets incremented in the 7-second grid timer function
    
    // Clean up all listeners
    return () => {
      window.removeEventListener('cosmic-threshold-change', handleCosmicThresholdChange as EventListener);
      document.removeEventListener('cosmic-threshold-update', handleCosmicThresholdChange as EventListener);
      // REMOVED: We no longer listen to forceRefreshGrids in two places
      // document.removeEventListener('forceRefreshGrids', handleCosmicThresholdChange as EventListener);
    };
  }, [active]);

  // Process cosmic words when they change
  useEffect(() => {
    if (!active || !cosmicWords.length) return;
    
    // Check if this is the first grid (for debugging purposes)
    const isFirstBatch = gridNumberTrackingRef.current <= 1;
    if (isFirstBatch) {
      console.log(`🔍 FIRST BATCH CHECK: Processing first batch of cosmic words with ${cosmicWords.length} words in grid #${gridNumberTrackingRef.current}`);
      // Log all the words from the first grid with their scores
      console.log(`\n🔍🔍 FIRST GRID WORD ANALYSIS 🔍🔍`);
      console.log(`Current cosmic threshold: ${(window as any).COSMIC_THRESHOLD_VALUE || COSMIC_THRESHOLD}/50`);
      console.log(`Attention score of this grid: ${attentionScore}/50 (threshold: ${DYNAMIC_ATTENTION_THRESHOLD})`);
      console.log(`Total words found in this grid: ${cosmicWords.length}`);
      console.log(`Grid processing lock status: ${gridProcessingRef.current ? 'LOCKED' : 'UNLOCKED'}`);
      console.log(`Grids processed so far: ${Array.from(displayedGridsRef.current).join(', ') || 'None'}`);
      
      cosmicWords.forEach(word => {
        console.log(`🔍 WORD: "${word.word}" with cosmic score ${word.score}/50, from grid #${word.gridGeneration} ${(word.score >= ((window as any).COSMIC_THRESHOLD_VALUE || COSMIC_THRESHOLD)) ? '✅ PASSES COSMIC THRESHOLD' : '❌ BELOW COSMIC THRESHOLD'}`);
      });
      console.log(`🔍🔍 END WORD ANALYSIS 🔍🔍\n`);
    }
    
    // Get all unique grid generations
    const gridGens = [...new Set(cosmicWords.map(word => word.gridGeneration || 0))];
    
    // Create a batch for each grid generation
    const batches: StreamingWord[][] = [];
    
    gridGens.forEach(gridGen => {
      // First pass: Collect all derived words (secondary and tertiary) for filtering
      const derivedWordsSet = new Set<string>();
      const primaryWordsSet = new Set<string>();
      const primaryWithDerivationsSet = new Set<string>();
      
      // Pass 1: Identify all words in this grid
      cosmicWords.forEach(word => {
        if (word.gridGeneration !== gridGen) return;
        
        // Cast to extended type
        const extendedWord = word as ExtendedCosmicWord;
        
        // Add primary word to tracking set
        primaryWordsSet.add(extendedWord.word.toLowerCase());
        
        // Track if this word has derived words
        const hasDerivedWords = 
          (extendedWord.tertiaryWords && extendedWord.tertiaryWords.length > 0) || 
          (extendedWord.childWords && extendedWord.childWords.length > 0);
        
        // Mark primary words that have derivations
        if (hasDerivedWords) {
          primaryWithDerivationsSet.add(extendedWord.word.toLowerCase());
        }
        
        // Collect all child words (secondary words)
        if (extendedWord.childWords && extendedWord.childWords.length > 0) {
          extendedWord.childWords.forEach(child => {
            derivedWordsSet.add(child.word.toLowerCase());
          });
        }
        
        // Legacy code for tertiary words (keeping for backward compatibility)
        if (extendedWord.tertiaryWords && extendedWord.tertiaryWords.length > 0) {
          extendedWord.tertiaryWords.forEach(tertiary => {
            derivedWordsSet.add(tertiary.word.toLowerCase());
          });
        }
        
        // Collect all secondary words
        if (word.childWords && word.childWords.length > 0) {
          word.childWords.forEach(secondary => {
            derivedWordsSet.add(secondary.word.toLowerCase());
          });
        }
      });
      
      // Map to store all words that will appear in the final display
      const wordMap = new Map<string, { level: number, count: number, score: number, replacedWord?: string, wordType?: string, parent?: string }>();
      
      // Log the types of words in this grid for debugging
      console.log(`Grid #${gridGen} - Processing ${cosmicWords.filter(w => w.gridGeneration === gridGen).length} words:
        - Primary words: ${primaryWordsSet.size}
        - Derived words: ${derivedWordsSet.size}
        - Words with derivations: ${primaryWithDerivationsSet.size}
      `);
      
      // Pass 2: Process all words with prioritization and filtering
      cosmicWords.forEach(word => {
        if (word.gridGeneration !== gridGen) return;
        
        // Cast to extended type
        const extendedWord = word as ExtendedCosmicWord;
        
        // Note: Tertiary word processing has been removed as we don't use it anymore
        
        // Process all secondary words that pass the cosmic threshold, regardless of comparison to primary word score
        if (word.childWords && word.childWords.length > 0) {
          word.childWords.forEach(secondary => {
            // Include all secondary words that pass the cosmic threshold
            // No comparison to primary word score required
            console.log(`Processing secondary word "${secondary.word}" (score: ${secondary.score}) from primary "${word.word}" (score: ${word.score})`);
            const key = secondary.word.toLowerCase();
            if (wordMap.has(key)) {
              // Only increment count if not already a tertiary word
              const existing = wordMap.get(key)!;
              if (existing.level <= 2) { // Only update if existing is the same level or lower
                wordMap.set(key, { 
                  level: 2, 
                  count: existing.count + 1,
                  score: secondary.score,
                  replacedWord: word.word, // Original word that was replaced
                  parent: word.word // Store parent word for reference
                });
              }
            } else {
              wordMap.set(key, { 
                level: 2, 
                count: 1,
                score: secondary.score,
                replacedWord: word.word, // Original word that was replaced
                parent: word.word // Store parent word for reference
              });
            }
          });
        }
        
        // Process primary words with filtering:
        // ONLY show primary words that:
        // 1. Don't have any derived words, AND
        // 2. Don't exist as a derived word anywhere in this grid
        const key = word.word.toLowerCase();
        
        // Skip this primary word if:
        // - It has its own derivations, OR
        // - It appears as a derived word anywhere in this grid
        const shouldSkipPrimary = 
          primaryWithDerivationsSet.has(key) || // Has its own derived words
          derivedWordsSet.has(key);            // Appears as someone else's derived word
        
        if (!shouldSkipPrimary) {
          if (wordMap.has(key)) {
            // Only increment count if not already a higher level word
            const existing = wordMap.get(key)!;
            if (existing.level === 1) {
              wordMap.set(key, { 
                level: 1, 
                count: existing.count + 1,
                score: word.score
                // No replacedWord for primary words
              });
            }
          } else {
            wordMap.set(key, { 
              level: 1, 
              count: 1,
              score: word.score
              // No replacedWord for primary words
            });
          }
        }
      });
      
      // Process the words for this grid
      // New approach: Identify secondary words by using the Home component's derived word tracking
      const secondaryWords = new Set<string>();
      
      // Create a set of secondary words (from derived words in Home component)
      console.log(`🔍 SECONDARY TRACKING: Looking for secondary words in grid #${gridGen}`);
      
      // Process all cosmic words without filtering by grid generation
      cosmicWords.forEach(word => {
        // Check if this is a primary word with children (these are marked in Home.tsx)
        if (word.childWords && word.childWords.length > 0) {
          console.log(`🔍 SECONDARY TRACKING: Word "${word.word}" has ${word.childWords.length} child words`);
          
          word.childWords.forEach(child => {
            console.log(`🔍 SECONDARY TRACKING: Adding secondary word "${child.word}" (from "${word.word}")`);
            secondaryWords.add(child.word.toLowerCase());
          });
        } else {
          console.log(`🔍 SECONDARY TRACKING: Word "${word.word}" has no child words (primary only)`);
        }
      });
      
      // Convert map to array
      const deduplicatedWords: StreamingWord[] = [];
      
      // Log the total secondary words we found
      console.log(`🔍 WORD CLASSIFICATION: Found ${secondaryWords.size} secondary words in grid #${gridGen}`);
      if (secondaryWords.size > 0) {
        console.log(`🔍 WORD CLASSIFICATION: Secondary words: ${Array.from(secondaryWords).join(', ')}`);
      }
      
      wordMap.forEach((value, key) => {
        // Determine if this word is a secondary word
        const isSecondary = secondaryWords.has(key.toLowerCase());
        
        // Log the classification of each word
        console.log(`🔍 WORD CLASSIFICATION: Word "${key}" classified as ${isSecondary ? '2nd' : '1st'} level`);
        
        // Find parent word for secondary words
        let parentWord = undefined;
        if (isSecondary) {
          // Look through all primary words to find which one has this as a child
          // No more filtering by grid generation
          for (const word of cosmicWords) {
            if (word.childWords && word.childWords.length > 0) {
              const isChild = word.childWords.some(child => 
                child.word.toLowerCase() === key.toLowerCase()
              );
              
              if (isChild) {
                parentWord = word.word;
                console.log(`🔗 Found parent "${parentWord}" for secondary word "${key}"`);
                break;
              }
            }
          }
        }
        
        deduplicatedWords.push({
          word: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
          // Set level based on whether it's a secondary word
          level: isSecondary ? 2 : 1,
          count: value.count,
          score: value.score,
          replacedWord: value.replacedWord,
          parent: parentWord // Add parent information for secondary words
        });
      });
      
      // Sort ONLY by score (highest first)
      const sortedBatch = [...deduplicatedWords].sort((a, b) => {
        return (b.score || 0) - (a.score || 0);
      });
      batches.push(sortedBatch);
    });
    
    // No more sorting batches by grid generation
    // We'll just use batches in the order they were created
    
    // Update the queue with new batches
    wordGridQueueRef.current = batches;
    
  }, [active, cosmicWords]);
  
  // No more caching grid attention scores - each score is freshly calculated
  // Comments retained for documentation purposes only
  
  // REMOVED: checkAttentionFilter function has been removed as it's no longer needed
  // We now calculate attention scores directly every 7 seconds with no caching logic
  
  // Ellipsis animation effect
  useEffect(() => {
    // Only run ellipsis animation if we're waiting for attention or cosmic words
    const needsEllipsis = active && (waitingForAttention || waitingForCosmicWords);
    
    if (!needsEllipsis) {
      if (ellipsisTimerRef.current) {
        clearInterval(ellipsisTimerRef.current);
        ellipsisTimerRef.current = null;
      }
      return;
    }
    
    // Set first dot immediately - don't wait for timer to start
    setEllipsisCount(1);
    
    // Clear any existing timer to avoid multiple animations
    if (ellipsisTimerRef.current) {
      clearInterval(ellipsisTimerRef.current);
    }
    
    // Set up ellipsis animation timer with a faster sequence - maximum 1.5 seconds per full cycle
    ellipsisTimerRef.current = window.setInterval(() => {
      try {
        // Simpler, more consistent animation - just cycle 1, 2, 3, 1, 2, 3...
        setEllipsisCount(prev => {
          // Reset to 1 if somehow the value gets out of bounds (prevents hanging)
          if (prev < 1 || prev > 3) return 1;
          // Normal cycle through the 3 dots 
          return (prev % 3) + 1;
        });
      } catch (error) {
        // Fallback to a safe value if something goes wrong
        console.error("Error in ellipsis animation:", error);
        setEllipsisCount(1);
      }
    }, 500); // 500ms per dot = 1.5 seconds for full cycle (3 dots)
    
    return () => {
      if (ellipsisTimerRef.current) {
        clearInterval(ellipsisTimerRef.current);
      }
    };
  }, [active, waitingForAttention, waitingForCosmicWords]);
  
  // Update the ref whenever the active state changes to keep them in sync
  useEffect(() => {
    // Update the ref to match the current active state
    streamingModeRef.current = active;
    console.log(`🔄 STREAMING SYNC: Updated streamingModeRef.current to ${active}`);
    
    // If we're activating streaming mode, prepare state for a new session
    if (active) {
      // UNIFIED PATH: Use the same approach for all runs
      // Track that it's a streaming activation for debugging
      const runCount = typeof window !== 'undefined' ? ((window as any).beginCommunicationCount || 0) + 1 : 1;
      console.log(`🔄 STREAMING ACTIVATION #${runCount}: Initializing with unified code path`);
      
      // Always ensure the grid processing lock is disabled
      console.log(`🔒 GRID LOCK: Ensuring grid processing lock is disabled for clean start`);
      gridProcessingRef.current = false;
      
      // Clear display tracking data to ensure a clean start
      displayedGridsRef.current.clear();
      messageSoundPlayedRef.current.clear();
      previousWordsRef.current = [];
      // Reset grid display tracking but not the grid number itself
      lastDisplayedGridRef.current = -1; // Use -1 to force displaying the first grid
      lastDisplayedWordsRef.current = [];
      
      // CHANGED: Always reset gridNumberTrackingRef.current on streaming activation
      // This ensures a fresh start for each Begin Communication session
      gridNumberTrackingRef.current = 0;
      console.log(`🔢 GRID RESET: Reset grid number to #0 for fresh start`);
      
      // CRITICAL FIX: Also update the global window.currentGridBeingDisplayed variable
      // This is needed for the diagnostic system to properly display grid numbers
      if (typeof window !== 'undefined') {
        (window as any).currentGridBeingDisplayed = 0;
        console.log(`🔢 GRID DISPLAY: Initialized global window.currentGridBeingDisplayed to #0`);
      }
      
      // Always reset grid processing state for a clean start
      gridProcessingRef.current = false;
      
      // Mark that we've run Begin Communication at least once
      if (typeof window !== 'undefined') {
        // Mark that we've run at least once
        (window as any).alreadyRunBeginCommunication = true;
        
        // Increment and track the run counter
        const currentCount = (window as any).beginCommunicationCount || 1;
        (window as any).beginCommunicationCount = currentCount + 1;
        console.log(`📈 BEGIN COMM COUNTER: Run #${(window as any).beginCommunicationCount}`);
      }
      
      // Reset local state
      setCurrentBatch([]);
      setShowBatch(false);
      setWaitingForAttention(true);
      setWaitingForCosmicWords(true);
      setEllipsisCount(0);
      
      // This is a decoder - we're tracking runs but not filtering content between runs
      const isSubsequentActivation = typeof window !== 'undefined' && (window as any).alreadyRunBeginCommunication;
      if (!isSubsequentActivation) {
        console.log("🧹 FIRST RUN: Starting with clean display history");
        // REMOVED: setWordHistory([]) to prevent word caching
      } else {
        console.log("🔄 SUBSEQUENT RUN: This is run #" + ((window as any).beginCommunicationCount || 2));
      }
      
      setBatchIndex(0);
      setGridNumber(0);
      
      // Force a clean state for any previous timers that might be lingering
      if (displayTimerRef.current) {
        clearTimeout(displayTimerRef.current);
        displayTimerRef.current = null;
      }
      if (gridTimerRef.current) {
        clearInterval(gridTimerRef.current);
        gridTimerRef.current = null;
      }
      if (ellipsisTimerRef.current) {
        clearInterval(ellipsisTimerRef.current);
        ellipsisTimerRef.current = null;
      }
      if (attentionUpdateTimerRef.current) {
        clearInterval(attentionUpdateTimerRef.current);
        attentionUpdateTimerRef.current = null;
      }
      
      // Force reset the word queue
      wordGridQueueRef.current = [];
      
      console.log("🧹 GRID TRACKING: Complete reset performed for a fresh streaming session");
      
      // Notify that we're ready for streaming with a clean state
      try {
        const streamingReadyEvent = new CustomEvent('streamingStateReady', {
          detail: { timestamp: Date.now() }
        });
        window.dispatchEvent(streamingReadyEvent);
        console.log("🚀 STREAMING: Dispatched streamingStateReady event");
      } catch (error) {
        console.error("Error dispatching streaming ready event:", error);
      }
    }
    
    // When streaming mode is activated - only log activation, don't run any extra attention checks
    if (active) {
      console.log("🚨 STREAMING MODE ACTIVATED 🚨");
      console.log("🚨 GRID POLICY: No immediate attention checks - waiting for 7-second timer only");
      console.log("🚨 DUPLICATION FIX: Removed manual attention filter test that was causing duplicate attention scores");
    }
    
    // Clean up when streaming mode is deactivated
    if (!active) {
      console.log("🧹 STREAMING CLEANUP: Deactivating streaming mode, performing complete cleanup");
      
      // Reset local state
      setCurrentBatch([]);
      setShowBatch(false);
      setWaitingForAttention(false);
      setWaitingForCosmicWords(false);
      setEllipsisCount(0);
      
      // REMOVED: No longer resetting display history to prevent word caching
      console.log("🧹 STREAMING CLEANUP: No word history tracking - disabled to prevent caching");
      
      // Clear all tracking data EXCEPT grid number
      displayedGridsRef.current.clear();
      messageSoundPlayedRef.current.clear();
      previousWordsRef.current = [];
      lastDisplayedGridRef.current = -1; // Use -1 to force refresh on next activation
      lastDisplayedWordsRef.current = [];
      // REMOVED: No longer resetting grid number when deactivating
      // Grid numbers should persist throughout the entire session
      console.log(`🔢 GRID PERSISTENCE: Keeping grid number at #${gridNumberTrackingRef.current} during deactivation`);
      wordGridQueueRef.current = [];
      
      // Clear all timers
      if (displayTimerRef.current) {
        clearTimeout(displayTimerRef.current);
        displayTimerRef.current = null;
        console.log("🧹 STREAMING CLEANUP: Cleared display timer");
      }
      
      // Simple clean-up approach: just log what we're doing
      console.log(`\n🧹 TIMER CLEANUP: Streaming mode changed, cleaning up timers`);
      console.log(`🧹 TIMER CLEANUP: Resetting execution counter`);
      
      if (typeof window !== 'undefined') {
        // Reset execution counter for clean tracking
        if ((window as any).TIMER_EXEC_COUNT) {
          (window as any).TIMER_EXEC_COUNT = 0;
        }
        
        // Clear the active timer ID reference
        if ((window as any).activeTimerId) {
          (window as any).activeTimerId = null;
        }
      }
      
      console.log(`🧹 END TIMER CLEANUP\n`);
      
      // Also clear our specific timer
      if (gridTimerRef.current) {
        clearInterval(gridTimerRef.current);
        gridTimerRef.current = null;
        console.log("🧹 STREAMING CLEANUP: Cleared grid timer");
      }
      
      if (ellipsisTimerRef.current) {
        clearInterval(ellipsisTimerRef.current);
        ellipsisTimerRef.current = null;
        console.log("🧹 STREAMING CLEANUP: Cleared ellipsis timer");
      }
      
      // Clean up the attention update timer
      if (attentionUpdateTimerRef.current) {
        clearInterval(attentionUpdateTimerRef.current);
        attentionUpdateTimerRef.current = null;
        console.log("🧹 STREAMING CLEANUP: Cleared attention update timer");
      }
      
      // Critical: Always reset grid processing lock when streaming mode is toggled off
      // This prevents the grid from getting stuck in a locked state when streaming mode is toggled back on
      if (gridProcessingRef.current) {
        gridProcessingRef.current = false;
        console.log("🧹 STREAMING CLEANUP: Released grid processing lock to prevent hanging");
      }
      
      // Signal that cleanup is complete
      try {
        const cleanupCompleteEvent = new CustomEvent('streamingCleanupComplete', {
          detail: { timestamp: Date.now() }
        });
        window.dispatchEvent(cleanupCompleteEvent);
        console.log("🧹 STREAMING: Dispatched streamingCleanupComplete event");
      } catch (error) {
        console.error("Error dispatching cleanup complete event:", error);
      }
    }
  }, [active]);

  // Memory management and periodic cleanup to prevent crashes after long runtime
  useEffect(() => {
    if (!streamingModeRef.current) return;
    
    console.log("🚀 IMPROVED: Adding memory management system to prevent crashes after long runtime");
    
    // Set up periodic cleanup of ONLY critical components that need regular maintenance
    // This more focused cleanup prevents screen flashes and component remounts
    const gridProcessingCleanupInterval = setInterval(() => {
      if (!streamingModeRef.current) return;
      
      console.log("\n🧹 PERFORMING TARGETED GRID PROCESSING CLEANUP 🧹");
      
      try {
        if (typeof window !== 'undefined') {
          // CRITICAL FIX: Only clear GRID_UNIQUE_PROCESSING which is needed to prevent duplication issues
          // This is the only cleanup that's truly necessary for proper functioning
          if ((window as any).GRID_UNIQUE_PROCESSING) {
            const gridCount = (window as any).GRID_UNIQUE_PROCESSING.size;
            if (gridCount > 0) {
              (window as any).GRID_UNIQUE_PROCESSING.clear();
              console.log(`🧹 TARGETED CLEANUP: Cleared GRID_UNIQUE_PROCESSING Set (${gridCount} grids)`);
            } else {
              console.log(`🧹 TARGETED CLEANUP: GRID_UNIQUE_PROCESSING already empty, no action needed`);
            }
          } else {
            console.log(`🧹 TARGETED CLEANUP: GRID_UNIQUE_PROCESSING doesn't exist yet, no action needed`);
          }
        }
      } catch (error) {
        console.error("Error during targeted grid processing cleanup:", error);
      }
      
      console.log("🧹 TARGETED GRID PROCESSING CLEANUP COMPLETE 🧹\n");
      
    }, 60000); // Run this focused cleanup every 60 seconds
    
    return () => {
      // Clean up the interval when component unmounts
      clearInterval(gridProcessingCleanupInterval);
      console.log("🧹 MEMORY: Cleared grid processing cleanup interval on unmount");
    };
  }, [streamingModeRef.current]);

  // Set up display cycle when active
  useEffect(() => {
    // Don't need to update ref here, it's already handled in the first useEffect
    
    // Simple timer setup logging - no duplicate tracking needed
    if (typeof window !== 'undefined') {
      console.log(`\n🔍🔍 TIMER SETUP 🔍🔍`);
      console.log(`Active state: ${active}`);
      console.log(`Streaming mode: ${streamingModeRef.current ? 'active' : 'inactive'}`);
      console.log(`Current timer ID: ${gridTimerRef.current}`);
      console.log(`🔍🔍 END TIMER SETUP 🔍🔍\n`);
    }
    
    // CRITICAL FIX: Don't do ANY initialization if not active
    // This prevents grid generation on page load when not active
    if (!active) {
      console.log("🚫 STREAMING INACTIVE: No initialization will be performed");
      // Reset all state
      setCurrentBatch([]);
      setShowBatch(false);
      setBatchIndex(0);
      setGridNumber(0);
      setWaitingForAttention(false);
      setWaitingForCosmicWords(false);
      
      // Reset displayedGridsRef to ensure we don't track grids across sessions
      displayedGridsRef.current = new Set();
      
      // Reset timers already handled in the first useEffect
      return;
    }
    
    console.log("🚀 STREAMING ACTIVE: Initializing streaming mode");
    
    // CRITICAL FIX: Remove the early grid generation ("boost") mechanism
    // We're simplifying the approach by ensuring grids are only generated
    // after the 7-second timer is fully initialized
    
    // We're still tracking if this is first run or subsequent run
    // but NO initial grid generation happens here anymore
    if (typeof window !== 'undefined') {
      if (!(window as any).alreadyRunBeginCommunication) {
        // First time running Begin Communication
        (window as any).alreadyRunBeginCommunication = true;
        (window as any).beginCommunicationRunCount = 1; // Initialize run counter
        console.log("🔮 GLOBAL TRACKING: This is the FIRST instance of Begin Communication (Run #1)");
        (window as any).firstBeginCommunicationTime = Date.now();
        
        // Setup automatic diagnostics for first run
        // Create a reference to messageLog for diagnostics
        if (typeof window !== 'undefined') {
          (window as any).AUTO_DIAGNOSTICS_ENABLED = true;
          (window as any).AUTO_DIAGNOSTICS_INTERVAL = 15; // Run diagnostics every 15 grids
          console.log("🧪 AUTO DIAGNOSTICS: Enabled automatic diagnostics (every 15 grids)");
        }
      } else {
        // This is a subsequent run - increment run counter
        (window as any).beginCommunicationRunCount = ((window as any).beginCommunicationRunCount || 1) + 1;
        console.log(`🔮 GLOBAL TRACKING: This is a SUBSEQUENT instance of Begin Communication (Run #${(window as any).beginCommunicationRunCount})`);
        
        // For long running sessions, automatically increase diagnostic frequency
        if ((window as any).beginCommunicationRunCount >= 3) {
          (window as any).AUTO_DIAGNOSTICS_INTERVAL = 10; // Run more frequently after 3+ runs
          console.log("🧪 AUTO DIAGNOSTICS: Increasing diagnostic frequency (every 10 grids)");
        }
      }
      
      // Always reset lastDisplayedGridRef regardless of run number
      lastDisplayedGridRef.current = -1;
      console.log("🛠️ CRITICAL FIX: Set lastDisplayedGridRef to -1");
      
      // IMPORTANT: No grid generation happens at this point - waiting for timer
      console.log("⏱️ GRID POLICY: No initial grids generated - waiting for 7-second timer initialization");
    }
    
    console.log("Starting grid cycle with 7s intervals as requested");
    
    // Reset grid processing lock to ensure a fresh start
    gridProcessingRef.current = false;
    console.log("🔓 GRID LOCK: Reset at startup to ensure fresh state");
    
    // REMOVED: The 5-second attention update timer was causing too frequent updates
    // Attention score will now only be updated on the main 7-second grid timer
    if (attentionUpdateTimerRef.current) {
      clearInterval(attentionUpdateTimerRef.current);
      attentionUpdateTimerRef.current = null;
    }
    
    console.log("⚠️ ATTENTION UPDATE: Removed 5-second timer - will only update attention on 7-second grid timer");
    
    // Check if this is a subsequent run of Begin Communication
    const isSubsequentRun = typeof window !== 'undefined' && (window as any).alreadyRunBeginCommunication;
    
    // CRITICAL FIX FOR DUPLICATES: Remove all separate code paths 
    // All initial grid generation happens exclusively via the 7-second timer
    console.log("🔍 GRID POLICY: All grid generation happens exclusively via the 7-second timer");
    console.log("🔍 GRID POLICY: No immediate grid generation at startup - waiting for first timer cycle");
    
    // Initialize waiting states properly
    setWaitingForAttention(true);
    setWaitingForCosmicWords(true);
    setShowBatch(true); // Show ellipses
    
    // Initialize attention score at zero until first timer cycle
    setAttentionScore(0);
    
    // No separate code paths for first vs subsequent runs
    // All grid processing happens exclusively through the 7-second timer
    
    // Setup will be done in the main useEffect below
    
    // Set up interval to run attention filter every 7 seconds (7000ms)
    // Only proceed with grid generation if attention score passes the threshold
    
    // Initialize the cycle tracking at 0, meaning no cycle has completed yet
    gridCycleCompletedRef.current = 0;
    console.log("🔄 CYCLE TRACKING: Initialized cycle tracker to 0 on component mount");
    
    // REMOVED: Eliminated the entire initialGridKickstart function that was creating duplicate timers
    console.log(`\n🚫 REMOVED: Deleted entire initialGridKickstart function that was causing duplicates`);
    console.log(`🔄 SIMPLIFIED: Using only the main 7-second timer for attention checks and grid processing`);
    console.log(`🔄 STATUS: Single timer mode now active - waiting for 7-second cycle\n`);
    
    // Always reset the global attention score cache for complete state reset
    if (typeof window !== 'undefined') {
      // Create a fresh empty object to ensure complete reset
      (window as any).GRID_ATTENTION_SCORES = {};
      console.log("🔍 GRID TRACKING: Completely reset global GRID_ATTENTION_SCORES cache");
      
      // REMOVED: No longer using GRID_ALREADY_MADE - relying solely on GRID_UNIQUE_PROCESSING
      // with 5-second auto-cleanup for better decoder behavior
      console.log("🔍 GRID TRACKING: No longer using global GRID_ALREADY_MADE cache");
      
      // IMPROVED: Early grid caching has been completely removed
      console.log("🔍 GRID TRACKING: Using only 7-second timer for grid generation - early grid caching removed");
      
      // Reset attention score
      window.attentionScore = 0;
      window.attentionScoreLastUpdated = Date.now();
      console.log("🔍 GRID TRACKING: Reset global attention score to 0");
    }
    
    // Debug grid numbering
    if (typeof window !== 'undefined') {
      console.log(`\n🔢🔢 GRID NUMBER DEBUG AT STARTUP 🔢🔢`);
      console.log(`Grid tracking ref: ${gridNumberTrackingRef.current}`);
      console.log(`🔢🔢 END GRID NUMBER DEBUG 🔢🔢\n`);
    }
    
    // Simple timer cleanup - only clear our own timer if it exists
    if (gridTimerRef.current) {
      console.log(`🧹 CLEARING PREVIOUS TIMER: ${gridTimerRef.current}`);
      clearInterval(gridTimerRef.current);
      gridTimerRef.current = null;
    }
    
    // Create a SINGLE new timer and store in ref
    // This is the ONLY place in the entire codebase that creates the 7-second timer
    console.log(`\n⏱️⏱️ CREATING SINGLE 7-SECOND TIMER ⏱️⏱️`);
    console.log(`⏱️ Time: ${new Date().toISOString()}`);
    console.log(`⏱️ Previous timer ID: ${gridTimerRef.current}`);
    console.log(`⏱️ Using GRID_INTERVAL: ${GRID_INTERVAL}ms (7 seconds)`);
    
    // MODIFIED: Add a 0.5-second delay before starting the timer
    // This ensures the component is fully loaded before any grid generation begins
    console.log(`⏱️ TIMER CREATION: Adding a 0.5-second delay before starting the main timer`);
    console.log(`⏱️ DELAYED START: Will initialize timer at ${new Date(Date.now() + 500).toISOString()}`);
    
    // Use setTimeout to delay the creation of the setInterval timer
    const startupTimer = setTimeout(() => {
      console.log(`⏱️ TIMER CREATION: Now creating timer with exact interval: ${GRID_INTERVAL}ms after 0.5-second delay`);
      console.log(`⏱️ TIMER STARTUP: Starting timer at ${new Date().toISOString()}`);
      
      // Create timer and IMMEDIATELY store its ID in the ref
      const newTimerId = window.setInterval(function gridTimerFunction() {
        // Function body starts properly here
        
        // Store the timer ID in the ref for immediate access
        gridTimerRef.current = newTimerId;
      
      // Simply store the timer ID in the ref for cleanup - no tracking or duplicate checking needed
      console.log(`✅ TIMER: Running with ID ${newTimerId}`);
      
      // Keep simple logging of the timer ID for debugging purposes
      if (typeof window !== 'undefined') {
        if (!(window as any).activeTimerId) {
          (window as any).activeTimerId = newTimerId;
        }
      }
      
      // Record execution time for debugging
      console.log(`\n⏰⏰ TIMER EXECUTION: ${new Date().toISOString()} ⏰⏰`);
      console.log(`⏰ TIMER ID: ${newTimerId}`);
      console.log(`⏰ EXECUTION COUNT: ${typeof window !== 'undefined' && (window as any).TIMER_EXEC_COUNT ? 
        (window as any).TIMER_EXEC_COUNT++ : ((window as any).TIMER_EXEC_COUNT = 1)}`);
      
      // IMPROVED LOGGING: Add a more visible way to track which grids posted to message log
      if (typeof window !== 'undefined') {
        const attention = window.attentionScore || 0;
        const threshold = (window as any).ATTENTION_THRESHOLD || 20;
        console.log(`\n🔎🔎🔎 ATTENTION DIAGNOSTICS FOR GRID #${gridNumberTrackingRef.current} 🔎🔎🔎`);
        console.log(`🔎 Current attention score: ${attention}/50`);
        console.log(`🔎 Current threshold: ${threshold}/50`);
        console.log(`🔎 Will pass check: ${attention >= threshold ? 'YES ✓' : 'NO ✗'}`);
        const gridLogEntries = Array.from(messageLog).map(entry => entry.gridNumber);
        console.log(`🔎 Message log grid numbers: ${gridLogEntries.length > 0 ? gridLogEntries.join(', ') : 'EMPTY LOG'}`);
        
        // AUTOMATIC DIAGNOSTICS: Run at specific intervals
        if ((window as any).AUTO_DIAGNOSTICS_ENABLED && 
            gridNumberTrackingRef.current % ((window as any).AUTO_DIAGNOSTICS_INTERVAL || 15) === 0 && 
            gridNumberTrackingRef.current > 0) {
          console.log(`\n🧪🧪 RUNNING AUTOMATIC DIAGNOSTICS AT GRID #${gridNumberTrackingRef.current} 🧪🧪`);
          
          // Run without blocking the UI - use setTimeout with 0 delay
          setTimeout(() => {
            try {
              // Save a reference to the message log for diagnostics
              if (typeof window !== 'undefined') {
                window.messageLogRef = { current: messageLog };
              }
              
              // Check if we have the new centralized diagnostics available
              if (typeof window !== 'undefined' && (window as any).runDiagnostics) {
                console.log("Using centralized diagnostic tools from window.runDiagnostics");
                (window as any).runDiagnostics.analyzeGridNumbers();
                
                // After each 3 automatic runs, perform a full diagnostic
                if ((window as any).AUTO_DIAGNOSTICS_RUNS && 
                    (window as any).AUTO_DIAGNOSTICS_RUNS.length % 3 === 0) {
                  console.log(`\n🧪🧪 RUNNING FULL DIAGNOSTIC SUITE (AUTOMATIC) 🧪🧪`);
                  (window as any).runDiagnostics.runFullDiagnostics();
                }
              } else {
                // Fall back to local version if window.runDiagnostics isn't available
                runDiagnostics.findMessageLogDuplicates(messageLog);
              }
              
              // Record diagnostic execution
              if (!(window as any).AUTO_DIAGNOSTICS_RUNS) {
                (window as any).AUTO_DIAGNOSTICS_RUNS = [];
              }
              (window as any).AUTO_DIAGNOSTICS_RUNS.push({
                timestamp: Date.now(),
                gridNumber: gridNumberTrackingRef.current,
                messageLogLength: messageLog.length
              });
            } catch (error) {
              console.error("Automatic diagnostics error:", error);
            }
          }, 0);
        }
        
        console.log(`🔎🔎🔎 END ATTENTION DIAGNOSTICS 🔎🔎🔎\n`);
      }
      
      console.log(`⏰⏰ END TIMER EXECUTION ⏰⏰\n`);
      
      // CRITICAL BUGFIX: Complete redesign of grid number incrementing logic
      // We need to carefully synchronize grid number increments with the 7-second cycle
      
      // IMPORTANT: We only increment the grid number at the START of the 7-second cycle,
      // BEFORE any processing begins. This ensures each grid has a unique number
      // and each unique number corresponds to exactly one grid of content.
      
      // Get the current cycle number based on timestamp
      const exactTimeNow = Date.now();
      const currentCycleBasedOnTime = Math.floor(exactTimeNow / GRID_INTERVAL);
      
      // Store the current state variables
      const previousGridNumber = gridNumberTrackingRef.current;
      const currentWordContentState = wordGenerationInProgressRef.current || false;
      const isGettingAttention = isGettingAttentionScoreRef.current || false;
      
      // Get the last cycle we processed (if any)
      const lastCycleProcessed = lastProcessedCycleRef.current || 0;
      
      // COMPLETELY REDESIGNED GRID INCREMENT POLICY:
      // Only increment the grid number if this is a NEW CYCLE that hasn't been processed yet
      if (currentCycleBasedOnTime > lastCycleProcessed) {
        // This is a new cycle that we haven't processed yet
        
        // Update lastProcessedCycle to prevent duplicate processing
        lastProcessedCycleRef.current = currentCycleBasedOnTime;
        
        // Calculate the next grid number
        const nextGridNum = previousGridNumber + 1;
        
        // Update the grid number tracking
        gridNumberTrackingRef.current = nextGridNum;
        
        console.log(`🔢 GRID INCREMENT: Grid number advanced from #${previousGridNumber} to #${nextGridNum} - new cycle #${currentCycleBasedOnTime}`);
        console.log(`🔢 GRID SAFETY: Last processed cycle: #${lastCycleProcessed}, Current cycle: #${currentCycleBasedOnTime}`);
        console.log(`🔢 GRID STATES: Processing lock: ${gridProcessingRef.current ? 'LOCKED' : 'UNLOCKED'}, ` + 
                   `Word generation: ${currentWordContentState ? 'IN PROGRESS' : 'IDLE'}, ` +
                   `Attention calc: ${isGettingAttention ? 'IN PROGRESS' : 'IDLE'}`);
      } else {
        // This cycle has already been processed or grid number already incremented
        console.log(`🔢 GRID INCREMENT SKIPPED: Already processed cycle #${currentCycleBasedOnTime}`);
        console.log(`🔢 GRID CONTINUITY: Maintaining grid #${previousGridNumber} for remainder of cycle`);
        console.log(`🔢 GRID STATES: Processing lock: ${gridProcessingRef.current ? 'LOCKED' : 'UNLOCKED'}, ` + 
                   `Word generation: ${currentWordContentState ? 'IN PROGRESS' : 'IDLE'}, ` +
                   `Attention calc: ${isGettingAttention ? 'IN PROGRESS' : 'IDLE'}`);
      }
      
      // CRITICAL FIX: Update the global window.currentGridBeingDisplayed variable
      // This is needed for the diagnostic system to properly display grid numbers
      // Update the global display variable with the current grid number
      const currentGridNum = gridNumberTrackingRef.current;
      if (typeof window !== 'undefined') {
        (window as any).currentGridBeingDisplayed = currentGridNum;
        console.log(`🔢 GRID DISPLAY: Updated global window.currentGridBeingDisplayed to #${currentGridNum}`);
      }
      
      // Track grid number incrementing for debugging
      if (typeof window !== 'undefined' && gridNumberTrackingRef.current > previousGridNumber) {
        // Only record if we actually incremented the grid number
        if (!(window as any).GRID_NUMBER_INCREMENTS) {
          (window as any).GRID_NUMBER_INCREMENTS = [];
        }
        
        const currentGridNum = gridNumberTrackingRef.current;
        
        // Only store when an increment happened (skip if grid number didn't change)
        if (currentGridNum > previousGridNumber) {
          (window as any).GRID_NUMBER_INCREMENTS.push({
            from: previousGridNumber,
            to: currentGridNum,
            timestamp: Date.now(),
            time: new Date().toISOString(),
            source: '7_second_timer_cycle',
            stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
          });
          
          // Log increment history
          const increments = (window as any).GRID_NUMBER_INCREMENTS;
          console.log(`\n🔢🔢 GRID INCREMENT HISTORY 🔢🔢`);
          console.log(`Total increments: ${increments.length}`);
          increments.forEach((increment: any, idx: number) => {
            console.log(`[${idx+1}] Grid #${increment.from} → #${increment.to} at ${increment.time}`);
            console.log(`    Source: ${increment.source}`);
            console.log(`    Stack: ${increment.stack.split('\n')[0]}`);
          });
          console.log(`🔢🔢 END GRID INCREMENT HISTORY 🔢🔢\n`);
        }
      }
      
      // IMPROVED: Now using only local tracking for grid numbers
      // Define function to track grid in local set
      const trackGridLocally = (gridNumber: number) => {
        // Add to local processed grids set
        processedGridsRef.current.add(gridNumber);
        
        // Log the update
        console.log(`📊 GRID TRACKING: Grid #${gridNumber} tracked in local processed grids set`);
        console.log(`📊 GRID TRACKING: Total processed grids in this session: ${processedGridsRef.current.size}`);
      };
      
      // Always track the current grid locally
      trackGridLocally(gridNumberTrackingRef.current);
      
      // BEGIN ORIGINAL TIMER CODE
      // Track which cycle we're in - used for strict cycle-based processing
      const currentCycleNumber = Math.floor(Date.now() / 7000);
      // Track if this cycle has already processed a grid successfully
      const thisGridCycleCompleted = gridCycleCompletedRef.current === currentCycleNumber;
      
      // Enhanced logging for the 7-second attention check cycle
      console.log(`\n⏰⏰ 7-SECOND TIMER CYCLE #${currentCycleNumber} ⏰⏰`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`Grid number: ${gridNumberTrackingRef.current}`);
      console.log(`Current streaming mode: ${streamingModeRef.current ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`Active prop: ${active ? 'true' : 'false'}`);
      console.log(`Current attention threshold: ${DYNAMIC_ATTENTION_THRESHOLD}/50`);
      console.log(`Global window.ATTENTION_THRESHOLD: ${(window as any).ATTENTION_THRESHOLD || 'undefined'}/50`);
      console.log(`Failed checks so far: ${failedAttentionChecksRef.current}`);
      console.log(`Grid processing lock: ${gridProcessingRef.current ? 'LOCKED' : 'UNLOCKED'}`);
      console.log(`Current cycle completed: ${thisGridCycleCompleted ? 'YES' : 'NO'}`);
      console.log(`⏰⏰ END 7-SECOND TIMER INFO ⏰⏰\n`);
      
      // We've already incremented the grid number at the beginning of every cycle
      // No need to check if it's already processed since we're always incrementing at cycle start
      const cycleGridNumber = gridNumberTrackingRef.current;
      
      // Simply log the current grid number for tracking
      console.log(`🔢 GRID STATUS CHECK: Processing grid #${cycleGridNumber} (incremented at cycle start)`);
      
      // MECHANISM #2: Only one grid per 7-second cycle 
      // Add timestamp check to ensure cycle tracking doesn't block grids across sessions
      const sessionStartTime = (typeof window !== 'undefined' && (window as any).sessionStartTimestamp) || 0;
      const lastCompletedCycleTime = (typeof window !== 'undefined' && (window as any).lastCompletedCycleTimestamp) || 0;
      const currentSessionRunning = (typeof window !== 'undefined' && (window as any).STREAMING_MODE_ACTIVE === true);
      
      // Check if the cycle was completed in the current session by comparing timestamps
      const isSameSession = sessionStartTime > 0 && lastCompletedCycleTime > 0 && 
                            sessionStartTime < lastCompletedCycleTime;
                            
      // Enhanced logging for session tracking debugging
      console.log(`🔍 SESSION TRACKING: Current session timestamp ${sessionStartTime} (${new Date(sessionStartTime).toISOString()})`);
      console.log(`🔍 SESSION TRACKING: Last completed cycle timestamp ${lastCompletedCycleTime} (${new Date(lastCompletedCycleTime).toISOString()})`);
      console.log(`🔍 SESSION TRACKING: Same session check: ${isSameSession ? 'YES - same session' : 'NO - different session'}`);
      console.log(`🔍 SESSION TRACKING: Current streaming mode: ${currentSessionRunning ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`🔍 SESSION TRACKING: Cycle completed: ${thisGridCycleCompleted ? 'YES' : 'NO'}`);
      console.log(`🔍 SESSION TRACKING: Will block grid: ${(thisGridCycleCompleted && currentSessionRunning && isSameSession) ? 'YES' : 'NO'}`);
      
      
      // Only apply cycle protection if we're in the same session that set the cycle completion
      if (thisGridCycleCompleted && currentSessionRunning && isSameSession) {
        console.log(`🔒 CYCLE COMPLETE: Already processed a grid in cycle #${currentCycleNumber} in current session. Waiting for next cycle.`);
        return;
      }
      
      // If a cycle is blocked but from a previous session, log but allow it to proceed
      if (thisGridCycleCompleted && (!currentSessionRunning || !isSameSession)) {
        console.log(`🔓 CYCLE RESET: Cycle #${currentCycleNumber} was completed in previous session, allowing grid in new session`);
        // Log timestamps for debugging
        console.log(`🔓 SESSION DEBUG: Current session started at ${new Date(sessionStartTime).toISOString()}, last cycle completed at ${new Date(lastCompletedCycleTime).toISOString()}`);
        // Reset the cycle completion to allow this cycle to process in the new session
        gridCycleCompletedRef.current = 0;
      }
      
      // CRITICAL FIX: Check if processing is already in progress from previous cycle
      if (gridProcessingRef.current) {
        // If processing is already in progress, don't start a new calculation
        console.log(`🔒 PROCESSING LOCK ACTIVE: Previous grid calculation still in progress`);
        console.log(`🔒 CYCLE OVERLAP PREVENTED: Skipping current timer cycle to prevent race condition`);
        console.log(`🔒 WILL RETRY: Next 7-second cycle will attempt again when previous calculation completes`);
        return; // Exit early to prevent concurrent processing
      }
      
      // Now we know no processing is in progress, set the lock BEFORE starting
      gridProcessingRef.current = true;
      console.log(`🔒 GRID PROCESSING: Lock activated for grid #${gridNumberTrackingRef.current}`);
      
      // Debug information - log the processing state
      console.log(`🔍 LOCK STATE CHECK: gridProcessingRef=${gridProcessingRef.current}, wordGenerationInProgressRef=${wordGenerationInProgressRef.current}, isGettingAttentionScoreRef=${isGettingAttentionScoreRef.current}`);
      console.log(`🔍 CALL STACK: ${new Error().stack?.split('\n').slice(0, 5).join('\n')}`); // Log the call stack for debugging
      
      // Simply log timing info but don't enforce a minimum time
      const timestamp = Date.now();
      const lastGridRequestTime = lastGridRequestTimeRef?.current || 0;
      const timeSinceLastGrid = lastGridRequestTime > 0 ? timestamp - lastGridRequestTime : 0;
      
      // Just log timing information, but allow grid generation to proceed regardless
      console.log(`ℹ️ TIMING: ${(timeSinceLastGrid/1000).toFixed(1)}s since last grid request`);
      
      
      // We've already incremented the grid number at the beginning of the 7-second cycle
      // Removing this duplicate code to avoid multiple increments
      console.log(`🔍 USING ALREADY INCREMENTED GRID #${gridNumberTrackingRef.current}`);
      
      // Log the current state of local grid tracking
      const trackedGridsCount = processedGridsRef.current.size;
      const trackedGridsList = Array.from(processedGridsRef.current).join(', ');
      console.log(`🔍 LOCAL GRID TRACKING: Currently tracking ${trackedGridsCount} grids: ${trackedGridsList || 'none'}`);
      console.log(`🔍 GRID TRACKING: Using only local tracking, no global variables used`);
      
      // Always check attention score first - this is the gatekeeper
      // No grid generation happens unless attention score passes
      
      // IMPORTANT: Set the source to 'timer' so the cache policy knows this is from the 7-second timer
      attentionCheckSourceRef.current = 'timer';
      console.log(`🔍 ATTENTION SOURCE: Setting attention check source to 'timer' for cache policy`);
      console.log(`\n⏰⏰ TIMER SOURCE SET: Source is now 'timer' ⏰⏰`);
      console.log(`⏰ TIMESTAMP: ${new Date().toISOString()}`);
      console.log(`⏰ GRID NUMBER: ${gridNumberTrackingRef.current}`);
      console.log(`⏰ CALL STACK: ${new Error().stack?.split('\n').slice(1, 4).join('\n')}`);
      console.log(`⏰⏰ END TIMER SOURCE SET ⏰⏰\n`);
      
      // STREAMLINED GRID DIAGNOSTICS: Use centralized diagnostics tools
      if (typeof window !== 'undefined') {
        const attentionScores = (window as any).GRID_ATTENTION_SCORES || {};
        
        console.log(`\n🧪 STREAMLINED GRID DIAGNOSTIC: Grid #${gridNumberTrackingRef.current}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`Cache entries: ${Object.keys(attentionScores).length}`);
        
        // Track word occurrences across all grids
        const wordToGridMap: {[word: string]: {gridNum: number, score: any, timestamp: number}[]} = {};
        
        // Track which words appear in each grid
        const gridToWordsMap: {[gridNum: number]: {words: string[], timestamp: number, source: string}} = {};
        
        // Use the latest messageLog data directly from state
        const messageLogEntries = Array.from(messageLog);
        
        // First gather all grid and word data
        console.log(`\n=== MESSAGE LOG CONTENTS (${messageLogEntries.length} entries) ===`);
        messageLogEntries.forEach((entry: any, index: number) => {
          const gridNum = entry.gridNumber;
          const words = entry.words || [];
          const wordsList = words.map((w: any) => w.word.toUpperCase());
          const timestamp = entry.timestamp || 0;
          const source = entry._source || 'unknown';
          
          // Store grid data
          if (!gridToWordsMap[gridNum]) {
            gridToWordsMap[gridNum] = {
              words: wordsList,
              timestamp,
              source
            };
          } else {
            console.log(`⚠️ DUPLICATE GRID #${gridNum} IN MESSAGE LOG! Previous words: ${gridToWordsMap[gridNum].words.join(', ')}`);
            console.log(`⚠️ Current words: ${wordsList.join(', ')}`);
          }
          
          // Log grid content
          console.log(`\n🔢 GRID #${gridNum.toString().padStart(2, '0')} (Entry #${index+1})`);
          console.log(`  Time: ${new Date(timestamp).toISOString()}`);
          console.log(`  Source: ${source}`);
          console.log(`  Attention: ${attentionScores[gridNum] || 'unknown'}/50`);
          console.log(`  Words (${wordsList.length}): ${wordsList.join(', ') || 'none'}`);
          
          // Build word to grid map
          words.forEach((wordObj: any) => {
            const word = wordObj.word.toUpperCase();
            if (!wordToGridMap[word]) {
              wordToGridMap[word] = [];
            }
            
            // Store word occurrence
            wordToGridMap[word].push({
              gridNum,
              score: attentionScores[gridNum],
              timestamp
            });
          });
        });
        
        // Calculate important grid statistics
        const gridNumbers = Object.keys(gridToWordsMap).map(Number).sort((a, b) => a - b);
        const minGrid = gridNumbers.length > 0 ? Math.min(...gridNumbers) : 0;
        const maxGrid = gridNumbers.length > 0 ? Math.max(...gridNumbers) : 0;
        
        console.log(`\n=== GRID SEQUENCE ANALYSIS ===`);
        if (gridNumbers.length > 0) {
          console.log(`Grids in message log: ${gridNumbers.map(n => n.toString().padStart(2, '0')).join(', ')}`);
          console.log(`Range: Grid #${minGrid} to #${maxGrid}`);
          
          // Check for gaps in the sequence
          const expectedCount = maxGrid - minGrid + 1;
          const missingGrids: number[] = [];
          
          for (let i = minGrid; i <= maxGrid; i++) {
            if (!gridNumbers.includes(i)) {
              missingGrids.push(i);
            }
          }
          
          if (missingGrids.length > 0) {
            console.log(`⚠️ MISSING GRIDS: ${missingGrids.map(n => n.toString().padStart(2, '0')).join(', ')}`);
            
            // Check if these missing grids failed attention
            missingGrids.forEach(gridNum => {
              const attentionResult = attentionScores[gridNum.toString()];
              if (attentionResult === "FAILED_ATTENTION") {
                console.log(`  ✓ Grid #${gridNum.toString().padStart(2, '0')}: EXPECTED - Failed attention check`);
              } else if (attentionResult !== undefined) {
                console.log(`  ⚠️ Grid #${gridNum.toString().padStart(2, '0')}: UNEXPECTED - Has attention score ${attentionResult} but missing from log`);
              } else {
                console.log(`  ⚠️ Grid #${gridNum.toString().padStart(2, '0')}: No attention score recorded`);
              }
            });
          } else {
            console.log(`✓ Sequence complete - No missing grids between #${minGrid} and #${maxGrid}`);
          }
        } else {
          console.log(`No grids in message log yet.`);
        }
        
        // Analyze attention scores
        console.log(`\n=== ATTENTION SCORE ANALYSIS ===`);
        // Parse grid numbers but maintain as strings for lookup
        const gridNumsWithScores = Object.keys(attentionScores);
        const gridsWithAttentionScores = gridNumsWithScores.map(Number).sort((a, b) => a - b);
        
        console.log(`Grids with attention scores: ${gridsWithAttentionScores.map(n => n.toString().padStart(2, '0')).join(', ')}`);
        gridsWithAttentionScores.forEach(gridNum => {
          const gridNumStr = gridNum.toString();
          const scoreValue = attentionScores[gridNumStr];
          const inMessageLog = gridNumbers.includes(gridNum);
          
          let status = '';
          if (scoreValue === "FAILED_ATTENTION") {
            status = '✓ Failed attention check (normal)';
          } else if (inMessageLog) {
            status = '✓ In message log';
          } else {
            status = '⚠️ NOT in message log despite passing check';
          }
          
          const displayScore = scoreValue === "FAILED_ATTENTION" 
            ? `"FAILED_ATTENTION"` 
            : `${scoreValue}/50`;
          
          console.log(`  Grid #${gridNum.toString().padStart(2, '0')}: ${displayScore} - ${status}`);
        });
        
        // Find duplicate words across grids
        console.log(`\n=== DUPLICATE WORD ANALYSIS ===`);
        const duplicateWords: string[] = [];
        
        Object.keys(wordToGridMap).forEach(word => {
          const occurrences = wordToGridMap[word];
          if (occurrences.length > 1) {
            duplicateWords.push(word);
            
            // Sort occurrences by timestamp (oldest first)
            const sortedOccurrences = [...occurrences].sort((a, b) => a.timestamp - b.timestamp);
            
            console.log(`⚠️ DUPLICATE: "${word}" appears in ${occurrences.length} grids:`);
            sortedOccurrences.forEach((occ, idx) => {
              const gridTime = new Date(occ.timestamp).toISOString();
              const otherWords = gridToWordsMap[occ.gridNum]?.words.filter(w => w !== word) || [];
              console.log(`  ${idx+1}. Grid #${occ.gridNum.toString().padStart(2, '0')} @ ${gridTime}`);
              console.log(`     Score: ${occ.score || 'unknown'}/50`);
              console.log(`     Other words: ${otherWords.join(', ') || 'none'}`);
            });
          }
        });
        
        if (duplicateWords.length === 0) {
          console.log(`✓ No duplicate words found across grids.`);
        } else {
          console.log(`⚠️ Found ${duplicateWords.length} duplicate words: ${duplicateWords.join(', ')}`);
        }
        
        // Special checks for potential issues
        if (messageLogEntries.length > 0 && minGrid > 0) {
          console.log(`\n=== EARLY GRID ANALYSIS ===`);
          console.log(`⚠️ First grid is #${minGrid} (not #0)`);
          
          // Check early grid attention scores
          for (let i = 0; i < minGrid; i++) {
            const earlyAttention = attentionScores[i.toString()];
            if (earlyAttention === undefined) {
              console.log(`  - Grid #${i.toString().padStart(2, '0')}: No attention score recorded`);
            } else if (earlyAttention === "FAILED_ATTENTION") {
              console.log(`  ✓ Grid #${i.toString().padStart(2, '0')}: Failed attention check (${earlyAttention})`);
            } else {
              console.log(`  ⚠️ Grid #${i.toString().padStart(2, '0')}: Has attention score ${earlyAttention}/50 but NOT in message log`);
            }
          }
        }
        
        // Add a basic memory usage check
        if (typeof window !== 'undefined') {
          console.log(`\n=== MEMORY USAGE ===`);
          if ((window as any).performance && (window as any).performance.memory) {
            const memory = (window as any).performance.memory;
            console.log(`  Used JS heap: ${(memory.usedJSHeapSize / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`  JS heap limit: ${(memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`  Total JS heap: ${(memory.totalJSHeapSize / (1024 * 1024)).toFixed(2)} MB`);
          } else {
            console.log(`  Memory usage data not available`);
          }
        }
        
        // Refer to central diagnostics for more detailed analysis
        if (typeof window !== 'undefined' && (window as any).runDiagnostics) {
          console.log(`\n🧪 TIP: Use window.runDiagnostics in console for more detailed analysis`);
          console.log(`🧪 Example: window.runDiagnostics.analyzeGridNumbers() or window.runDiagnostics.findResets()`);
        }
        
        console.log(`\n🧪 END GRID DIAGNOSTIC\n`);
      }
      
      // TIMER VALIDATION: Record timer execution data for debugging
      if (typeof window !== 'undefined') {
        if (!(window as any).TIMER_EXECUTIONS) {
          (window as any).TIMER_EXECUTIONS = [];
        }
        
        // Track execution details
        (window as any).TIMER_EXECUTIONS.push({
          timestamp: Date.now(),
          iso_time: new Date().toISOString(),
          timer_id: gridTimerRef.current,
          grid_number: gridNumberTrackingRef.current,
          cycle_number: currentCycleNumber,
          source: 'timer'
        });
        
        console.log(`⏱️ TIMER EXECUTION TRACKING: Recorded timer ${gridTimerRef.current} for grid #${gridNumberTrackingRef.current} in cycle #${currentCycleNumber}`);
      }
      
      // Define function to write grid number and attention score to cache
      // This is the ONLY function that should write attention scores to the cache
      // All other code paths should call this function
      const writeAttentionScoreToCache = (gridNumber: number, score: number, passed: boolean) => {
        if (typeof window !== 'undefined') {
          // Ensure we have a global attention score cache
          if (!(window as any).GRID_ATTENTION_SCORES) {
            (window as any).GRID_ATTENTION_SCORES = {};
            console.log(`📊 CACHE INIT: Created GRID_ATTENTION_SCORES cache`);
          }
          
          // IMPORTANT: NEVER overwrite scores - each grid should have one and only one score
          // This prevents duplicate entries with different scores in the message log
          
          // REMOVED: We no longer use cycle-specific keys or cycleId
          // This was causing the duplicate grid numbers pattern
          
          // SUPER DETAILED DEBUGGING: Track precisely where this write is coming from
          const callStackTrace = new Error().stack || 'No stack trace available';
          const callerInfo = callStackTrace.split('\n')[2] || 'unknown';
          
          console.log(`\n🔎🔎 ATTENTION SCORE CACHE WRITE DETECTED 🔎🔎`);
          console.log(`Grid #${gridNumber}: Score ${passed ? score : 'FAILED_ATTENTION'}`);
          console.log(`Cache write caller: ${callerInfo}`);
          console.log(`Source: ${attentionCheckSourceRef.current || 'unknown'}`);
          console.log(`Timestamp: ${new Date().toISOString()}`);
          
          // CRITICAL FIX: Create a grid-to-content map for accurate tracking
          if (!(window as any).GRID_NUMBER_TO_CONTENT_MAP) {
            (window as any).GRID_NUMBER_TO_CONTENT_MAP = {};
            console.log(`📊 CONTENT MAP INIT: Created GRID_NUMBER_TO_CONTENT_MAP for cross-referencing`);
          }
          
          // Get the current batch words for tracking
          const currentWords = currentBatch.map(w => w.word);
          const currentHash = lastGridContentHashRef.current;
          
          // Store grid content for diagnostic purposes
          if (currentWords && currentWords.length > 0) {
            (window as any).GRID_NUMBER_TO_CONTENT_MAP[gridNumber] = {
              words: currentWords,
              hash: currentHash,
              score: passed ? score : 'FAILED_ATTENTION'
            };
            console.log(`📊 CONTENT TRACKING: Mapped grid #${gridNumber} to ${currentWords.length} words with hash ${currentHash}`);
          }
          
          // SIMPLIFIED: Only check if the grid number entry exists
          // No more cycle-specific keys
          const gridEntryExists = typeof window !== 'undefined' && 
              (window as any).GRID_ATTENTION_SCORES && 
              (window as any).GRID_ATTENTION_SCORES[gridNumber] !== undefined;
          
          if (gridEntryExists) {
            const existingScore = (window as any).GRID_ATTENTION_SCORES[gridNumber];
            console.log(`🔒 GRID ENTRY: Found existing entry for grid #${gridNumber}`);
            
            // Do not overwrite existing scores - this prevents duplicate entries with different scores
            console.log(`🔒 SCORE PROTECTED: Grid #${gridNumber} already has score: ${existingScore}`);
            console.log(`🔒 SCORE POLICY: Not overwriting existing score. Using original value: ${existingScore}`);
            console.log(`🔒 SCORE CONSISTENCY: This ensures consistent scores for each grid in the message log`);
            
            // CRITICAL FIX: Check for content hash mismatch indicating same grid number with different content
            const existingContent = (window as any).GRID_NUMBER_TO_CONTENT_MAP[gridNumber];
            if (existingContent && existingContent.hash !== currentHash) {
              console.log(`⚠️ GRID CONTENT MISMATCH: Grid #${gridNumber} has different content but same grid number!`);
              console.log(`⚠️ EXISTING HASH: ${existingContent.hash}, CURRENT HASH: ${currentHash}`);
              console.log(`⚠️ This explains why we're seeing different word sets with the same grid numbers`);
            }
            
            // Return early without writing a new score
            return;
          } else {
            console.log(`✅ First time writing a score for grid #${gridNumber}`);
            
            // Store the score if this is the first time for this grid number
            let valueToStore: number | string;
            if (passed) {
              valueToStore = score;
              console.log(`📊 CACHE WRITE: Grid #${gridNumber} attention score ${score} saved to cache (PASSED)`);
            } else {
              valueToStore = "FAILED_ATTENTION";
              console.log(`📊 CACHE WRITE: Grid #${gridNumber} marked as FAILED_ATTENTION in cache`);
            }
            
            // Store enhanced data (without cycle tracking)
            const enhancedData: any = {
              score: valueToStore,
              gridNumber: gridNumber,
              timestamp: Date.now()
            };
            
            // TRACK CONTENT SIGNATURE FOR ANTI-DUPLICATION:
            // First convert words into a simple sorted string (just the words themselves)
            let contentSignature = '';
            let contentHash = '';
            if (currentBatch && currentBatch.length > 0) {
              try {
                // Sort words alphabetically to ensure consistent order
                const sortedWords = [...currentBatch].map((word: any) => {
                  if (typeof word === 'string') {
                    return word.toLowerCase();
                  } else if (word && typeof word === 'object' && 'word' in word && typeof word.word === 'string') {
                    return word.word.toLowerCase();
                  } else {
                    return '';
                  }
                }).sort();
                
                // Create a simple signature for this content
                contentSignature = sortedWords.join('|');
                contentHash = generateGridContentHash(currentBatch);
                
                // Store both for debugging
                enhancedData.contentSignature = contentSignature;
                enhancedData.contentHash = contentHash;
                
                console.log(`📝 CONTENT TRACKING: Grid #${gridNumber} signature: "${contentSignature.substring(0, 40)}..."`);
              } catch (err) {
                console.error(`Error creating content signature: ${err}`);
              }
            }
            
            // CRITICAL: Track which content signatures have been dispatched already
            // This prevents triple-posting when the same content appears with different grid numbers
            if (typeof window !== 'undefined') {
              if (!(window as any).DISPATCHED_CONTENT_SIGNATURES) {
                (window as any).DISPATCHED_CONTENT_SIGNATURES = new Set();
              }
            }
            
            // Write to the grid number entry ONLY
            // This ensures we don't have duplicate entries that can cause duplicate grid processing
            (window as any).GRID_ATTENTION_SCORES[gridNumber] = enhancedData;
            
            // Add debug to track updates to grid number cache
            console.log(`🛠️ CACHE: Updated grid #${gridNumber} cache with score ${valueToStore}`);
            
            // CRITICAL FIX: Dispatch an event when the cache is updated
            // This allows the message manager to respond to cache updates rather than being called directly
            try {
              // Only dispatch if source is 'timer' (primary source)
              const attentionSource = attentionCheckSourceRef.current || 'unknown';
              
              // MAJOR FIX: Check if we've already dispatched this exact content
              // This prevents triple-posting when the same words appear in multiple grids
              const contentAlreadyDispatched = contentSignature && 
                (window as any).DISPATCHED_CONTENT_SIGNATURES && 
                (window as any).DISPATCHED_CONTENT_SIGNATURES.has(contentSignature);
                
              if (attentionSource === 'timer') {
                if (contentAlreadyDispatched) {
                  // This exact content has already been dispatched - skip to prevent duplication
                  console.log(`🛑 DUPLICATE PREVENTION: Content with signature "${contentSignature.substring(0, 20)}..." already dispatched previously`);
                  console.log(`🛑 EVENT SKIPPED: Not dispatching duplicate gridScoreAdded event for grid #${gridNumber}`);
                } else {
                  // New unique content - dispatch event
                  const gridScoreAddedEvent = new CustomEvent('gridScoreAdded', {
                    detail: { 
                      gridNumber,
                      score: valueToStore,
                      passed,
                      timestamp: Date.now(),
                      words: currentBatch, // Pass the current batch of words
                      contentSignature // Store signature for debugging
                    }
                  });
                  
                  // Dispatch the event
                  window.dispatchEvent(gridScoreAddedEvent);
                  console.log(`🔔 EVENT: Dispatched gridScoreAdded event for grid #${gridNumber} with score ${valueToStore}`);
                  
                  // Mark this content as dispatched to prevent future duplicates
                  if (contentSignature) {
                    (window as any).DISPATCHED_CONTENT_SIGNATURES.add(contentSignature);
                    console.log(`✅ MARKED AS DISPATCHED: Content signature "${contentSignature.substring(0, 20)}..." will not be dispatched again`);
                  }
                }
              } else {
                // Not from timer - skip dispatch
                console.log(`🛑 EVENT SKIPPED: Not dispatching gridScoreAdded event for grid #${gridNumber} because source is '${attentionSource}' not 'timer'`);
                console.log(`🛑 EVENT POLICY: Only timer-triggered attention checks should post to message log to prevent duplicates`);
              }
            } catch (e) {
              console.error("Error dispatching grid score added event:", e);
            }
          }
          
          // Print information about all related grids
          console.log(`📊 CACHE STATUS: Current cache now has ${Object.keys((window as any).GRID_ATTENTION_SCORES).length} grid scores`);
          
          // Log source of the cache write for debugging
          console.log(`📊 CACHE SOURCE: Write for grid #${gridNumber} from ${attentionCheckSourceRef.current || 'unknown'}`);
          console.log(`📊 CACHE TIME: ${new Date().toISOString()}`);
          console.log(`🔎🔎 END ATTENTION SCORE CACHE WRITE 🔎🔎\n`);
        }
      };
      
      // SIMPLIFIED ARCHITECTURE: Calculate attention score directly
      // No more caching or lookups - we simply calculate a new score for each grid
      console.log(`🔮 ATTENTION CHECK: Calling calculateAttentionScore() for grid #${gridNumberTrackingRef.current}`)
      
      // IMPROVED FIX: Generate a unique grid ID for this cycle
      // This ensures we don't reuse grid numbers for different content
      const cycleTimestamp = Date.now();
      const cycleUniqueId = `${cycleTimestamp}_${Math.floor(Math.random() * 1000)}`;
      const currentCycleId = `cycle_${cycleUniqueId}`;
      
      // Store this unique cycle ID with the grid number
      if (typeof window !== 'undefined' && !(window as any).GRID_CYCLE_MAP) {
        (window as any).GRID_CYCLE_MAP = new Map();
      }
      
      if (typeof window !== 'undefined') {
        (window as any).GRID_CYCLE_MAP.set(gridNumberTrackingRef.current, currentCycleId);
        console.log(`🔄 CYCLE TRACKING: Grid #${gridNumberTrackingRef.current} mapped to cycle ID ${currentCycleId}`);
      }
      
      // CRITICAL FIX: Check if we already have a score for this grid number
      // This prevents duplicate calculations and potential race conditions
      const currentGridCheck = gridNumberTrackingRef.current;
      
      // SIMPLIFIED APPROACH: Only check the plain grid number entry
      // We no longer use cycle-specific keys which were causing duplication issues
      const hasGridEntry = typeof window !== 'undefined' && 
                      (window as any).GRID_ATTENTION_SCORES && 
                      (window as any).GRID_ATTENTION_SCORES[currentGridCheck] !== undefined;
                          
      // If the entry exists, get it
      let existingScore;
      if (hasGridEntry) {
        existingScore = (window as any).GRID_ATTENTION_SCORES[currentGridCheck];
        console.log(`🔍 FOUND GRID ENTRY: Using cached data for grid #${currentGridCheck}`);
      } else {
        existingScore = undefined;
        console.log(`🔍 NO CACHE ENTRY: No existing data for grid #${currentGridCheck}`);
      }
                          
      if (existingScore !== undefined) {
        // Check if existingScore is the enhanced data object or just a number/string
        const isEnhancedData = existingScore !== null && 
                             typeof existingScore === 'object' && 
                             'score' in existingScore;
        
        // Extract the actual score value
        const actualScore = isEnhancedData ? existingScore.score : existingScore;
        
        console.log(`🔒 DUPLICATE PREVENTION: Grid #${currentGridCheck} already has score ${
          isEnhancedData ? actualScore : actualScore
        } in cache`);
        console.log(`🔒 CALCULATION SKIPPED: Prevented duplicate calculation for grid #${currentGridCheck}`);
        
        // Use existing score instead of calculating a new one
        let scoreValue = typeof actualScore === 'number' ? actualScore : 0;
        const passed = actualScore !== "FAILED_ATTENTION" && scoreValue >= DYNAMIC_ATTENTION_THRESHOLD;
        
        // Just update the UI state without changing cache
        setAttentionScore(scoreValue);
        setWaitingForAttention(!passed);
        
        // Set global tracking without writing to cache
        if (typeof window !== 'undefined') {
          window.attentionScore = scoreValue;
          window.attentionScoreLastUpdated = Date.now();
        }
        
        return; // Skip new calculation
      }
      
      // Only calculate if we don't have a score for this grid
      // CRITICAL FIX: Set word generation in progress flag to prevent race conditions
      wordGenerationInProgressRef.current = true;
      console.log(`🔒 WORD GENERATION: Started for grid #${gridNumberTrackingRef.current} - LOCKED`);
      
      // CRITICAL FIX: Store current batch content hash for later comparison
      const currentBatchHash = generateGridContentHash(currentBatch);
      if (currentBatchHash && currentBatchHash === lastGridContentHashRef.current) {
        console.log(`🔒 CONTENT HASH MATCH: Grid #${gridNumberTrackingRef.current} has same content hash as previous grid`);
        console.log(`🔒 DUPLICATE PREVENTION: Skipping processing to prevent duplicate grid content`);
        
        // Release the word generation lock since we're not going to process this grid
        wordGenerationInProgressRef.current = false;
        console.log(`🔓 WORD GENERATION: Released for grid #${gridNumberTrackingRef.current} - duplicate content`);
        
        // CRITICAL FIX: DO NOT increment grid number here, as it causes duplicate grid numbers
        // The grid number will be incremented automatically at the beginning of the next 7-second cycle
        // which is the single source of truth for grid number incrementing
        console.log(`🔢 GRID INCREMENT: Skipping increment, will wait for next 7-second cycle to increment grid number`);
        
        // Return without processing
        return;
      }
      
      // Store the current hash for future comparison
      if (currentBatchHash) {
        lastGridContentHashRef.current = currentBatchHash;
        console.log(`📝 CONTENT HASH: Stored hash ${currentBatchHash} for grid #${gridNumberTrackingRef.current}`);
      }
      
      // CRITICAL FIX: Create a proper wrapper function for calculateAttentionScore
      // that handles locking and error cases correctly
      const getAttentionScoreWithLocking = async (): Promise<number> => {
        try {
          // CRITICAL FIX: Set isGettingAttentionScoreRef flag to track attention score calculation
          isGettingAttentionScoreRef.current = true;
          console.log(`🔒 ATTENTION CALCULATION: Started for grid #${gridNumberTrackingRef.current} - LOCKED`);
          
          // Execute the original calculation function
          const score = await calculateAttentionScore();
          
          // Release the lock immediately after calculation completes
          isGettingAttentionScoreRef.current = false;
          console.log(`🔓 ATTENTION CALCULATION: Completed for grid #${gridNumberTrackingRef.current} - UNLOCKED`);
          
          return score;
        } catch (error) {
          // CRITICAL SAFETY: Release lock if there's an error in attention score calculation
          isGettingAttentionScoreRef.current = false;
          console.error(`❌ ATTENTION CALCULATION ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.log(`🔓 ATTENTION CALCULATION: Released lock after error for grid #${gridNumberTrackingRef.current}`);
          
          // Re-throw the error to be handled by the outer catch
          throw error;
        }
      };
      
      // Use our new wrapper function - lock is handled inside the function
      getAttentionScoreWithLocking()
        .then(score => {
          // Lock is already released in the wrapper function
          
          // Determine if score passes threshold
          const passed = score >= DYNAMIC_ATTENTION_THRESHOLD;
          
          // The current grid being checked
          const currentGridNumber = gridNumberTrackingRef.current;
          
          // Log this score calculation
          console.log(`\n📝📝 ATTENTION SCORE GENERATION 📝📝`);
          console.log(`📝 GRID NUMBER: ${currentGridNumber}`);
          console.log(`📝 SCORE: ${score}/50`);
          console.log(`📝 PASSED: ${passed ? 'YES' : 'NO'}`);
          console.log(`📝 SOURCE: 7-second timer`);
          console.log(`📝 TIMESTAMP: ${new Date().toISOString()}`);
          console.log(`📝📝 END ATTENTION SCORE GENERATION 📝📝\n`);
          
          // Update state
          setAttentionScore(score);
          
          // Global tracking for other components
          if (typeof window !== 'undefined') {
            window.attentionScore = score;
            window.attentionScoreLastUpdated = Date.now();
          }
          
          // Store in cache for message log access
          writeAttentionScoreToCache(currentGridNumber, score, passed);
        
          // Special logging for first grid attention check
          const isFirstCheckAfterStartup = currentGridNumber <= 1;
          const isSubsequentRunCheck = typeof window !== 'undefined' && (window as any).alreadyRunBeginCommunication;
          
          if (isFirstCheckAfterStartup) {
            console.log(`🔍 FIRST GRID ATTENTION CHECK: Score=${score}, Threshold=${DYNAMIC_ATTENTION_THRESHOLD}, Passed=${passed}`);
          }
          
          // Log out attention check result with timestamps to track how often checks happen
          console.log(`⏱️ ATTENTION CHECK: Score=${score}, Threshold=${DYNAMIC_ATTENTION_THRESHOLD}, Passed=${passed}, Time=${new Date().toISOString()}`);
        
        // Update UI to show waiting or ready state
        setWaitingForAttention(!passed);
        
        // SPECIAL HANDLING FOR SUBSEQUENT RUNS:
        // Always force unlock the grid and proceed with grid generation 
        // if this is a subsequent run and attention passes
        if (isSubsequentRunCheck && passed) {
          console.log(`🚨 SUBSEQUENT RUN: Forcing grid generation since attention score passed`);
          
          // Always release any existing lock first
          if (gridProcessingRef.current) {
            console.log("🔓 SUBSEQUENT RUN: Forcibly releasing grid processing lock before proceeding");
            gridProcessingRef.current = false;
          }
        }
        
        // UPDATED FLOW: Process ALL grids regardless of score, but mark failing ones
        // Message manager will handle filtering what gets displayed
        if (!passed) {
          // Make sure the grid processing lock is released when attention check fails
          if (gridProcessingRef.current) {
            console.log("🔓 GRID LOCK: Releasing lock after failed attention check");
            gridProcessingRef.current = false;
          }
          
          // Track consecutive failed checks for logging
          const failedChecks = failedAttentionChecksRef.current || 0;
          console.log(`⚠️ ATTENTION SCORE TOO LOW: Grid #${gridNumberTrackingRef.current} with score ${score}/${DYNAMIC_ATTENTION_THRESHOLD} will be generated but filtered by Message Manager`);
          
          // Log the specifics of the binary values that were checked
          console.log(`\n📊 BINARY SAMPLE VERIFICATION 📊`);
          console.log(`Using global 65k binary array for attention score calculation`);
          console.log(`Score calculation: ${score}/50 (${score/50*100}%)`);
          console.log(`Session: ${streamingModeRef.current ? 'ACTIVE' : 'INACTIVE'}`);
          console.log(`Grid counter: ${gridNumberTrackingRef.current}`);
          console.log(`Time: ${new Date().toISOString()}`);
          console.log(`📊 END BINARY VERIFICATION 📊\n`);
          
          // CRITICAL FIX: Force the waiting UI (ellipses) to display when attention fails
          // This ensures we don't show the previous successful grid's words again
          console.log(`⏱️ DISPLAY FIX: Showing ellipses due to failed attention check`);
          
          // Use preserveScrollPosition to prevent jumps when updating UI
          preserveScrollPosition(() => {
            setWaitingForAttention(true);
            setWaitingForCosmicWords(true); // Show ellipses animation
            setShowBatch(false); // Clear any existing batch
            setCurrentBatch([]); // Ensure current batch is empty
            
            // Set first dot visible immediately
            setEllipsisCount(1);
            
            // Show the ellipsis container immediately
            setShowBatch(true);
          });
          
          // CRITICAL CHANGE: We still continue with grid generation despite failed attention check
          // The grid will be generated but Message Manager will filter it from the message log
          console.log(`🔄 CONTINUING: Proceeding with grid generation despite failed attention check`);
          console.log(`🔄 UI STATE: Showing ellipses animation while waiting for next valid grid`);
        }
        
        // Reset failed checks counter when we pass
        failedAttentionChecksRef.current = 0;
        
        // FIXED: Don't clear and immediately reset the lock
        // Just ensure the lock is properly set to prevent multiple grid generations
        gridProcessingRef.current = true;
        console.log("🔒 GRID LOCK: Processing lock set for this grid");
        
        // FIXED: Mark this 7-second cycle as completed to prevent multiple grids
        // Use the exact timestamp divided by interval to get a unique cycle number
        const exactTime = Date.now();
        const currentCycleNumber = Math.floor(exactTime / GRID_INTERVAL);
        gridCycleCompletedRef.current = currentCycleNumber;
        console.log(`🔄 CYCLE TRACKING: Marked cycle #${currentCycleNumber} as completed at ${new Date(exactTime).toISOString()}`);
        
        // Also store the current session timestamp with the cycle completion
        if (typeof window !== 'undefined') {
          (window as any).lastCompletedCycleTimestamp = Date.now();
          (window as any).lastCompletedCycleNumber = currentCycleNumber;
          console.log(`🔒 CYCLE PROTECTION: Marked cycle #${currentCycleNumber} as completed at session timestamp ${(window as any).sessionStartTimestamp}`);
          
          // REMOVED: Grid number increment logic is now at the beginning of the 7-second cycle
          // This ensures that each cycle has a new grid number regardless of attention score
          console.log(`🔢 GRID NUMBER POLICY: No increment needed here - grid number was already incremented at cycle start`);
          console.log(`🔍 GRID INCREMENT CHECK - Current cycle number: ${Math.floor(Date.now() / GRID_INTERVAL)}`);
          console.log(`🔍 GRID INCREMENT CHECK - Current score: ${score}, Threshold: ${DYNAMIC_ATTENTION_THRESHOLD}, Passed: ${score >= DYNAMIC_ATTENTION_THRESHOLD}`);
          
          // Just update cycle completion tracking without incrementing grid
          if (typeof window !== 'undefined') {
            // Already marked as processed at the beginning of the cycle
            const currentGridNumber = gridNumberTrackingRef.current;
            
            // Make sure this grid is properly tracked in local tracking (redundant but safe)
            // Add grid to local processed grids set
            processedGridsRef.current.add(currentGridNumber);
            console.log(`🔢 LOCAL TRACKING: Added grid #${currentGridNumber} to local processed grids set`);
            console.log(`🔢 LOCAL TRACKING: Total processed grids: ${processedGridsRef.current.size}`);
            
            // Dispatch the same event for compatibility, but no actual increment
            try {
              const gridNumberChangedEvent = new CustomEvent('gridNumberChanged', {
                detail: { 
                  previousGrid: currentGridNumber,
                  currentGrid: currentGridNumber,
                  timestamp: Date.now()
                }
              });
              window.dispatchEvent(gridNumberChangedEvent);
              console.log(`🔔 EVENT: Dispatched gridNumberChanged event for grid #${currentGridNumber} (compatibility)`);
            } catch (e) {
              console.error("Error dispatching grid number changed event:", e);
            }
          } else {
            console.error(`❌ CRITICAL ERROR: Cannot increment grid - window is undefined`);
          }
        } else {
          console.log(`🔒 CYCLE PROTECTION: Marked cycle #${currentCycleNumber} as completed`);
        }
        
        // Update last grid request time tracking
        lastGridRequestTimeRef.current = Date.now();
        
        // Enhanced logging for first grid passing
        if (isFirstCheckAfterStartup) {
          console.log(`🚨 FIRST GRID ATTENTION PASSED: Score ${score}/${DYNAMIC_ATTENTION_THRESHOLD} - Will process first grid #${gridNumberTrackingRef.current}`);
        }
        
        console.log("🔒 GRID LOCK: Setting grid processing lock - will wait for completion");
        
        // Request a new grid - the Home.tsx component will handle calling processBackgroundGrid
        // which will check if the grid is already processed and handle the increment there
        console.log(`✅ ATTENTION PASSED: Grid #${gridNumberTrackingRef.current} has passed attention check with score ${score}/${DYNAMIC_ATTENTION_THRESHOLD}`);
        
        // SIMPLIFIED FLOW: Always generate a grid - no flag needed
        // Grid generation is unconditional - Message Manager filters based on attention scores in cache
        if (typeof window !== 'undefined') {
          try {
            // CRITICAL FIX: Track the current grid number to prevent duplicate processing
            // Initialize the unique processing tracker if it doesn't exist
            if (typeof window !== 'undefined' && !(window as any).GRID_UNIQUE_PROCESSING) {
              (window as any).GRID_UNIQUE_PROCESSING = new Set();
            }
            
            // Check if we've already processed this grid number in this session
            const currentGridNum = gridNumberTrackingRef.current;
            const uniqueKey = `grid_${currentGridNum}_${Date.now()}`;
            
            if (typeof window !== 'undefined' && (window as any).GRID_UNIQUE_PROCESSING.has(currentGridNum)) {
              console.log(`⚠️⚠️ DUPLICATE PREVENTION: Grid #${currentGridNum} is already being processed - skipping duplicate event`);
              console.log(`⚠️⚠️ This prevents the same grid from flashing multiple times in the streaming display`);
              return; // Stop here to prevent duplicate processing
            }
            
            // Mark this grid as being processed
            if (typeof window !== 'undefined') {
              (window as any).GRID_UNIQUE_PROCESSING.add(currentGridNum);
              console.log(`🔒 UNIQUE PROCESSING: Added grid #${currentGridNum} to unique processing tracker`);
              
              // Automatically remove from tracking after 5 seconds
              // This ensures we don't permanently block a grid number in case of errors
              setTimeout(() => {
                if ((window as any).GRID_UNIQUE_PROCESSING) {
                  (window as any).GRID_UNIQUE_PROCESSING.delete(currentGridNum);
                  console.log(`🔓 UNIQUE PROCESSING: Removed grid #${currentGridNum} from unique processing tracker after timeout`);
                }
              }, 5000);
            }
            
            // CRITICAL IMPROVEMENT: Implement a Promise-based sequence control
            // This ensures operations happen in order with proper completion signals
            console.log(`🔄 SEQUENCE: Starting Promise chain for grid #${currentGridNum}`);
            
            // Step 1: Create a Promise that will be resolved when the calculation is done
            const sequencePromise = new Promise<void>((resolve) => {
              console.log(`🔄 SEQUENCE STEP 1: Setting up grid calculation for grid #${currentGridNum}`);
              
              // Store a completion callback in the window object for Home.tsx to call
              (window as any).gridCalculationComplete = (calculatedGridNum: number) => {
                console.log(`🔄 SEQUENCE CALLBACK: Grid #${calculatedGridNum} calculation completed`);
                
                // CRITICAL FIX: Release the word generation lock when grid calculation is complete
                if (wordGenerationInProgressRef.current) {
                  wordGenerationInProgressRef.current = false;
                  console.log(`🔓 WORD GENERATION: Completed for grid #${calculatedGridNum} - UNLOCKED`);
                }
                
                if (calculatedGridNum === currentGridNum) {
                  resolve();
                }
              };
              
              // Create event with minimal details - just telling Home.tsx to generate a grid
              // No shouldGenerateGrid flag - Home.tsx always generates grid when called
              const event = new CustomEvent('forceRefreshGrids', { 
                detail: { 
                  timestamp: Date.now(),
                  gridNumber: currentGridNum,
                  // This is always true during streaming
                  subsequentActivation: true,
                  // Add unique identifier to prevent duplicate processing
                  uniqueKey: uniqueKey,
                  // Add sequence control flag
                  sequenceControl: true
                }
              });
              
              // Dispatch the event to trigger Home.tsx's processBackgroundGrid
              window.dispatchEvent(event);
              
              if (score >= DYNAMIC_ATTENTION_THRESHOLD) {
                console.log(`🔔 EVENT: Dispatched grid generation request for grid #${currentGridNum} (attention passed with ${score}/${DYNAMIC_ATTENTION_THRESHOLD})`);
              } else {
                console.log(`🔔 EVENT: Dispatched grid generation request for grid #${currentGridNum} despite failed attention check (${score}/${DYNAMIC_ATTENTION_THRESHOLD})`);
                console.log(`⚠️ NOTE: Grid will be generated but Message Manager will filter it out from display`);
              }
              
              // Add a safety timeout in case the calculation never completes
              setTimeout(() => {
                console.log(`⚠️ SEQUENCE TIMEOUT: Grid #${currentGridNum} calculation timed out after 5 seconds`);
                
                // CRITICAL SAFETY: Always release the processing lock if the timer times out
                if (gridProcessingRef.current) {
                  gridProcessingRef.current = false;
                  console.log(`🔓 EMERGENCY UNLOCK: Releasing grid processing lock after timeout for grid #${currentGridNum}`);
                }
                
                // Also make sure word generation lock is released
                if (wordGenerationInProgressRef.current) {
                  wordGenerationInProgressRef.current = false;
                  console.log(`🔓 EMERGENCY UNLOCK: Releasing word generation lock after timeout for grid #${currentGridNum}`);
                }
                
                // Always resolve the promise to continue the flow
                resolve();
              }, 5000);
            });
            
            // Wait for the calculation to complete before proceeding
            sequencePromise.then(() => {
              console.log(`🔄 SEQUENCE STEP 2: Grid #${currentGridNum} calculation complete, verifying cache`);
              
              // Verify the grid attention score is in the cache
              const cachedScore = (window as any).GRID_ATTENTION_SCORES && 
                (window as any).GRID_ATTENTION_SCORES[currentGridNum];
              
              // Convert to string for safe display in case it's a number or FAILED_ATTENTION
              const cachedScoreDisplay = cachedScore !== undefined ? String(cachedScore) : "undefined";
              console.log(`🔄 SEQUENCE: Grid #${currentGridNum} cached score: ${cachedScoreDisplay}`);
              
              // No need to trigger anything else - the gridScoreAdded event is already fired
              // by Home.tsx when the grid is processed
              
              // Clean up the completion callback
              delete (window as any).gridCalculationComplete;
              
              // CRITICAL FIX: Release the grid processing lock after successful completion
              gridProcessingRef.current = false;
              console.log(`🔓 GRID PROCESSING: Lock released for grid #${currentGridNum} after successful completion`);
              
              console.log(`🔄 SEQUENCE COMPLETE: Grid #${currentGridNum} processing sequence completed`);
            }).catch(error => {
              console.error(`🔄 SEQUENCE ERROR: Grid #${currentGridNum} processing failed:`, error);
              
              // CRITICAL FIX: Release the word generation lock if an error occurs
              if (wordGenerationInProgressRef.current) {
                wordGenerationInProgressRef.current = false;
                console.log(`🔓 WORD GENERATION: Released for grid #${currentGridNum} after error`);
              }
              
              // CRITICAL FIX: Release the grid processing lock if an error occurs
              gridProcessingRef.current = false;
              console.log(`🔓 GRID PROCESSING: Lock released for grid #${currentGridNum} after error`);
              
              // Clean up the completion callback
              delete (window as any).gridCalculationComplete;
            });
          } catch (error) {
            console.error("Error dispatching grid processing event:", error);
          }
        }
        
        // Get the next batch if available
        const nextGrid = wordGridQueueRef.current[batchIndex];
        if (!nextGrid) {
          // No grid available, release lock
          gridProcessingRef.current = false;
          console.log("🔓 GRID LOCK: Released - no grid available");
          return;
        }
          
          // Use the tracking ref to get the actual grid number from the background process
          // This ensures our displayed grid number matches what's being processed in Home.tsx
          console.log(`✨ GRID TRACKING: Processing Grid #${gridNumberTrackingRef.current} for display`);
          
          // IMPROVED: Safety check now uses only local grid tracking
          // All global tracking has been removed to eliminate cross-component dependencies
          const localProcessedGrids = Array.from(processedGridsRef.current);
          console.log(`🔍 LOCAL TRACKING: Using local processed grids set with ${localProcessedGrids.length} tracked grids`);
          
          // BUGFIX 2.0: We ONLY skip if the current grid is already in local history WITH
          // REMOVED: No longer comparing with word history to prevent word caching
          // Each grid is treated as completely new for true decoder behavior
          
          if (false) { // Intentionally disabled to prevent word caching
            console.log(`🚫 REMOVED: Grid history comparison disabled to prevent word caching and ensure true decoder behavior`);
            
            // Force wait for next check - don't increment the grid counter
            setWaitingForAttention(true);
            setWaitingForCosmicWords(true); 
            
            // Release grid processing lock to allow next check
            gridProcessingRef.current = false;
            console.log(`🔓 GRID LOCK: Released after detecting collision for grid #${gridNumberTrackingRef.current}`);
            
            return; // Exit processing to avoid displaying duplicates
          }
          
          // We'll still record displayed grids for reference
          if (!displayedGridsRef.current.has(gridNumberTrackingRef.current)) {
            displayedGridsRef.current.add(gridNumberTrackingRef.current);
          }
          
          // Process the grid words
          // Check for any of these conditions to skip showing the grid words:
          // 1. Empty grid (no words pass threshold)
          // 2. Same grid number as last displayed grid (but ONLY if this is not a subsequent run)
          const isEmptyGrid = nextGrid.length === 0;
          
          // IMPORTANT FIX: NEVER consider grids as duplicates regardless of grid number
          // This ensures we always show new words in subsequent runs and within the same run
          // Completely disable the grid number check to ensure all words are displayed
          let isSameGridNumber = false; // Always false - never skip showing words due to grid number
          
          // Log this special bypass for troubleshooting
          console.log(`🛠️ GRID NUMBER CHECK BYPASS: Always showing qualified words regardless of grid number (${gridNumberTrackingRef.current})`);
          
          // For reference only, here's what the original check would have evaluated to:
          let originalCheckResult = gridNumberTrackingRef.current === lastDisplayedGridRef.current;
          console.log(`🛠️ ORIGINAL CHECK (DISABLED): Grid ${gridNumberTrackingRef.current} vs Last ${lastDisplayedGridRef.current} = ${originalCheckResult ? 'SAME (would skip)' : 'DIFFERENT (would show)'}`);
          
          
          // Get the subsequent run state for logging and checks
          const isSubsequentRunMode = typeof window !== 'undefined' && (window as any).alreadyRunBeginCommunication;
          
          console.log(`🔄 GRID DISPLAY CHECK: Grid #${gridNumberTrackingRef.current}, Subsequent run: ${isSubsequentRunMode}, Same grid check: ${isSameGridNumber}`);
          
          // 3. REMOVED ALL WORD COMPARISONS AS REQUESTED
          // No word comparisons at all - per user request
          // We will only do grid checks later - no word comparisons ever
          let isSameWords = false; // Always false - we never compare words
          
          console.log(`🛠️ WORD COMPARISON COMPLETELY DISABLED: No word comparisons will ever be performed`);
          
          // All word comparison code removed per user request
          
          // Special logging for first grid (typically grid #1)
          const isFirstGrid = gridNumberTrackingRef.current <= 1;
          if (isFirstGrid) {
            console.log(`🚨 FIRST GRID DISPLAY CHECK: Grid #${gridNumberTrackingRef.current}`);
            console.log(`🚨 FIRST GRID DETAILS: Empty=${isEmptyGrid}, SameNumber=${isSameGridNumber}, SameWords=${isSameWords}`);
            console.log(`🚨 FIRST GRID COMPARISONS: Current=${gridNumberTrackingRef.current}, Last=${lastDisplayedGridRef.current}`);
            console.log(`🚨 FIRST GRID WORD COUNT: Found ${nextGrid.length} words in this grid`);
          }
          
          // Always show the first grid with words regardless of same grid number check
          // This fixes the issue where grid #1 doesn't display even when it passes attention threshold
          if (isFirstGrid && nextGrid.length > 0 && !isEmptyGrid) {
            // For the very first grid with passing attention score, override the checks
            console.log(`🚨 FIRST GRID OVERRIDE: Forcing display of first grid #${gridNumberTrackingRef.current} with ${nextGrid.length} words`);
            isSameGridNumber = false; // Force to false to allow display
            isSameWords = false;      // Force to false to allow display
          }
          
          if (isEmptyGrid || isSameGridNumber || isSameWords) {
            // No words passed the cosmic threshold OR this is a repeat grid we already displayed
            
            // Log the specific reason why we're showing ellipses
            if (isEmptyGrid) {
              console.log(`🔎 GRID TRACKING: Grid #${gridNumberTrackingRef.current} has no words meeting cosmic threshold`);
            } else if (isSameGridNumber) {
              console.log(`⚠️ GRID REPEAT: Grid #${gridNumberTrackingRef.current} already displayed, showing ellipsis instead`);
            } else if (isSameWords) {
              console.log(`⚠️ WORD REPEAT: Grid #${gridNumberTrackingRef.current} has the same words as a previous grid, showing ellipsis instead`);
            }
            
            // Additional logging if this is the first grid (with score 30)
            if (gridNumberTrackingRef.current <= 1) {
              console.log(`🚨 FIRST GRID WORDS SKIPPED: Grid #${gridNumberTrackingRef.current} with ${nextGrid.length} words is being skipped`);
              // Log all words being skipped
              nextGrid.forEach((word, idx) => {
                console.log(`🚨 SKIPPED WORD #${idx+1}: "${word.word}" (${word.score}/50)`);
              });
            }
            
            setWaitingForCosmicWords(true);
            setShowBatch(false); // First clear any existing batch
            setCurrentBatch([]); // Empty batch
            
            // Set first dot visible immediately before showing the container
            setEllipsisCount(1);
            
            // Then show the ellipsis container immediately
            setShowBatch(true); // Show the ellipses container
            
            // CRITICAL: When no words meet the threshold, release the lock
            // with a small delay to ensure the ellipses are visible
            setTimeout(() => {
              gridProcessingRef.current = false;
              console.log("🔓 GRID LOCK: Released early - no qualifying words found or repeat grid");
            }, 500); // 0.5 second delay to ensure message is visible
            
            // Dispatch event that cosmic words were removed
            try {
              const cosmicWordsRemovedEvent = new CustomEvent('cosmicWordsRemoved', {
                detail: { timestamp: Date.now() }
              });
              window.dispatchEvent(cosmicWordsRemovedEvent);
              console.log('🟢 EVENT: Cosmic words removed (no qualifying words)');
            } catch (e) {
              console.error("Error dispatching cosmic words removed event:", e);
            }
          } else {
            // We have words above the cosmic threshold - show them
            
            // Log the level info for each word in the batch for verification
            console.log(`🔮 STREAMING STATUS CHECK:\n              - streamingMode: ${streamingModeRef.current}\n              - cosmicWords count: ${nextGrid.length}\n              - attentionScore: ${score}/50\n              - attentionThreshold: ${DYNAMIC_ATTENTION_THRESHOLD}/50`);
            
            // Count how many words at each level
            const primaryCount = nextGrid.filter(w => w.level === 1).length;
            const secondaryCount = nextGrid.filter(w => w.level === 2).length;
            const tertiaryCount = nextGrid.filter(w => w.level === 3).length;
            console.log(`🌟 STARDUST: Processing ${nextGrid.length} words`);
            console.log(`🌟 STARDUST: Found ${nextGrid.length} words - ${tertiaryCount} tertiary, ${secondaryCount} secondary, ${primaryCount} primary`);
            
            setWaitingForCosmicWords(false);
            console.log(`🔎 GRID TRACKING: Grid #${gridNumberTrackingRef.current} has ${nextGrid.length} qualifying words`);
            
            // Only play the message sound when we have words to display
            // It doesn't matter if we have words or not - we'll add to the message log either way
            // This is the ONLY place we write to the message log to prevent duplicates
            preserveScrollPosition(() => {
              // We still update currentBatch for tracking purposes,
              // but we don't display it separately anymore
              setCurrentBatch(nextGrid);
              setShowBatch(true);
              
              // Track message sound played for grids with words
              if (nextGrid.length > 0) {
                console.log(`🔇 Message sound disabled for grid #${gridNumberTrackingRef.current}`);
                messageSoundPlayedRef.current.add(gridNumberTrackingRef.current);
              }
              
              // CONSOLIDATED MESSAGE LOG UPDATES: One place for all grid types
              // Handle all message log updates here, regardless of grid having words or being empty
              setMessageLog(prevLog => {
                // Use just the current timestamp without random value to avoid duplicate entries
                const timestamp = Date.now();
                const gridNumber = gridNumberTrackingRef.current;
                const stackTrace = new Error().stack;
                const fullStack = new Error().stack || 'No stack trace available';
                const callingFunction = fullStack.split('\n')[3] || 'unknown';
                const messageId = `grid_${gridNumber}_${timestamp}_direct`;
                const callSite = window.location.href;
                
                // DEBUG: Record this update for diagnostic tracking
                runDiagnostics.recordMessageLogUpdate(gridNumber, nextGrid, 'StreamingSentence.setMessageLog');
                
                // CONSOLIDATED CACHE DUMP - Use centralized diagnostics
                console.log(`\n🔍 CACHE STATUS: Message Log Update for Grid #${gridNumber}`);
                
                // Check if the centralized diagnostics are available
                if (typeof window !== 'undefined') {
                  // Check for grid number mismatch
                  if (gridNumber !== gridNumberTrackingRef.current) {
                    console.log(`🚨 WARNING: Grid number mismatch - param: ${gridNumber}, ref: ${gridNumberTrackingRef.current}`);
                  }

                  // Get cached attention score - only from plain grid number entries
                  const attentionScores = (window as any).GRID_ATTENTION_SCORES || {};
                  
                  // Extract attention score, handling both simple and enhanced data formats
                  let cachedScore = 'NOT FOUND';
                  const entry = attentionScores[gridNumber];
                  
                  if (entry !== undefined) {
                    // Check if it's an enhanced data object
                    if (entry !== null && typeof entry === 'object' && 'score' in entry) {
                      cachedScore = entry.score;
                    } else {
                      cachedScore = entry;
                    }
                  }
                  
                  console.log(`📊 Grid #${gridNumber} attention score: ${cachedScore}/50`);
                  
                  // Check for missing attention score
                  if (cachedScore === 'NOT FOUND') {
                    console.log(`⚠️ No attention score in cache for grid #${gridNumber}`);
                  }
                  
                  // Quick word check
                  if (nextGrid && nextGrid.length > 0) {
                    console.log(`📝 Adding ${nextGrid.length} words to message log`);
                  }
                  
                  // Specific grid check for problem grids (8 and 9)
                  if (gridNumber === 8 || gridNumber === 9 || gridNumber === 8 + 1) {
                    const grid8Score = attentionScores['8'];
                    const grid9Score = attentionScores['9'];
                    
                    if (grid8Score !== undefined && grid9Score !== undefined) {
                      console.log(`⚠️ Grid 8/9 check: #8 = ${grid8Score}/50, #9 = ${grid9Score}/50 (same: ${grid8Score === grid9Score})`);
                    }
                  }
                  
                  // Use centralized diagnostics if available
                  if ((window as any).runDiagnostics) {
                    // Store the grid data for later troubleshooting if needed
                    if (nextGrid && nextGrid.length > 0) {
                      try {
                        (window as any).runDiagnostics.trackGridContent(
                          gridNumber, 
                          nextGrid.map(w => w.word.toUpperCase()),
                          cachedScore
                        );
                      } catch (e) {
                        console.error("Error tracking grid content:", e);
                      }
                    }
                  }
                }
                
                // Show source tracking info
                console.log(`\n📋 SOURCE INFO FOR GRID #${gridNumber}:`);
                console.log(`⏱️ Time: ${new Date().toISOString()}`);
                console.log(`🔢 Grid number from tracking ref: ${gridNumberTrackingRef.current}`);
                console.log(`🔢 Grid number from message log param: ${gridNumber}`);
                console.log(`📝 Attention check source: ${attentionCheckSourceRef.current || 'unknown'}`);
                console.log(`📜 Call stack:\n${stackTrace?.split('\n').slice(1, 5).join('\n')}`);
                
                console.log(`🔍🔍🔍 END CRITICAL DIAGNOSTIC FOR GRID #${gridNumber} 🔍🔍🔍\n`);
                
                // REMOVED: All early grid special handling code has been deleted
                // All grid generation happens through the 7-second timer ONLY
                // No more special rules for early grids
                
                // STRICT PROTOCOL: Never create default scores - only rely on attention checks
                // Grids must have a properly calculated score to appear in the message log
                if (typeof window === 'undefined' || 
                    !(window as any).GRID_ATTENTION_SCORES || 
                    (window as any).GRID_ATTENTION_SCORES[gridNumber] === undefined) {
                  // Log error and return early - don't add grids without attention scores
                  console.error(`🚫 ERROR: No cached score found for grid #${gridNumber} in attention score cache`);
                  console.error(`🚫 PROTOCOL ENFORCED: Grid must have legitimate calculated attention score to appear in message log`);
                  console.error(`🚫 SKIPPING: Grid #${gridNumber} will not be added to message log without proper score`);
                  return prevLog; // Skip this grid entirely
                }
                
                // Verify we have a properly formatted score (either raw value or in enhanced object)
                const cachedValue = (window as any).GRID_ATTENTION_SCORES[gridNumber];
                if (cachedValue === null || (typeof cachedValue === 'object' && !('score' in cachedValue))) {
                  console.error(`🚫 ERROR: Cached value for grid #${gridNumber} is invalid format: ${JSON.stringify(cachedValue)}`);
                  console.error(`🚫 PROTOCOL ENFORCED: Grid must have properly formatted attention score to appear in message log`);
                  return prevLog; // Skip this grid entirely
                }
                
                // Get the cached score or special condition
                // IMPORTANT: This ONLY reads from the cache, never triggers a calculation
                const rawValue = (window as any).GRID_ATTENTION_SCORES[gridNumber];
                // Extract the actual value, handling both simple and enhanced data formats
                const gridAttentionValue = rawValue !== null && typeof rawValue === 'object' && 'score' in rawValue
                  ? rawValue.score
                  : rawValue;
                
                // Verify we're not accidentally triggering a calculation
                if (typeof attentionCheckSourceRef.current === 'string' && 
                    attentionCheckSourceRef.current.includes('message_log')) {
                  console.error('🚨 CRITICAL ERROR: Message log should never trigger attention checks');
                }
                
                // SPECIAL CONDITION CHECK #1: Check for "FAILED_ATTENTION" marker
                if (gridAttentionValue === "FAILED_ATTENTION") {
                  // This grid didn't pass the attention check, so don't add it to the message log
                  console.log(`📊 MESSAGE LOG POLICY: Grid #${gridNumber} has special marker "FAILED_ATTENTION" - skipping message log entry`);
                  console.log(`⚠️ FAILED GRID: Grid #${gridNumber} failed attention check with score below threshold ${DYNAMIC_ATTENTION_THRESHOLD}`);
                  return prevLog; // Skip adding entry for failed attention grids
                }
                
                // If we get here, grid has a numeric attention score and passed the check
                console.log(`✅ PASSED GRID: Grid #${gridNumber} passed attention check with score ${gridAttentionValue}/50 (threshold: ${DYNAMIC_ATTENTION_THRESHOLD})`);
                
                // SPECIAL CONDITION CHECK #2: Verify all words meet the cosmic threshold
                const cosmicThreshold = (window as any).COSMIC_THRESHOLD_VALUE || 33; // Default to 33 if not set
                
                // Skip empty grids
                if (!nextGrid || nextGrid.length === 0) {
                  console.log(`📊 MESSAGE LOG POLICY: Grid #${gridNumber} has no words - skipping message log entry`);
                  return prevLog; // Don't add empty grids to message log
                }
                
                // Check if each word's cosmic score passes the threshold
                let allWordsAboveThreshold = true;
                const belowThresholdWords: string[] = [];
                
                for (const wordObj of nextGrid) {
                  if (!wordObj.score || wordObj.score < cosmicThreshold) {
                    allWordsAboveThreshold = false;
                    if (wordObj.word) {
                      belowThresholdWords.push(wordObj.word.toUpperCase());
                    }
                  }
                }
                
                // If any words are below threshold, skip this grid
                if (!allWordsAboveThreshold) {
                  console.log(`📊 MESSAGE LOG POLICY: Grid #${gridNumber} has words below cosmic threshold (${cosmicThreshold}/50) - skipping message log entry`);
                  console.log(`📊 BELOW THRESHOLD WORDS: ${belowThresholdWords.join(', ')}`);
                  return prevLog; // Skip adding entry for grids with words below threshold
                }
                
                // SPECIAL CONDITION CHECK #3: Check for consecutive identical word sets with identical cosmic scores
                if (prevLog.length > 0) {
                  // Get the most recent entry in the message log
                  const lastEntry = prevLog[prevLog.length - 1];
                  
                  // Check if this grid has the exact same words with same cosmic scores as the last entry
                  if (nextGrid.length === lastEntry.words.length && nextGrid.length > 0) {
                    // Create maps of word -> cosmic score for both grids
                    const currentWordScoreMap = new Map();
                    const lastWordScoreMap = new Map();
                    
                    // Map words to their cosmic scores for the current grid
                    nextGrid.forEach(wordObj => {
                      currentWordScoreMap.set(wordObj.word.toUpperCase(), wordObj.score || 0);
                    });
                    
                    // Map words to their cosmic scores for the last grid
                    lastEntry.words.forEach(wordObj => {
                      lastWordScoreMap.set(wordObj.word.toUpperCase(), wordObj.score || 0);
                    });
                    
                    // Check if both grids have identical words with identical cosmic scores
                    let identical = true;
                    if (currentWordScoreMap.size === lastWordScoreMap.size) {
                      for (const [word, score] of currentWordScoreMap.entries()) {
                        const lastScore = lastWordScoreMap.get(word);
                        if (lastScore === undefined || lastScore !== score) {
                          identical = false;
                          break;
                        }
                      }
                    } else {
                      identical = false;
                    }
                    
                    // If identical, skip this grid
                    if (identical) {
                      console.log(`📊 MESSAGE LOG POLICY: Grid #${gridNumber} has identical words and cosmic scores as previous grid - skipping message log entry`);
                      console.log(`📊 CONSECUTIVE DUPLICATE: Grid #${gridNumber} duplicate of previous grid with same words and scores`);
                      console.log(`📊 PREVENTION POLICY: Consecutive identical grids are skipped, but can reappear after different content`);
                      return prevLog; // Skip adding this consecutive duplicate grid
                    }
                  }
                }
                
                // If we get here, the grid passed all checks
                console.log(`✅ PASSED ALL CHECKS: Grid #${gridNumber} passed attention check, cosmic threshold, and is not a consecutive duplicate`);
                console.log(`📊 MESSAGE LOG POLICY: Adding grid #${gridNumber} to message log with ${nextGrid.length} words`);
                
                // Continue with adding this grid to the message log...
                
                // Only proceed with timer-cached score that's not the special "FAILED_ATTENTION" marker
                const gridAttentionScore = gridAttentionValue;
                console.log(`📊 MESSAGE LOG: Using timer-cached score ${gridAttentionScore}/50 for grid #${gridNumber}`)
                
                // SUPER DETAILED LOGGING - ORIGIN POINT TRACKING
                console.log(`\n🔍🔍🔍 MESSAGE LOG ENTRY CREATION - DIRECT PATH 🔍🔍🔍`);
                console.log(`📝 MESSAGE LOG DIRECT UPDATE [ID:${messageId}]`);
                console.log(`📝 TIMESTAMP: ${new Date(timestamp).toISOString()} (${timestamp})`);
                console.log(`📝 GRID NUMBER: ${gridNumber}`);
                console.log(`📝 WORD COUNT: ${nextGrid.length}`);
                console.log(`📝 CACHED SCORE: ${gridAttentionScore}/50 (the ONLY score that matters for message log)`);
                console.log(`📝 SCORE SOURCE: GRID_ATTENTION_SCORES[${gridNumber}] (local score variable no longer used)`);
                console.log(`📝 PREVIOUS LOG LENGTH: ${prevLog.length} entries`);
                console.log(`📝 MESSAGE LOG READ-ONLY POLICY: Message log only reads from attention score cache, never triggers calculations`);
                
                if (nextGrid.length > 0) {
                  console.log(`📝 WORDS BEING ADDED:`);
                  nextGrid.forEach((word, idx) => {
                    console.log(`   [${idx+1}] ${word.word.toUpperCase()} (Score: ${word.score}/50, Level: ${word.level})`);
                    
                    // NO DUPLICATE WORD TRACKING - This is a decoder that doesn't compare between grids
                  });
                } else {
                  console.log(`📝 NO WORDS BEING ADDED (empty grid)`);
                }
                
                // We allow duplicate grid numbers in the message log
                // But we now check for consecutive identical word sets with identical cosmic scores
                
                // The duplicate checking is already done above in SPECIAL CONDITION CHECK #3
                // We don't need to do it twice
                
                // Grid is not a consecutive duplicate, log info if it's a duplicate grid number (just for info)
                const isDuplicateGrid = prevLog.some(entry => entry.gridNumber === gridNumber);
                if (isDuplicateGrid) {
                  console.log(`📝 GRID NUMBER NOTE: Grid #${gridNumber} already exists in message log but with different content`);
                  
                  // Log info about the duplicate grid number for diagnostic purposes
                  const duplicateEntries = prevLog.filter(entry => entry.gridNumber === gridNumber);
                  if (duplicateEntries.length > 0) {
                    const firstDupe = duplicateEntries[0];
                    console.log(`🔍 PREVIOUS GRID #${gridNumber}: ${firstDupe.words.length} words at ${new Date(firstDupe.timestamp).toISOString()}`);
                    console.log(`🔍 CURRENT GRID #${gridNumber}: ${nextGrid.length} words at ${new Date(timestamp).toISOString()}`);
                  }
                }
                
                // Partial Word Overlap Check (for informational purposes only)
                // This doesn't prevent the grid from being shown, just logs info about partial overlap
                if (prevLog.length > 0) {
                  const previousEntry = prevLog[prevLog.length - 1]; // Get the most recent entry
                  
                  // We've already checked for identical sets above, so here we just check for partial overlap
                  // for informational purposes
                  const currentWords = new Set(nextGrid.map(w => w.word.toUpperCase()));
                  const previousWords = new Set(previousEntry.words.map(w => w.word.toUpperCase()));
                  
                  // Find words that appear in both grids
                  const duplicateWords: string[] = [];
                  for (const word of currentWords) {
                    if (previousWords.has(word)) {
                      duplicateWords.push(word);
                    }
                  }
                  
                  // If we have some overlap but not identical sets (which would have been caught above),
                  // log it for informational purposes
                  if (duplicateWords.length > 0 && duplicateWords.length < currentWords.size && 
                      (currentWords.size !== previousWords.size || duplicateWords.length !== currentWords.size)) {
                    console.log(`📝 PARTIAL WORD OVERLAP: Grid #${gridNumber} contains ${duplicateWords.length} words also found in previous grid`);
                    console.log(`📝 SHARED WORDS: ${duplicateWords.join(', ')}`);
                    console.log(`✅ GRID SHOWN: Partial overlap is allowed`);
                  }
                }
                
                console.log(`✅ GRID VERIFICATION: Grid #${gridNumber} is not a duplicate - adding to message log`);
                
                // Simple grid info without duplicate tracking
                console.log(`\n📊 GRID INFO: Grid #${gridNumber} has attention score: ${gridAttentionScore}/50`);
                
                // Just list a few words from this grid for reference
                if (nextGrid.length > 0) {
                  console.log(`Grid #${gridNumber} words (${nextGrid.length} total):`);
                  nextGrid.slice(0, Math.min(3, nextGrid.length)).forEach((word, i) => {
                    console.log(`  [${i+1}] ${word.word.toUpperCase()}`);
                  });
                  
                  if (nextGrid.length > 3) {
                    console.log(`  ... (${nextGrid.length - 3} more words)`);
                  }
                }
                console.log(`🔍🔍🔍 END MESSAGE LOG ENTRY CREATION - DIRECT PATH 🔍🔍🔍\n`);
                
                // Create our updated log entry for return
                const updatedLog = [
                  ...prevLog,
                  {
                    gridNumber: gridNumber,
                    attentionScore: gridAttentionScore, // Use the cached attention score from GRID_ATTENTION_SCORES
                    words: [...nextGrid], // Create a copy to avoid reference issues (works for both empty and filled grids)
                    timestamp: timestamp,
                    // Add tracing information to the log entry itself
                    _source: 'direct_setMessageLog',
                    _messageId: messageId,
                    _stackTrace: stackTrace?.split('\n')[2] || 'unknown'
                  }
                ];
                
                // Run diagnostic checks every 5 grids to detect duplicates early
                if (gridNumber > 0 && gridNumber % 5 === 0) {
                  console.log(`\n🔍🔍 RUNNING PERIODIC DIAGNOSTICS AT GRID #${gridNumber} 🔍🔍`);
                  
                  // Run without blocking the UI - use setTimeout with 0 delay
                  setTimeout(() => {
                    try {
                      // Save a reference to the message log for diagnostics
                      if (typeof window !== 'undefined') {
                        window.messageLogRef = { current: updatedLog };
                        runDiagnostics.findMessageLogDuplicates(updatedLog);
                      }
                    } catch (error) {
                      console.error("Diagnostics error:", error);
                    }
                  }, 0);
                }
                
                return updatedLog;
              });
            });
            
            // REMOVED historical section that was adding duplicate entries to message log
            // We now handle message log entries directly in the UI update section above
            if (score >= DYNAMIC_ATTENTION_THRESHOLD && nextGrid.length > 0) {
              // All handling is now done by the message log update logic at line ~3100
              // We still need to get the cached score for logging and other uses.
              const cachedValue = typeof window !== 'undefined' && 
                  (window as any).GRID_ATTENTION_SCORES && 
                  (window as any).GRID_ATTENTION_SCORES[gridNumberTrackingRef.current];
                  
              // We'll continue processing regardless so words can still be generated,
              // but skip checking the cache here. The message log updater (the ONE place
              // that handles posting to log) will check if it was "FAILED_ATTENTION"
              
              // Get the cached value for logging purposes only
              const gridAttentionScore = (cachedValue && cachedValue !== "FAILED_ATTENTION") ? cachedValue : 0;
              
              // Log the value if it exists
              if (cachedValue !== undefined) {
                if (cachedValue === "FAILED_ATTENTION") {
                  console.log(`📊 ATTENTION SCORE: Found "FAILED_ATTENTION" marker for grid #${gridNumberTrackingRef.current} - continuing processing`);
                  console.log(`📊 NOTE: Grid #${gridNumberTrackingRef.current} will be processed but not posted to message log`);
                } else {
                  console.log(`📊 ATTENTION SCORE: Using cached value "${cachedValue}" for grid #${gridNumberTrackingRef.current}`);
                }
              } else {
                console.log(`📊 ATTENTION SCORE: No cached value found for grid #${gridNumberTrackingRef.current} - proceeding anyway`);
              }
              
              console.log(`📊 ATTENTION SCORE: Using ONLY cached score of ${gridAttentionScore}/50 for grid #${gridNumberTrackingRef.current}`);
              
              // IMPROVED: Using GRID_UNIQUE_PROCESSING for short-term duplicate prevention
              // This uses a 7-second auto-cleanup for better decoder behavior
              if (typeof window !== 'undefined') {
                // Initialize GRID_UNIQUE_PROCESSING if needed
                if (!(window as any).GRID_UNIQUE_PROCESSING) {
                  (window as any).GRID_UNIQUE_PROCESSING = new Set();
                  console.log(`🔢 GRID TRACKING: Initialized GRID_UNIQUE_PROCESSING tracker to prevent duplicates`);
                }
                
                // Check if this grid is currently being processed
                // This is only to prevent processing the same grid twice in the same cycle
                // It DOES NOT prevent identical grid numbers from appearing in the message log
                if ((window as any).GRID_UNIQUE_PROCESSING.has(gridNumberTrackingRef.current)) {
                  console.log(`📝 PROCESSING NOTE: Grid #${gridNumberTrackingRef.current} is already being processed in this cycle`);
                  console.log(`📝 GRID POLICY: Same grid can appear later in message log, just not twice in same processing cycle`);
                  // Return early to prevent duplicate processing in same cycle
                  return;
                }
                
                // Mark this grid as being processed with 7-second auto-cleanup
                (window as any).GRID_UNIQUE_PROCESSING.add(gridNumberTrackingRef.current);
                console.log(`📝 GRID TRACKING: Grid #${gridNumberTrackingRef.current} marked as processing for current cycle only`);
                
                // Set up 7-second auto-cleanup (increased from 5 to match the 7-second timer cycle)
                setTimeout(() => {
                  if ((window as any).GRID_UNIQUE_PROCESSING) {
                    (window as any).GRID_UNIQUE_PROCESSING.delete(gridNumberTrackingRef.current);
                    console.log(`🔓 GRID TRACKING: Removed grid #${gridNumberTrackingRef.current} from current processing cycle`);
                  }
                }, 7000);
                
                // Log the current state of GRID_UNIQUE_PROCESSING for debugging
                const uniqueProcessingSize = (window as any).GRID_UNIQUE_PROCESSING ? (window as any).GRID_UNIQUE_PROCESSING.size : 0;
                console.log(`🔢 GRID TRACKING DEBUG: GRID_UNIQUE_PROCESSING currently has ${uniqueProcessingSize} grids being processed`);
                
                // 5. Add to older trackers for backward compatibility
                const currentProcessed = (window as any).PROCESSED_GRID_NUMBERS || [];
                if (!currentProcessed.includes(gridNumberTrackingRef.current)) {
                  (window as any).PROCESSED_GRID_NUMBERS = [...currentProcessed, gridNumberTrackingRef.current];
                  console.log(`🔄 GLOBAL GRID TRACKING: Updated global processed grids with grid #${gridNumberTrackingRef.current}`);
                }
                
                // SIMPLIFIED APPROACH: Don't store next grid number here
                // We'll handle all grid incrementation directly in the attention check handler
                // This prevents having multiple places that modify the grid number
                
                // Just mark the current grid as processed so the attention handler knows to increment
                console.log(`🔢 GRID MARKING: Grid #${gridNumberTrackingRef.current} marked as processed - will be incremented in next attention check`);
                
                // No need to store the next grid number here - keep it simple
                // when the attention check will pass and trigger a new grid creation
                
                console.log(`🔢 GRID FLOW: Grid #${gridNumberTrackingRef.current} successfully processed, awaiting next 7-second cycle for new grid`);
                
                // Schedule a grid request check for the next 7-second cycle 
                // but we don't increment the number - this will happen naturally with requestNewGrid()
                
                // REMOVED: No longer marking grid in GRID_ALREADY_MADE
                // Using GRID_UNIQUE_PROCESSING instead with its 7-second auto-cleanup
                console.log(`🔢 GRID FLOW CHECK: Grid #${gridNumberTrackingRef.current} is being tracked by GRID_UNIQUE_PROCESSING`);
                
                
                // Add this grid to FULLY_PROCESSED_GRIDS array for permanent tracking
                if (!(window as any).FULLY_PROCESSED_GRIDS) {
                  (window as any).FULLY_PROCESSED_GRIDS = [];
                }
                
                if (!(window as any).FULLY_PROCESSED_GRIDS.includes(gridNumberTrackingRef.current)) {
                  (window as any).FULLY_PROCESSED_GRIDS.push(gridNumberTrackingRef.current);
                  console.log(`✅ GRID TRACKING: Added grid #${gridNumberTrackingRef.current} to FULLY_PROCESSED_GRIDS permanent tracking`);
                }
                
                // Log the grid number explicitly for tracking
                console.log(`🔢 GRID NUMBER TRACKING: Grid #${gridNumberTrackingRef.current} permanently assigned to these ${nextGrid.length} words`);
                
                // CRITICAL FIX: We don't want to add words to history anymore - clear history instead
                // REMOVED: No longer tracking history to prevent word caching
                preserveScrollPosition(() => {
                  // No history tracking - each grid is completely independent
                  console.log(`🔄 CRITICAL FIX: Removed all word history tracking to prevent caching between grids`);
                  
                  // Only use cached attention scores from the timer cycle
                  if (typeof window !== 'undefined' && 
                      (window as any).GRID_ATTENTION_SCORES && 
                      (window as any).GRID_ATTENTION_SCORES[gridNumberTrackingRef.current] !== undefined) {
                    // Score exists in cache
                    const cachedScore = (window as any).GRID_ATTENTION_SCORES[gridNumberTrackingRef.current];
                    console.log(`📚 CURRENT GRID: Displaying grid #${gridNumberTrackingRef.current} with ${nextGrid.length} words and timer-cached score ${cachedScore}/50`);
                  } else {
                    // Just log that we can't get the score - but we won't create one
                    console.error(`⚠️ STRICT CACHE POLICY: No timer-cached score found for grid #${gridNumberTrackingRef.current}`);
                    console.log(`📚 CURRENT GRID: Displaying grid #${gridNumberTrackingRef.current} with ${nextGrid.length} words (no score available)`);
                  }
                });
              }
            } else {
              // We only log that we're skipping - no score retrieval needed for this case
              console.log(`📚 HISTORY: Skipped adding batch to history - ${score < DYNAMIC_ATTENTION_THRESHOLD ? 'failed attention check' : 'no qualifying words'}`);
            }
            
            // ONLY update the displayed grid number when we actually show words
            // This is the key change - we only increment the grid number display
            // when we have actual words to show
            console.log(`📊 GRID DISPLAY: Updating displayed grid number to ${gridNumberTrackingRef.current}`);
            setGridNumber(gridNumberTrackingRef.current);
            
            // IMPORTANT FIX: Never track the current grid as the last displayed grid
            // This ensures the next grid will never be considered a duplicate
            lastDisplayedGridRef.current = -1; // Use an impossible grid number to force showing all future grids
            console.log(`🛠️ GRID TRACKING BYPASS: Reset lastDisplayedGridRef to -1 (instead of ${gridNumberTrackingRef.current}) to ensure next grid is shown`);
            
            // CRITICAL - Don't track words from this grid - this is a decoder and should never compare words
            // Always clear the array completely to ensure words are never compared between grids
            if (lastDisplayedWordsRef.current.length > 0) {
              lastDisplayedWordsRef.current = [];
              console.log(`🛠️ WORD TRACKING CLEARED: Explicitly emptied word history to prevent any word comparisons`);
            } else {
              console.log(`🛠️ WORD TRACKING ALREADY EMPTY: No word history to clear (array already empty)`);
            }
            
            // Force clear the array again just to be absolutely certain
            lastDisplayedWordsRef.current.length = 0;
            console.log(`🛠️ WORD COMPARISON DISABLED: Words will never be compared between grids as requested`);
            
            // CRITICAL FIX: No global word history tracking - words should never be cached between grids
            try {
              // Remove global word history if it exists to prevent any caching
              if (typeof window !== 'undefined' && (window as any).globalWordHistory) {
                delete (window as any).globalWordHistory;
                console.log(`🧹 CRITICAL FIX: Removed globalWordHistory to prevent word caching between grids`);
              }
              
              // VERIFY the score is already in cache - scores should ALWAYS be cached when generated
              if (typeof window !== 'undefined') {
                if (!(window as any).GRID_ATTENTION_SCORES) {
                  (window as any).GRID_ATTENTION_SCORES = {};
                  console.error(`⚠️ CRITICAL ERROR: GRID_ATTENTION_SCORES cache wasn't initialized`);
                }
                
                // Just verify the score is in the cache (it should have been stored during generation)
                if ((window as any).GRID_ATTENTION_SCORES[gridNumberTrackingRef.current] !== undefined) {
                  // The score should already be in the cache - just verify it's there
                  console.log(`✅ GRID CACHING: Verified attention score ${(window as any).GRID_ATTENTION_SCORES[gridNumberTrackingRef.current]}/50 for grid #${gridNumberTrackingRef.current} is in cache`);
                } else {
                  // This should never happen if scores are always cached when generated
                  console.error(`⚠️ CRITICAL ERROR: No attention score found in cache for grid #${gridNumberTrackingRef.current}`);
                  console.log(`⚠️ This should never happen - scores should ALWAYS be cached when generated`);
                }
              }
              
              // We removed this check since we've moved all the decision making
              // about posting to the message log to ONE place at line ~3100
              // Keep the processing part simple - just get the value for logging
              
              // Get the cached value for logging only
              const cachedValue = typeof window !== 'undefined' && 
                  (window as any).GRID_ATTENTION_SCORES && 
                  (window as any).GRID_ATTENTION_SCORES[gridNumberTrackingRef.current];
                  
              // Log what we find
              if (cachedValue !== undefined) {
                console.log(`✅ FOUND CACHED VALUE: Grid #${gridNumberTrackingRef.current} has cache value: ${cachedValue}`);
              } else {
                console.log(`⚠️ NO CACHED VALUE: Grid #${gridNumberTrackingRef.current} has no cache value`);
              }
              
              // Always continue processing regardless of cache - the message log updater will decide whether to post
              const cachedScore = cachedValue;
              
              // All cosmicWordsAdded event code deleted - no events needed
              // We only use the direct setMessageLog path
            } catch (e) {
              console.error("Error processing words:", e);
            }
          }
          
          // Always increment the batch index, regardless of whether the grid has words
          // This ensures we keep moving forward in the queue and don't repeat words from previous grids
          setBatchIndex(prev => {
            // If we have no more grids, reset to 0 to start fresh with new grids
            const newIndex = (prev + 1) % Math.max(1, wordGridQueueRef.current.length);
            console.log(`📊 BATCH INDEX: Updated from ${prev} to ${newIndex}`);
            return newIndex;
          });
          
          // Set timer to hide the batch after display duration
          if (displayTimerRef.current) {
            clearTimeout(displayTimerRef.current);
          }
          
          displayTimerRef.current = window.setTimeout(() => {
            // No need to add to history here - already added when batch was first shown
            console.log(`⏳ Timer: Display duration complete for current batch of ${currentBatch.length} words`);
            
            // Always clear the current batch and show waiting state after display duration
            // Use scroll preservation function to keep the page from jumping
            preserveScrollPosition(() => {
              setShowBatch(false); // First hide everything
              setCurrentBatch([]); // Clear the words
              setWaitingForCosmicWords(true); // Show waiting state with ellipses
            });
            
            // Set first dot visible immediately and show ellipsis container without delay
            setEllipsisCount(1);
            setShowBatch(true); // Show the ellipses container right away
            
            // Force the batch index to reset to prevent repeating the previous batch
            setBatchIndex(0);
            
            console.log(`Showing cosmic threshold waiting state - threshold: ${(window as any).COSMIC_THRESHOLD_VALUE || COSMIC_THRESHOLD}`);
            
            // Dispatch event that cosmic words were removed
            try {
              const cosmicWordsRemovedEvent = new CustomEvent('cosmicWordsRemoved', {
                detail: { timestamp: Date.now() }
              });
              window.dispatchEvent(cosmicWordsRemovedEvent);
              console.log('🟢 EVENT: Cosmic words removed (display duration ended)');
            } catch (e) {
              console.error("Error dispatching cosmic words removed event:", e);
            }
            
            // FIXED: Release the grid processing lock immediately after display cycle ends
            // Don't add extra delay to the 5-second DISPLAY_DURATION
            gridProcessingRef.current = false;
            console.log("🔓 GRID LOCK: Released - grid fully processed and displayed after exact 5-second duration");
            
            // Clear console logs
            console.log("Display timer completed - showing ellipses until next words");
          }, DISPLAY_DURATION);
        
        // This section was causing a syntax error - removed incorrect else statement
        // Keeping the core functionality
        function showWaitingState() {
          // Spirits don't want to communicate right now, but keep showing ellipses
          // Use scroll preservation here too to prevent any jumps
          preserveScrollPosition(() => {
            setWaitingForAttention(true);
            setWaitingForCosmicWords(true); // Keep ellipses animation consistent
            setShowBatch(false); // First clear any existing batch
            setCurrentBatch([]); // Ensure current batch is empty
            
            // This needs to happen after the clear, so we do it in the same preservation block
            // Set first dot visible immediately and show ellipsis right away
            setEllipsisCount(1);
            setShowBatch(true); // Show the ellipses container without delay
          });
          
          // Release the grid processing lock since we're not going to process a grid
          // Add a small delay to ensure the waiting state is shown
          setTimeout(() => {
            gridProcessingRef.current = false;
            console.log("🔓 GRID LOCK: Released - attention check failed");
          }, 300); // 0.3 second delay
        }
      }).catch(error => {
        console.error("❌ Error during attention check:", error);
        
        // CRITICAL FIX: Release the word generation lock if there's an error
        if (wordGenerationInProgressRef.current) {
          wordGenerationInProgressRef.current = false;
          console.log(`🔓 WORD GENERATION: Released after error during attention check`);
        }
        
        // Always release the grid processing lock on error after a short delay
        setTimeout(() => {
          gridProcessingRef.current = false;
          console.log("🔓 GRID LOCK: Released after error during attention check");
        }, 300); // 0.3 second delay
      });
      }, GRID_INTERVAL);
      
      console.log(`⏱️ TIMER CONFIRMATION: Successfully created timer with ID ${newTimerId} and interval ${GRID_INTERVAL}ms`);
    }, 500); // Close the setTimeout after 0.5 seconds
    
    console.log(`⏱️ STARTUP TIMER: Created delayed startup timer for 0.5 seconds`);
    
    // Store the startupTimer in our ref so we can clean it up if the component unmounts before it fires
    startupTimerRef.current = startupTimer;
    
    return () => {
      // Clean up timers on unmount
      if (displayTimerRef.current) {
        clearTimeout(displayTimerRef.current);
        displayTimerRef.current = null;
      }
      
      // Clean up the grid timer
      if (gridTimerRef.current) {
        clearInterval(gridTimerRef.current);
        gridTimerRef.current = null;
        console.log("⏱️ UNMOUNT: Cleared main grid timer during component unmount");
      }
      
      // Clean up the ellipsis timer
      if (ellipsisTimerRef.current) {
        clearInterval(ellipsisTimerRef.current);
        ellipsisTimerRef.current = null;
      }
      
      // Clean up the attention update timer
      if (attentionUpdateTimerRef.current) {
        clearInterval(attentionUpdateTimerRef.current);
        attentionUpdateTimerRef.current = null;
        console.log("⏱️ UNMOUNT: Cleared attention update timer during component unmount");
      }
      
      // CRITICAL FIX: Clean up the startup timer if it hasn't fired yet
      if (startupTimerRef.current) {
        clearTimeout(startupTimerRef.current);
        startupTimerRef.current = null;
        console.log("⏱️ UNMOUNT: Cleared delayed startup timer before it could create interval timer");
      }
    };
  }, [active, batchIndex]);
  
  // Don't render anything when not active
  if (!active) {
    return null;
  }
  
  return (
    <div className="w-full max-w-full mx-auto px-2 sm:px-4 flex items-center streaming-sentence-container mt-4 sm:mt-6">
      <div className="bg-black/80 border-2 border-blue-400/70 rounded-lg backdrop-blur-sm w-full shadow-lg non-scrollable-container mt-[30px] sm:mt-0" 
        style={{ 
          backgroundColor: 'rgba(0, 20, 40, 0.85)', 
          boxShadow: '0 0 25px rgba(0, 162, 255, 0.4)',
          height: 'auto',
          minHeight: '490px',
          padding: '0.75rem 0.5rem',
          position: 'relative',
          zIndex: 10,
          overflow: 'visible',
          overflowY: 'visible',
          overflowX: 'visible'
        }}>
        {/* Threshold values and attention score - more compact for mobile */}
        <div className="text-center text-blue-300/90 text-xs sm:text-sm mb-2">
          <span 
            className="font-medium cursor-pointer hover:text-blue-200 transition-colors" 
            onClick={() => {
              const event = new CustomEvent('focus-cosmic-slider', { detail: { timestamp: Date.now() } });
              window.dispatchEvent(event);
            }}
            title="Click to adjust cosmic threshold"
          >
            CThresh: {cosmicThreshValue}/50
          </span> • 
          <span 
            className="font-medium cursor-pointer hover:text-blue-200 transition-colors" 
            onClick={() => {
              const event = new CustomEvent('focus-attention-slider', { detail: { timestamp: Date.now() } });
              window.dispatchEvent(event);
            }}
            title="Click to adjust attention threshold"
          >
            Attention: {attentionFilterValue}/50
          </span>
          <span className="text-xs mt-1 block">(Need {attentionFilterValue}+ for attention, {cosmicThreshValue}+ for words)</span>
        </div>
        
        <div className="relative w-full rounded-md overflow-visible min-h-[180px] flex flex-col items-center justify-center" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {/* Main container with flexible height - removed fixed height that was causing scrollbar bouncing */}
          <div className="relative w-full" style={{ position: 'relative', minHeight: '500px', display: 'block' }}>
            {/* Status messages (ellipses, waiting, etc) - always centered, optimized for mobile */}
            {/* Always render the ellipsis container with fixed height to prevent layout jumps - positioned at top */}
            <div className="absolute left-0 right-0 top-[8%] flex items-center justify-center z-10 py-2 sm:py-4"
                 style={{ 
                   height: '120px', /* Fixed height to prevent layout jumping */
                   opacity: (!showBatch || currentBatch.length === 0 || attentionScore === "FAILED_ATTENTION" || (typeof attentionScore === 'number' && attentionScore < DYNAMIC_ATTENTION_THRESHOLD)) ? 1 : 0,
                   visibility: (!showBatch || currentBatch.length === 0 || attentionScore === "FAILED_ATTENTION" || (typeof attentionScore === 'number' && attentionScore < DYNAMIC_ATTENTION_THRESHOLD)) ? 'visible' : 'hidden',
                   transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out'
                 }}>
              <div className="flex flex-col items-center bg-blue-900/20 backdrop-blur-sm px-4 sm:px-8 py-3 sm:py-5 rounded-lg border border-blue-400/30"
                style={{ minWidth: '180px', minHeight: '80px', width: '80%', maxWidth: '90%' }}>
                <div className="text-blue-400 text-2xl sm:text-3xl font-bold min-h-[40px] sm:min-h-[50px] flex items-center justify-center">
                  {/* Always show ellipsis animation for consistency - no more "NO RESULTS" message */}
                  <div className="flex space-x-2">
                    <span className={`text-2xl sm:text-3xl transition-opacity duration-200 ${ellipsisCount === 1 ? 'opacity-100' : 'opacity-30'}`}>.</span>
                    <span className={`text-2xl sm:text-3xl transition-opacity duration-200 ${ellipsisCount === 2 ? 'opacity-100' : 'opacity-30'}`}>.</span>
                    <span className={`text-2xl sm:text-3xl transition-opacity duration-200 ${ellipsisCount === 3 ? 'opacity-100' : 'opacity-30'}`}>.</span>
                  </div>
                </div>
                
                {/* ALWAYS show both scores regardless of state for consistency - compact for mobile */}
                <div className="flex flex-col items-center space-y-1 mt-2">
                  <div className="text-blue-300/80 text-xs sm:text-sm">
                    Attention: {attentionScore}/50 (min {attentionFilterValue})
                  </div>
                  <div className="text-blue-300/80 text-xs sm:text-sm">
                    Cosmic: {cosmicThreshValue}/50 (min {cosmicThreshValue})
                  </div>
                </div>
              </div>
            </div>
            
            {/* Current batch centered when visible - positioned to match the ellipses */}
            {showBatch && currentBatch.length > 0 && (
              // Only show if the attention score passes threshold checks
              attentionScore !== "FAILED_ATTENTION" && 
              typeof attentionScore === 'number' && 
              attentionScore >= DYNAMIC_ATTENTION_THRESHOLD
            ) && (
              <div className="absolute left-0 right-0 top-[8%] flex flex-wrap justify-center max-w-full p-3 z-10 bg-blue-900/30 rounded-md shadow-lg border border-blue-400/50"
                style={{ 
                  backgroundColor: 'rgba(0, 25, 50, 0.8)',
                  boxShadow: '0 0 15px rgba(30, 144, 255, 0.4)',
                  maxHeight: '200px',
                  width: '95%', /* Ensure it doesn't take full width */
                  maxWidth: '95%', /* Ensure it doesn't exceed parent container */
                  margin: '0 auto', /* Center within parent container */
                  overflow: 'hidden', /* Hide overflowing content */
                  wordBreak: 'break-word', /* Break words to prevent overflow */
                  wordWrap: 'break-word', /* Additional word wrapping */
                  textOverflow: 'ellipsis', /* Show ellipsis for overflow */
                  whiteSpace: 'normal', /* Allow text to wrap */
                  padding: '15px',
                  borderWidth: '2px' /* Thicker border for visibility */
                }}>
                {currentBatch.map((entry, index) => (
                  <StreamingWord 
                    key={`${entry.word}-${index}-${gridNumber}`}
                    word={entry.word}
                    level={entry.level}
                    count={entry.count || 1}
                    score={entry.score || 0}
                    replacedWord={entry.replacedWord}
                    parent={entry.parent}
                    // Keep current batch with original larger size
                    className="py-1 px-2"
                    gridNumber={gridNumberTrackingRef.current}
                    attentionScore={attentionScore}
                  />
                ))}
              </div>
            )}
            
            {/* Historical words container with self-contained scrollbar that won't affect the main page */}
            <div className="absolute bottom-[5%] left-0 right-0 px-2 pb-1 rounded-md history-container" 
              style={{ 
                margin: '0 auto',
                width: '95%',
                maxWidth: '95%',
                position: 'absolute',
                bottom: '5%',
                zIndex: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                borderRadius: '8px',
                backdropFilter: 'blur(2px)',
                border: '1px solid rgba(0, 162, 255, 0.2)',
                height: '200px',
                maxHeight: '200px',
                overflowY: 'auto', /* Changed from scroll to auto */
                overflowX: 'hidden'
              }}>
              
              {/* Content container with flexible height */}
              <div style={{
                width: '100%',
                position: 'relative',
                boxSizing: 'border-box'
              }}>
              {/* Header with Copy button - reduced vertical space needed */}
              <div className="flex flex-row items-center justify-between px-1 mb-1 pt-1 relative w-full h-6">
                <div className="text-xs text-blue-400/60 font-medium">
                  {/* Changed to Message Log as requested */}
                  Message Log
                </div>
                
                {/* Now checking both current batch and message log */}
                {(currentBatch.length > 0 || messageLog.length > 0) && (
                  <button 
                    onClick={() => {
                      // Format message log with the current batch at the top
                      // Include grid numbers, cosmic scores, and attention scores as requested
                      let formattedText = '';
                      
                      // Add current batch at the top if available
                      if (currentBatch.length > 0) {
                        const header = `Grid #${gridNumberTrackingRef.current} | Attention: ${attentionScore}/50`;
                        const wordsList = currentBatch.map(word => 
                          `  - ${word.word.toUpperCase()}${word.score ? ` (Cosmic: ${word.score}/50)` : ''}`
                        ).join('\n');
                        formattedText += `${header}\n${wordsList}\n\n`;
                      }
                      
                      // Add message log history with newest at the top
                      // This displays all previous messages
                      if (messageLog.length > 0) {
                        const sortedLog = [...messageLog].sort((a, b) => b.timestamp - a.timestamp);
                        formattedText += sortedLog.map(entry => {
                          // Create a more readable format with each word on a new line
                          const header = `Grid #${entry.gridNumber} | Attention: ${entry.attentionScore}/50`;
                          
                          // If there are words, list each one on its own line with cosmic score
                          if (entry.words.length > 0) {
                            const wordsList = entry.words.map(word => 
                              `  - ${word.word.toUpperCase()}${word.score ? ` (Cosmic: ${word.score}/50)` : ''}`
                            ).join('\n');
                            return `${header}\n${wordsList}`;
                          } else {
                            // For empty grids, just show the header
                            return `${header} | No words above cosmic threshold`;
                          }
                        }).join('\n\n');
                      }
                      
                      // If nothing is available
                      if (formattedText === '') {
                        formattedText = 'No messages available';
                      }
                      
                      // Copy to clipboard
                      navigator.clipboard.writeText(formattedText)
                        .then(() => {
                          setCopySuccess(true);
                          // Reset copy success message after 2 seconds
                          setTimeout(() => setCopySuccess(false), 2000);
                          console.log("Copied messages to clipboard:", formattedText);
                        })
                        .catch(err => {
                          console.error('Failed to copy: ', err);
                        });
                    }}
                    className="text-xs bg-blue-600/40 hover:bg-blue-500/60 text-blue-100 rounded px-2 py-0.5 
                      flex items-center border border-blue-400/30 transition-colors ml-1 flex-shrink-0
                      portrait:py-0 portrait:h-[18px] portrait:text-[10px]"
                    title="Copy all messages to clipboard"
                  >
                    {copySuccess ? (
                      <span className="flex items-center">
                        <span className="mr-1">✓</span> Copied
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <span className="mr-1">📋</span> Copy
                      </span>
                    )}
                  </button>
                )}
              </div>
              
              {/* We don't need to show current batch separately - problem is elsewhere */}
              
              {/* 
                CRITICAL NOTE: The issue isn't with the UI but with the message log update.
                We should focus on fixing the duplicate EVENT PATHS, not the UI display.
              */}
              
              {/* Display message log with newest at the top */}
              {messageLog.length > 0 && (
                <div className="message-log-container w-full">
                  {/* Debug info for message log - should always show even if entries disappear */}
                  <div className="bg-blue-900/30 p-1 mb-2 text-xs text-blue-300/80 rounded">
                    <div>Message Log Debug: {messageLog.length} entries total</div>
                    <div>Grid Numbers: {messageLog.map(e => e.gridNumber).join(', ')}</div>
                    <div>Last update: {new Date().toLocaleTimeString()}</div>
                  </div>
                  {[...messageLog]
                    .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
                    .map((entry, entryIndex) => (
                      <div 
                        key={`log-${entry.gridNumber}-${entry.timestamp}-${entryIndex}`}
                        className="history-item flex flex-wrap justify-center w-full p-1 pl-[42px] border-b border-blue-400/10 mb-2 bg-blue-800/10 rounded relative"
                        style={{ 
                          opacity: 1,
                          maxWidth: '100%',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                          minHeight: '40px'
                        }}
                      >
                        {/* Attention score badge */}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-blue-900/70 px-1.5 py-1 rounded-sm border border-blue-400/30 flex flex-col items-center justify-center z-20" style={{minWidth: '40px', maxWidth: '40px'}}>
                          <span className="text-[9px] text-blue-200">Score</span>
                          <span className="text-xs text-blue-300 font-bold">{entry.attentionScore}</span>
                        </div>
                        
                        {/* Log entry words */}
                        <div className="flex flex-wrap justify-center w-full gap-1 min-h-[32px]">
                          {entry.words.map((word: StreamingWord, wordIndex: number) => (
                            <StreamingWord 
                              key={`log-${entry.gridNumber}-${entry.timestamp}-${word.word}-${wordIndex}`}
                              word={word.word}
                              level={word.level}
                              count={word.count || 1}
                              score={word.score || 0}
                              replacedWord={word.replacedWord}
                              parent={word.parent}
                              className="text-sm py-0.5 px-1 m-0"
                              gridNumber={entry.gridNumber}
                              attentionScore={entry.attentionScore}
                            />
                          ))}
                        </div>
                        
                        {/* Grid number */}
                        <div 
                          className="absolute bottom-0 right-0 px-1 py-0.5 text-[8px] text-blue-300/70 font-mono"
                          title="Grid number"
                        >
                          Grid #{entry.gridNumber}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingSentence;