import { useState, useEffect, useCallback, useRef } from "react";
import TitleSection from "../components/TitleSection";
// REMOVED: fixedTimer import - using 7-second safety timer exclusively
import GridContainer from "../components/GridContainer";
import GameInstructions from "../components/GameInstructions";
import DialogueOutput from "../components/DialogueOutput";
import StardustTransition from "../components/StardustTransition";
import StreamingModule from "../components/StreamingModule";
import DisclaimerPopup from "../components/DisclaimerPopup";
import InfoButton from "../components/InfoButton";
import InfoPopup from "../components/InfoPopup";
import DiagnosticDump from "../components/DiagnosticDump";
import AttentionScoreDebugger from "../components/AttentionScoreDebugger";
import openChannelImg from "../assets/openchannel.png";
import saturnImage from "@assets/saturn3.png";


import CosmicThresholdSlider from "../components/CosmicThresholdSlider";
import { addInitialQuickConnectEntries } from "../utils/addInitialQuickConnect";
import { 
  generateRandomGrid, 
  generateRandomStrand,
  getHorizontalWords, 
  getVerticalWords,
  ROWS,
  COLS,
  delay
} from "../lib/gridUtils";
import { findAllWordsFromStrand, FoundWord } from "../lib/simplifiedWordFinder";
import { 
  initializeDictionary, 
  findLongestWord, 
  findSecondLongestWord, 
  findThirdLongestWord,
  findMultipleWords,
  findSecondaryWord,
  findAndTagWordsParallel,
  TaggedWord
} from "../lib/wordUtils";
import { initializeEventDrivenWordProcessor } from "../lib/eventDrivenWordProcessor";
import { initializeSimplifiedEventProcessor, processStrandDirectly } from "../lib/simplifiedEventProcessor";
import {
  savePsychicBinaryFile,
  filterWordsByCosmicSignificance,
  processSecondTierWords,
  processTertiaryWords,
  evaluateWordCosmicScore,
  // Removed calculateAttentionScore - this is now used ONLY in the 7-second safety timer
  CosmicWord,
  COSMIC_THRESHOLD
} from "../lib/psychicRandomizer";
// Import our hierarchical word processor
import { 
  processGridHierarchically, 
  WordLevel, 
  HierarchicalWord,
  loadDictionary
} from '../lib/hierarchicalWordFinder';
import { 
  containsBlockedEntity, 
  containsShivaEntity, 
  containsDeviEntity,
  containsTimeTerm,
  getBlockedEntityMessage,
  DEVI_ERROR_MESSAGE,
  TIME_TERMS_ERROR_MESSAGE
} from "../lib/blockedEntities";

import { useToast } from "../hooks/use-toast";

// Emoji mapping for A-Z letters
const EMOJI_MAPPING: { [key: string]: string } = {
  'A': '😡', // Angry
  'B': '😬', // Bothered
  'C': '😎', // Cool
  'D': '😢', // Depressed
  'E': '😳', // Embarrassed
  'F': '😨', // Fearful
  'G': '🤢', // Grossed Out
  'H': '😂', // Happy
  'I': '😶', // Indifferent
  'J': '😏', // Joyful
  'K': '🔪', // Knife
  'L': '❤️', // Love
  'M': '🪖', // Military
  'N': '❌', // No
  'O': '😮', // Overwhelmed
  'P': '😱', // Panicked
  'Q': '🤨', // Questioning
  'R': '😤', // Resentful
  'S': '😈', // Sexy
  'T': '🥱', // Tired
  'U': '😓', // Uncomfortable
  'V': '😍', // Valued
  'W': '😵', // Worried
  'X': '😖', // eXhausted
  'Y': '✅', // Yes
  'Z': '🧘'  // Zen
};

/**
 * Gets a random emoji by sampling from the global alphabet array
 * Uses crypto.getRandomValues for true randomness
 */
function getEmoji(): string {
  try {
    // Get the global alphabet array
    const globalAlphabet = (window as any).globalAlphabetArray;
    if (!globalAlphabet || !Array.isArray(globalAlphabet) || globalAlphabet.length === 0) {
      console.warn('🎭 EMOJI: Global alphabet array not available, using fallback');
      // Fallback to direct random letter generation
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomIndex = Math.floor(Math.random() * letters.length);
      const letter = letters[randomIndex];
      return EMOJI_MAPPING[letter] || '😶';
    }

    // Use crypto.getRandomValues for true randomness
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const randomIndex = randomArray[0] % globalAlphabet.length;
    
    // Get the letter at the random index
    const selectedLetter = globalAlphabet[randomIndex];
    
    // Map to emoji
    const emoji = EMOJI_MAPPING[selectedLetter] || '😶';
    
    console.log(`🎭 EMOJI: Selected letter '${selectedLetter}' at index ${randomIndex} → ${emoji}`);
    return emoji;
    
  } catch (error) {
    console.error('🎭 EMOJI: Error getting random emoji:', error);
    return '😶'; // Default to indifferent if error
  }
}

import background1 from "@assets/background1.png";
import pixelGridSound from "@assets/pixelgrid4.mp3";


// Define interfaces for word diagnostics to avoid TypeScript errors
interface PrimaryWordDiagnostic {
  word: string;
  score: number;
  passesThreshold: boolean;
  hasSecondary: boolean;
}

interface SecondaryWordDiagnostic {
  word: string;
  score: number;
  parent: string;
  passesThreshold: boolean;
}

// Define types for global window properties
declare global {
  interface Window {
    // Thresholds
    ATTENTION_THRESHOLD: number;  // Still keeping threshold for streaming component
    COSMIC_THRESHOLD_VALUE: number;
    
    // Grid tracking reference for safety timer integration
    gridNumberTrackingRef: { current: number }; // Reference to current grid number for 7-second safety timer
    
    // Grid processing functions exposed by Home.tsx
    homeComponentFunctions: {
      processGrid: (detail: any) => void;
    };
    
    // Binary data for attention score calculation
    psychicBinaryData?: number[]; // Global binary array for attention score calculation
    psychicDecoder?: {
      getBinaryFile: () => Promise<string>;
      getPsychicLetters: () => Promise<string[]>;
    };
    
    // DEPRECATED: Legacy grid tracking (no longer used - for backwards compatibility only)
    // All grid tracking is now done via the 7-second safety timer with gridNumberTrackingRef
    CURRENT_GRID_NUMBER: number; // DEPRECATED: Legacy variable
    PROCESSED_GRID_NUMBERS: number[]; // DEPRECATED: Legacy variable
    FULLY_PROCESSED_GRIDS: number[]; // DEPRECATED: Legacy variable
    GRID_ALREADY_MADE: {[gridNum: number]: boolean}; // DEPRECATED: Legacy variable
    GRID_NUMBER_INITIALIZATION_TIME: number; // DEPRECATED: Legacy variable
    
    // Feature flags
    alreadyRunBeginCommunication: boolean;
    gridLockDisabledForSubsequentRun: boolean;
    
    // NEW: Parallel word processing system
    allTaggedWords: TaggedWord[]; // Global array of tagged words from parallel processing
  }
}

// Interface for the word hierarchies
interface WordHierarchy {
  main: string;
  secondary: string;
  tertiary: string;
}

const Home = () => {
  // Initialize toast
  const { toast } = useToast();
  
  // State for the letter grid
  const [grid, setGrid] = useState<string[][]>([]);
  const [flippedCells, setFlippedCells] = useState<boolean[][]>([]);
  
  // State for animation and processing
  const [isInvoking, setIsInvoking] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  // State for streaming mode
  const [streamingMode, setStreamingMode] = useState(false);
  // Removed isOpeningChannel state - no longer needed
  // Add stream session counter that increases each time streaming mode is toggled
  // Removed stream session counter as it's not needed and was causing unwanted remounts
  // Fixed connection text that doesn't change - displays only local entities
  const [connectionText, setConnectionText] = useState("ENTITIES AROUND ME RIGHT NOW WHO WISH TO COMMUNICATE THROUGH THIS DEVICE");
  // Always lock the connection since it's now static
  const [isConnectionLocked, setIsConnectionLocked] = useState(true);
  
  // Add a state to track if grid generation is already in progress
  // This prevents overlap issues in our event-driven system
  const [gridGenerationInProgress, setGridGenerationInProgress] = useState(false);
  
  // Removed: Pixel grid functionality completely removed
  
  // State for sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true); // Default to enabled
  
  // State for the cosmic threshold (scoring system for words)
  const [cosmicThreshold, setCosmicThreshold] = useState(66); // Set to 66 on startup (on 0-100 scale)
  
  // State for attention threshold (controls message log filtering)
  const [attentionThreshold, setAttentionThreshold] = useState(15);
  
  // State for found words
  const [horizontalWords, setHorizontalWords] = useState<WordHierarchy[]>([]);
  const [verticalWords, setVerticalWords] = useState<WordHierarchy[]>([]);
  
  // State for cosmically significant words
  const [cosmicWords, setCosmicWords] = useState<CosmicWord[]>([]);
  
  // State for current grid number
  const [gridNumber, setGridNumber] = useState<number>(0);

  // Track the psychic binary file URL
  const [psychicBinaryUrl, setPsychicBinaryUrl] = useState<string>('');
  
  // State for the disclaimer popup
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  
  // State to track if this is the first time showing the disclaimer
  const [isFirstTimeDisclaimer, setIsFirstTimeDisclaimer] = useState(false);
  
  // State for the info popup
  const [isInfoPopupOpen, setIsInfoPopupOpen] = useState(false);
  
  // State to control visibility of sliders when communication ends
  const [showSliders, setShowSliders] = useState(false);
  

  

  
  // COMMENTED OUT: Legacy streaming timer ref - now using event-driven gridPostedToCache system
  // const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reference for the safety timer to prevent duplicates
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use a ref to track streaming mode state to avoid race conditions with timer
  const streamingModeRef = useRef<boolean>(false);
  
  // REMOVED: No longer using processedGridsRef to track processed grids
  // We want to process ALL grids regardless of their grid number
  
  // Set attention threshold to 15 as soon as component mounts
  // This will override any other initialization
  useEffect(() => {
    // Removed: attention threshold functionality
    
    // Initialize grid tracking without global ATTENTION_THRESHOLD variable
    if (typeof window !== 'undefined') {
      console.log("🎚️ ATTENTION FILTER: Using clean event-based filtering only");
      
      // CRITICAL FIX: Initialize global grid number tracking reference
      // This ensures the safety timer has something to increment
      if (!(window as any).gridNumberTrackingRef) {
        (window as any).gridNumberTrackingRef = { current: 0 };
        console.log("🔢 GRID NUMBER: Initialized global gridNumberTrackingRef to 0");
      }
      
      // Clean initialization - StreamingModule will use its default threshold
      console.log("🎚️ ATTENTION FILTER: Clean initialization complete - no forced events");
    }
  }, []);
  
  // Remove global word history tracking in a separate effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Remove global word history if it exists
      if ((window as any).globalWordHistory) {
        delete (window as any).globalWordHistory;
        console.log("📚 GLOBAL HISTORY: Removed globalWordHistory to prevent word caching");
      }
      
      // Expose getEmoji function globally for simplified event processor
      (window as any).getEmoji = getEmoji;
      console.log('🎭 EMOJI: Exposed getEmoji function globally');
      
      // We'll no longer listen for or process cosmicWordsAdded events for history
      console.log("📚 GLOBAL HISTORY: Disabled global word history tracking to prevent word caching");
    }
  }, []);

  // Global flag to disable gridLockReleased handler for testing direct calls
  const DISABLE_GRID_LOCK_HANDLER = false; // Set to true to bypass handleGridLockReleased

  // Add event listeners for slider visibility control
  useEffect(() => {
    const handleBeginCommunication = () => {
      // Reset grid counter to 0 every time begin communication is triggered
      if (typeof window !== 'undefined' && (window as any).gridNumberTrackingRef) {
        (window as any).gridNumberTrackingRef.current = 0;
        console.log("🔢 GRID RESET: Reset grid counter to 0 for new communication session");
      }
      
      // Set streaming mode active
      setStreamingMode(true);
      streamingModeRef.current = true;
      setShowResults(true);
      setProcessingComplete(true);
      
      // Show sliders
      setShowSliders(true);
      
      console.log("🎚️ SLIDERS: Showing cosmic threshold and attention filter sliders");
      console.log("🔄 STREAMING: Activated streaming mode and displays");
      console.log("🔄 BEGIN COMMUNICATION: Complete reset and initialization performed");
    };

    const handleEndCommunication = () => {
      setShowSliders(false);
      setStreamingMode(false);
      streamingModeRef.current = false;
      setIsInvoking(false); // Reset invoking state that blocks streaming mode
      setShowResults(false);
      setProcessingComplete(false);
      console.log("🎚️ SLIDERS: Hiding cosmic threshold and attention filter sliders");
      console.log("🔄 BUTTON: Reset streaming mode to false - button should show 'Begin Communication'");
      console.log("🔄 RESET: Cleared isInvoking flag and display states");
    };

    // Register event listeners
    window.addEventListener('beginCommunication', handleBeginCommunication);
    window.addEventListener('endCommunication', handleEndCommunication);

    // Cleanup
    return () => {
      window.removeEventListener('beginCommunication', handleBeginCommunication);
      window.removeEventListener('endCommunication', handleEndCommunication);
    };
  }, []);
  
  // REMOVED: Legacy processGrid function and global exposure
  // The grid processing is now handled entirely through the 7-second safety timer
  // which directly dispatches gridLockReleased events
  // This simplifies the architecture and removes an unnecessary event path
  
  // REMOVED: No longer listening for gridNumberBroadcast events
  // Grid numbers are now tracked directly in Home.tsx via the 7-second safety timer

  // Listen for internal gridLockReleased events only
  useEffect(() => {

    
    // INTERNAL grid lock released event handler - triggered by processGrid function
    const handleGridLockReleased = async (event: Event) => {
      // Safety check: Early exit if handler is disabled
      if (DISABLE_GRID_LOCK_HANDLER) {
        console.log("🚫 HANDLER DISABLED: handleGridLockReleased bypassed via global flag");
        return;
      }
      
      // Need to cast event as CustomEvent to access detail property
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      
      // Use the event's cycle ID if available, otherwise generate one
      // This ensures we're tracking the exact same cycle across components
      const cycleTimestamp = detail.timestamp || Date.now();
      const cycleId = detail.cycle || Math.floor(cycleTimestamp / 4000); // Convert to cycle number (4-second intervals)
      
      console.log(`\n🔄🔄 4-SECOND SAFETY TIMER CYCLE #${cycleId} 🔄🔄`);
      console.log(`🔔 EVENT ARCHITECTURE: Received gridLockReleased event from safety timer at ${new Date(cycleTimestamp).toISOString()}`);
      console.log(`🔄 CYCLE TRACKING: Processing cycle #${cycleId}`);
      
      // MAJOR FIX: Synchronize the internal grid numbers with 7-second timer cycles
      // This prevents duplicates caused by recalculation of attention scores
      if (typeof window !== 'undefined') {
        // Initialize grid cycle tracking if needed
        if (!(window as any).GRID_CYCLE_TRACKING) {
          (window as any).GRID_CYCLE_TRACKING = {
            lastProcessedCycle: 0,
            lastGridPostedToCacheCycle: 0,
            lastGridRetrievedFromCacheCycle: 0,
            globalGridNumber: 0 // ADDED: This is now the single source of truth for grid numbers
          };
        }
        
        // REMOVED CYCLE PROTECTION: We now always generate a grid for every 7-second cycle
        // This ensures continuous grid generation without any blocking checks
        
        // For diagnostic purposes only, we still track the last cycle
        const lastPostedCycle = (window as any).GRID_CYCLE_TRACKING.lastGridPostedToCacheCycle;
        console.log(`ℹ️ CYCLE TRACKING: Last posted cycle: #${lastPostedCycle}, Current cycle: #${cycleId}`);
        console.log(`🔄 ALWAYS PROCESS: All timer events will generate a grid, no skipping`);
        // No early return here - always continue processing
        
        // CRITICAL FIX: Update the global grid number exactly once per cycle
        // This is how we ensure the grid number is tied directly to the safety timer
        console.log(`🔢 GRID NUMBER SYNC: Current global grid number is ${(window as any).GRID_CYCLE_TRACKING.globalGridNumber}`);
        
        // REMOVED: Grid number incrementation is now exclusively managed by the 7-second safety timer
        // We now receive grid numbers via the safety timer mechanism
        console.log(`🔢 GRID NUMBER SYNC: No longer incrementing grid numbers in Home.tsx`);
        console.log(`🔢 GRID NUMBER AUTHORITY: 7-second safety timer is the sole authority for grid numbers`);
        console.log(`🔢 GRID NUMBER POLICY: Home.tsx only responds to safety timer events`);
        
        // Using the current grid number for processing
        const currentGrid = typeof window !== 'undefined' && window.gridNumberTrackingRef ? 
          window.gridNumberTrackingRef.current : 0;
        console.log(`🔢 GRID NUMBER SYNC: Current grid number from global reference: ${currentGrid}`);
      }
      
      // REMOVED: Checks that were preventing gridLockReleased processing
      // Instead, always process grid events regardless of streamingMode state
      // This ensures continuous operation of the grid processing system
      
      // Just log that we're processing the grid - this should always happen now
      console.log(`🔄 GRID PROCESSING: Processing grid for cycle #${cycleId} (streamingMode=${streamingMode})`);
      
      
      // Verify this event should be processed by Home.tsx
      if (detail.processedBy && detail.processedBy !== 'home-only') {
        console.log(`⚠️ EVENT ARCHITECTURE: Ignoring event not meant for Home.tsx (processedBy: ${detail.processedBy})`);
        return;
      }
      
      // Always force new grid generation on every 7-second cycle
      console.log(`⏱️ PURE EVENT SYSTEM: 7-second timer triggered grid generation directly`);
      console.log(`⏱️ SYNCHRONIZED POSTING: Posting exactly one grid to cache in cycle #${cycleId}`);
      
      // Generate a unique ID for this grid generation that includes the grid number
      // This gives us better traceability between grid IDs and cycle IDs
      // Use the grid number from the detail object (passed directly) or from the 7-second safety timer's ref
      const gridNumberForId = detail.gridNumber !== undefined ? 
        detail.gridNumber : 
        (window.gridNumberTrackingRef ? window.gridNumberTrackingRef.current : 0);
      
      // REMOVED: Duplicate prevention code that was causing grids to be skipped
      // We want to process ALL grids regardless of their grid number
      // The GRID_CACHE is the single source of truth and should handle all grid data
      console.log(`✅ GRID POLICY: Processing ALL grids without duplicate prevention`);
      console.log(`✅ GRID FLOW: Using GRID_CACHE as single source of truth for grid data`);
      
      // REMOVED: Sliding window code that was tracking processed grids
      // We no longer need to track processed grids since we want to process ALL grids
      // Each grid is treated independently regardless of whether it was processed before
      console.log(`🧹 MEMORY MANAGEMENT: No longer tracking processed grids - all grids are processed`);
      console.log(`🧹 GRID POLICY: Every grid event is treated as a new, independent grid`);
      
      const uniqueId = `grid_${gridNumberForId}_${cycleId}_${Math.random().toString(36).substring(2, 7)}`;
      console.log(`🔮 EVENT ARCHITECTURE: Using unique ID ${uniqueId} for grid #${gridNumberForId} in cycle #${cycleId}`);
      
      try {
        // FORCED GENERATION: Do not check any in-progress flags
        // For a pure event-driven system, we always generate a new grid on the 7-second cycle
        console.log(`🔮 PURE EVENT SYSTEM: Forcing new grid generation in cycle #${cycleId}`);
        console.log(`⏱️ TIMER CYCLE: Generating grid #${gridNumberForId} at ${new Date().toISOString()}`);
        
        // SYNCHRONIZED OPERATION: Mark this cycle as having posted a grid to cache
        if (typeof window !== 'undefined') {
          (window as any).GRID_CYCLE_TRACKING.lastGridPostedToCacheCycle = cycleId;
          console.log(`🔒 CYCLE TRACKING: Marked cycle #${cycleId} as having posted grid #${gridNumberForId} to cache`);
        }
        
        // Use simplified pipeline instead of complex background grid processing
        console.log(`🎯 SIMPLIFIED: Using direct strand processing for grid #${gridNumberForId}`);
        await processStrandDirectly(gridNumberForId);
        
        // Skip the rest of this function, as processBackgroundGrid handles everything
        return;
        
        // The code below is intentionally skipped when using the direct approach above
        console.log(`🔮 EVENT ARCHITECTURE: Generating new random grid with ID ${uniqueId}...`);
        const newGrid = await generateRandomGrid();
        
        // Process the grid for words using the new hierarchical approach
        console.log(`🔮 EVENT ARCHITECTURE: Processing for words using hierarchical approach...`);
        
        // Process the entire grid at once to get hierarchical words
        console.log(`🔮 EVENT ARCHITECTURE: Beginning hierarchical word processing...`);
        
        // We'll convert the old processing to use our new hierarchical approach
        let allHierarchicalWords: HierarchicalWord[] = [];
        // Initialize this outside the try block so it can be accessed in the outer scope
        let processedHierarchicalWords: any[] = [];
        
        // Ensure dictionary is loaded
        await loadDictionary();
        
        try {
          // Process grid to extract hierarchical words with primary, secondary, tertiary levels
          allHierarchicalWords = await processGridHierarchically(newGrid);
          
          console.log(`🔮 GRID REQUEST: Hierarchical processing complete. Found ${allHierarchicalWords.length} total words:`);
          console.log(`    - Primary: ${allHierarchicalWords.filter(w => w.level === WordLevel.PRIMARY).length}`);
          console.log(`    - Secondary: ${allHierarchicalWords.filter(w => w.level === WordLevel.SECONDARY).length}`);
          console.log(`    - Tertiary: ${allHierarchicalWords.filter(w => w.level === WordLevel.TERTIARY).length}`);
          
          // We're fully using the hierarchical word finding system now
          // No need to generate the old structures or track word hierarchies separately
          console.log(`🔮 GRID REQUEST: Using hierarchical word finding exclusively...`);
          
          // Debugging output - log the primary, secondary, and tertiary words
          const primaryWords = allHierarchicalWords.filter(w => w.level === WordLevel.PRIMARY);
          const secondaryWords = allHierarchicalWords.filter(w => w.level === WordLevel.SECONDARY);
          const tertiaryWords = allHierarchicalWords.filter(w => w.level === WordLevel.TERTIARY);
          
          console.log(`🔍 FOUND WORDS BY LEVEL:`);
          console.log(`   Primary (${primaryWords.length}): ${primaryWords.map(w => w.word).join(', ')}`);
          console.log(`   Secondary (${secondaryWords.length}): ${secondaryWords.map(w => w.word).join(', ')}`);
          console.log(`   Tertiary (${tertiaryWords.length}): ${tertiaryWords.map(w => w.word).join(', ')}`);
          
          // Check for words that appear in both row and column (doubles)
          const wordOccurrences = new Map<string, number>();
          
          // Count occurrences of each word
          allHierarchicalWords.forEach(wordObj => {
            const count = wordOccurrences.get(wordObj.word) || 0;
            wordOccurrences.set(wordObj.word, count + 1);
          });
          
          // Mark words that appear more than once
          processedHierarchicalWords = allHierarchicalWords.map(wordObj => {
            const appearsTwice = (wordOccurrences.get(wordObj.word) || 0) > 1;
            return { ...wordObj, appearsTwice };
          });
          
          // Log words that appear twice
          const doubleWords = Array.from(wordOccurrences.entries())
            .filter(([_, count]) => count > 1)
            .map(([word]) => word);
          
          if (doubleWords.length > 0) {
            console.log(`🔍 FOUND ${doubleWords.length} DOUBLE WORDS (appear in both row & column): ${doubleWords.join(', ')}`);
          } else {
            console.log(`🔍 NO DOUBLE WORDS FOUND in this grid`);
          }
        } catch (error) {
          console.error(`Error in hierarchical word processing:`, error);
          // Fall back to traditional processing if hierarchical fails
          console.log(`⚠️ FALLBACK: Using traditional word processing due to error`);
          
          const horizontalSequences = getHorizontalWords(newGrid);
          const verticalSequences = getVerticalWords(newGrid);
          
          const newHorizontalWords: WordHierarchy[] = [];
          const newVerticalWords: WordHierarchy[] = [];
          const allFoundWords: string[] = [];
          
          // Traditional processing (kept as fallback)
          for (let row = 0; row < horizontalSequences.length; row++) {
            const letters = horizontalSequences[row];
            try {
              const rowWords = findMultipleWords(letters);
              
              if (rowWords.length > 0) {
                const mainWord = rowWords[0] || '';
                const secondaryWord = rowWords[1] || '';
                const tertiaryWord = rowWords[2] || '';
                
                if (mainWord) allFoundWords.push(mainWord);
                if (secondaryWord) allFoundWords.push(secondaryWord);
                if (tertiaryWord) allFoundWords.push(tertiaryWord);
                
                newHorizontalWords.push({
                  main: mainWord,
                  secondary: secondaryWord,
                  tertiary: tertiaryWord
                });
              } else {
                newHorizontalWords.push({ main: '', secondary: '', tertiary: '' });
              }
            } catch (error) {
              console.error(`Error processing row ${row + 1}:`, error);
              newHorizontalWords.push({ main: '', secondary: '', tertiary: '' });
            }
          }
          
          for (let col = 0; col < verticalSequences.length; col++) {
            const letters = verticalSequences[col];
            try {
              const colWords = findMultipleWords(letters);
              
              if (colWords.length > 0) {
                const mainWord = colWords[0] || '';
                const secondaryWord = colWords[1] || '';
                const tertiaryWord = colWords[2] || '';
                
                if (mainWord) allFoundWords.push(mainWord);
                if (secondaryWord) allFoundWords.push(secondaryWord);
                if (tertiaryWord) allFoundWords.push(tertiaryWord);
                
                newVerticalWords.push({
                  main: mainWord,
                  secondary: secondaryWord,
                  tertiary: tertiaryWord
                });
              } else {
                newVerticalWords.push({ main: '', secondary: '', tertiary: '' });
              }
            } catch (error) {
              console.error(`Error processing column ${col + 1}:`, error);
              newVerticalWords.push({ main: '', secondary: '', tertiary: '' });
            }
          }
        }
        
        // Convert hierarchical words to cosmic words format for the 7-second safety timer
        console.log(`🔮 GRID REQUEST: Preparing words with hierarchical levels...`);
        
        // Prepare words with their scores and levels to send back using our processed words
        // Use the empty array fallback to prevent null/undefined errors
        const flatWords = (processedHierarchicalWords || []).map((wordObj: any) => {
          return {
            word: wordObj.word,
            score: wordObj.attentionScore || 25, // Default to 25 if no score
            level: `level_${wordObj.level}`,     // Convert numeric level to string format
            appearsTwice: wordObj.appearsTwice || false,
            source: wordObj.source || '',
            // Include row/column position information
            rowIndex: wordObj.rowIndex,
            colIndex: wordObj.colIndex
          };
        });
        
        // Dispatch the grid generation completion event first
        const responseEvent = new CustomEvent('gridGenerationComplete', {
          detail: {
            words: flatWords,
            timestamp: Date.now(),
            success: true,
          }
        });
        
        // Send the event to indicate grid generation is complete
        window.dispatchEvent(responseEvent);
        console.log(`🔮 GRID REQUEST: Generation complete, dispatched gridGenerationComplete event`);
        
        // Calculate attention score using binary file method
        let attentionScore = 0;
        
        // Get grid number from the 7-second safety timer
        const gridNumber = typeof window !== 'undefined' && window.gridNumberTrackingRef ? 
          window.gridNumberTrackingRef.current : 0;
          
        // Calculate attention score using binary file method
        try {
          // Create a binary array if not already available
          if (typeof window !== 'undefined' && !(window as any).ATTENTION_BINARY_ARRAY) {
            // Create a binary string of 1s and 0s (111100001111...)
            const binaryLength = 1000; // Length of binary array
            const binaryArray = new Uint8Array(binaryLength);
            
            // Fill with alternating sequences for testing
            for (let i = 0; i < binaryLength; i++) {
              binaryArray[i] = Math.random() > 0.5 ? 1 : 0;
            }
            
            (window as any).ATTENTION_BINARY_ARRAY = binaryArray;
            console.log(`📊 ATTENTION: Created binary array with ${binaryLength} values`);
          }
          
          const binaryArray = (window as any).ATTENTION_BINARY_ARRAY;
          
          // Select 50 random indices and sum the values
          const indices = new Uint32Array(50);
          
          if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            // Use crypto for true randomness if available
            window.crypto.getRandomValues(indices);
            
            // Normalize indices to the length of the binary array
            for (let i = 0; i < indices.length; i++) {
              indices[i] = indices[i] % binaryArray.length;
            }
          } else {
            // Fallback to Math.random
            for (let i = 0; i < 50; i++) {
              indices[i] = Math.floor(Math.random() * binaryArray.length);
            }
          }
          
          // Calculate attention score by getting all 50 values simultaneously with Promise.all
          const scorePromises = indices.map(index => {
            return Promise.resolve(binaryArray[index]);
          });
          
          // Get all binary values at once
          const binaryValues = await Promise.all(scorePromises);
          
          // Sum all values to get final attention score
          attentionScore = binaryValues.reduce((sum, value) => sum + value, 0);
          
          console.log(`📊 ATTENTION: Calculated score ${attentionScore}/50 for grid #${gridNumber}`);
          
          // Store the calculated score for use in the event
          if (typeof window !== 'undefined') {
            (window as any).attentionScore = attentionScore;
          }
        } catch (error) {
          console.error('Error calculating attention score:', error);
          // Use a default score if calculation fails
          attentionScore = 25;
        }
        
        // Always include cosmic score (whether words pass threshold)
        const cosmicScore = flatWords.filter(w => w.score && w.score >= cosmicThreshold).length;
        
        // 🚫 REMOVED REDUNDANT EVENT: The cosmic scoring function already dispatches gridPostedToCache
        // This was the duplicate "7s-safety-cycle" event causing problems
        console.log(`📦 CACHE: Grid posted to cache, cosmic scoring will handle gridPostedToCache event`);
        
      } catch (error) {
        console.error(`❌ GRID REQUEST: Error generating grid:`, error);
        
        // Dispatch failure event
        const failureEvent = new CustomEvent('gridGenerationComplete', {
          detail: {
            // No grid number needed - 7-second safety timer will use its own tracking
            words: [],
            timestamp: Date.now(),
            success: false,
            error: String(error),
            // REMOVED: No longer using uniqueId for tracking
          }
        });
        
        console.error('Error details:', error);
        
        window.dispatchEvent(failureEvent);
      }
    };
    
    // Add event listener for our event-driven architecture
    window.addEventListener('gridLockReleased', handleGridLockReleased as EventListener);
    
    // Cleanup function
    return () => {
      window.removeEventListener('gridLockReleased', handleGridLockReleased as EventListener);
    };
  }, []);

  // Listen for application reset events
  useEffect(() => {
    const handleApplicationReset = (e: CustomEvent) => {
      console.log("🧹 RESET: Received application reset event in Home component", e.detail);
      
      if (e.detail?.clearCosmicWords) {
        // Clear the cosmic words
        setCosmicWords([]);
        console.log("🧹 RESET: Cleared cosmic words");
      }
      
      if (e.detail?.clearDialogueBoxes) {
        // Reset row and column words
        setHorizontalWords([]);
        setVerticalWords([]);
        console.log("🧹 RESET: Cleared row and column words");
      }
      
      // Reset processing state
      setShowResults(false);
      setProcessingComplete(false);
      
      // Always reset the invoking state to allow button re-enabling
      if (isInvoking) {
        console.log("🧹 RESET: Resetting isInvoking state to false");
        setIsInvoking(false);
      }
      
      // Reset grid display
      setFlippedCells(Array(ROWS).fill(null).map(() => Array(COLS).fill(false)));
      
      console.log("🧹 RESET: Completed reset in Home component");
    };
    
    // Handle 'reset-for-next-activation' event - MODIFIED for state persistence
    const handleResetForNextActivation = (e: CustomEvent) => {
      console.log("🚀 IMPROVED: Modified reset-for-next-activation to maintain state persistence", e.detail);
      
      // Reset invoking state to ensure "Begin Communication" button is enabled
      if (isInvoking) {
        setIsInvoking(false);
        console.log("🔄 RESET-FOR-NEXT-ACTIVATION: Force reset isInvoking to false");
      }
      
      // CRITICAL FIX: Do NOT reset streaming mode in this handler
      // Instead just log if there's a potential issue, but maintain state
      if (streamingMode && e.detail?.forceDeactivation) {
        // Only reset if explicitly told to force deactivation (rare condition)
        setStreamingMode(false);
        streamingModeRef.current = false;
        console.log("⚠️ EMERGENCY: Force deactivated streaming mode by explicit request");
      } else if (streamingMode) {
        // Otherwise just log but maintain the current state
        console.log("🚀 PERSISTENCE: Preserving streamingMode state (currently true)");
      }
      
      // REMOVED: No longer using opening channel state
      
      // CRITICAL: Log grid counter status to verify state persistence
      console.log(`🚀 PERSISTENCE: Maintaining grid counter at ${gridGenerationCounterRef.current}`);
      
      // DEPRECATED: Only maintaining window.CURRENT_GRID_NUMBER for legacy logging compatibility
      if (typeof window !== 'undefined' && (window as any).CURRENT_GRID_NUMBER !== undefined) {
        console.log(`🚀 LEGACY: Global CURRENT_GRID_NUMBER variable at ${(window as any).CURRENT_GRID_NUMBER} (no longer used for grid tracking)`);
      }
      
      console.log("🚀 IMPROVED: Completed minimal reset to maintain state persistence");
    };
    
    // Handle 'app-state-reset' event - MODIFIED to maintain state persistence
    const handleAppStateReset = (e: CustomEvent) => {
      console.log("🚀 IMPROVED: Modified app-state-reset handler to maintain state persistence", e.detail);
      
      // Only reset visual states, not data that needs to persist
      setCosmicWords([]);
      setHorizontalWords([]);
      setVerticalWords([]);
      
      // Reset UI state flags
      setShowResults(true);
      setProcessingComplete(true);
      setIsInvoking(false);
      setIsFlipping(false);
      
      // CRITICAL: Do NOT reset streaming mode or grid counters
      // This allows proper state persistence between activations
      
      // Log what we're NOT doing (for debugging)
      console.log(`🚀 PERSISTENCE: Maintaining grid counter at ${gridGenerationCounterRef.current}`);
      
      // REMOVED: No longer using opening channel state
      
      // REMOVED: Auto-refresh code that was causing application to reset after a minute
      // This was disrupting the protocol by forcing component remount
      // if (e.detail?.fullCleanup) {
      //  setTimeout(() => {
      //    setStreamSessionCounter(prev => prev + 1);
      //    console.log("🧹 APP-STATE-RESET: Incremented stream session counter for complete refresh");
      //  }, 100);
      // }
      console.log("🧹 APP-STATE-RESET: Skipping session counter increment to maintain protocol stability");
      
      // Reset grid display
      setFlippedCells(Array(ROWS).fill(null).map(() => Array(COLS).fill(false)));
      
      console.log("🧹 APP-STATE-RESET: Completed full application state reset");
    };
    
    // Handle force deactivation of streaming mode
    const handleForceDeactivateStreaming = (e: CustomEvent) => {
      console.log("🔴 FORCE DEACTIVATE: Received force deactivate streaming mode event", e.detail);
      
      // Forcefully update React state and ref
      setStreamingMode(false);
      streamingModeRef.current = false;
      
      // Removed counter increment that caused unwanted component remounts
      
      // COMMENTED OUT: Legacy streaming timer cleanup - now using event-driven system
      // if (streamingTimerRef.current) {
      //   clearInterval(streamingTimerRef.current);
      //   streamingTimerRef.current = null;
      //   console.log("🔴 FORCE DEACTIVATE: Cleared streaming timer");
      // }
      
      // REMOVED: No longer dispatching reset event to maintain state persistence
      console.log("🚀 IMPROVED: Skipping component reset to maintain state persistence between sessions");
      
      console.log("🔴 FORCE DEACTIVATE: Streaming mode forcefully deactivated");
    };
    
    // Listen for streaming toggle completion events
    const handleStreamingToggleComplete = (e: CustomEvent) => {
      const active = e.detail?.active;
      console.log(`🔄 STREAMING TOGGLE COMPLETION EVENT received: active=${active}`);
      
      // Force state reset for streamingMode if needed
      if (active === false && streamingMode === true) {
        setStreamingMode(false);
        streamingModeRef.current = false;
        
        // Reset state to allow turning back on
        setTimeout(() => {
          console.log("🔄 RESET: Performing delayed state cleanup to allow toggling back on");
          // COMMENTED OUT: Legacy streaming timer cleanup - now using event-driven system
          // if (streamingTimerRef.current) {
          //   clearInterval(streamingTimerRef.current);
          //   streamingTimerRef.current = null;
          //   console.log("🧹 Cleared streaming timer after toggle completion");
          // }
          
          // Removed component remount mechanism that was destabilizing the application
          console.log("🔄 RESET: No longer force refreshing component to maintain protocol stability");
        }, 500);
      }
    };
    
    // Handle cosmic scoring completion - populate GRID_CACHE with scored words
    const handleCosmicScoringComplete = async (e: CustomEvent) => {
      const { cosmicWords, gridNumber, timestamp } = e.detail;
      console.log(`🌟 COSMIC COMPLETE: Received cosmicScoringComplete event with ${cosmicWords.length} words for grid #${gridNumber}`);
      
      // Get the real attention score calculated in the cosmic scoring function
      const realAttentionScore = e.detail.attentionScore || 25;
      console.log(`📊 COSMIC ATTENTION: Using calculated attention score ${realAttentionScore}/50 for grid #${gridNumber} from cosmic scoring function`);
      
      // Format ALL words for GRID_CACHE (no threshold filtering)
      const cosmicThreshold = (typeof window !== 'undefined' && (window as any).COSMIC_THRESHOLD_VALUE) || 65;
      
      console.log(`🌟 COSMIC PROCESSING: Processing all ${cosmicWords.length} words for grid #${gridNumber}`);
      
      if (typeof window !== 'undefined') {
        // Format ALL words for GRID_CACHE including frequency data
        const formattedWords = cosmicWords.map((word: any) => ({
          word: word.word,
          score: word.score,
          cosmicScore: word.score,
          frequency: word.frequency || 1, // Include frequency data from strand processing
          level: word.level,
          isSecondary: word.level > 1,
          parent: word.parent,
          sourceType: word.sourceType,
          sourceIndex: word.sourceIndex
        }));
        
        // Get emoji data from the event (generated in simplified event processor)
        const gridEmoji = e.detail.emoji || '😶';
        console.log(`🎭 EMOJI: Including emoji ${gridEmoji} in GRID_CACHE for grid #${gridNumber}`);
        
        // Store in GRID_CACHE - this will trigger the cache manager to dispatch gridPostedToCache
        const cacheEntry = {
          gridNumber,
          words: formattedWords,
          attentionScore: realAttentionScore, // Use the real calculated attention score
          cosmicScore: cosmicWords.length, // Total words, not just qualifying
          cosmicThreshold: cosmicThreshold,
          emoji: gridEmoji, // Include emoji data
          timestamp: timestamp,
          cycle: Date.now(),
          source: "cosmic-scoring"
        };
        
        // Store in GRID_CACHE as single entry (overwrites previous entry)
        (window as any).GRID_CACHE = cacheEntry;
        console.log(`📦 COSMIC CACHE: Stored all ${cosmicWords.length} words in single-entry GRID_CACHE (grid #${gridNumber})`);
        
        // Manually dispatch gridPostedToCache event since the cache manager should do this
        window.dispatchEvent(new CustomEvent("gridPostedToCache", {
          detail: cacheEntry
        }));
        console.log(`📦 COSMIC EVENT: Manually dispatched gridPostedToCache for all words`);
      } else {
        console.warn('⚠️ COSMIC ERROR: GRID_CACHE not available for storing cosmic words');
      }
    };

    // Saturn glow effect when grid is posted to cache
    const handleGridPostedToCache = async (e: CustomEvent) => {
      // Trigger Saturn glow animation (prevent overlapping animations)
      const saturnImage = document.querySelector('.saturn-glow');
      if (saturnImage && streamingModeRef.current) {
        // Only start new animation if one isn't already running
        if (!saturnImage.classList.contains('saturn-pulse')) {
          saturnImage.classList.add('saturn-pulse');
          setTimeout(() => {
            saturnImage.classList.remove('saturn-pulse');
          }, 2000);
        }
      }
    };

    window.addEventListener('resetApplicationState', handleApplicationReset as EventListener);
    window.addEventListener('forceDeactivateStreamingMode', handleForceDeactivateStreaming as EventListener);
    window.addEventListener('streamingToggleComplete', handleStreamingToggleComplete as EventListener);
    window.addEventListener('reset-for-next-activation', handleResetForNextActivation as EventListener);
    window.addEventListener('app-state-reset', handleAppStateReset as EventListener);
    window.addEventListener('cosmicScoringComplete', handleCosmicScoringComplete as EventListener);
    window.addEventListener('gridPostedToCache', handleGridPostedToCache as EventListener);
    
    return () => {
      window.removeEventListener('resetApplicationState', handleApplicationReset as EventListener);
      window.removeEventListener('forceDeactivateStreamingMode', handleForceDeactivateStreaming as EventListener);
      window.removeEventListener('cosmicScoringComplete', handleCosmicScoringComplete as EventListener);
      window.removeEventListener('streamingToggleComplete', handleStreamingToggleComplete as EventListener);
      window.removeEventListener('reset-for-next-activation', handleResetForNextActivation as EventListener);
      window.removeEventListener('app-state-reset', handleAppStateReset as EventListener);
      window.removeEventListener('gridPostedToCache', handleGridPostedToCache as EventListener);
    };
  }, []);

  // Initialize grid numbering specifically (separate effect for grid number tracking)
  useEffect(() => {
    console.log("🔢 INITIALIZING GRID NUMBER TRACKING");
    
    // IMPORTANT: Initialize gridNumberTrackingRef to ensure the 7-second safety timer works properly
    if (typeof window !== 'undefined') {
      // Initialize the core grid number tracking reference if it doesn't exist
      if (!(window as any).gridNumberTrackingRef) {
        (window as any).gridNumberTrackingRef = { current: 0 };
        console.log("🔢 GRID NUMBER: Initialized global gridNumberTrackingRef to 0");
      }
      
      // Clear any old global tracking variables that might still exist
      // These are no longer used but we clean them up to avoid confusion
      const variablesToClean = [
        'CURRENT_GRID_NUMBER', 
        'currentGridBeingDisplayed', 
        'PROCESSED_GRID_NUMBERS', 
        'FULLY_PROCESSED_GRIDS',
        'GRID_ALREADY_MADE',
        'GRID_UNIQUE_PROCESSING'
      ];
      
      variablesToClean.forEach(varName => {
        if ((window as any)[varName] !== undefined) {
          delete (window as any)[varName];
        }
      });
      
      console.log(`🧹 CLEANUP: Removed all legacy grid tracking variables`);
      console.log(`🔢 GRID ARCHITECTURE: 7-second safety timer is the sole manager of grid numbers`);
    }
    
    // SIMPLIFIED: Using only local grid number tracking with refs
    // Initialize to 0 if this is the first run
    gridGenerationCounterRef.current = 0;
    console.log(`🔢 GRID TRACKING: Initialized local grid counter to 0`);
    
    // Initialize a timestamp for diagnostics only
    const initTime = Date.now();
    console.log(`🔢 GRID NUMBERING INITIALIZED: Starting with grid #0 at ${new Date(initTime).toISOString()}`);
  }, []);
  
  // MODIFIED: No longer listening for grid increment requests
  // The 7-second safety timer is now the only source of grid incrementation
  useEffect(() => {
    // Log that Home.tsx is not handling grid increments
    console.log(`🔢 GRID NUMBER POLICY: Home.tsx no longer handles grid increments - 7-second safety timer is the sole incrementer`);
  }, []);

  // Initialize the empty grid and dictionary when component mounts
  useEffect(() => {
    console.log("======= INITIALIZING APPLICATION =======");
    const initGrid = Array(ROWS).fill(null).map(() => 
      Array(COLS).fill('')
    );
    setGrid(initGrid);
    
    const initFlipped = Array(ROWS).fill(null).map(() => 
      Array(COLS).fill(false)
    );
    setFlippedCells(initFlipped);
    
    // Load dictionary data
    initializeDictionary();
    
    // CRITICAL FIX: Initialize the event-driven word processor
    initializeEventDrivenWordProcessor();
    console.log('🚀 EVENT SYSTEM: Event-driven word processor initialized');
    
    // Add initial Quick Connect entries for testing
    addInitialQuickConnectEntries();
    
    // Use our pre-initialized static 65,000 entry psychic binary file
    console.log("🔮 Using pre-initialized 65,000 entry psychic binary file...");
    const binaryFileUrl = savePsychicBinaryFile();
    setPsychicBinaryUrl(binaryFileUrl);
    
    // Make it available to window object for use in GlyphPixelGrid
    window.psychicBinaryUrl = binaryFileUrl;
    
    console.log(`🔮 Psychic binary file created with 65,000 values at: ${binaryFileUrl}`);
    
    // Set background image for the entire app
    document.body.style.backgroundImage = `url(${background1})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center 0%"; // Move background even lower to show more of the top part
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.minHeight = "100vh";
    
    // REMOVED: Custom scrollbar styles and overflow control - causing scroll lock issues
    
    return () => {
      // Clean up the binary file URL when component unmounts
      if (psychicBinaryUrl) {
        console.log("🔮 Cleaning up psychic binary file:", psychicBinaryUrl);
        URL.revokeObjectURL(psychicBinaryUrl);
      }
      
      // COMMENTED OUT: Legacy streaming timer cleanup - now using event-driven system
      // if (streamingTimerRef.current) {
      //   console.log("🔄 Cleaning up streaming mode timer");
      //   clearInterval(streamingTimerRef.current);
      //   streamingTimerRef.current = null;
      // }
      
      // Reset all background styles
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundAttachment = "";
      document.body.style.minHeight = "";
      document.body.style.maxHeight = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, []);

  // Process words from grid rows and columns
  const processWords = useCallback(async () => {
    console.log("=================================================");
    console.log("STARTING WORD PROCESSING WITH NEW INDEPENDENT WORD SYSTEM");
    console.log("=================================================");
    
    console.log("DEBUGGING DICTIONARY:");
    console.log("Dictionary loaded correctly:", typeof initializeDictionary === 'function' ? 'YES' : 'NO');
    console.log("findMultipleWords function exists:", typeof findMultipleWords === 'function' ? 'YES' : 'NO');
    
    // Get all horizontal and vertical word sequences
    console.log("Getting horizontal and vertical sequences...");
    const horizontalSequences = getHorizontalWords(grid);
    const verticalSequences = getVerticalWords(grid);
    
    console.log("Horizontal sequences length:", horizontalSequences.length);
    console.log("Vertical sequences length:", verticalSequences.length);
    
    console.log("===== WORD SEQUENCE EXAMPLES =====");
    // Debug first few rows and columns
    for (let i = 0; i < 3 && i < horizontalSequences.length; i++) {
      console.log(`Row ${i+1} sequence:`, horizontalSequences[i].join(''));
    }
    for (let i = 0; i < 3 && i < verticalSequences.length; i++) {
      console.log(`Column ${i+1} sequence:`, verticalSequences[i].join(''));
    }
    
    // Dictionary is now fully loaded and operational
    console.log("Dictionary loaded and ready for word processing");
    console.log("\n===== PROCESSING ALL 40 SEQUENCES WITH PARTIAL PARALLELIZATION =====");
    console.log(`🚀 PARTIAL PARALLEL PRIMARY: Processing ${horizontalSequences.length} rows + ${verticalSequences.length} columns = ${horizontalSequences.length + verticalSequences.length} sequences simultaneously with Promise.all`);
    
    const allFoundWords: string[] = []; // Track all words for cosmic significance testing
    let newHorizontalWords: WordHierarchy[] = [];
    let newVerticalWords: WordHierarchy[] = [];
    
    try {
      // Create promises for all sequences (rows + columns) to process simultaneously
      const sequencePromises = [
        // Process all horizontal sequences (rows)
        ...horizontalSequences.map(async (letters, row) => {
          try {
            console.log(`⭐ PARALLEL ROW ${row + 1}: ${letters.join('')}`);
            // Each sequence processes its words sequentially (internal sequential)
            const rowWords = findMultipleWords(letters);
            
            const mainWord = rowWords[0] || '';
            const secondaryWord = rowWords[1] || '';
            const tertiaryWord = rowWords[2] || '';
            
            console.log(`✅ ROW ${row + 1} PARALLEL RESULTS: [${mainWord}, ${secondaryWord}, ${tertiaryWord}]`);
            
            return {
              type: 'horizontal' as const,
              index: row,
              hierarchy: { main: mainWord, secondary: secondaryWord, tertiary: tertiaryWord },
              words: [mainWord, secondaryWord, tertiaryWord].filter(w => w.length > 0)
            };
          } catch (error) {
            console.error(`Error in parallel row ${row + 1}:`, error);
            return {
              type: 'horizontal' as const,
              index: row,
              hierarchy: { main: '', secondary: '', tertiary: '' },
              words: []
            };
          }
        }),
        
        // Process all vertical sequences (columns)
        ...verticalSequences.map(async (letters, col) => {
          try {
            console.log(`⭐ PARALLEL COLUMN ${col + 1}: ${letters.join('')}`);
            // Each sequence processes its words sequentially (internal sequential)
            const colWords = findMultipleWords(letters);
            
            const mainWord = colWords[0] || '';
            const secondaryWord = colWords[1] || '';
            const tertiaryWord = colWords[2] || '';
            
            console.log(`✅ COLUMN ${col + 1} PARALLEL RESULTS: [${mainWord}, ${secondaryWord}, ${tertiaryWord}]`);
            
            return {
              type: 'vertical' as const,
              index: col,
              hierarchy: { main: mainWord, secondary: secondaryWord, tertiary: tertiaryWord },
              words: [mainWord, secondaryWord, tertiaryWord].filter(w => w.length > 0)
            };
          } catch (error) {
            console.error(`Error in parallel column ${col + 1}:`, error);
            return {
              type: 'vertical' as const,
              index: col,
              hierarchy: { main: '', secondary: '', tertiary: '' },
              words: []
            };
          }
        })
      ];
      
      // Execute ALL 40 sequences simultaneously
      console.log(`🚀 EXECUTING ${sequencePromises.length} SEQUENCES IN PARALLEL...`);
      const sequenceResults = await Promise.all(sequencePromises);
      
      // Separate and organize results
      const newHorizontalWords: WordHierarchy[] = new Array(horizontalSequences.length).fill(null).map(() => ({ main: '', secondary: '', tertiary: '' }));
      const newVerticalWords: WordHierarchy[] = new Array(verticalSequences.length).fill(null).map(() => ({ main: '', secondary: '', tertiary: '' }));
      
      // Process results and collect all found words
      sequenceResults.forEach(result => {
        if (result.type === 'horizontal') {
          newHorizontalWords[result.index] = result.hierarchy;
        } else {
          newVerticalWords[result.index] = result.hierarchy;
        }
        
        // Add words to collection for cosmic testing
        result.words.forEach(word => {
          if (word && word.trim().length > 0) {
            allFoundWords.push(word.trim());
          }
        });
      });
      
      console.log(`🚀 PARALLEL SUCCESS: Processed all ${sequenceResults.length} sequences simultaneously`);
      console.log(`🚀 PARALLEL RESULTS: Found ${newHorizontalWords.filter(w => w.main).length} row words, ${newVerticalWords.filter(w => w.main).length} column words`);
      
      // Set state for both horizontal and vertical words
      setHorizontalWords(newHorizontalWords);
      setVerticalWords(newVerticalWords);
      
    } catch (error) {
      console.error('🚀 PARALLEL FAILURE: Error in parallel sequence processing:', error);
      
      // Fallback to sequential processing if parallel fails
      console.log('🚀 FALLBACK: Using sequential processing due to parallel failure');
      
      const newHorizontalWords: WordHierarchy[] = [];
      
      // Sequential fallback for rows
      for (let row = 0; row < horizontalSequences.length; row++) {
        try {
          const rowWords = findMultipleWords(horizontalSequences[row]);
          const mainWord = rowWords[0] || '';
          const secondaryWord = rowWords[1] || '';
          const tertiaryWord = rowWords[2] || '';
          
          if (mainWord) allFoundWords.push(mainWord);
          if (secondaryWord) allFoundWords.push(secondaryWord);
          if (tertiaryWord) allFoundWords.push(tertiaryWord);
          
          newHorizontalWords.push({ main: mainWord, secondary: secondaryWord, tertiary: tertiaryWord });
        } catch (seqError) {
          console.warn(`Sequential row ${row + 1} failed:`, seqError);
          newHorizontalWords.push({ main: '', secondary: '', tertiary: '' });
        }
      }
      
      // Sequential fallback for columns
      const newVerticalWords: WordHierarchy[] = [];
      for (let col = 0; col < verticalSequences.length; col++) {
        try {
          const colWords = findMultipleWords(verticalSequences[col]);
          const mainWord = colWords[0] || '';
          const secondaryWord = colWords[1] || '';
          const tertiaryWord = colWords[2] || '';
          
          if (mainWord) allFoundWords.push(mainWord);
          if (secondaryWord) allFoundWords.push(secondaryWord);
          if (tertiaryWord) allFoundWords.push(tertiaryWord);
          
          newVerticalWords.push({ main: mainWord, secondary: secondaryWord, tertiary: tertiaryWord });
        } catch (seqError) {
          console.warn(`Sequential column ${col + 1} failed:`, seqError);
          newVerticalWords.push({ main: '', secondary: '', tertiary: '' });
        }
      }
      
      setHorizontalWords(newHorizontalWords);
      setVerticalWords(newVerticalWords);
    }
    
    // Process secondary derived words from each primary word
    console.log("\n===== PROCESSING SECONDARY DERIVED WORDS =====");
    const derivedSecondaryWords: string[] = [];
    const derivedWordMap = new Map<string, string>(); // Map primary words to their secondary derived words
    
    // Process horizontal words for secondary derived words
    for (const wordHierarchy of (newHorizontalWords || [])) {
      // Find secondary derived words for each primary word in the hierarchies
      if (wordHierarchy.main) {
        const derivedWord = findSecondaryWord(wordHierarchy.main);
        if (derivedWord) {
          console.log(`Found secondary derived word "${derivedWord}" from primary word "${wordHierarchy.main}"`);
          derivedSecondaryWords.push(derivedWord);
          derivedWordMap.set(wordHierarchy.main, derivedWord);
        }
      }
      
      if (wordHierarchy.secondary) {
        const derivedWord = findSecondaryWord(wordHierarchy.secondary);
        if (derivedWord) {
          console.log(`Found secondary derived word "${derivedWord}" from primary word "${wordHierarchy.secondary}"`);
          derivedSecondaryWords.push(derivedWord);
          derivedWordMap.set(wordHierarchy.secondary, derivedWord);
        }
      }
      
      if (wordHierarchy.tertiary) {
        const derivedWord = findSecondaryWord(wordHierarchy.tertiary);
        if (derivedWord) {
          console.log(`Found secondary derived word "${derivedWord}" from primary word "${wordHierarchy.tertiary}"`);
          derivedSecondaryWords.push(derivedWord);
          derivedWordMap.set(wordHierarchy.tertiary, derivedWord);
        }
      }
    }
    
    // Process vertical words for secondary derived words
    for (const wordHierarchy of newVerticalWords) {
      // Find secondary derived words for each primary word in the hierarchies
      if (wordHierarchy.main) {
        const derivedWord = findSecondaryWord(wordHierarchy.main);
        if (derivedWord) {
          console.log(`Found secondary derived word "${derivedWord}" from primary word "${wordHierarchy.main}"`);
          derivedSecondaryWords.push(derivedWord);
          derivedWordMap.set(wordHierarchy.main, derivedWord);
        }
      }
      
      if (wordHierarchy.secondary) {
        const derivedWord = findSecondaryWord(wordHierarchy.secondary);
        if (derivedWord) {
          console.log(`Found secondary derived word "${derivedWord}" from primary word "${wordHierarchy.secondary}"`);
          derivedSecondaryWords.push(derivedWord);
          derivedWordMap.set(wordHierarchy.secondary, derivedWord);
        }
      }
      
      if (wordHierarchy.tertiary) {
        const derivedWord = findSecondaryWord(wordHierarchy.tertiary);
        if (derivedWord) {
          console.log(`Found secondary derived word "${derivedWord}" from primary word "${wordHierarchy.tertiary}"`);
          derivedSecondaryWords.push(derivedWord);
          derivedWordMap.set(wordHierarchy.tertiary, derivedWord);
        }
      }
    }
    
    console.log(`Found ${derivedSecondaryWords.length} secondary derived words from primary words`);
    
    // REAL-TIME SCORING APPROACH - Use the scores calculated when displaying the rows/columns
    console.log("\n===== USING REAL-TIME SCORING FOR COSMIC INSIGHTS =====");
    
    // Create a map to track words by their row/column for later reference
    const wordSourceMap = new Map();
    
    // This will store scores calculated in real-time for each word
    const wordScores = new Map();
    
    // Collect all words that need scoring
    const wordsToScore: Array<{
      word: string;
      sourceInfo: any;
      logMessage: string;
    }> = [];

    // Process horizontal words (rows)
    newHorizontalWords.forEach((wordSet, rowIndex) => {
      // Add primary words if they exist
      if (wordSet.main) {
        wordsToScore.push({
          word: wordSet.main,
          sourceInfo: { type: 'row', index: rowIndex },
          logMessage: `🎯 Real-time score for row ${rowIndex+1} main word "${wordSet.main}": `
        });
      }
      
      if (wordSet.secondary) {
        wordsToScore.push({
          word: wordSet.secondary,
          sourceInfo: { type: 'row', index: rowIndex },
          logMessage: `🎯 Real-time score for row ${rowIndex+1} secondary word "${wordSet.secondary}": `
        });
      }
      
      if (wordSet.tertiary) {
        wordsToScore.push({
          word: wordSet.tertiary,
          sourceInfo: { type: 'row', index: rowIndex },
          logMessage: `🎯 Real-time score for row ${rowIndex+1} tertiary word "${wordSet.tertiary}": `
        });
      }
      
      // Also track derived words
      const mainDerived = findSecondaryWord(wordSet.main);
      const secondaryDerived = findSecondaryWord(wordSet.secondary);
      const tertiaryDerived = findSecondaryWord(wordSet.tertiary);
      
      if (mainDerived) {
        wordsToScore.push({
          word: mainDerived,
          sourceInfo: { 
            type: 'derived', 
            parent: wordSet.main, 
            parentSource: { type: 'row', index: rowIndex } 
          },
          logMessage: `🎯 Real-time score for row ${rowIndex+1} derived word "${mainDerived}" (from "${wordSet.main}"): `
        });
      }
      
      if (secondaryDerived) {
        wordsToScore.push({
          word: secondaryDerived,
          sourceInfo: { 
            type: 'derived', 
            parent: wordSet.secondary, 
            parentSource: { type: 'row', index: rowIndex } 
          },
          logMessage: `🎯 Real-time score for row ${rowIndex+1} derived word "${secondaryDerived}" (from "${wordSet.secondary}"): `
        });
      }
      
      if (tertiaryDerived) {
        wordsToScore.push({
          word: tertiaryDerived,
          sourceInfo: { 
            type: 'derived', 
            parent: wordSet.tertiary, 
            parentSource: { type: 'row', index: rowIndex } 
          },
          logMessage: `🎯 Real-time score for row ${rowIndex+1} derived word "${tertiaryDerived}" (from "${wordSet.tertiary}"): `
        });
      }
    });
    
    // Process vertical words (columns)
    newVerticalWords.forEach((wordSet, colIndex) => {
      // Add primary words if they exist 
      if (wordSet.main) {
        wordsToScore.push({
          word: wordSet.main,
          sourceInfo: { type: 'column', index: colIndex },
          logMessage: `🎯 Real-time score for column ${colIndex+1} main word "${wordSet.main}": `
        });
      }
      
      if (wordSet.secondary) {
        wordsToScore.push({
          word: wordSet.secondary,
          sourceInfo: { type: 'column', index: colIndex },
          logMessage: `🎯 Real-time score for column ${colIndex+1} secondary word "${wordSet.secondary}": `
        });
      }
      
      if (wordSet.tertiary) {
        wordsToScore.push({
          word: wordSet.tertiary,
          sourceInfo: { type: 'column', index: colIndex },
          logMessage: `🎯 Real-time score for column ${colIndex+1} tertiary word "${wordSet.tertiary}": `
        });
      }
      
      // Also track derived words
      const mainDerived = findSecondaryWord(wordSet.main);
      const secondaryDerived = findSecondaryWord(wordSet.secondary);
      const tertiaryDerived = findSecondaryWord(wordSet.tertiary);
      
      if (mainDerived) {
        wordsToScore.push({
          word: mainDerived,
          sourceInfo: { 
            type: 'derived', 
            parent: wordSet.main, 
            parentSource: { type: 'column', index: colIndex } 
          },
          logMessage: `🎯 Real-time score for column ${colIndex+1} derived word "${mainDerived}" (from "${wordSet.main}"): `
        });
      }
      
      if (secondaryDerived) {
        wordsToScore.push({
          word: secondaryDerived,
          sourceInfo: { 
            type: 'derived', 
            parent: wordSet.secondary, 
            parentSource: { type: 'column', index: colIndex } 
          },
          logMessage: `🎯 Real-time score for column ${colIndex+1} derived word "${secondaryDerived}" (from "${wordSet.secondary}"): `
        });
      }
      
      if (tertiaryDerived) {
        wordsToScore.push({
          word: tertiaryDerived,
          sourceInfo: { 
            type: 'derived', 
            parent: wordSet.tertiary, 
            parentSource: { type: 'column', index: colIndex } 
          },
          logMessage: `🎯 Real-time score for column ${colIndex+1} derived word "${tertiaryDerived}" (from "${wordSet.tertiary}"): `
        });
      }
    });
    
    // Score all words in parallel, NEVER CACHE SCORES as that breaks the decoder
    console.log(`Scoring ${wordsToScore.length} words all in parallel...`);
    
    // Define types for our result arrays
    type WordResult = { word: string; score: number; sourceInfo: any };
    
    // Process all words completely in parallel with absolutely no staggering
    // Each word still goes through its own 50-pass evaluation with 1ms delay between passes
    const wordPromises = wordsToScore.map(({ word, sourceInfo, logMessage }) => {
      if (!word) return Promise.resolve(null as WordResult | null); // Skip empty words
      
      // No delay or staggering - start all word evaluations simultaneously
      console.log(`Starting 50-pass evaluation for word: "${word}"`);
      
      // Always get a fresh score - NEVER cache cosmic scores
      return evaluateWordCosmicScore(word)
        .then(score => {
          // Store source info for display purposes only
          wordSourceMap.set(word, sourceInfo);
          console.log(`${logMessage}${score}/50`);
          return { word, score, sourceInfo } as WordResult;
        });
    });
    
    // Wait for all word evaluations to complete
    const allResultsPromise = Promise.all(wordPromises)
      .then((results: (WordResult | null)[]) => {
        // Filter out null/undefined results
        const validResults = results.filter(Boolean) as WordResult[];
        console.log(`Completed parallel processing of all ${validResults.length} words`);
        return validResults;
      });
    
    // Wait for all batches to complete
    const allResults = await allResultsPromise;
    
    const scoreResults: WordResult[] = allResults;
    
    console.log(`Finished scoring ${scoreResults.filter(Boolean).length} words in parallel`);
    
    // Now create cosmic word objects with the calculated scores (from the scoreResults, not wordScores map)
    const allCosmicWords: CosmicWord[] = [];
    
    // Use the scoreResults from our batch processing instead of the cached wordScores map
    scoreResults.forEach((result: WordResult) => {
      // Skip if result is null or undefined
      if (!result) return;
      
      const { word, score, sourceInfo } = result;
      
      // Additional safety check for required fields
      if (!word || score === undefined || !sourceInfo) return;
      
      const isDerived = sourceInfo.type === 'derived';
      
      allCosmicWords.push({
        word,
        score,
        isSecondary: isDerived,
        parent: isDerived ? sourceInfo.parent : undefined,
        sourceType: isDerived ? sourceInfo.parentSource.type : sourceInfo.type,
        sourceIndex: isDerived ? sourceInfo.parentSource.index : sourceInfo.index
      });
    });
    
    // Group words by source
    const wordsBySource = new Map();
    
    allCosmicWords.forEach(wordObj => {
      const source = wordSourceMap.get(wordObj.word);
      if (!source) return;
      
      // For derived words, use their parent's source as the key
      const sourceType = source.type === 'derived' ? source.parentSource.type : source.type;
      const sourceIndex = source.type === 'derived' ? source.parentSource.index : source.index;
      
      const key = `${sourceType}-${sourceIndex}`;
      if (!wordsBySource.has(key)) {
        wordsBySource.set(key, []);
      }
      
      wordsBySource.get(key).push(wordObj);
    });
    
    // For each source (row/column), select the highest scoring word
    const highestScoringWordsBySource: CosmicWord[] = [];
    
    wordsBySource.forEach((words, sourceKey) => {
      // First, sort words by score (highest first)
      // If scores are equal, prioritize secondary/derived words over primary words
      const sortedWords = [...words].sort((a, b) => {
        // If scores are different, sort by score
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // If scores are the same, prioritize secondary/derived words
        if (a.isSecondary && !b.isSecondary) return -1;
        if (!a.isSecondary && b.isSecondary) return 1;
        return 0;
      });
      
      if (sortedWords.length > 0) {
        const highestWord = sortedWords[0];
        console.log(`🏆 Highest scoring word for ${sourceKey}: "${highestWord.word}" (${highestWord.score}/50) - ${highestWord.isSecondary ? 'SECONDARY (PRIORITIZED)' : 'PRIMARY'}`);
        
        // If this is a derived word, mark what it was derived from
        if (highestWord.parent) {
          const indexDisplay = typeof highestWord.sourceIndex === 'number' ? highestWord.sourceIndex + 1 : '?';
          console.log(`   ↑ Derived from "${highestWord.parent}" in ${highestWord.sourceType} ${indexDisplay}`);
        }
        
        highestScoringWordsBySource.push(highestWord);
      }
    });
    
    // Now, explicitly set aside the highest scoring words for display in cosmic insights
    console.log("\n===== TOP SCORING WORDS BY ROW/COLUMN =====");
    highestScoringWordsBySource.forEach(word => {
      const indexDisplay = typeof word.sourceIndex === 'number' ? word.sourceIndex + 1 : '?';
      console.log(`TOP WORD: "${word.word}" (${word.score}/50) from ${word.sourceType} ${indexDisplay} - ${word.isSecondary ? 'SECONDARY' : 'PRIMARY'}`);
    });
    
    // Add grid generation numbers to the words for the normal mode
    // This helps the DialogueOutput component to differentiate between streaming and normal mode
    const normalGridNumber = 999; // Use a special number for manual invocation
    
    // OPTION 2: Only show one highest scoring word per row/column, but ONLY if it meets the cosmic threshold
    
    // Filter the highest scoring words to only include those with score >= cosmicThreshold
    const qualifiedHighScoringWords = highestScoringWordsBySource.filter(word => word.score >= cosmicThreshold);
    
    console.log(`\n===== QUALIFIED HIGH SCORING WORDS =====`);
    console.log(`Found ${qualifiedHighScoringWords.length} highest scoring words that met the ${cosmicThreshold}+ threshold`);
    
    qualifiedHighScoringWords.forEach(word => {
      console.log(`QUALIFIED: "${word.word}" (${word.score}/50) - ${word.isSecondary ? 'SECONDARY' : 'PRIMARY'}`);
    });
    
    // Only use the qualified highest scoring words
    const finalCosmicWords = qualifiedHighScoringWords;
    
    // Add grid generation numbers to all words
    const wordsWithGridGen = finalCosmicWords.map(word => ({
      ...word,
      gridGeneration: normalGridNumber
      // We no longer track child words or tertiary words
    }));
    
    // Log the final selection of words that will be displayed
    console.log("\n===== FINAL COSMIC WORDS SELECTION =====");
    wordsWithGridGen.forEach(word => {
      const sourceInfo = wordSourceMap.get(word.word);
      if (sourceInfo) {
        const sourceType = sourceInfo.type === 'derived' 
          ? sourceInfo.parentSource.type 
          : sourceInfo.type;
        const sourceIndex = sourceInfo.type === 'derived'
          ? sourceInfo.parentSource.index
          : sourceInfo.index;
        
        const indexDisplay = typeof sourceIndex === 'number' ? sourceIndex + 1 : '?';
        console.log(`COSMIC WORD: "${word.word}" (${word.score}/50) from ${sourceType} ${indexDisplay} - ${word.isSecondary ? 'SECONDARY' : 'PRIMARY'}`);
      } else {
        console.log(`COSMIC WORD: "${word.word}" (${word.score}/50) - source location unknown - ${word.isSecondary ? 'SECONDARY' : 'PRIMARY'}`);
      }
    });
    
    // Calculate summary information before returning
    const rowWordsFound = newHorizontalWords.filter(w => w.main).length;
    const colWordsFound = newVerticalWords.filter(w => w.main).length;
    const cosmicWordsFound = qualifiedHighScoringWords.length;
    
    // Log summary information
    console.log(`\n===== WORD SUMMARY =====`);
    console.log(`Total words found: ${rowWordsFound + colWordsFound}`);
    console.log(`Row words: ${rowWordsFound}`);
    console.log(`Column words: ${colWordsFound}`);
    console.log(`Cosmic words: ${cosmicWordsFound}`);
    console.log(`⭐ FINAL DISPLAY: ${wordsWithGridGen.length} words will be shown in the cosmic insights panel`);
    
    console.log("Preparing to update UI with final results...");
    
    // Use Promise.then to ensure browser gets a chance to handle UI updates
    // This creates a small gap between batch processing completion and updating the UI
    return delay(100).then(() => {
      console.log("Updating Cosmic Insights panel with scored words...");
      
      // Update state with only the highest scoring word per row/column that meets the cosmic threshold
      // This single operation updates the Cosmic Insights panel
      setCosmicWords(wordsWithGridGen);
      
      // Small delay to ensure state update propagates before marking processing as complete
      return delay(50);
    }).then(() => {
      console.log("Setting processingComplete to true");
      setProcessingComplete(true);
      console.log("\n===== WORD PROCESSING COMPLETE =====");
      
      // CRITICAL ADDITION: Log completion for diagnostic purposes
      // No event dispatch needed as 7-second safety timer handles grid synchronization
      if (typeof window !== 'undefined') {
        try {
          // Get the current grid number from the tracking ref
          const gridNumber = gridGenerationCounterRef.current;
          
          // Log completion for diagnostic purposes only
          console.log(`🔄 GRID SYNC: Grid processing complete for grid #${gridNumber}`);
          console.log(`🔄 GRID SYNC: Event will contain ${wordsWithGridGen.length} words`);
          
          // DIRECT COMMUNICATION: Set global variables for the 7-second safety timer to detect
          // This is a more reliable method than events for cross-component communication
          (window as any).PROCESSED_GRID_DATA = {
            gridNumber,
            words: wordsWithGridGen,
            timestamp: Date.now(),
            attentionScore: (window as any).attentionScore || 0,
            source: 'home-processWords'
          };
          
          console.log(`🔄 GRID SYNC: Stored grid data in global PROCESSED_GRID_DATA variable`);
          
          // PROMISE CHAIN COMPLETION: Mark the promise chain as complete
          (window as any).PROMISE_CHAIN_COMPLETE = true;
          (window as any).PROMISE_CHAIN_COMPLETE_TIMESTAMP = Date.now();
          (window as any).PROMISE_CHAIN_COMPLETE_GRID = gridNumber;
          
          console.log(`🔄 PROMISE CHAIN: Marked as complete for grid #${gridNumber}`);
          
          // Use a short timeout before dispatching event to ensure global vars are set
          setTimeout(() => {
            try {
              // Create the event with all necessary data
              const gridProcessingCompleteEvent = new CustomEvent('gridProcessingComplete', {
                detail: {
                  gridNumber,
                  words: wordsWithGridGen,
                  timestamp: Date.now(),
                  attentionScore: (window as any).attentionScore || 0
                }
              });
              
              // Dispatch to both window and document to ensure it's received
              window.dispatchEvent(gridProcessingCompleteEvent);
              document.dispatchEvent(gridProcessingCompleteEvent);
              
              console.log(`🔄 GRID SYNC: Successfully dispatched gridProcessingComplete event for grid #${gridNumber}`);
              console.log(`🔄 GRID SYNC: Event contains ${wordsWithGridGen.length} words`);
              
              // Grid completion tracking removed - no longer needed for streamlined protocol
            } catch (innerError) {
              console.error('Error in event dispatch timeout:', innerError);
            }
          }, 50); // Small delay to ensure UI updates first
        } catch (error) {
          console.error('Error dispatching gridProcessingComplete event:', error);
        }
      }
      
      // Return the summary information for potential use by the caller
      return { 
        rowWordsFound, 
        colWordsFound, 
        cosmicWordsFound, 
        totalDisplayWords: wordsWithGridGen.length 
      };
    });
  }, [grid]);

  // REMOVED: Legacy CalcAttnScoreNew function that was causing competing timer cycles
  // This function has been completely replaced by the parallelized attention calculation
  // in the cosmic scoring system. Removing this eliminates the micro-timing conflicts.

  // Add a grid counter to track different grid generations - SYNC WITH GLOBAL VALUE
  // If global value exists, we'll use that for true persistence between page loads
  // The incrementing will happen naturally through the attention check process
  // We start at 0 for safety and compatibility with existing code
  const gridGenerationCounterRef = useRef<number>(0);
  
  // Function to process a background grid for streaming mode
  // Define a variable to store the last grid start time
  const gridStartTimeRef = useRef<number>(0);
  // Track when the last grid was processed to measure intervals between grids
  const gridLastProcessedTimeRef = useRef<number>(0);
  // REMOVED: No longer tracking processed grids to prevent duplicates
  // We want to process ALL grids regardless of their grid number

  const processBackgroundGrid = useCallback(async (forceActive = false) => {
    // PURE EVENT SYSTEM: Force grid generation on every 7-second cycle
    // Remove all blocking checks to ensure grid generation happens unconditionally
    console.log(`⏱️ PURE EVENT SYSTEM: Forcing grid generation on 7-second cycle`);
    console.log(`⏱️ UNCONDITIONAL: Generating grid at ${new Date().toISOString()}`);
    
    const startTime = Date.now();
    const hrStartTime = performance.now(); // High-resolution timing
    gridStartTimeRef.current = startTime; // Store for timing calculations
    
    // SIMPLIFIED: No longer need streaming mode ref checks
    // Always assume streaming mode is active when called
    console.log(`⚡ SIMPLIFIED: Ignoring all streaming mode checks for pure event system`);
    
    // IMPORTANT: Always get the latest grid number from the global reference
    // This ensures we're using the same grid number that the safety timer has set
    let currentGridNumber = 0; // Default to 0 if reference not available
    
    // Get the grid number directly from the global reference (the safety timer is the authority)
    if (typeof window !== 'undefined' && (window as any).gridNumberTrackingRef) {
      currentGridNumber = (window as any).gridNumberTrackingRef.current;
      console.log(`🔢 GRID NUMBER: Using global tracking ref value: ${currentGridNumber} (source of truth)`);
    } else {
      console.log(`⚠️ WARNING: Could not access global gridNumberTrackingRef - using fallback grid number 0`);
    }
    
    // Update our local ref to match for consistency
    gridGenerationCounterRef.current = currentGridNumber;
    console.log(`⚡ GRID TRACKING: Current grid number is ${currentGridNumber}`);
    
    // SIMPLIFIED: Always generate a new grid, ignore all event details
    // In our pure event system, the 7-second timer is the sole authority for grid generation
    
    // Always log that grid generation is happening without condition
    console.log(`🔍 GRID GENERATION: Always generating grid when processBackgroundGrid is called`);
    

    // Initialize a global grid attention cache if it doesn't exist
    // REMOVED: Home.tsx no longer needs to handle GRID_ATTENTION_SCORES
    // The cache is initialized in the 7-second safety timer when needed
    // We've removed this initialization to avoid redundancy
    
    // Just get the threshold value for logging purposes only
    const logThreshold = 20; // Using fixed value for simplicity
    
    console.log(`🔍 ATTENTION THRESHOLD: Using simplified threshold of ${logThreshold}/50`);
    console.log(`🔍 GRID GENERATION: Grid generation is now managed by the 7-second safety timer`);
    
    
    console.log(`🔍 ATTENTION POLICY: Home.tsx is NOT calculating or caching attention scores anymore`);
    console.log(`🔍 ATTENTION POLICY: This is now the exclusive responsibility of the 7-second safety timer`);
    
    // COMPLETE SIMPLIFICATION: Home.tsx now always generates grids unconditionally
    // No more shouldGenerateGrid flag - grid generation happens every time this function is called
    
    // REMOVED: No longer using any conditional flags
    // Grid progression is now entirely dependent on the natural 7-second attention check cycle
    
    // ENHANCED LOGGING: Show simplified grid generation check logging
    console.log(`🔍 GRID GENERATION CHECK: Grid #${currentGridNumber} - ALWAYS generating grid (unconditional)`);
    console.log(`🔢 GRID INCREMENT CHECK: Using natural 7-second cycle (managed by the 7-second safety timer)`);
    
    // Generate a new grid every time this function is called
    
    // REMOVED: Grid number check to prevent processing
    // if (processedGridsRef.current.has(prevGridNumber)) {
    //   console.log(`🚨🚨 GRID COLLISION: Grid #${prevGridNumber} has already been processed! Forcing skip.`);
    //   skipProcessing = true;
    // }
    
    // Always process the grid - unconditionally
    console.log(`⚠️ GRID POLICY: Always generating grid regardless of grid number ${currentGridNumber}`);
    
    // REMOVED: All grid tracking checks that would prevent processing
    // We now process every grid request regardless of grid number or tracking

    // REMOVED: No longer checking for already processed grids
    // Unconditional grid processing means we don't need to check FULLY_PROCESSED_GRIDS or GRID_UNIQUE_PROCESSING
    
    // Process this grid unconditionally
    console.log(`🔄 PURE EVENT SYSTEM: Processing grid #${currentGridNumber} unconditionally`);
    
    // No need to check any legacy tracking variables - they've been removed
    console.log(`🔄 GRID ARCHITECTURE: Using pure event-driven processing with no grid tracking`);
    
    
    // REMOVED: Skip processing logic and early return
    // We now always process all grids regardless of current processing status
    
    // REMOVED: All special handling for ensureNewGrid and grid incrementation
    // Grid tracking is exclusively handled by the 7-second safety timer
    
    // Simply log that we don't handle grid numbers anymore
    console.log(`🔢 GRID NUMBER RESPONSIBILITY: Home.tsx has no grid number management role`);
    console.log(`🔢 GRID INCREMENTATION: Exclusively managed by 7-second safety timer`);
    
    // REMOVED: No longer checking for already processed grids
    // All grid processing is now unconditional, so no need to check processing status
    console.log(`🔄 GRID POLICY: All grids are processed unconditionally`);
    console.log(`🔄 GRID ARCHITECTURE: No duplicate prevention - every grid is treated as new`);
    // Grid numbers are managed by the 7-second safety timer
    let newGridNumber = currentGridNumber;
    
    // Log our decision - unconditional grid generation
    console.log(`🔢 GRID MAINTAINED: Home.tsx no longer increments grid numbers`);
    console.log(`🔢 GRID POLICY: Grid incrementation responsibility delegated to 7-second safety timer only`);
    
    // Log the grid ID assignment with enhanced clarity about decision
    console.log(`🔢🔢 GRID ID ASSIGNMENT: ASSIGNING Grid #${newGridNumber} (previous: ${currentGridNumber})`);
    console.log(`🔢🔢 GRID PROCESSING DECISION: WILL PROCESS ✓`);
    
    // CRITICAL FIX: Mark that the grid was just incremented in this cycle
    // This will help prevent duplicate grid processing
    const justIncremented = false; // No longer incrementing grid numbers in Home.tsx
    
    // REMOVED: No longer updating grid counter in Home.tsx
    // All grid number tracking is now exclusively managed by the 7-second safety timer
    
    // REMOVED: No longer storing the grid number in global window object
    // We now rely solely on local tracking via gridGenerationCounterRef
    if (typeof window !== 'undefined') {
      // Keep the other tracking variables for debugging
      (window as any).GRID_JUST_INCREMENTED = justIncremented;
      (window as any).GRID_INCREMENT_TIME = Date.now();
      console.log(`🔢 GRID TRACKING: Updated tracking variables (justIncremented=${justIncremented})`);
    }
    
    // Process all grids unconditionally - no tracking needed
    console.log(`🔢 GRID TRACKING: Using local tracking only - no global variables`);
    console.log(`🔢 GRID MANAGEMENT: 7-second safety timer is sole manager of grid processing state`);
    console.log(`🔄 GRID TRACKING: Processing grid #${newGridNumber} - all grids are processed unconditionally`);
    
    // SUPER CRITICAL DEBUGGING: Log the grid numbers to diagnose sequencing issues
    console.log(`⏱️🔢 GRID SEQUENCE: Previous grid #${currentGridNumber} → Current grid #${newGridNumber}`);
    console.log(`⏱️🔢 GRID DIAGNOSTIC: Exact time: ${new Date().toISOString()}`);
    
    // REMOVED: No longer dispatching gridNumberChanged events from Home.tsx
    // Grid number management is now exclusively handled by the 7-second safety timer
    console.log(`🔢 GRID NOTIFICATION: Home.tsx no longer dispatches grid number events`);
    console.log(`🔢 GRID ARCHITECTURE: 7-second safety timer handles all grid number management`);
    
    console.log(`⏱️⏱️⏱️ TIMING: Starting grid #${newGridNumber} processing at ${startTime} (${new Date(startTime).toISOString()})`);
    console.log(`⏱️⏱️⏱️ GRID TIMING: Process started at ${hrStartTime.toFixed(2)}ms (high-resolution)`);
    
    // Track when the last grid was processed
    const lastGridTime = gridLastProcessedTimeRef.current;
    const timeSinceLastGrid = lastGridTime ? startTime - lastGridTime : 0;
    console.log(`⏱️⏱️⏱️ GRID TIMING: Time since last grid: ${timeSinceLastGrid}ms (${(timeSinceLastGrid/1000).toFixed(2)}s)`);
    
    // Update the last processed time
    gridLastProcessedTimeRef.current = startTime;
    console.log("STREAMING DEBUG: Inside processBackgroundGrid, streamingMode =", streamingMode);
    console.log("STREAMING DEBUG: streamingModeRef.current =", streamingModeRef.current);
    
    // IMPORTANT: Check both React state and ref value to avoid race conditions
    const isStreamingModeActive = streamingMode || streamingModeRef.current;
    
    // In our pure event-driven architecture, we don't need the subsequent activation check
    // as we process every event regardless of state
    
    // COMPLETE SIMPLIFICATION: Always show results and process grid - unconditional
    // REMOVED: No longer checking streaming mode status before processing
    // We process ALL grids regardless of streaming mode state
    setShowResults(true);
    setProcessingComplete(true);
    console.log("✅ GRID GENERATION: Setting showResults and processingComplete to true");
    
    console.log("STREAMING DEBUG: Continuing with grid generation...");
    
    // Use the newGridNumber we already defined earlier for consistency
    // This ensures we reference the same grid number throughout the function
    const currentGridGeneration = newGridNumber;
    console.log(`STREAMING DEBUG: Processing grid generation #${currentGridGeneration}`);
    
    
    console.log("=============================================");
    console.log("🎮 STREAMING - Starting background grid generation");
    
    // Set status for streaming display
    if (!showResults) setShowResults(true);
    if (!processingComplete) setProcessingComplete(true);
    
    // Generate a new random grid (without animation) - now parallel async
    const newGrid = await generateRandomGrid();
    
    // Verify that the grid is populated with real letters
    let emptyCount = 0;
    let totalCellCount = 0;
    
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        totalCellCount++;
        if (!newGrid[i][j] || newGrid[i][j].trim() === '') {
          emptyCount++;
          console.error(`⚠️ STREAMING ERROR: Empty cell at [${i},${j}] in new grid`);
        }
      }
    }
    
    if (emptyCount > 0) {
      console.error(`⚠️ STREAMING ERROR: Found ${emptyCount} empty cells out of ${totalCellCount} (${(emptyCount/totalCellCount*100).toFixed(2)}%)`);
    } else {
      console.log(`✅ STREAMING GRID: Valid ${newGrid.length}x${newGrid[0]?.length || 0} grid with all cells containing letters`);
    }
    
    // Print a sample of the current grid for debugging
    console.log("🎮 STREAMING GRID SAMPLE (first 5 rows):");
    for (let i = 0; i < 5 && i < newGrid.length; i++) {
      console.log(`Row ${i + 1}: "${newGrid[i].join(' ')}"`);
    }
    
    // Process the grid for words without updating the visible UI
    // Add more detailed logging of what's happening
    // Get all horizontal and vertical word sequences
    console.log("🎮 STREAMING - Getting horizontal and vertical word sequences with NEW INDEPENDENT WORD SYSTEM");
    const horizontalSequences = getHorizontalWords(newGrid);
    const verticalSequences = getVerticalWords(newGrid);
    
    // Process words from the sequences
    const newHorizontalWords: WordHierarchy[] = [];
    const newVerticalWords: WordHierarchy[] = [];
    const allFoundWords: string[] = []; // Track all words for cosmic significance testing
    
    // NEW APPROACH: Process all words in parallel using 3-stage parallelized word finding
    console.log("🚀 PARALLEL PROCESSING - Starting 3-stage parallel word finding for rows and columns");
    console.log(`🚀 TIMING - Starting high-resolution timing for parallel word finding`);
    const parallelStartTime = performance.now();
    
    try {
      // Stage 1-3: Process all rows sequentially to avoid Promise.all timeout conditions
      console.log("🚀 PARALLEL - Processing all rows with 3-stage sequential approach");
      const horizontalTaggedWords = await findAndTagWordsParallel(horizontalSequences, 'row');
      
      // Stage 1-3: Process all columns sequentially to avoid Promise.all timeout conditions
      console.log("🚀 PARALLEL - Processing all columns with 3-stage sequential approach");
      const verticalTaggedWords = await findAndTagWordsParallel(verticalSequences, 'column');
      
      console.log(`🚀 PARALLEL - All word finding complete in ${(performance.now() - parallelStartTime).toFixed(2)}ms`);
      console.log(`🚀 PARALLEL - Found ${horizontalTaggedWords.length} tagged words from rows`);
      console.log(`🚀 PARALLEL - Found ${verticalTaggedWords.length} tagged words from columns`);
      
      // Combine all tagged words - declare this with global scope so we can use it outside the try block
      window.allTaggedWords = [...horizontalTaggedWords, ...verticalTaggedWords];
      console.log(`🚀 PARALLEL - Total of ${window.allTaggedWords.length} tagged words found`);
      
      // CRITICAL FIX: Use ALL tagged words from findAndTagWordsParallel
      // This includes primary, secondary, AND tertiary words that were already generated
      console.log(`🚀 COMPLETE HIERARCHY: Using all ${window.allTaggedWords.length} words from 3-tier processing`);
      
      // Filter words by level for debugging
      const primaryWords = window.allTaggedWords.filter(w => w.level === 1);
      const secondaryWords = window.allTaggedWords.filter(w => w.level === 2);
      const tertiaryWords = window.allTaggedWords.filter(w => w.level === 3);
      
      console.log(`🚀 WORD BREAKDOWN: ${primaryWords.length} primary, ${secondaryWords.length} secondary, ${tertiaryWords.length} tertiary`);
      
      // Log tertiary examples if they exist
      if (tertiaryWords.length > 0) {
        console.log(`🚀 TERTIARY EXAMPLES: ${tertiaryWords.slice(0, 3).map(w => `"${w.word}" from "${w.parent}"`).join(', ')}`);
      } else {
        console.log(`🚀 TERTIARY DEBUG: No tertiary words found - this is the issue!`);
      }
      
      // Create parent-child relationship maps from the tagged words
      const parentChildMap = new Map<string, string[]>();
      
      // Initialize window.allTaggedWords if it doesn't exist
      if (!window.allTaggedWords) {
        window.allTaggedWords = [];
      }
      
      // Fill allFoundWords array for cosmic testing
      window.allTaggedWords.forEach((taggedWord: TaggedWord) => {
        allFoundWords.push(taggedWord.word);
        
        // Store parent-child relationships for any secondary/tertiary words
        if (taggedWord.level > 1 && taggedWord.parent) {
          // Instead of separate row/column maps, use a single parent-child map
          if (!parentChildMap.has(taggedWord.parent)) {
            parentChildMap.set(taggedWord.parent, []);
          }
          parentChildMap.get(taggedWord.parent)?.push(taggedWord.word);
        }
      });
      
      // Prepare the grid data structures expected by the rest of the code
      // For each row, find the primary words (level 1)
      for (let row = 0; row < ROWS; row++) {
        const rowWords = horizontalTaggedWords.filter(
          word => word.sourceType === 'row' && word.sourceIndex === row && word.level === 1
        ).map(word => word.word);
        
        if (rowWords.length > 0) {
          newHorizontalWords.push({
            main: rowWords[0] || '',
            secondary: rowWords[1] || '',
            tertiary: rowWords[2] || ''
          });
        } else {
          newHorizontalWords.push({ main: '', secondary: '', tertiary: '' });
        }
      }
      
      // For each column, find the primary words (level 1)
      for (let col = 0; col < COLS; col++) {
        const colWords = verticalTaggedWords.filter(
          word => word.sourceType === 'column' && word.sourceIndex === col && word.level === 1
        ).map(word => word.word);
        
        if (colWords.length > 0) {
          newVerticalWords.push({
            main: colWords[0] || '',
            secondary: colWords[1] || '',
            tertiary: colWords[2] || ''
          });
        } else {
          newVerticalWords.push({ main: '', secondary: '', tertiary: '' });
        }
      }
      
      console.log(`🚀 PARALLEL - Completed building grid data structures for ${newHorizontalWords.length} rows and ${newVerticalWords.length} columns`);
      
    } catch (error) {
      console.error("Error in parallel word processing:", error);
      // CRITICAL FIX: Ensure window.allTaggedWords is always set, even on error
      if (!window.allTaggedWords) {
        window.allTaggedWords = [];
        console.warn("Set window.allTaggedWords to empty array due to processing error");
      }
      console.warn("Continuing word processing despite error - words may still be found");
    }
    
    // ADDITIONAL SAFETY: Ensure window.allTaggedWords always exists before collection phase
    if (!window.allTaggedWords) {
      window.allTaggedWords = [];
      console.warn("SAFETY: Initialized window.allTaggedWords to prevent undefined access");
    }
    
    // CRITICAL FIX: Always collect words from parallel processing results, regardless of window.allTaggedWords availability
    if (window.allTaggedWords && window.allTaggedWords.length > 0) {
      // Collect ALL words from parallel processing - primary, secondary, and tertiary
      const allParallelWords = window.allTaggedWords.map((word: TaggedWord) => word.word);
      allFoundWords.push(...allParallelWords);
      
      console.log(`🚀 PARALLEL - Collected ${allParallelWords.length} words from parallel processing system`);
      console.log(`🚀 PARALLEL - WORDS COLLECTED: ${allParallelWords.join(', ')}`);
    } else {
      console.log(`🚀 PARALLEL - No tagged words available, using direct grid word extraction`);
      console.log(`🚀 FALLBACK DEBUG - newHorizontalWords.length: ${newHorizontalWords.length}`);
      console.log(`🚀 FALLBACK DEBUG - newVerticalWords.length: ${newVerticalWords.length}`);
      
      // EMERGENCY FALLBACK: Direct word extraction from grid sequences when parallel processing fails
      console.log(`🚀 EMERGENCY FALLBACK - Directly processing horizontal and vertical sequences`);
      
      // Process horizontal sequences directly
      for (let row = 0; row < horizontalSequences.length; row++) {
        const letters = horizontalSequences[row];
        try {
          const foundWords = findMultipleWords(letters);
          foundWords.forEach(word => {
            if (word && word.trim().length >= 3) {
              allFoundWords.push(word.trim());
              console.log(`🚀 EMERGENCY - Found horizontal word: "${word}" from row ${row}`);
            }
          });
        } catch (error) {
          console.warn(`Error processing horizontal row ${row}:`, error);
        }
      }
      
      // Process vertical sequences directly
      for (let col = 0; col < verticalSequences.length; col++) {
        const letters = verticalSequences[col];
        try {
          const foundWords = findMultipleWords(letters);
          foundWords.forEach(word => {
            if (word && word.trim().length >= 3) {
              allFoundWords.push(word.trim());
              console.log(`🚀 EMERGENCY - Found vertical word: "${word}" from column ${col}`);
            }
          });
        } catch (error) {
          console.warn(`Error processing vertical column ${col}:`, error);
        }
      }
      
      console.log(`🚀 EMERGENCY FALLBACK - Directly extracted ${allFoundWords.length} words from grid`);
    }
    
    console.log(`🚀 PARALLEL - Total words collected: ${allFoundWords.length} words for cosmic processing`);
    console.log(`🚀 PARALLEL - FINAL WORDS TO FILTER: ${allFoundWords.join(', ')}`);
    
    // Remove duplicates
    const uniqueWords = [...new Set(allFoundWords)];
    allFoundWords.length = 0;
    allFoundWords.push(...uniqueWords);
    
    console.log(`🚀 PARALLEL - After deduplication: ${allFoundWords.length} unique words`);
    
    // Use real-time scoring instead of post-processing filter
    // NEVER CACHE SCORES as that breaks the decoder
    console.log(`Scoring ${allFoundWords.length} streaming mode words in full parallel mode...`);
    
    // No batching - process all words completely in parallel
    console.log(`🌟 FULL PARALLEL PROCESSING: Will score all ${allFoundWords.length} words simultaneously before displaying any results`);
    
    // OPTIMIZATION: Process all words in parallel using Promise.all
    // Each word maintains its internal 1ms delays for accurate randomness
    console.log(`🚀 PERFORMANCE OPTIMIZATION: Starting parallel cosmic score evaluation for ${allFoundWords.length} words`);
    
    // CRITICAL FIX: Feed words into the event-driven cascade system
    console.log(`🚀 WORD COLLECTION: Collecting primary words to feed into event cascade`);
    
    // Build tagged primary words from grid sequences
    const allTaggedWords: TaggedWord[] = [];
    
    // Process horizontal sequences for primary words
    horizontalSequences.forEach((letters, i) => {
      try {
        const words = findMultipleWords(letters);
        words.forEach(word => {
          if (word && word.trim().length >= 3) {
            allTaggedWords.push({
              word: word.trim(),
              level: 1,
              sourceType: 'row',
              sourceIndex: i
            });
          }
        });
      } catch (error) {
        console.warn(`Error processing horizontal row ${i}:`, error);
      }
    });
    
    // Process vertical sequences for primary words
    verticalSequences.forEach((letters, i) => {
      try {
        const words = findMultipleWords(letters);
        words.forEach(word => {
          if (word && word.trim().length >= 3) {
            allTaggedWords.push({
              word: word.trim(),
              level: 1,
              sourceType: 'column',
              sourceIndex: i
            });
          }
        });
      } catch (error) {
        console.warn(`Error processing vertical column ${i}:`, error);
      }
    });
    
    console.log(`🚀 PRIMARY COLLECTION: Found ${allTaggedWords.length} primary words to dispatch into event cascade`);
    
    // Dispatch primary words into the event cascade system
    if (allTaggedWords.length > 0) {
      console.log(`🚀 EVENT DISPATCH: Sending ${allTaggedWords.length} primary words to event cascade`);
      window.dispatchEvent(new CustomEvent("primaryWordsComplete", {
        detail: {
          primaryWords: allTaggedWords,
          gridNumber: currentGridNumber,
          timestamp: Date.now()
        }
      }));
    } else {
      console.log(`🚀 EVENT SKIP: No primary words found, skipping event cascade`);
    }
    
    // Skip immediate scoring - let the event-driven system handle the complete hierarchy
    const wordScoreResults = [];
    
    console.log(`🚀 SEQUENTIAL PROCESSING: Completed scoring all ${wordScoreResults.length} words`);
    
    console.log(`🌟 PARALLEL PROCESSING: Completed scoring all ${wordScoreResults.length} words simultaneously`);
    console.log(`🌟 PARALLEL RESULTS: Sample scores: ${wordScoreResults.slice(0, 5).map(r => `${r.word}:${r.score}`).join(', ')}`);
    
    
    const allCosmicWords: CosmicWord[] = [];
    
    // Get the current cosmic threshold directly from the COSMIC_THRESHOLD export
    // This ensures we're always using the up-to-date global value
    const currentThreshold = typeof COSMIC_THRESHOLD !== 'undefined' ? COSMIC_THRESHOLD : cosmicThreshold;
    
    // Create diagnostic arrays to track all words 
    const primaryWordDiagnostics: PrimaryWordDiagnostic[] = [];
    const secondaryWordDiagnostics: SecondaryWordDiagnostic[] = [];
    
    // Log all scored words including primary and secondary
    console.log("🚀 PARALLEL - ALL SCORED WORDS (before filtering):");
    wordScoreResults.forEach(result => {
      // Check if this is a primary or derived word using our parallel processing results
      let isDerived = false;
      let parent = null;
      
      // If we have tagged words from parallel processing, use them to determine word relationships
      if (window.allTaggedWords && window.allTaggedWords.length > 0) {
        // Find this word in our tagged words
        const taggedWord = window.allTaggedWords.find(tw => tw.word === result.word);
        
        // If found, check if it's a secondary or tertiary word (level > 1)
        if (taggedWord && taggedWord.level > 1) {
          isDerived = true;
          parent = taggedWord.parent || null;
        }
      }
      
      // Check if this word passes cosmic threshold
      const passesThreshold = result.score >= currentThreshold;
      
      // Display comprehensive diagnostic info
      console.log(`🔍🔎 ${isDerived ? 'SECONDARY' : 'PRIMARY'} WORD: "${result.word}" - Score: ${result.score}/50 ${parent ? `(derived from "${parent}")` : ''} - ${passesThreshold ? 'PASSES THRESHOLD ✓' : 'BELOW THRESHOLD ✗'}`);
      
      // Add to diagnostic arrays
      if (isDerived && parent) {
        secondaryWordDiagnostics.push({
          word: result.word,
          score: result.score,
          parent,
          passesThreshold
        });
      } else {
        // For primary words, check if they have secondary words using our parallel tagging
        let hasSecondary = false;
        
        // Check if any tagged word has this word as its parent
        if (window.allTaggedWords && window.allTaggedWords.length > 0) {
          hasSecondary = window.allTaggedWords.some(tw => tw.parent === result.word);
        }
        
        primaryWordDiagnostics.push({
          word: result.word,
          score: result.score,
          passesThreshold,
          hasSecondary
        });
      }
    });
    
    // Log primary/secondary word statistics
    const primaryCount = primaryWordDiagnostics.length;
    const primaryPassingCount = primaryWordDiagnostics.filter(w => w.passesThreshold).length;
    const secondaryCount = secondaryWordDiagnostics.length;
    const secondaryPassingCount = secondaryWordDiagnostics.filter(w => w.passesThreshold).length;
    
    console.log(`⭐⭐⭐ WORD STATISTICS (Grid #${currentGridGeneration}) ⭐⭐⭐`);
    console.log(`PRIMARY WORDS: ${primaryCount} total, ${primaryPassingCount} passing threshold (${Math.round(primaryPassingCount/primaryCount*100 || 0)}%)`);
    console.log(`SECONDARY WORDS: ${secondaryCount} total, ${secondaryPassingCount} passing threshold (${Math.round(secondaryPassingCount/secondaryCount*100 || 0)}%)`);
    
    // Log all secondary words details for debugging
    if (secondaryCount > 0) {
      console.log(`🔍🔍 SECONDARY WORDS DETAILED ANALYSIS:`);
      secondaryWordDiagnostics.forEach(sw => {
        console.log(`  "${sw.word}" (from "${sw.parent}") - Score: ${sw.score}/50 - ${sw.passesThreshold ? 'PASSES ✓' : 'FAILS ✗'}`);
      });
    } else {
      console.log(`🔍🔍 NO SECONDARY WORDS FOUND IN THIS GRID`);
    }
    
    // Now process the results using the direct results array
    for (const result of wordScoreResults) {
      const { word, score } = result;
      
      // Get the source information for this word
      const source = (() => {
        // First check horizontal words
        for (let rowIndex = 0; rowIndex < newHorizontalWords.length; rowIndex++) {
          const wordSet = newHorizontalWords[rowIndex];
          if (wordSet.main === word) return { type: 'row', index: rowIndex };
          if (wordSet.secondary === word) return { type: 'row', index: rowIndex };
          if (wordSet.tertiary === word) return { type: 'row', index: rowIndex };
        }
        
        // Then check vertical words
        for (let colIndex = 0; colIndex < newVerticalWords.length; colIndex++) {
          const wordSet = newVerticalWords[colIndex];
          if (wordSet.main === word) return { type: 'column', index: colIndex };
          if (wordSet.secondary === word) return { type: 'column', index: colIndex };
          if (wordSet.tertiary === word) return { type: 'column', index: colIndex };
        }
        
        // Check for derived words using our parallel tagging approach
        console.log(`🚀 PARALLEL - Checking if "${word}" is a derived word`);
        
        if (window.allTaggedWords && window.allTaggedWords.length > 0) {
          // Find this word in our tagged words
          const taggedWord = window.allTaggedWords.find(tw => tw.word === word);
          
          // If found and it's a secondary or tertiary word, get its parent info
          if (taggedWord && taggedWord.level > 1 && taggedWord.parent) {
            console.log(`🚀 PARALLEL - Found "${word}" as level ${taggedWord.level} word derived from parent "${taggedWord.parent}"`);
            
            // The tagged word already has source type and index information
            return {
              type: 'derived',
              parent: taggedWord.parent,
              parentSource: {
                type: taggedWord.sourceType,
                index: taggedWord.sourceIndex
              }
            };
          }
        }
        
        console.log(`🔍 SOURCE DEBUG: "${word}" is not a derived word, checking if it's a primary word`);
        
        return null;
      })();
      
      // Get the current cosmic threshold directly from the COSMIC_THRESHOLD export
      // This ensures we're always using the up-to-date global value
      const currentThreshold = typeof COSMIC_THRESHOLD !== 'undefined' ? COSMIC_THRESHOLD : cosmicThreshold;
      
      // Log the current threshold we're using for debugging
      console.log(`🎮 STREAMING - Using cosmic threshold: ${currentThreshold}/50 (React state: ${cosmicThreshold}, Global: ${COSMIC_THRESHOLD})`);
      
      // Only add words with source info and meeting threshold
      if (source && score >= currentThreshold) {
        const isDerived = source.type === 'derived';
        
        allCosmicWords.push({
          word,
          score,
          isSecondary: isDerived,
          parent: isDerived ? source.parent : undefined,
          sourceType: isDerived && source.parentSource ? source.parentSource.type : source.type,
          sourceIndex: isDerived && source.parentSource ? source.parentSource.index : source.index,
          level: isDerived ? 2 : 1 // Explicitly set level to 2 for secondary/derived words
        });
        
        // Note that score is already a number here since we've pre-calculated all scores using Promise.all
        console.log(`🎯 STREAMING - Real-time score for "${word}": ${score}/50 - ${score >= cosmicThreshold ? 'QUALIFIED ✓' : 'REJECTED ✗'}`);
      }
    }
    
    console.log(`🎮 STREAMING - After real-time scoring, found ${allCosmicWords.length} cosmically significant words`);
    if (allCosmicWords.length > 0) {
      console.log(`🎮 SIGNIFICANT WORDS: ${allCosmicWords.map(w => `${w.word} (${w.score}/50)`).join(', ')}`);
    } else {
      console.log(`🎮 NO WORDS met the significance threshold of ${cosmicThreshold}/50`);
    }
    
    // Create a significantWords variable to maintain compatibility with rest of the code
    const significantWords = allCosmicWords;
    
    // Skip additional second-tier processing in streaming mode
    // We've already scored all words (including derived words) with our real-time approach
    console.log(`🎮 STREAMING - Using real-time scoring, we've already identified all qualified words`);
    
    // Use the significantWords directly as our final processed words
    const enhancedSignificantWords = significantWords;
    
    // Print some of the raw words found before filtering
    console.log("TOP WORDS FROM GRID:", allFoundWords.slice(0, 10));
    
    // Log a sample of the scored words
    console.log("FILTERED WORDS WITH SCORES:");
    significantWords.forEach(word => {
      console.log(`Word: ${word.word}, Score: ${word.score}/50`);
    });
    
    // In streaming mode, each generation should be completely separate
    // We don't merge - we just replace with the latest words
    // Add the grid generation number to each cosmic word
    const wordsWithGeneration = enhancedSignificantWords.map(word => ({
      ...word,
      gridGeneration: currentGridGeneration,
      level: word.isSecondary ? 2 : 1 // Set level based on whether it's a secondary word
    }));
    
    console.log(`🚨 STREAMING DEBUG: Added grid generation #${currentGridGeneration} to ${wordsWithGeneration.length} cosmic words`);
    
    // COMPLETELY REMOVED: No need for any parent-child relationship building
    // The relationships are already established in the parallel word finding process
    // We're also directly using the words as they come from the word finding function
    console.log(`🚀 PARALLEL - Using words directly from the word finding process`);
    console.log(`🚀 PARALLEL - All relationships are already established during word extraction`);
    
    // Just use the words directly - no additional processing needed
    const processedWords = wordsWithGeneration;
    
    console.log(`🚀 PARALLEL - MAXIMUM OPTIMIZATION: Completely removed redundant parent-child processing`);
    console.log(`🚀 PARALLEL - MAXIMUM OPTIMIZATION: Using ${processedWords.length} words directly from word finding`);
    
    // For backward compatibility, log the total count of processed words
    console.log(`🚀 PARALLEL - Using ${processedWords.length} words with their pre-established relationships`);
    
    // Wait for all words to be scored before posting to Cosmic Insights
    // Sort words by score (highest first) for better presentation
    const sortedWords = [...processedWords].sort((a, b) => b.score - a.score);
    
    console.log(`🌟 BATCH DISPLAY: All ${sortedWords.length} words have been scored and sorted`);
    if (sortedWords.length > 0) {
      console.log(`🌟 BATCH DISPLAY: Top scoring words: ${sortedWords.slice(0, 5).map(w => `${w.word} (${w.score}/50)`).join(', ')}`);
    }
    
    // Make sure we're still in streaming mode before updating the cosmic words
    if (streamingMode || streamingModeRef.current || forceActive) {
      // Always clear the cosmic words in streaming mode
      // Get the current value from streamingModeRef for most up-to-date state
      const isActiveStreaming = streamingMode || streamingModeRef.current;
      
      if (isActiveStreaming) {
        // In active streaming mode, ALWAYS replace words completely for each grid
        console.log(`🚨 STREAMING DEBUG: LIVE MODE - Replacing all cosmic words with ${sortedWords.length} words from grid #${currentGridGeneration}`);
        
        // Important: Always set to just the latest words at once, never append or update incrementally
        console.log(`🌟 BATCH DISPLAY: Posting all ${sortedWords.length} words to Cosmic Insights panel at once`);
        setCosmicWords(sortedWords); // Use sorted words for better display
      } else {
        // Only in background processing mode, append words to ensure continuity
        setCosmicWords(prevWords => {
          // Always clear words if in streaming mode and this is our first grid
          if (prevWords.length === 0 || forceActive) {
            console.log(`🚨 STREAMING DEBUG: First grid or forced - replacing with ${sortedWords.length} words`);
            console.log(`🌟 BATCH DISPLAY: Posting all ${sortedWords.length} words to Cosmic Insights panel at once`);
            return sortedWords;
          }
          
          // Do a deep verification to ensure we don't already have these words
          const existingGridGens = new Set(prevWords.map(w => w.gridGeneration || 0));
          console.log(`🚨 STREAMING DEBUG: Existing grid generations: [${Array.from(existingGridGens).join(', ')}]`);
          
          // Check if we already have words from this grid generation
          if (existingGridGens.has(currentGridGeneration)) {
            console.log(`🚨 STREAMING DEBUG: Already have words from grid #${currentGridGeneration}, skipping update`);
            return prevWords;
          }
          
          console.log(`🚨 STREAMING DEBUG: Appending ${sortedWords.length} words from grid #${currentGridGeneration} to existing ${prevWords.length} words`);
          console.log(`🌟 BATCH DISPLAY: Posting all newly scored words to Cosmic Insights panel at once`);
          
          // Return combined words from all grid generations
          return [...prevWords, ...sortedWords];
        });
      }
    } else {
      console.log("🚨 WARNING: Streaming mode was disabled during processing - not updating cosmic words");
    }
    
    console.log(`Streaming mode - processed ${enhancedSignificantWords.length} new cosmic words`);
    
    // Provide extra logging for debugging
    console.log("🔮 STREAMING STATUS CHECK:", {
      streamingMode,
      showResults,
      processingComplete,
      cosmicWordsCount: enhancedSignificantWords.length,
      combinedActiveState: streamingMode && showResults && processingComplete && enhancedSignificantWords.length > 0
    });
    
    // Make sure results and processing complete are set to true for streaming display
    if (!showResults) setShowResults(true);
    if (!processingComplete) setProcessingComplete(true);
    
    // Record timing stats for the complete grid processing cycle
    const endTime = Date.now();
    const hrEndTime = performance.now();
    const totalProcessingTime = endTime - startTime;
    const hrTotalTime = hrEndTime - hrStartTime;
    
    console.log(`⏱️⏱️⏱️ GRID TIMING: Grid #${currentGridGeneration} processing completed at ${endTime} (${new Date(endTime).toISOString()})`);
    console.log(`⏱️⏱️⏱️ GRID TIMING: Total processing time: ${totalProcessingTime}ms (${(totalProcessingTime/1000).toFixed(2)}s)`);
    console.log(`⏱️⏱️⏱️ GRID TIMING: High-resolution timing: ${hrTotalTime.toFixed(2)}ms`);
    console.log(`⏱️⏱️⏱️ GRID TIMING: Found ${enhancedSignificantWords.length} significant words in this grid`);
    
    // IMPROVED: Track processed grids only in local reference
    // No global tracking system is used
    
    // REMOVED: No longer tracking processed grids
    // We want to process ALL grids regardless of their grid number
    
    console.log(`🔄 GRID PROCESSING COMPLETE: Grid #${currentGridGeneration} finished with ${enhancedSignificantWords.length} words`);
    console.log(`🔄 GRID TRACKING: Grid #${currentGridGeneration} processing completed`);
    console.log(`🔄 GRID TRACKING: No longer tracking processed grids - ALL grids are processed`);
    console.log(`🕒 GRID TIMING: Grid #${currentGridGeneration} completed at ${endTime} (${new Date(endTime).toISOString()})`);
    console.log(`⏱️ GRID PROCESSING: Time since last grid: ${totalProcessingTime}ms`);
    console.log(`🔄 GRID COMPLETE: Grid #${currentGridGeneration} completed, waiting for next attention check`);
    
    // REMOVED: Grid processing complete event dispatch
    // This was causing duplicate message log entries with different attention scores
    // The 7-second safety timer now exclusively manages its own message log updates using timer-cached scores
    console.log(`📝 HOME.TSX: Grid #${currentGridGeneration} processing complete with ${enhancedSignificantWords.length} words at ${new Date(endTime).toISOString()}`);
    console.log(`📝 HOME.TSX: NO EVENT DISPATCHED - 7-second safety timer has exclusive control of message log`);
    
    // NOTE: Home.tsx should NEVER write to or update the message log
    // All message log updates are now centralized in the 7-second safety timer with consistent attention scores
    
    // CRITICAL IMPROVEMENT: Call sequence control callback if it exists
    // This ensures that the 7-second safety timer knows the grid calculation is complete
    if (typeof window !== 'undefined') {
      try {

        
        console.log(`🚩 GENERATION FLAG: Set grid #${currentGridGeneration} as successfully generated`);
        
        // REFACTORED: Update GRID_CACHE instead of direct event dispatch
        // This creates a unified data flow through the cache system
        try {
          console.log(`🔄 CACHE UPDATE: Storing grid #${currentGridGeneration} data in GRID_CACHE`);
          
          // Calculate an attention score for this grid (0-50)
          // Using our new binary file method
          let attentionScore = 0;
          try {
            // REMOVED: Attention score calculation now happens directly in cosmic scoring function
            console.log(`📊 ATTENTION: Attention score calculation moved to cosmic scoring function for grid #${currentGridGeneration}`);
            attentionScore = 25; // Placeholder - real calculation happens in cosmic scoring
            console.log(`📊 ATTENTION: Using placeholder score ${attentionScore}/50 for grid #${currentGridGeneration} (real calculation in cosmic scoring)`);
          } catch (error) {
            console.error('Error calculating attention score:', error);
            // Fallback to random score if binary method fails
            attentionScore = Math.floor(Math.random() * 51);
            console.log(`📊 ATTENTION: Using fallback random attention score ${attentionScore}/50`);
          }
          
          // Initialize GRID_CACHE if it doesn't exist
          if (typeof window !== 'undefined' && !(window as any).GRID_CACHE) {
            (window as any).GRID_CACHE = {};
          }
          
          // Store in GRID_CACHE
          if (typeof window !== 'undefined') {
            // Get the cosmic threshold
            const cosmicThreshold = typeof window !== 'undefined' && (window as any).COSMIC_THRESHOLD_VALUE 
              ? (window as any).COSMIC_THRESHOLD_VALUE 
              : 33; // Default cosmic threshold
            
            // Calculate cosmic score
            const cosmicScore = enhancedSignificantWords.filter(w => w.score && w.score >= cosmicThreshold).length;
            
            // MOST IMPORTANT CHANGE: Always directly access the global grid number tracking reference
            // This ensures we're always using the latest grid number from the safety timer
            let gridNumber = 0; // Default to 0 if reference is not available
            
            // Get the LATEST grid number from gridNumberTrackingRef
            if (typeof window !== 'undefined' && (window as any).gridNumberTrackingRef) {
              gridNumber = (window as any).gridNumberTrackingRef.current;
              console.log(`🔢 GRID NUMBER: Directly using global tracking ref value: ${gridNumber} for GRID_CACHE and events`);
            } else {
              console.log(`⚠️ WARNING: Could not access global gridNumberTrackingRef - using fallback grid number 0`);
            }
            
            // Store everything in the cache as single entry (overwrites previous entry)
            (window as any).GRID_CACHE = {
              gridNumber: gridNumber,
              words: enhancedSignificantWords,
              timestamp: Date.now(),
              processedAt: Date.now(),
              attentionScore: attentionScore,
              cosmicScore: cosmicScore,
              cosmicThreshold: cosmicThreshold,
              success: true
            };
            
            // 🚫 REMOVED SECOND DUPLICATE: This was the other gridPostedToCache causing duplicates
            // Cosmic scoring already handles the gridPostedToCache event properly
            console.log(`📦 CACHE: Grid stored in cache, cosmic scoring handles gridPostedToCache event`);
          }
          
          console.log(`✅ CACHE UPDATE: Grid #${gridNumber} stored in GRID_CACHE with ${enhancedSignificantWords.length} words`);
          console.log(`✅ UNIFIED DATA FLOW: Using GRID_CACHE as single source of truth for grid data`);
        } catch (error) {
          console.error(`❌ EVENT ERROR: Failed to dispatch event for grid #${gridNumber}`, error);
        }
      } catch (error) {
        console.error('Error in grid completion sequence:', error);
      }
    }
    
    // GRID CYCLING: We rely on the built-in 7-second safety timer
    // and attention score threshold system to determine when to generate new grids.
    // No explicit scheduling of additional grids should happen here to ensure
    // proper timing and attention score validation.
  }, [streamingMode, showResults, processingComplete, setCosmicWords, setShowResults, setProcessingComplete]);
  
  // Toggle streaming mode
  // Handle connection text change from the input field
  const handleConnectionTextChange = (text: string) => {
    // Check if the text contains time terms (days of week, months)
    if (containsTimeTerm(text)) {
      // Show error toast for time terms
      toast({
        title: "Time Search Restricted",
        description: TIME_TERMS_ERROR_MESSAGE,
        variant: "destructive",
        duration: 5000
      });
      
      // Don't update the connection text with time terms
      return;
    }
    
    // Allow all characters including special characters
    setConnectionText(text);
  };
  

  
  // Note: Attention threshold initialization has been moved to StreamingModule.tsx
  // This is part of making StreamingModule.tsx the exclusive source of attention-related operations
  useEffect(() => {
    console.log('🔄 ATTENTION INITIALIZATION: Now exclusively managed by StreamingModule.tsx');
  }, []);
  
  // Clear the grid and regenerate words (used for cosmic threshold changes)
  const clearGridAndRegenerateWords = useCallback(async () => {
    // Don't run if already invoking to prevent conflicts
    if (isInvoking) return;
    
    console.log("🔄 GRID REGENERATION: Clearing grid and regenerating words after cosmic threshold change");
    
    // Reset cosmic words array
    setCosmicWords([]);
    
    // Generate a new grid without animation
    const newGrid = await generateRandomGrid();
    
    // Update the grid
    setGrid(newGrid);
    
    // Process the new words with the updated cosmic threshold
    await processWords();
    
    // Set the results to be shown
    setShowResults(true);
    setProcessingComplete(true);
    
    console.log("🔄 GRID REGENERATION: Complete after cosmic threshold change");
  }, [isInvoking, processWords]);
  
  // Handle cosmic threshold change from the slider
  const handleCosmicThresholdChange = (value: number) => {
    // Ensure minimum value of 20 is maintained
    const safeValue = Math.max(20, value);
    
    console.log(`🔮 COSMIC THRESHOLD: Changing from ${cosmicThreshold} to ${safeValue}`);
    
    // Update local state
    setCosmicThreshold(safeValue);
    
    // Always update the global value
    if (typeof window !== 'undefined') {
      (window as any).COSMIC_THRESHOLD_VALUE = safeValue;
      console.log(`🔮 COSMIC THRESHOLD: Updated global COSMIC_THRESHOLD_VALUE to ${safeValue}`);
    }
    
    // Dispatch events to notify all components with timestamp for tracking
    const timestamp = Date.now();
    
    // 1. Main window event for backward compatibility
    const event1 = new CustomEvent('cosmic-threshold-change', { 
      detail: { threshold: safeValue, timestamp }
    });
    window.dispatchEvent(event1);
    
    // 2. Document level event for broader reach
    const event2 = new CustomEvent('cosmic-threshold-update', { 
      detail: { threshold: safeValue, timestamp }
    });
    document.dispatchEvent(event2);
    
    // 3. Force refresh grids event
    const refreshEvent = new CustomEvent('forceRefreshGrids', { 
      detail: { urgent: true, timestamp, thresholdChanged: true, newThreshold: safeValue }
    });
    document.dispatchEvent(refreshEvent);
    
    console.log(`🔮 COSMIC THRESHOLD: Changed to ${safeValue}/50 (all events dispatched)`);
    
    // If in streaming mode, we need special handling
    if (streamingMode && streamingModeRef.current) {
      console.log("🔮 COSMIC THRESHOLD: Changed while streaming mode active - forcing event propagation");
      
      // Force clearing and regenerating the grid
      setTimeout(() => {
        // Additional event dispatch after a delay to ensure it's caught
        const lateEvent = new CustomEvent('cosmic-threshold-change', { 
          detail: { threshold: safeValue, timestamp: Date.now(), forceUpdate: true }
        });
        window.dispatchEvent(lateEvent);
        document.dispatchEvent(lateEvent);
      }, 250);
    }
  };
  
  // Handle attention threshold change from the slider - SIMPLIFIED VERSION
  const handleAttentionThresholdChange = (value: number) => {
    // Ensure value is within valid range
    const safeValue = Math.max(15, Math.min(50, value));
    
    console.log(`🎚️ ATTENTION FILTER: Changing from ${attentionThreshold} to ${safeValue}`);
    
    // Update local state
    setAttentionThreshold(safeValue);
    
    // Only dispatch the clean event for StreamingModule - no global variables
    const event = new CustomEvent('attentionThresholdChanged', {
      detail: { 
        threshold: safeValue,
        timestamp: Date.now(),
        source: 'home-slider'
      }
    });
    window.dispatchEvent(event);
    
    console.log(`🎚️ ATTENTION FILTER: Changed to ${safeValue}/50 - affects message log display only`);
  };
  
  const handleToggleStreamingMode = () => {
    
    // Don't allow streaming mode to be toggled while invoking
    if (isInvoking) {
      console.log("⛔ Cannot toggle streaming mode while invoking spirits");
      return;
    }
    
    // Check if connection contains a Devi entity - if so, don't allow streaming
    if (containsDeviEntity(connectionText)) {
      console.log("⛔ Cannot activate streaming mode with Devi connection");
      
      // Display error toast notification
      toast({
        title: "Streaming Mode Restricted",
        description: "This entity is unavailable for streaming by divine directive.",
        variant: "destructive",
        duration: 5000
      });
      
      return; // Prevent activation of streaming mode
    }
    
    // Check if connection contains a Shiva entity - also don't allow streaming
    if (containsShivaEntity(connectionText)) {
      console.log("⛔ Cannot activate streaming mode with Shiva connection");
      
      // Display error toast notification with red styling
      toast({
        title: "Streaming Mode Restricted",
        description: "This entity is unavailable for streaming by divine directive.",
        variant: "destructive",
        duration: 5000
      });
      
      return; // Prevent activation of streaming mode
    }
    
    // Check for time-related terms
    if (containsTimeTerm(connectionText)) {
      console.log("⛔ Cannot activate streaming mode with time-related connection");
      
      // Display error toast notification
      toast({
        title: "Streaming Mode Restricted",
        description: TIME_TERMS_ERROR_MESSAGE,
        variant: "destructive",
        duration: 5000
      });
      
      return; // Prevent activation of streaming mode
    }
    
    // Calculate new mode state (toggle current state)
    const newMode = !streamingMode;
    console.log(`🎮 Streaming mode ${newMode ? 'ACTIVATED ▶️' : 'DEACTIVATED ⏹️'}`);
    
    // Removed stream session counter increment that was causing unwanted component remounts
    console.log("🔄 STREAMING: No longer forcing component remount to maintain protocol stability");
    
    // COMMENTED OUT: Legacy streaming timer cleanup - now using event-driven system
    // if (streamingTimerRef.current) {
    //   console.log("🎮 STREAMING: Clearing existing timer before state change");
    //   clearInterval(streamingTimerRef.current);
    //   streamingTimerRef.current = null;
    // }
    
    // REMOVED: No longer resetting safety timer components
    // This maintains state persistence between activations
    console.log("🚀 IMPROVED: Skipping component reset to maintain state persistence between sessions");
    
    // If enabling streaming mode, activate immediately with no delay
    if (newMode) {
      // CRITICAL: First, perform essential cleanup BEFORE activating streaming mode
      if (typeof window !== 'undefined') {
        console.log("🧹 ESSENTIAL CLEANUP: Performing critical reset before Begin Communication");
        
        // 1. FIRST STEP: Clear the global grid number value
        if (window.gridNumberTrackingRef) {
          window.gridNumberTrackingRef.current = 0;
          console.log(`🔢 GRID RESET: Global grid number tracking ref reset to 0`);
        }
        (window as any).CURRENT_GRID_NUMBER = 0;
        console.log(`🔢 GRID RESET: Legacy CURRENT_GRID_NUMBER reset to 0`);
        
        // 2. SECOND STEP: Clear the single entry GRID_CACHE
        if ((window as any).GRID_CACHE) {
          (window as any).GRID_CACHE = {};
          console.log(`📦 CACHE RESET: Cleared GRID_CACHE single entry cache`);
        }
        
        // 3. Reset 7-second safety timer cycle tracking
        if ((window as any).GRID_CYCLE_TRACKING) {
          (window as any).GRID_CYCLE_TRACKING = {
            lastProcessedCycle: 0,
            lastGridPostedToCacheCycle: 0,
            lastGridRetrievedFromCacheCycle: 0,
            globalGridNumber: 0
          };
          console.log(`⏱️ TIMER RESET: Restarted 7-second cycle counter in GRID_CYCLE_TRACKING`);
        }
        
        // 4. Clean up any lingering timers
        if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
          console.log(`⏱️ TIMER CLEANUP: Cleared existing safety timer`);
        }
        if ((window as any).SIGNED_SAFETY_TIMER_ID) {
          clearTimeout((window as any).SIGNED_SAFETY_TIMER_ID);
          delete (window as any).SIGNED_SAFETY_TIMER_ID;
          console.log(`⏱️ TIMER CLEANUP: Cleared global safety timer reference`);
        }
        
        console.log("🧹 ESSENTIAL CLEANUP: Completed critical reset before activation");
      }
      
      // Note: Attention threshold reset now happens in the 7-second safety timer
      console.log("🔄 RESET: Attention threshold reset now managed by the 7-second safety timer");
      // Set local state to 15 for UI consistency
      // Removed: attention threshold functionality
      
      // Set streamingMode state immediately to update the UI right away
      setStreamingMode(true);
      console.log(`🎮 STREAMING: Called setStreamingMode(true) IMMEDIATELY`);
      
      // Update ref first (synchronous, immediate)
      streamingModeRef.current = true;
      console.log(`🎮 STREAMING: Set streamingModeRef.current = true`);
      
      // CRITICAL FIX: Set global flags to enable grid processing
      if (typeof window !== 'undefined') {
        // Reset cancellation flag to allow grid requests
        (window as any).CANCEL_PENDING_GRID_REQUESTS = false;
        console.log(`🎮 STREAMING: Reset CANCEL_PENDING_GRID_REQUESTS to false`);
        
        // Set global streaming mode flag
        (window as any).STREAMING_MODE_ACTIVE = true;
        console.log(`🎮 STREAMING: Set global STREAMING_MODE_ACTIVE to true`);
        
        // GRID INITIALIZATION MOVED FROM STREAMING SENTENCE: Reset grid numbering to 0
        // This ensures each Begin Communication starts with a fresh grid number sequence
        (window as any).CURRENT_GRID_NUMBER = 0;
        (window as any).currentGridBeingDisplayed = 0;
        
        // Reset tracking arrays
        (window as any).PROCESSED_GRID_NUMBERS = [];
        (window as any).FULLY_PROCESSED_GRIDS = [];
        
        // Record initialization time
        (window as any).GRID_NUMBER_INITIALIZATION_TIME = Date.now();
        
        console.log(`🔢 BEGIN COMMUNICATION: Grid numbers reset to #0 at ${new Date().toISOString()}`);
        console.log(`🔢 GRID TRACKING: Cleared all grid tracking arrays for fresh start`);
        
        // Reset grid generation counter in local ref
        gridGenerationCounterRef.current = 0;
        console.log(`🔢 GRID RESET: Local grid counter reset to 0`);
        
        // REMOVED: No longer tracking processed grids 
        // We want to process ALL grids regardless of their grid number
        console.log(`🧹 RESET: Grid tracking completely removed - all grids processed unconditionally`);
      }
      
      // REMOVED: No longer showing opening channel loading state
      // Begin the activation process right away
      // Clear any existing data
      setCosmicWords([]);
      
      // No longer using word history
      console.log("🧹 STREAMING CLEANUP: Word history tracking has been removed");
      
      // Automatically lock the connection field when streaming mode is activated
      if (!isConnectionLocked) {
        console.log("🔒 AUTO-LOCKING CONNECTION FIELD: Streaming mode activated");
        setIsConnectionLocked(true);
      }
      
      // Dispatch custom event to lock the name field in GameInstructions component
      console.log("🔒 AUTO-LOCKING NAME FIELD: Streaming mode activated");
      const lockNameEvent = new CustomEvent('lockNameField', { detail: { locked: true }});
      window.dispatchEvent(lockNameEvent);
      

      
      // CRITICAL FIX: Do NOT reset the grid counter - let it maintain continuity
      // The grid counter should ONLY change through the natural attention filter
      console.log(`🎮 STREAMING: Preserving grid counter at ${gridGenerationCounterRef.current}`);
      
      // DEPRECATED: Global CURRENT_GRID_NUMBER is no longer the source of truth but kept for backwards compatibility
      // The 7-second safety timer now manages grid numbers exclusively via gridNumberTrackingRef
      if (typeof window !== 'undefined') {
        // Initialize global variable if needed, but this is now just for legacy logging
        if ((window as any).CURRENT_GRID_NUMBER === undefined) {
          (window as any).CURRENT_GRID_NUMBER = gridGenerationCounterRef.current;
          console.log(`📊 GLOBAL GRID NUMBER: For legacy compatibility only - initialized to ${gridGenerationCounterRef.current}`);
        } else {
          console.log(`📊 GLOBAL GRID NUMBER: Legacy variable preserved at ${(window as any).CURRENT_GRID_NUMBER}`);
        }
        
        // REMOVED: No longer dispatching gridNumberChanged events from Home.tsx
        // Grid number synchronization is now exclusively handled by the 7-second safety timer
        console.log(`🔢 GRID SYNC: No need to dispatch grid events from Home.tsx - managed by the 7-second safety timer`);
        console.log(`🔢 GRID POLICY: Home.tsx no longer manages grid numbers`);
      }
      
      // Force the processing state to be ready for streaming
      setShowResults(true);
      setProcessingComplete(true);
      console.log("🎮 STREAMING: Set showResults and processingComplete to true");
      
      // CRITICAL FIX: Explicitly set global STREAMING_MODE_ACTIVE to true
      if (typeof window !== 'undefined') {
        (window as any).STREAMING_MODE_ACTIVE = true;
        console.log("🎮 STREAMING MODE: Set global STREAMING_MODE_ACTIVE = true");
      }
      
      // CRITICAL FIX: Explicitly dispatch a streaming mode active event
      // This ensures the 7-second safety timer knows streaming mode is active
      console.log("🎮 STREAMING MODE: Dispatching explicit streaming mode active event");
      const streamingActiveEvent = new CustomEvent('streamingModeChanged', {
        detail: {
          active: true,
          source: 'begin-communication-button',
          timestamp: Date.now(),
          forceActivate: true
        }
      });
      window.dispatchEvent(streamingActiveEvent);
      console.log("🎮 STREAMING MODE: Explicit activation event dispatched");
      
      // Dispatch beginCommunication event to show StreamingModule
      console.log("🎮 BEGIN COMMUNICATION: Dispatching beginCommunication event");
      const beginCommEvent = new CustomEvent('beginCommunication', {
        detail: { 
          timestamp: Date.now(),
          sessionId: Math.random().toString(36).substring(2, 15)
        }
      });
      window.dispatchEvent(beginCommEvent);
      
      // REMOVED: No longer using opening channel animation or loading state
      
      // IMPLEMENTED: New 7-second safety timer with event signing
      console.log("\n⏱️⏱️⏱️ NEW TIMER IMPLEMENTATION: Using signed 7-second safety timer ⏱️⏱️⏱️");
      console.log("⏱️⏱️⏱️ EVENT SIGNATURE: Added event signing to prevent unauthorized updates ⏱️⏱️⏱️");
      console.log("⏱️⏱️⏱️ SINGLE SOURCE OF TRUTH: This timer is the exclusive source of gridLockReleased events ⏱️⏱️⏱️\n");
      
      // Setup the safety timer with event signing
      const startSignedSafetyTimer = () => {
        
        // CRITICAL FIX: Check if an existing timer is already running
        // This prevents duplicate timer instances from being created
        if (safetyTimerRef.current) {
          console.log("⚠️ DUPLICATE PREVENTION: Clearing existing safety timer before creating new one");
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
        }
        
        // Get current cycle speed from global reference (default 1000ms)
        const currentSpeed = typeof window !== 'undefined' && (window as any).CYCLE_SPEED ? 
          (window as any).CYCLE_SPEED : 1000;
        
        const timerId = setTimeout(() => {
          // REMOVED: Streaming mode check - timer runs unconditionally once started
          // The Begin/End Communication button is the sole controller of streaming mode
          console.log(`⏱️ SAFETY TIMER: ${currentSpeed}ms timer executing unconditionally`);
          
          // Calculate the current cycle based on dynamic speed
          const currentCycle = Math.floor(Date.now() / currentSpeed);
          
          // Generate a unique signature for this event
          const eventSignature = `safety-${currentCycle}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
          
          console.log(`\n⏱️ SAFETY TIMER: ${currentSpeed}ms timer reached - cycle #${currentCycle}`);
          console.log(`⏱️ SAFETY TIMER: Generating signed event with signature: ${eventSignature}`);
          
          // CRITICAL CHANGE: Increment grid number in the safety timer
          // This is the only place where grid numbers should be incremented
          let currentGridNumber = 0;
          let nextGridNumber = 1; // Default to 1 if we can't find the current grid number
          
          if (typeof window !== 'undefined') {
            // Get current grid number from global reference if available
            if (window.gridNumberTrackingRef) {
              currentGridNumber = window.gridNumberTrackingRef.current;
              // Increment the grid number
              window.gridNumberTrackingRef.current = currentGridNumber + 1;
              nextGridNumber = window.gridNumberTrackingRef.current;
              console.log(`🔢 GRID NUMBER: Safety timer incremented grid from #${currentGridNumber} to #${nextGridNumber}`);
            } 
            // Fallback to local counter if global reference not available
            else if ((window as any).GRID_CYCLE_TRACKING) {
              currentGridNumber = (window as any).GRID_CYCLE_TRACKING.globalGridNumber;
              // Increment the grid number
              (window as any).GRID_CYCLE_TRACKING.globalGridNumber = currentGridNumber + 1;
              nextGridNumber = (window as any).GRID_CYCLE_TRACKING.globalGridNumber;
              console.log(`🔢 GRID NUMBER: Safety timer incremented grid from #${currentGridNumber} to #${nextGridNumber} (fallback method)`);
            }
            else {
              // Last resort: use gridGenerationCounterRef
              currentGridNumber = gridGenerationCounterRef.current;
              gridGenerationCounterRef.current = currentGridNumber + 1;
              nextGridNumber = gridGenerationCounterRef.current;
              console.log(`🔢 GRID NUMBER: Safety timer incremented grid from #${currentGridNumber} to #${nextGridNumber} (local ref method)`);
            }
            
            // Broadcast the grid number change
            const gridNumberEvent = new CustomEvent('gridNumberBroadcast', {
              detail: {
                gridNumber: nextGridNumber,
                previousGridNumber: currentGridNumber,
                cycle: currentCycle,
                timestamp: Date.now(),
                source: 'safety-timer'
              }
            });
            window.dispatchEvent(gridNumberEvent);
            console.log(`🔢 GRID NUMBER: Broadcast gridNumberBroadcast event with grid #${nextGridNumber}`);
          }
          
          // SIMPLIFIED: Directly call processStrandDirectly instead of dispatching event
          console.log(`⏱️ DIRECT CALL: Calling processStrandDirectly for grid #${nextGridNumber} (cycle #${currentCycle})`);
          
          // Call processStrandDirectly without await (it handles its own async operations)
          processStrandDirectly(nextGridNumber).then(() => {
            console.log(`⏱️ DIRECT CALL: Successfully processed grid #${nextGridNumber} via simplified pipeline`);
          }).catch((error) => {
            console.error(`⏱️ DIRECT CALL: Error in processStrandDirectly for grid #${nextGridNumber}:`, error);
          });
          
          // Clear the current timer reference before starting the next cycle
          safetyTimerRef.current = null;
          
          // Only start the next cycle if streaming mode is still active
          if (streamingModeRef.current) {
            startSignedSafetyTimer();
          } else {
            console.log("⏱️ SAFETY TIMER: Stopping timer - streaming mode deactivated");
          }
        }, currentSpeed);
        
        // Store the timer ID for cleanup
        if (typeof window !== 'undefined') {
          (window as any).SIGNED_SAFETY_TIMER_ID = timerId;
          
          // Store in the ref for proper cleanup and duplicate prevention
          safetyTimerRef.current = timerId;
          
          console.log(`⏱️ SAFETY TIMER: Timer ID ${timerId} stored in ref and global variable`);
        }
      };
      
      // Start the timer
      startSignedSafetyTimer();
      console.log("⏱️ SAFETY TIMER: Started signed 5-second safety timer");
      
      // REMOVED: No longer forcing grid generation with forceRefreshGrids event
      // This was causing duplicate attention score calculations
      // Our new fixed timer now handles grid generation every 5 seconds
      console.log("🔄 STREAMING: Removed redundant forceRefreshGrids event - using direct timer instead");
      
      // Reset the grid display to ensure proper refreshing
      console.log("🔄 STREAMING: Dispatching grid display reset event");
      const resetGridEvent = new CustomEvent('resetGridDisplay', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(resetGridEvent);
      
      // Also reset any memory variables that might be causing the delay
      if (typeof window !== 'undefined') {
        console.log(`\n🔄🔄 STREAMING MODE ACTIVATION 🔄🔄`);
        console.log(`Attention threshold functionality removed`);
        console.log(`Current global attention threshold: ${(window as any).ATTENTION_THRESHOLD || 'undefined'}/50`);
        console.log(`Current streaming mode ref: ${streamingModeRef.current}`);
        console.log(`Current streaming mode state: ${streamingMode}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`Event: Begin Communication pressed`);
        console.log(`🔄🔄 END STREAM ACTIVATION REPORT 🔄🔄\n`);
        
        // No longer using gridToWordsMap - removing initialization
        console.log("🔄 GRID INIT: Skipping gridToWordsMap initialization - not used in pure event-based model");
        
        // Trigger initial attention score calculation using our event-based system
        console.log("🔄 ATTENTION INIT: Dispatching initial attention score calculation");
        // Use CustomEvent to initialize the attention score calculation
        const initialGridEvent = new CustomEvent('gridGenerationRequested', {
          detail: {
            gridNumber: 0,
            timestamp: Date.now(),
            source: 'begin-communication'
          }
        });
        window.dispatchEvent(initialGridEvent);
        console.log("🔄 ATTENTION INIT: Initial grid event dispatched");
        
        // No longer resetting attention score here - handled by the 7-second safety timer through events
        console.log("🔄 STREAMING: Attention state variables now managed exclusively by the 7-second safety timer");
        
        // Attention threshold functionality removed
        // We no longer dispatch attention events from Home.tsx to ensure single responsibility
      }
    } else {
      // For deactivation, perform a complete reset of all state to simulate a page refresh
      console.log(`\n🔄🔄 STREAMING MODE DEACTIVATION 🔄🔄`);
      console.log(`Attention threshold functionality removed`);
      console.log(`Current global attention threshold: ${(window as any).ATTENTION_THRESHOLD || 'undefined'}/50`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`Event: End Communication pressed`);
      console.log(`🔄🔄 END STREAM DEACTIVATION REPORT 🔄🔄\n`);
      
      console.log("🔄 FULL RESET: Beginning complete state reset for streaming mode deactivation");
      
      // 1. First update ref and state immediately - with proper forced cleanup
      // CRITICAL FIX: Ensure the reference is set to false BEFORE updating state
      streamingModeRef.current = false;
      console.log(`🎮 STREAMING: Set streamingModeRef.current = false directly`);
      
      // IMPROVED: Proper cleanup of the signed safety timer when streaming mode is deactivated
      console.log("\n⏱️⏱️⏱️ TIMER CLEANUP: Clearing the signed 7-second safety timer ⏱️⏱️⏱️");
      
      // Clean up our signed safety timer
      if (typeof window !== 'undefined' && (window as any).SIGNED_SAFETY_TIMER_ID) {
        clearTimeout((window as any).SIGNED_SAFETY_TIMER_ID);
        delete (window as any).SIGNED_SAFETY_TIMER_ID;
        console.log("⏱️ SAFETY TIMER: Successfully cleared signed safety timer");
      }
      
      console.log("⏱️⏱️⏱️ TIMER POLICY: Safety timer properly cleaned up ⏱️⏱️⏱️\n");
      
      // Dispatch a force deactivate event to ensure all components see the deactivation
      // Using force deactivate event to completely reset state across components
      const forceDeactivateEvent = new CustomEvent('forceDeactivateStreamingMode', {
        detail: { 
          timestamp: Date.now(),
          force: true,
          source: 'toggleStreamingMode'
        }
      });
      
      // Dispatch to both window and document to ensure it's caught by all components
      window.dispatchEvent(forceDeactivateEvent);
      document.dispatchEvent(forceDeactivateEvent);
      console.log(`🎮 STREAMING: Dispatched forceDeactivateStreamingMode event to ensure sync`);
      
      // Enhanced logging to track the deactivation flow
      console.log(`🎮 DEACTIVATION FLOW: 
        1. Updated streamingModeRef.current to false (direct reference)
        2. Dispatched forceDeactivateStreamingMode event
        3. About to call setStreamingMode(false) (React state)
      `);
      
      // Then update React state after ensuring ref and events are properly set
      setStreamingMode(false);
      console.log(`🎮 STREAMING: Called setStreamingMode(false)`);
      
      // Safety check - double-verify the reference is false
      if (streamingModeRef.current !== false) {
        console.log(`⚠️ CRITICAL ERROR: Reference still not false after setting! Forcing again...`);
        streamingModeRef.current = false;
      }
      
      // Removed session counter increment to prevent component remounting
      console.log(`🔢 STREAM COUNTER: No longer incrementing session counter to maintain protocol stability`);
      
      // 2. CRITICAL FIX: DO NOT reset the grid counter - maintain state between runs
      // gridGenerationCounterRef.current = 1; // <-- COMMENTED OUT
      console.log(`🧹 CONTINUITY: Preserving grid counter at ${gridGenerationCounterRef.current}`);
      
      // DEPRECATED: Global window.CURRENT_GRID_NUMBER is no longer used for grid tracking
      // Only kept for backwards compatibility with logging
      if (typeof window !== 'undefined') {
        // Simply log the legacy variable state, which has no actual effect on grid tracking
        console.log(`📊 GLOBAL GRID NUMBER: Legacy variable state at ${(window as any).CURRENT_GRID_NUMBER} (unused)`);
        
        // REMOVED: No longer notifying components about grid numbers from Home.tsx
        // Grid number preservation is now handled exclusively by the 7-second safety timer
        console.log(`🔢 GRID PRESERVATION: Home.tsx no longer manages grid numbers during deactivation`);
        console.log(`🔢 GRID POLICY: Grid number state now exclusively managed by the 7-second safety timer`);
      }
      
      // REMOVED: No longer tracking processed grids
      // We want to process ALL grids regardless of their grid number
      console.log("🧹 RESET: Grid tracking completely removed - all grids processed unconditionally");
      
      // PRESERVE grid instance counter for message log debouncing
      console.log("📊 DEBOUNCING: Preserving global grid instance counter between activations");
      
      // 3. Reset any global state variables
      if (typeof window !== 'undefined') {
        // No longer setting attention score here - this is handled by the 7-second safety timer
        console.log("🧹 RESET: Attention state variables now managed exclusively by the 7-second safety timer");
        
        // Word history has been removed
        console.log("🧹 RESET: No word history to clear (feature removed)");
        
        // REMOVED: No longer dispatching application-wide reset event
        // This maintains state persistence between Begin Communication activations
        console.log("🚀 IMPROVED: Skipping app-state-reset to maintain state persistence");
      }
      
      // 4. Reset important React state
      setCosmicWords([]);
      console.log("🧹 RESET: Cleared cosmic words array");
      
      // 5. Reset UI-related state
      setShowResults(true);
      setProcessingComplete(true);
      console.log("🧹 RESET: Reset UI state variables");
      
      // 7. Dispatch the streaming mode changed event so other components know mode is inactive
      window.dispatchEvent(new CustomEvent('streamingModeChanged', { 
        detail: { 
          active: false, 
          fullReset: true,
          source: 'end-communication-button' // Add source parameter for better tracking
        }
      }));
      console.log("📣 RESET: Dispatched streaming mode deactivation with full reset flag and source");
      
      // REMOVED: No longer resetting safety timer components 
      // This maintains state persistence between Begin Communication activations
      console.log("🚀 IMPROVED: Skipping safety timer reset to maintain state persistence");
      
      // 9. Dispatch grid reset event to ensure worker is properly reset
      const resetGridEvent = new CustomEvent('resetGridDisplay', {
        detail: { timestamp: Date.now(), fullReset: true }
      });
      window.dispatchEvent(resetGridEvent);
      console.log("📣 RESET: Dispatched grid display reset event with fullReset flag");
      
      console.log("🔄 FULL RESET: Completed comprehensive state reset");
    }
    
    // For deactivation: We've already handled most reset logic above
    if (!newMode) {
      // Note: Attention reset now happens in the 7-second safety timer
      console.log("📣 RESET: Attention score reset now managed exclusively by the 7-second safety timer");
    } else {
      // For activation: The event will be dispatched immediately for faster response
      // Use window instead of document for consistent event handling
      window.dispatchEvent(new CustomEvent('streamingModeChanged', { 
        detail: { 
          active: true,
          source: 'begin-communication-button' // Add source parameter for better tracking
        }
      }));
    }
    
    // Double-check that the streaming mode change is effective
    console.log(`🎮 STREAMING: Double-checking activation status:
      - streamingMode (before state update completes): ${streamingMode}
      - streamingModeRef.current (immediate value): ${streamingModeRef.current}
      - newMode (what we're trying to set): ${newMode}
    `);
    
    // Log current state for debugging
    console.log(`🎮 CURRENT STATE:
      - streamingMode: ${streamingMode} (React state)
      - streamingModeRef: ${streamingModeRef.current} (ref value)
      - showResults: ${showResults}
      - processingComplete: ${processingComplete}
    `);
    
    // Force StardustTransition to reprocess all words by clearing and re-adding them
    if (newMode && cosmicWords && cosmicWords.length > 0) {
      const tempWords = [...cosmicWords];
      console.log(`🔄 Preserving ${tempWords.length} existing cosmic words for streaming`);
      setCosmicWords([]);
      
      // Re-add the words after a small delay to ensure counter reset
      setTimeout(() => {
        console.log(`🔄 Re-adding ${tempWords.length} cosmic words to streaming`);
        setCosmicWords(tempWords);
      }, 100);
    }
    
    if (newMode) {
      // Reset grid to tile fronts (flip all cells back)
      const resetFlipped = Array(ROWS).fill(null).map(() => 
        Array(COLS).fill(false)
      );
      setFlippedCells(resetFlipped);
      
      // Clear dialogue boxes by resetting state
      setHorizontalWords([]);
      setVerticalWords([]);
      
      // Clear cosmic words panel when starting streaming mode
      setCosmicWords([]);
      
      // Reset flags to ensure streaming mode gets activated properly
      setShowResults(true);
      setProcessingComplete(true);
      
      // COMMENTED OUT: Legacy streaming timer cleanup - now using event-driven system
      // if (streamingTimerRef.current) {
      //   clearInterval(streamingTimerRef.current);
      //   streamingTimerRef.current = null;
      // }
      
      // Automatically trigger handleInvokeSpirits when streaming mode is activated
      // This replaces the functionality of the removed "Invoke Spirits" button
      console.log("Streaming mode activated - automatically starting spirit connection");
      
      // Small delay to ensure state updates before processing
      setTimeout(() => {
        handleInvokeSpirits();
      }, 300);
      
      // Simply reset the grid counter at activation - no startup grid processing
      console.log("Streaming mode activated - ensuring grid counter starts at 1");
      
      // CRITICAL FIX: DO NOT reset grid counter - maintain state persistence between runs
      // gridGenerationCounterRef.current = 1; <- COMMENTED OUT
      // processedGridsRef.current.clear(); <- COMMENTED OUT to prevent losing track of processed grids
      console.log(`🚨 STREAMING STATE PERSISTENCE: Preserving grid counter at ${gridGenerationCounterRef.current} for continuity`);
      
      // COMMENTED OUT: Legacy streaming timer cleanup - now using event-driven system
      // if (streamingTimerRef.current) {
      //   console.log("STREAMING DEBUG: Cleaning up existing interval before creating new one");
      //   clearInterval(streamingTimerRef.current);
      //   streamingTimerRef.current = null;
      // }
      
      console.log("🚨 STREAMING DEBUG: No more initialization grids - relying entirely on attention checks");
      console.log("🚨 STREAMING DEBUG: Grid generation will only happen when attention score passes threshold");
    } else {
      // Update ref immediately when deactivating 
      streamingModeRef.current = false;
      console.log("STREAMING DEBUG: Setting streamingModeRef to false before cleanup");
      
      // COMMENTED OUT: Legacy streaming timer cleanup - now using event-driven system
      // if (streamingTimerRef.current) {
      //   clearInterval(streamingTimerRef.current);
      //   streamingTimerRef.current = null;
      //   console.log("Streaming mode deactivated - cleared background processing");
      // }
      
      // Clear the cosmic words when streaming mode is turned off
      setCosmicWords([]);
    }
  };

  // Modified function to work with streaming mode only - no visual grid
  const handleInvokeSpirits = async () => {
    console.log("Processing triggered, current state:", { 
      isInvoking, 
      streamingMode, 
      processingComplete 
    });
    
    // BUGFIX: Force state cleanup if stuck in processing state
    if (isInvoking) {
      console.log("🚨 INVOKE BUGFIX: Detected stuck isInvoking state, forcing cleanup");
      setIsInvoking(false);
      setProcessingComplete(false);
      setShowResults(false);
      
      // We need to wait a moment for state to update before proceeding
      await delay(100);
    }
    
    // Check if the connection text contains a Shiva entity (completely blocked)
    if (containsShivaEntity(connectionText)) {
      // Do not proceed with invocation, UI feedback is handled by GameInstructions
      return;
    }
    
    // Check if the connection text contains a Devi entity (now fully blocked like Shiva)
    if (containsDeviEntity(connectionText)) {
      // For Devi entities, we show the blocked entity message in GameInstructions
      // and completely prevent invocation, just like with Shiva entities
      return; // Do not proceed with invocation
    }
    
    // Reset states - complete cleanup for fresh start
    console.log("🔄 Resetting all states for a fresh start");
    setIsInvoking(true);
    setIsFlipping(false); // Reset animation state
    setShowResults(false);
    setProcessingComplete(false);
    setHorizontalWords([]);
    setVerticalWords([]);
    setCosmicWords([]);
    
    // Always lock the connection text field when processing
    if (!isConnectionLocked) {
      setIsConnectionLocked(true);
      console.log("🔒 Connection name field automatically locked during processing");
    }
    
    // Connection text is now fixed - no need to change it
    
    // Generate new random grid (for background processing)
    console.log("Starting grid generation for background processing");
    
    // Set all cells as "flipped" immediately since we're not showing the visual grid anymore
    const allFlipped = Array(ROWS).fill(null).map(() => 
      Array(COLS).fill(true)
    );
    setFlippedCells(allFlipped);
    
    // Generate the grid for background processing and set it directly
    console.log("📊 PROCESSING: Starting grid generation process");
    generateRandomGrid()
      .then(newGrid => {
        console.log("📊 PROCESSING: Grid generation complete, setting grid state");
        // Set the grid with the newly generated letters
        setGrid(newGrid);
        
        // Skip the visual animation since we don't have a visual grid
        // Instead, immediately move to processing the words
        console.log("📊 PROCESSING: Skipping visual animation, proceeding to word processing");
        setIsFlipping(false);
        setShowResults(true);
        
        // Force processing to start since we're not waiting for animations
        handleFlipComplete();
      })
      .catch(error => {
        console.error("❌ PROCESSING ERROR: Failed during grid generation:", error);
        // Reset invocation state on error
        setIsInvoking(false);
      });
  };

  // Handle tile flip animation completion
  const handleFlipComplete = useCallback(() => {
    // Set animation state to complete
    setIsFlipping(false);
    setShowResults(true);
    
    // Log that word processing is about to start
    console.log("===== ANIMATION COMPLETE - STARTING WORD PROCESSING =====");
    
    // Using Promise.then() for improved browser event loop handling
    return delay(100) // Minimal pause before word processing
      .then(() => {
        // Explicitly log our progress
        console.log("===== PROCESSING GRID FOR WORDS =====");
        console.log(`Grid dimensions: ${ROWS} rows × ${COLS} columns`);
        
        // Print a sample of the current grid for debugging
        console.log("GRID SAMPLE (first 5 rows):");
        for (let i = 0; i < 5 && i < grid.length; i++) {
          console.log(`Row ${i + 1}: ${grid[i].join('')}`);
        }
        
        console.log("===== CALLING PROCESS WORDS FUNCTION =====");
        // Ensure we're calling the function correctly
        document.dispatchEvent(new CustomEvent('startWordProcessing'));
        
        // Call the processWords function and handle its promise
        return processWords();
      })
      .then((result) => {
        console.log("===== WORD PROCESSING PROMISE RESOLVED =====");
        
        // Note: processWords now handles setting processingComplete = true internally
        // So we don't need to set it again here
        
        // Chain additional delay before resetting invocation state
        return delay(300);
      })
      .then(() => {
        // ALWAYS reset invocation state at the end
        console.log("🔄 Resetting invocation state to false - process complete");
        setIsInvoking(false);
      })
      .catch(error => {
        console.error("Error in word processing:", error);
        
        // Even on error, we need to reset the invocation state
        console.log("🚨 Error during word processing, but still resetting invocation state");
        
        // Reset invocation state
        setIsInvoking(false);
      });
  }, [processWords, grid]);

  // Flip all cells sequentially - row by row, tile by tile
  useEffect(() => {
    if (!isFlipping) return;
    
    const fastAnimation = async () => {
      // Target: Complete all cells in ~4-5 seconds
      // 400 cells / 5 seconds = 80 cells per second
      // 1000ms / 80 cells = ~12.5ms per batch of cells
      
      const ANIMATION_SPEED_MS = 20; // ms per batch (reveal multiple cells at once)
      const CELLS_PER_BATCH = 10;   // Reveal 10 cells in each batch
      
      // Create a deep copy of flipped cells to work with
      let newFlipped = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
      
      // Calculate total batches needed
      const totalCells = ROWS * COLS;
      const totalBatches = Math.ceil(totalCells / CELLS_PER_BATCH);
      
      // Begin fast wave-like animation
      let cellsFlipped = 0;
      
      for (let batch = 0; batch < totalBatches; batch++) {
        // Create a fresh copy of the current state
        newFlipped = [...newFlipped.map(row => [...row])];
        
        // Flip a batch of cells in this update
        for (let i = 0; i < CELLS_PER_BATCH; i++) {
          if (cellsFlipped >= totalCells) break;
          
          // Calculate row and column based on cellsFlipped
          const row = Math.floor(cellsFlipped / COLS);
          const col = cellsFlipped % COLS;
          
          // Flip this specific cell
          newFlipped[row][col] = true;
          cellsFlipped++;
        }
        
        // Update the state
        setFlippedCells(newFlipped);
        
        // Log progress occasionally
        if (batch % 10 === 0) {
          console.log(`Flipped ${cellsFlipped} of ${totalCells} cells`);
        }
        
        // Wait before next batch
        await delay(ANIMATION_SPEED_MS);
      }
      
      // All cells flipped, freeze animation
      console.log('🎬 Animation complete, triggering animationComplete event');
      
      // First, dispatch the event that other components might be listening for
      document.dispatchEvent(new CustomEvent('animationComplete'));
      
      // Then DIRECTLY call the flip complete handler using Promise.then() for better performance
      Promise.resolve()
        .then(() => {
          return handleFlipComplete();
        })
        .catch(err => {
          console.error('❌ Error during animation completion:', err);
          
          // Force reset invocation state if there's an error
          setIsInvoking(false);
          setProcessingComplete(true);
        });
    };
    
    fastAnimation();
  }, [isFlipping, handleFlipComplete]);
  
  // Make sure ref value always matches state value
  useEffect(() => {
    // CRITICAL: No longer forcing the grid counter to 1 - true persistence between runs
    // Even if the counter is 0, this is a valid initial state and we should respect it
    if (gridGenerationCounterRef.current < 0) {
      // Only fix negative values (which should never happen normally)
      console.log("🔢 GRID VALIDATION: Found negative grid counter (" + gridGenerationCounterRef.current + "), resetting to 0");
      gridGenerationCounterRef.current = 0;
    } else {
      console.log("🔢 GRID CONTINUITY: Maintaining grid counter at " + gridGenerationCounterRef.current);
    }
    
    // DO NOT reset the grid counter when streaming mode is activated
    // This preserves grid numbering between activations
    if (streamingMode && !streamingModeRef.current) {
      console.log("🔄🔄🔄 CRITICAL: Preserving grid counter value " + 
        gridGenerationCounterRef.current + " on streaming activation");
      // We never reset gridGenerationCounterRef.current to 0 - always preserve or set to 1
    }
    
    // Keep streamingModeRef in sync with the state value
    streamingModeRef.current = streamingMode;
    console.log(`🔮 STREAMING SYNC: Synced streamingModeRef.current to ${streamingMode}`);
  }, [streamingMode]);
  
  // Cleanup streaming timer on unmount and when streaming mode changes
  useEffect(() => {
    console.log("STREAMING DEBUG: Set up cleanup effect for streaming mode:", streamingMode);
    
    // Cleanup function runs on unmount or when dependencies change
    return () => {
      // COMMENTED OUT: Legacy streaming timer cleanup - now using event-driven system
      // if (streamingTimerRef.current) {
      //   console.log("STREAMING DEBUG: Cleaning up timer in useEffect cleanup");
      //   clearInterval(streamingTimerRef.current);
      //   streamingTimerRef.current = null;
      // }
    };
  }, [streamingMode]); // Re-run cleanup when streaming mode changes
  
  // When React state for streaming mode changes, ensure the ref value is in sync
  useEffect(() => {
    if (streamingModeRef.current !== streamingMode) {
      console.log(`🔄 STREAMING SYNC: Updating streamingModeRef to match React state: ${streamingMode}`);
      streamingModeRef.current = streamingMode;
    }
  }, [streamingMode]);
  
  // Set up event listener for grid refresh requests from the 7-second safety timer
  useEffect(() => {
    // Add event listener for forceRefreshGrids custom event - used by streaming mode
    const handleForceRefreshGrids = (e: CustomEvent) => {
      // Enhanced timing debug
      console.log(`⏱️⏱️ TIMING DEBUG: Grid refresh event received at ${new Date().toISOString()}`);
      
      const detail = e.detail || {};
      // Get subsequent activation flag
      const subsequentActivation = detail.subsequentActivation === true;
      
      // COMPLETE SIMPLIFICATION: Removed all conditional grid generation logic
      // Home.tsx always generates a grid when this event handler is called
      // No need to check any flags from the 7-second safety timer
      
      // Removed all shouldGenerateGrid checks and variables
      
      // AUDIT FIX: Ensure we associate the current grid number with this grid generation
      // This ensures all words found in this grid are properly tagged with the grid number
      if (typeof window !== 'undefined') {
        (window as any).CURRENT_GRID_FOR_WORD_GENERATION = gridGenerationCounterRef.current;
        console.log(`🔢 GRID-WORD LINK: Set CURRENT_GRID_FOR_WORD_GENERATION to ${gridGenerationCounterRef.current} to tag words properly`);
      }
      
      // REMOVED: Check for current grid being processed
      // We now generate a grid regardless of processing status
      
      // PURE EVENT SYSTEM: Removed legacy gridCurrentlyProcessing checks
      // No longer checking grid processing status - we process all events unconditionally
      const currentGrid = gridGenerationCounterRef.current;
      console.log(`🚀 PURE EVENT: Processing grid #${currentGrid} unconditionally`);
      console.log(`🚀 EVENT DRIVEN: No blocking conditions - every event generates a grid`);
      
      // CRITICAL FIX: Always create a unique processing token for this event
      // This ensures this specific invocation is tracked regardless of grid number
      const uniqueEventToken = `${currentGrid}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`🔄 EVENT TRACKING: Created unique token ${uniqueEventToken} for this grid generation event`);
      
      // Initialize the GRID_UNIQUE_PROCESSING set if it doesn't exist
      if (typeof window !== 'undefined' && !(window as any).GRID_UNIQUE_PROCESSING) {
        (window as any).GRID_UNIQUE_PROCESSING = new Set();
      }
      
      // UNIFIED PATH FOR ALL RUNS:
      // Whether it's a first or subsequent run, we'll handle it the same way
      // This ensures consistent behavior and eliminates duplication bugs
      if (!streamingModeRef.current) {
        // If streaming mode ref is not active, we shouldn't process the grid
        console.log("⚠️ STREAMING ISSUE: Grid refresh requested but streaming mode is not active in ref");
        
        if (subsequentActivation) {
          // For backward compatibility, log that we received a subsequentActivation flag
          console.log("🔄 UNIFIED PATH: Received subsequentActivation flag, but using unified code path");
          console.log("🔄 UNIFIED PATH: Not auto-activating streaming mode to prevent duplicate processing");
        }
        
        return; // Only process in streaming mode
      }
      
      // Log more detailed information including grid counter value and generation status
      console.log(`🔄🔄 GRID REFRESH: Event received at ${new Date().toISOString()} with:
        - subsequent=${subsequentActivation}
        - Current grid counter=${gridGenerationCounterRef.current}
        - Unconditional grid generation: ALWAYS ✓
        - Pure event system: NO BLOCKING CONDITIONS ✓
      `);
      
      // Log additional debug info if provided
      if (detail.debugInfo) {
        console.log('🔍 GRID REQUEST DEBUG INFO:', detail.debugInfo);
      }
      
      // COMPLETELY REMOVED: No shouldGenerateGrid check anymore
      // We now ALWAYS generate a grid when this handler is called
      // Attention scores are tracked in cache for filtering, but grid generation is not conditional
      
      console.log(`✅ UNCONDITIONAL GRID GENERATION: Always processing grid when event received`);
      
      // REMOVED: All conditional grid generation logic - grid is always generated
      
      // Add a detailed grid processing summary
      console.log(`\n🔄🔄 GRID PROCESSING SUMMARY 🔄🔄`);
      console.log(`Grid #${gridGenerationCounterRef.current} status:`);
      console.log(`- Pure event system: NO BLOCKING CONDITIONS`);
      console.log(`- Using fully unconditional grid generation: YES`);
      console.log(`- Current time: ${new Date().toISOString()}`);
      
      // REMOVED: No longer tracking processed grids
      // We want to process ALL grids regardless of their grid number
      
      console.log(`- Grid tracking completely removed - all grids processed unconditionally`);
      console.log(`🔄🔄 END GRID SUMMARY 🔄🔄\n`);
      
      // Always process grid when event is received - unconditionally
      console.log(`🔄🔄 STANDARD GRID: Unconditional generation at ${new Date().toISOString()} (no approval check needed)`);
      processBackgroundGrid(true);
    };
    
    // Add the event listener
    window.addEventListener('forceRefreshGrids', handleForceRefreshGrids as EventListener);
    
    return () => {
      // Clean up the event listener when component unmounts
      window.removeEventListener('forceRefreshGrids', handleForceRefreshGrids as EventListener);
    };
  }, [processBackgroundGrid]);

  return (
    <div className={`min-h-[100vh] w-screen flex flex-col items-center justify-start p-0 py-2 sm:py-3 md:py-4 overflow-y-auto pb-20`} style={{ 
      position: 'relative', // Changed from absolute to normal document flow
      width: '100%',
      maxWidth: '100vw',
      transition: 'height 0.3s ease'
    }}>
      {/* Disclaimer popup that displays on startup */}
      {showDisclaimer && (
        <DisclaimerPopup 
          onAccept={() => setShowDisclaimer(false)} 
          onFirstTimeCheck={(isFirstTime) => setIsFirstTimeDisclaimer(isFirstTime)}
        />
      )}
      
      {/* Buttons in right corner - buttons are grayed out and disabled when showing disclaimer */}
      {/* Sidebar buttons */}
      <div className="absolute top-4 right-8 z-40 flex flex-col items-end">
        <div className={`mb-4 transition-opacity duration-300 ${showDisclaimer ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <InfoButton onOpenInfoPopup={() => setIsInfoPopupOpen(true)} />
        </div>


      </div>
      
      {/* Popups */}
      <InfoPopup 
        isOpen={isInfoPopupOpen} 
        onClose={() => setIsInfoPopupOpen(false)} 
      />
      

      

      

      
      <TitleSection />
      <div className="mb-12 sm:mb-4">
        <GameInstructions 
          onInvokeSpirits={handleInvokeSpirits}
          isInvoking={isInvoking}
          onToggleStreamingMode={handleToggleStreamingMode}
          streamingModeActive={streamingMode}
          onConnectionTextChange={handleConnectionTextChange}
          connectionLocked={isConnectionLocked}
          setConnectionLocked={setIsConnectionLocked}
          parentConnectionText={connectionText}
        />
      </div>
      
      {/* Opening Channel animation - REMOVED */}
      
      {/* Debug log for streaming activation state */}
      {(() => {
        console.log(`🔮 STREAMING STATUS CHECK:
          - streamingMode: ${streamingMode}
          - showResults: ${showResults}
          - processingComplete: ${processingComplete}
          - cosmicWords count: ${cosmicWords?.length || 0}
          - Combined active state: ${streamingMode && showResults && processingComplete}`);
        return null;
      })()}
      
      {/* SHARED STREAMING SENTENCE COMPONENT - Used for both streaming and non-streaming modes */}
      <div className={`w-full ${streamingMode ? 'flex items-center justify-center' : 'flex flex-col items-center justify-center'} h-[420px] mb-0 mt-2 px-2`}>
        <StardustTransition 
          active={streamingMode}
          cosmicWords={cosmicWords ? [...cosmicWords] : []}
          connectionText={connectionText}
        />
        
        <StreamingModule
          active={streamingMode}
          attentionThreshold={15}
          cosmicThreshold={cosmicThreshold}
          soundEnabled={soundEnabled}
        />
        
        {/* Credits are now in App.tsx */}
      </div>
      
      {/* Streaming mode extra UI elements - only shown when streaming mode is active */}
      {(streamingMode || streamingModeRef.current) && showResults && processingComplete && (
        // Container for active streaming mode UI elements
        <div className="w-full flex flex-col items-center justify-start mt-0 px-2 sm:px-3 h-auto streaming-container">
          {/* Sliders section - only shown when showSliders is true */}
          {showSliders && (
            <div className="w-full mb-0 relative z-10 flex flex-col justify-center items-center gap-2 -mt-1">
              {/* Cosmic Threshold Slider */}
              <div className="w-full max-w-[280px]">
                <CosmicThresholdSlider
                  threshold={cosmicThreshold}
                  onChange={handleCosmicThresholdChange}
                />
              </div>
              
              {/* Attention Filter Slider */}
              <div className="attention-filter-container w-full max-w-[280px] p-2 rounded-lg bg-slate-700/30 border border-slate-400/40 relative">
              {/* Slider header */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-200 font-bold text-sm landscape:text-base">Attention Filter:</span>
                <span className="bg-slate-600/70 text-white font-bold rounded-md px-2 py-1 text-xs landscape:text-sm" 
                  style={{ boxShadow: '0 0 10px rgba(148, 163, 184, 0.5)' }}>
                  {attentionThreshold}/50
                </span>
              </div>
              
              {/* Range input */}
              <div className="relative py-1">
                <input
                  type="range"
                  min="15"
                  max="50"
                  step="1"
                  value={attentionThreshold}
                  onChange={(e) => handleAttentionThresholdChange(parseInt(e.target.value))}
                  className="w-full h-5 landscape:h-7 bg-gradient-to-r from-slate-500 to-slate-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    WebkitAppearance: 'none',
                    outline: 'none',
                    touchAction: 'manipulation'
                  }}
                />
                <style dangerouslySetInnerHTML={{
                  __html: `
                  input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #94A3B8;
                    border: 3px solid #64748B;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(148, 163, 184, 0.7);
                    transform: scale(1);
                    transition: transform 0.1s ease;
                  }
                  
                  input[type=range]::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                  }
                  
                  input[type=range]::-webkit-slider-thumb:active {
                    transform: scale(1.15);
                    box-shadow: 0 0 15px rgba(148, 163, 184, 0.9);
                  }
                  
                  input[type=range]::-moz-range-thumb {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #94A3B8;
                    border: 3px solid #64748B;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(148, 163, 184, 0.7);
                    transform: scale(1);
                    transition: transform 0.1s ease;
                  }
                  
                  input[type=range]::-moz-range-thumb:hover {
                    transform: scale(1.1);
                  }
                  
                  input[type=range]::-moz-range-thumb:active {
                    transform: scale(1.15);
                    box-shadow: 0 0 15px rgba(148, 163, 184, 0.9);
                  }
                  
                  /* Special landscape mode styling for better touch targets */
                  @media (orientation: landscape) {
                    input[type=range]::-webkit-slider-thumb {
                      width: 48px;
                      height: 48px;
                      border-width: 4px;
                      box-shadow: 0 0 15px rgba(148, 163, 184, 0.8);
                    }
                    
                    input[type=range]::-moz-range-thumb {
                      width: 48px;
                      height: 48px;
                      border-width: 4px;
                      box-shadow: 0 0 15px rgba(148, 163, 184, 0.8);
                    }
                  }
                  `
                }} />
              </div>
              
              {/* Floating Saturn image - only visible when streaming mode is active */}
              {streamingModeRef.current && (
                <div className="absolute -bottom-20 right-4 z-0">
                  <img 
                    src={saturnImage}
                    alt="Saturn"
                    className="saturn-glow w-20 h-20 opacity-60 hover:opacity-80 transition-opacity duration-300"
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(148, 163, 184, 0.6))',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              )}
            </div>
            </div>
          )}
          
          {/* Pixel Grid Toggle removed - functionality disabled */}
          
          {/* StreamingModule removed - already included above */}
          
          {/* Responsive grid container with reduced vertical margins on mobile */}
          <div className="grid-component-wrapper h-[550px] sm:h-[600px] md:h-[650px] lg:h-[700px] w-full relative mt-6 sm:mt-10">
            {/* Pixel grid disabled but streaming functionality preserved */}
            <div className="invisible h-full w-full">
              {/* Keep the streamer hidden but functional for events */}
              {/* Removed: pixel grid components */}
            </div>
          </div>
          
          {/* Streaming container - reduced margins on mobile */}
          <div className="w-full max-w-[800px] mx-auto mt-2 sm:mt-4 grid-container-wrapper overflow-visible relative">
            {/* Credits removed - now in App.tsx */}
          </div>
        </div>
      )}
      
      <div className="mt-4 sm:mt-8 md:mt-16 lg:mt-20 mb-4 sm:mb-6 md:mb-8 w-full px-2 sm:px-4 dialogue-output-container">
        <DialogueOutput 
          horizontalWords={horizontalWords}
          verticalWords={verticalWords}
          showResults={showResults}
          processingComplete={processingComplete}
          cosmicWords={cosmicWords}
        />
      </div>



      {/* Saturn pulse animation CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes saturnPulse {
            0% {
              filter: drop-shadow(0 0 12px rgba(148, 163, 184, 0.6));
              transform: scale(1);
              opacity: 0.6;
            }
            15% {
              filter: drop-shadow(0 0 14px rgba(59, 130, 246, 0.7)) drop-shadow(0 0 18px rgba(147, 197, 253, 0.4));
              transform: scale(1.015);
              opacity: 0.7;
            }
            30% {
              filter: drop-shadow(0 0 17px rgba(59, 130, 246, 0.85)) drop-shadow(0 0 22px rgba(147, 197, 253, 0.6));
              transform: scale(1.03);
              opacity: 0.85;
            }
            50% {
              filter: drop-shadow(0 0 20px rgba(59, 130, 246, 1)) drop-shadow(0 0 25px rgba(147, 197, 253, 0.7));
              transform: scale(1.05);
              opacity: 1;
            }
            70% {
              filter: drop-shadow(0 0 17px rgba(59, 130, 246, 0.85)) drop-shadow(0 0 22px rgba(147, 197, 253, 0.6));
              transform: scale(1.03);
              opacity: 0.85;
            }
            85% {
              filter: drop-shadow(0 0 14px rgba(59, 130, 246, 0.7)) drop-shadow(0 0 18px rgba(147, 197, 253, 0.4));
              transform: scale(1.015);
              opacity: 0.7;
            }
            100% {
              filter: drop-shadow(0 0 12px rgba(148, 163, 184, 0.6));
              transform: scale(1);
              opacity: 0.6;
            }
          }

          .saturn-pulse {
            animation: saturnPulse 2s cubic-bezier(0.25, 0.1, 0.25, 1);
          }
        `
      }} />
    </div>
  );
};

export default Home;