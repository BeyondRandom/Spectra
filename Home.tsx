import { useState, useEffect, useCallback, useRef } from "react";
import TitleSection from "../components/TitleSection";
import GridContainer from "../components/GridContainer";
import GameInstructions from "../components/GameInstructions";
import DialogueOutput from "../components/DialogueOutput";
import StardustTransition from "../components/StardustTransition";
import StreamingSentence from "../components/StreamingSentence";
import DisclaimerPopup from "../components/DisclaimerPopup";
import InfoButton from "../components/InfoButton";
import InfoPopup from "../components/InfoPopup";
import DiagnosticDump from "../components/DiagnosticDump";
import AttentionScoreDebugger from "../components/AttentionScoreDebugger";
import openChannelImg from "../assets/openchannel.png";

// Import new OffscreenCanvas-based grid renderer for better performance
import OffscreenPictureStreamer from "../components/OffscreenPictureStreamer";
// Keep legacy renderer for fallback
import ParallelPictureStreamer from "../components/ParallelPictureStreamer";
import PixelGridToggle from "../components/PixelGridToggle";
import CosmicThresholdSlider from "../components/CosmicThresholdSlider";
import { addInitialQuickConnectEntries } from "../utils/addInitialQuickConnect";
import { 
  generateRandomGrid, 
  getHorizontalWords, 
  getVerticalWords,
  ROWS,
  COLS,
  delay
} from "../lib/gridUtils";
import { 
  initializeDictionary, 
  findLongestWord, 
  findSecondLongestWord, 
  findThirdLongestWord,
  findMultipleWords,
  findSecondaryWord
} from "../lib/wordUtils";
import {
  savePsychicBinaryFile,
  filterWordsByCosmicSignificance,
  processSecondTierWords,
  processTertiaryWords,
  evaluateWordCosmicScore,
  // Removed calculateAttentionScore - this is now used ONLY in StreamingSentence.tsx
  CosmicWord,
  COSMIC_THRESHOLD
} from "../lib/psychicRandomizer";
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
    
    // DEPRECATED: Legacy grid tracking (no longer used - for backwards compatibility only)
    // All grid tracking is now done via StreamingSentence.tsx with gridNumberTrackingRef
    CURRENT_GRID_NUMBER: number; // DEPRECATED: Legacy variable
    PROCESSED_GRID_NUMBERS: number[]; // DEPRECATED: Legacy variable
    FULLY_PROCESSED_GRIDS: number[]; // DEPRECATED: Legacy variable
    GRID_ALREADY_MADE: {[gridNum: number]: boolean}; // DEPRECATED: Legacy variable
    GRID_NUMBER_INITIALIZATION_TIME: number; // DEPRECATED: Legacy variable
    
    // Feature flags
    alreadyRunBeginCommunication: boolean;
    gridLockDisabledForSubsequentRun: boolean;
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
  
  // State for pixel grid toggle and attention score threshold
  const [showPixelGrid, setShowPixelGrid] = useState(false); // Hidden by default (changed from true)
  const [attentionThreshold, setAttentionThreshold] = useState(20); // Set to 20 for testing
  
  // State for sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true); // Default to enabled
  
  // State for the cosmic threshold (scoring system for words)
  const [cosmicThreshold, setCosmicThreshold] = useState(33); // Set to 33 on startup
  
  // State for found words
  const [horizontalWords, setHorizontalWords] = useState<WordHierarchy[]>([]);
  const [verticalWords, setVerticalWords] = useState<WordHierarchy[]>([]);
  
  // State for cosmically significant words
  const [cosmicWords, setCosmicWords] = useState<CosmicWord[]>([]);

  // Track the psychic binary file URL
  const [psychicBinaryUrl, setPsychicBinaryUrl] = useState<string>('');
  
  // State for the disclaimer popup
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  
  // State to track if this is the first time showing the disclaimer
  const [isFirstTimeDisclaimer, setIsFirstTimeDisclaimer] = useState(false);
  
  // State for the info popup
  const [isInfoPopupOpen, setIsInfoPopupOpen] = useState(false);
  

  

  
  // Reference for the streaming mode timer interval
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use a ref to track streaming mode state to avoid race conditions with timer
  const streamingModeRef = useRef<boolean>(false);
  
  // We no longer need global word history tracking
  // Removing this mechanism to ensure no word caching or comparison between sessions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Remove global word history if it exists
      if ((window as any).globalWordHistory) {
        delete (window as any).globalWordHistory;
        console.log("📚 GLOBAL HISTORY: Removed globalWordHistory to prevent word caching");
      }
      
      // We'll no longer listen for or process cosmicWordsAdded events for history
      console.log("📚 GLOBAL HISTORY: Disabled global word history tracking to prevent word caching");
    }
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
      
      // Clear any existing streaming timer
      if (streamingTimerRef.current) {
        clearInterval(streamingTimerRef.current);
        streamingTimerRef.current = null;
        console.log("🔴 FORCE DEACTIVATE: Cleared streaming timer");
      }
      
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
          // Clean up any streaming timer
          if (streamingTimerRef.current) {
            clearInterval(streamingTimerRef.current);
            streamingTimerRef.current = null;
            console.log("🧹 Cleared streaming timer after toggle completion");
          }
          
          // Removed component remount mechanism that was destabilizing the application
          console.log("🔄 RESET: No longer force refreshing component to maintain protocol stability");
        }, 500);
      }
    };
    
    window.addEventListener('resetApplicationState', handleApplicationReset as EventListener);
    window.addEventListener('forceDeactivateStreamingMode', handleForceDeactivateStreaming as EventListener);
    window.addEventListener('streamingToggleComplete', handleStreamingToggleComplete as EventListener);
    window.addEventListener('reset-for-next-activation', handleResetForNextActivation as EventListener);
    window.addEventListener('app-state-reset', handleAppStateReset as EventListener);
    
    return () => {
      window.removeEventListener('resetApplicationState', handleApplicationReset as EventListener);
      window.removeEventListener('forceDeactivateStreamingMode', handleForceDeactivateStreaming as EventListener);
      window.removeEventListener('streamingToggleComplete', handleStreamingToggleComplete as EventListener);
      window.removeEventListener('reset-for-next-activation', handleResetForNextActivation as EventListener);
      window.removeEventListener('app-state-reset', handleAppStateReset as EventListener);
    };
  }, []);

  // Initialize grid numbering specifically (separate effect for grid number tracking)
  useEffect(() => {
    console.log("🔢 INITIALIZING GRID NUMBER TRACKING");
    
    // SIMPLIFIED: Using only local grid number tracking with refs
    // Initialize to 0 if this is the first run
    gridGenerationCounterRef.current = 0;
    console.log(`🔢 GRID TRACKING: Initialized local grid counter to 0`);
    
    // REMOVED: All global grid tracking systems
    // We now rely solely on local refs for tracking grid numbers
    console.log(`🔢 GRID TRACKING: Removed all global grid tracking systems`);
    
    // Reset any existing global trackers to prevent conflicts
    if (typeof window !== 'undefined') {
      // Remove the global trackers if they exist
      if ((window as any).PROCESSED_GRID_NUMBERS) {
        delete (window as any).PROCESSED_GRID_NUMBERS;
      }
      if ((window as any).FULLY_PROCESSED_GRIDS) {
        delete (window as any).FULLY_PROCESSED_GRIDS;
      }
      if ((window as any).GRID_ALREADY_MADE) {
        delete (window as any).GRID_ALREADY_MADE;
      }
      console.log(`🔢 GRID TRACKING: Removed all global grid tracking variables`);
    }
    
    // Initialize local tracking only
    processedGridsRef.current = new Set();
    console.log(`🔢 GRID TRACKING: Using exclusively local grid tracking via refs`);
    
    // Initialize a timestamp for diagnostics only
    const initTime = Date.now();
    console.log(`🔢 GRID NUMBERING INITIALIZED: Starting with grid #${gridGenerationCounterRef.current} at ${new Date(initTime).toISOString()}`);
  }, []);
  
  // MODIFIED: No longer listening for grid increment requests
  // StreamingSentence.tsx is now the only source of grid incrementation
  useEffect(() => {
    // Log that Home.tsx is not handling grid increments
    console.log(`🔢 GRID NUMBER POLICY: Home.tsx no longer handles grid increments - StreamingSentence.tsx is the sole incrementer`);
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
    document.body.style.overflow = "auto"; // Allow scrolling with custom scrollbar
    
    // Add custom scrollbar styles
    const style = document.createElement('style');
    style.textContent = `
      ::-webkit-scrollbar {
        width: 10px;
      }
      ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(0, 162, 255, 0.7);
        border-radius: 5px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 162, 255, 0.9);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      // Clean up the binary file URL when component unmounts
      if (psychicBinaryUrl) {
        console.log("🔮 Cleaning up psychic binary file:", psychicBinaryUrl);
        URL.revokeObjectURL(psychicBinaryUrl);
      }
      
      // Clean up streaming timer if active
      if (streamingTimerRef.current) {
        console.log("🔄 Cleaning up streaming mode timer");
        clearInterval(streamingTimerRef.current);
        streamingTimerRef.current = null;
      }
      
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
    console.log("\n===== PROCESSING ROWS WITH NEW INDEPENDENT WORD SYSTEM =====");
    // Process horizontal words (rows)
    const newHorizontalWords: WordHierarchy[] = [];
    const allFoundWords: string[] = []; // Track all words for cosmic significance testing
    
    for (let row = 0; row < horizontalSequences.length; row++) {
      const letters = horizontalSequences[row];
      console.log(`\n⭐ PROCESSING ROW ${row + 1} ⭐`);
      console.log(`Raw letters: ${letters.join('')}`);
      
      try {
        // Use new multiple word finder for independent words
        console.log(`Finding multiple independent words for row ${row + 1}...`);
        const rowWords = findMultipleWords(letters);
        console.log(`findMultipleWords returned ${rowWords.length} words for row ${row + 1}`);
        
        if (rowWords.length > 0) {
          // Get up to 3 independent words (might be fewer)
          const mainWord = rowWords[0] || '';
          const secondaryWord = rowWords[1] || '';
          const tertiaryWord = rowWords[2] || '';
          
          // Debug the independent words
          console.log(`✅ ROW ${row + 1} COMPLETE RESULTS:`);
          console.log(`🔸 Word 1: ${mainWord}`);
          console.log(`🔸 Word 2: ${secondaryWord}`);
          console.log(`🔸 Word 3: ${tertiaryWord}`);
          
          // Add non-empty words to our collection for cosmic significance testing
          if (mainWord) allFoundWords.push(mainWord);
          if (secondaryWord) allFoundWords.push(secondaryWord);
          if (tertiaryWord) allFoundWords.push(tertiaryWord);
          
          newHorizontalWords.push({
            main: mainWord,
            secondary: secondaryWord,
            tertiary: tertiaryWord
          });
        } else {
          console.log(`❌ No words found in row ${row + 1}`);
          newHorizontalWords.push({ main: '', secondary: '', tertiary: '' });
        }
      } catch (error) {
        console.error(`Error processing row ${row + 1}:`, error);
        newHorizontalWords.push({ main: '', secondary: '', tertiary: '' });
      }
      
      // Minimal delay between processing rows to avoid blocking UI
      await delay(10);
      
      // Only process the first 5 rows for debugging
      if (row === 4) {
        console.log("Processed first 5 rows, continuing with remaining rows...");
      }
    }
    
    console.log(`Setting horizontalWords state with ${newHorizontalWords.length} entries`);
    console.log(`Words found: ${newHorizontalWords.filter(w => w.main).length}`);
    setHorizontalWords(newHorizontalWords);
    
    console.log("\n===== PROCESSING COLUMNS WITH NEW INDEPENDENT WORD SYSTEM =====");
    // Process vertical words (columns)
    const newVerticalWords: WordHierarchy[] = [];
    
    for (let col = 0; col < verticalSequences.length; col++) {
      const letters = verticalSequences[col];
      console.log(`\n⭐ PROCESSING COLUMN ${col + 1} ⭐`);
      console.log(`Raw letters: ${letters.join('')}`);
      
      try {
        // Use new multiple word finder for independent words
        console.log(`Finding multiple independent words for column ${col + 1}...`);
        const colWords = findMultipleWords(letters);
        console.log(`findMultipleWords returned ${colWords.length} words for column ${col + 1}`);
        
        if (colWords.length > 0) {
          // Get up to 3 independent words (might be fewer)
          const mainWord = colWords[0] || '';
          const secondaryWord = colWords[1] || '';
          const tertiaryWord = colWords[2] || '';
          
          // Debug the independent words
          console.log(`✅ COLUMN ${col + 1} COMPLETE RESULTS:`);
          console.log(`🔸 Word 1: ${mainWord}`);
          console.log(`🔸 Word 2: ${secondaryWord}`);
          console.log(`🔸 Word 3: ${tertiaryWord}`);
          
          // Add non-empty words to our collection for cosmic significance testing
          if (mainWord) allFoundWords.push(mainWord);
          if (secondaryWord) allFoundWords.push(secondaryWord);
          if (tertiaryWord) allFoundWords.push(tertiaryWord);
          
          newVerticalWords.push({
            main: mainWord,
            secondary: secondaryWord,
            tertiary: tertiaryWord
          });
        } else {
          console.log(`❌ No words found in column ${col + 1}`);
          newVerticalWords.push({ main: '', secondary: '', tertiary: '' });
        }
      } catch (error) {
        console.error(`Error processing column ${col + 1}:`, error);
        newVerticalWords.push({ main: '', secondary: '', tertiary: '' });
      }
      
      // Minimal delay between processing columns to avoid blocking UI
      await delay(10);
      
      // Only process the first 5 columns for debugging
      if (col === 4) {
        console.log("Processed first 5 columns, continuing with remaining columns...");
      }
    }
    
    console.log(`Setting verticalWords state with ${newVerticalWords.length} entries`);
    console.log(`Words found: ${newVerticalWords.filter(w => w.main).length}`);
    setVerticalWords(newVerticalWords);
    
    // Process secondary derived words from each primary word
    console.log("\n===== PROCESSING SECONDARY DERIVED WORDS =====");
    const derivedSecondaryWords: string[] = [];
    const derivedWordMap = new Map<string, string>(); // Map primary words to their secondary derived words
    
    // Process horizontal words for secondary derived words
    for (const wordHierarchy of newHorizontalWords) {
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
      
      // Return the summary information for potential use by the caller
      return { 
        rowWordsFound, 
        colWordsFound, 
        cosmicWordsFound, 
        totalDisplayWords: wordsWithGridGen.length 
      };
    });
  }, [grid]);

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
  // Track processed grids to prevent duplicates
  const processedGridsRef = useRef<Set<number>>(new Set());

  const processBackgroundGrid = useCallback(async (forceActive = false) => {
    const startTime = Date.now();
    const hrStartTime = performance.now(); // High-resolution timing
    gridStartTimeRef.current = startTime; // Store for timing calculations
    
    // Check for subsequent run to ensure we continue processing properly
    const isSubsequentActivation = typeof window !== 'undefined' && (window as any).alreadyRunBeginCommunication;
    
    // For subsequent runs, always make sure streamingModeRef is true
    if (isSubsequentActivation && !streamingModeRef.current) {
      console.log("🚨 SUBSEQUENT RUN IN GRID FUNCTION: Auto-activating streaming mode for proper processing");
      streamingModeRef.current = true;
      setStreamingMode(true); // Also update React state
    }
    
    // Get the previous grid number (we'll only increment if attention check passes)
    const prevGridNumber = gridGenerationCounterRef.current;
    
    // We'll determine if this is an attention check triggering grid generation
    // Need to cast event as CustomEvent to access detail property
    const customEvent = event as CustomEvent;
    
    // COMPLETE SIMPLIFICATION: Removed shouldGenerateGrid flag - always generate grid
    const ensureNewGrid = customEvent?.detail?.ensureNewGrid === true;
    
    // Always log that grid generation is happening without condition
    console.log(`🔍 GRID GENERATION: Always generating grid when processBackgroundGrid is called`);
    

    // Initialize a global grid attention cache if it doesn't exist
    // REMOVED: Home.tsx no longer needs to handle GRID_ATTENTION_SCORES
    // The cache is initialized in StreamingSentence.tsx when needed
    // We've removed this initialization to avoid redundancy
    
    // Just get the threshold value for logging purposes only
    const logThreshold = 20; // Using fixed value for simplicity
    
    console.log(`🔍 ATTENTION THRESHOLD: Using simplified threshold of ${logThreshold}/50`);
    console.log(`🔍 GRID GENERATION: Grid generation is now managed by StreamingSentence.tsx`);
    
    
    console.log(`🔍 ATTENTION POLICY: Home.tsx is NOT calculating or caching attention scores anymore`);
    console.log(`🔍 ATTENTION POLICY: This is now the exclusive responsibility of StreamingSentence.tsx`);
    
    // COMPLETE SIMPLIFICATION: Home.tsx now always generates grids unconditionally
    // No more shouldGenerateGrid flag - grid generation happens every time this function is called
    
    // REMOVED: No longer using any conditional flags
    // Grid progression is now entirely dependent on the natural 7-second attention check cycle
    
    // ENHANCED LOGGING: Show simplified grid generation check logging
    console.log(`🔍 GRID GENERATION CHECK: Grid #${prevGridNumber} - ALWAYS generating grid (unconditional)`);
    console.log(`🔢 GRID INCREMENT CHECK: Using natural 7-second cycle (managed by StreamingSentence.tsx)`);
    
    // BEFORE CHANGING THE GRID NUMBER - Check if this grid has already been processed!
    // This is critical - we should NEVER process the same grid twice
    let skipProcessing = false;
    
    if (processedGridsRef.current.has(prevGridNumber)) {
      console.log(`🚨🚨 GRID COLLISION: Grid #${prevGridNumber} has already been processed! Forcing skip.`);
      skipProcessing = true;
    }
    
    // COMPLETE SIMPLIFICATION: Always process the grid if it hasn't been processed yet
    // This completely removes attention logic and conditionals from Home.tsx
    // We always generate a grid when this function is called
    const shouldProcessGrid = !skipProcessing; // CRITICAL: This is set only once and never changed
    
    // Log if we're skipping due to already processed grid
    if (skipProcessing) {
      console.log(`🔍 GRID PROCESSING: Grid already processed - will skip duplicate processing`);
    }
    
    // ENHANCED GRID TRACKING: Use two trackers to ensure we don't reprocess grids
    // 1. FULLY_PROCESSED_GRIDS array (main tracker for complete grids)
    // 2. GRID_UNIQUE_PROCESSING Set (short-term tracker with 5-second auto-cleanup)
    const gridAlreadyFullyProcessed = typeof window !== 'undefined' && 
      (window as any).FULLY_PROCESSED_GRIDS && 
      (window as any).FULLY_PROCESSED_GRIDS.includes(prevGridNumber);
    
    // Check if this grid is currently being processed with the 5-second tracker
    const gridCurrentlyProcessing = typeof window !== 'undefined' && 
      (window as any).GRID_UNIQUE_PROCESSING && 
      (window as any).GRID_UNIQUE_PROCESSING.has(prevGridNumber);
    
    // CRITICAL FIX: If this grid has already been fully processed or is currently being processed, mark it for skipping
    // but DO NOT increment the grid number - only attention check should do that
    if ((gridCurrentlyProcessing || gridAlreadyFullyProcessed) && !ensureNewGrid) {
      console.log(`🚨🚨 GRID ALREADY PROCESSED: Grid #${prevGridNumber} has already been processed (${gridAlreadyFullyProcessed ? 'fully processed list' : 'GRID_UNIQUE_PROCESSING tracker'})`);
      skipProcessing = true;
      // FIXED: Don't try to modify shouldProcessGrid since it's a constant
      // This should respect the 7-second cycle from StreamingSentence.tsx
      console.log(`🔢🔢 GRID NUMBER MAINTAINED: Grid #${prevGridNumber} was already processed, but waiting for regular attention check to increment`);
      console.log(`🔢 SINGLE PATHWAY: Maintaining current grid number until next 7-second attention check passes`);
      
      // CRITICAL: Do NOT update grid number here - this ensures there's only ONE pathway
      // to increment the grid number (the 7-second attention check)
      
      // Check if the next grid would also already be processed and if so, dispatch forceRefreshGrids
      // REMOVED: Auto-chain mechanism that was creating multiple grid number increment paths
      // We now rely solely on the 7-second cycle to handle this naturally
      console.log(`🔄 GRID ALREADY PROCESSED: Grid #${prevGridNumber} has been fully processed.`);
      console.log(`🔄 WAITING FOR NATURAL CYCLE: Will let the 7-second timer handle grid progression naturally.`);
      
      return; // Skip the rest of processing for already processed grids
    }
    
    // REMOVED: All special handling for ensureNewGrid and grid incrementation
    // Grid tracking is exclusively handled by StreamingSentence.tsx
    
    // Simply log that we don't handle grid numbers anymore
    console.log(`🔢 GRID NUMBER RESPONSIBILITY: Home.tsx has no grid number management role`);
    console.log(`🔢 GRID INCREMENTATION: Exclusively managed by StreamingSentence.tsx 7-second timer`);
    
    // Handle any already processed grid condition - now unconditionally
    if ((gridCurrentlyProcessing || gridAlreadyFullyProcessed)) {
      console.log(`🔄 GRID STATE: Grid #${prevGridNumber} already processed, working with current state`);
      skipProcessing = false;
      // FIXED: Don't try to modify shouldProcessGrid since it's a constant
      // Let the value be determined by !skipProcessing only
      console.log(`🔄 GRID POLICY: Will process grid despite being marked as already processed`);
    }
    
    // CRITICAL FIX: Do NOT increment grid number - that's StreamingSentence.tsx's job now
    // Grid numbers are exclusively managed by the 7-second cycle in StreamingSentence.tsx
    
    // CRITICAL FIX: REMOVED grid increment code from Home.tsx
    // This was causing duplicate grids because it created a second incrementation path
    // All grid incrementing is now handled ONLY by StreamingSentence.tsx where the
    // attention score is calculated using the calculateAttentionScore() function
    
    // Simply use the current grid number without incrementing it
    // StreamingSentence.tsx will increment the grid via the 7-second attention check cycle
    console.log(`🔢 GRID INCREMENT POLICY: Home.tsx no longer increments grid numbers`);
    console.log(`🔢 GRID INCREMENT POLICY: Using existing grid #${prevGridNumber} as provided`);
    
    // Keep the same grid number - no incrementing happens here anymore
    let newGridNumber = prevGridNumber;
    
    // Log our decision - unconditional grid generation
    console.log(`🔢 GRID MAINTAINED: Home.tsx no longer increments grid numbers`);
    console.log(`🔢 GRID POLICY: Grid incrementation responsibility delegated to StreamingSentence.tsx only`);
    
    // Log the grid ID assignment with enhanced clarity about decision
    console.log(`🔢🔢 GRID ID ASSIGNMENT: ${skipProcessing ? "ALREADY PROCESSED" : "ASSIGNING"} Grid #${newGridNumber} (previous: ${prevGridNumber})`);
    console.log(`🔢🔢 GRID PROCESSING DECISION: ${shouldProcessGrid ? "WILL PROCESS ✓" : "WILL NOT PROCESS ✗"}`);
    
    // CRITICAL FIX: Mark that the grid was just incremented in this cycle
    // This will help prevent duplicate grid processing
    const justIncremented = prevGridNumber !== newGridNumber;
    
    // REMOVED: No longer updating grid counter in Home.tsx
    // All grid number tracking is now exclusively managed by StreamingSentence.tsx
    
    // REMOVED: No longer storing the grid number in global window object
    // We now rely solely on local tracking via gridGenerationCounterRef
    if (typeof window !== 'undefined') {
      // Keep the other tracking variables for debugging
      (window as any).GRID_JUST_INCREMENTED = justIncremented;
      (window as any).GRID_INCREMENT_TIME = Date.now();
      console.log(`🔢 GRID TRACKING: Updated tracking variables (justIncremented=${justIncremented})`);
    }
    
    // Add this grid number to our processed grids tracking to prevent duplicates
    // SIMPLIFIED: Always add to processed grids if we're actually going to process this grid
    if (!skipProcessing) {
      // Add to local tracking set
      processedGridsRef.current.add(newGridNumber);
      
      // REMOVED: No longer updating global processed grid numbers array
      // All grid tracking is now done locally in StreamingSentence.tsx
      console.log(`🔢 GRID TRACKING: Using local tracking only - no global variables`);
      console.log(`🔢 GRID MANAGEMENT: StreamingSentence.tsx is sole manager of grid processing state`);
      
      console.log(`🔄 GRID TRACKING: Added grid #${newGridNumber} to processed grids. Total processed: ${processedGridsRef.current.size}`);
    }
    
    // SUPER CRITICAL DEBUGGING: Log the grid numbers to diagnose sequencing issues
    console.log(`⏱️🔢 GRID SEQUENCE: Previous grid #${prevGridNumber} → Current grid #${newGridNumber}`);
    console.log(`⏱️🔢 GRID DIAGNOSTIC: Exact time: ${new Date().toISOString()}`);
    
    // REMOVED: No longer dispatching gridNumberChanged events from Home.tsx
    // Grid number management is now exclusively handled by StreamingSentence.tsx
    console.log(`🔢 GRID NOTIFICATION: Home.tsx no longer dispatches grid number events`);
    console.log(`🔢 GRID ARCHITECTURE: StreamingSentence.tsx handles all grid number management`);
    
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
    
    // COMPLETE SIMPLIFICATION: Always show results and process grid - unconditional
    if (forceActive || isStreamingModeActive || isSubsequentActivation) {
      setShowResults(true);
      setProcessingComplete(true);
      console.log("✅ GRID GENERATION: Setting showResults and processingComplete to true");
    } else {
      // Only skip if streaming mode is not active - no more conditional grid generation
      console.log("❌ STREAMING INACTIVE: Skipping grid processing because streaming mode is not active");
      return;
    }
    
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
    
    // Generate a new random grid (without animation)
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
    
    // Process horizontal words (rows) with new independent word finding system
    console.log("🎮 STREAMING - Processing rows with new independent word system");
    const horizontalDerivedWords = new Map<string, string>(); // Track primary->secondary word derivations
    
    console.log("🔍🔍 DERIVED WORD TRACKING: Initializing horizontalDerivedWords map (currently empty)");
    
    for (let row = 0; row < horizontalSequences.length; row++) {
      const letters = horizontalSequences[row];
      try {
        // Use new multiple word finder for independent words
        const rowWords = findMultipleWords(letters);
        
        if (rowWords.length > 0) {
          // Get up to 3 independent words (might be fewer)
          const mainWord = rowWords[0] || '';
          const secondaryWord = rowWords[1] || '';
          const tertiaryWord = rowWords[2] || '';
          
          // Find secondary derived words for each primary word
          if (mainWord) {
            console.log(`🔍 WORD DEBUG: Row ${row} - Finding secondary words for primary word "${mainWord}"`);
            const derivedWord = findSecondaryWord(mainWord);
            if (derivedWord) {
              horizontalDerivedWords.set(mainWord, derivedWord);
              console.log(`🔍 WORD DEBUG: Row ${row} - CONFIRMED secondary word "${derivedWord}" added to cosmic testing`);
              allFoundWords.push(derivedWord); // Add derived word to the cosmic testing collection
            } else {
              console.log(`🔍 WORD DEBUG: Row ${row} - No secondary word found for "${mainWord}"`);
            }
            console.log(`🔍 WORD DEBUG: Row ${row} - Adding primary word "${mainWord}" to cosmic testing`);
            allFoundWords.push(mainWord);
          }
          
          if (secondaryWord) {
            console.log(`🔍 WORD DEBUG: Row ${row} - Finding secondary words for primary word "${secondaryWord}"`);
            const derivedWord = findSecondaryWord(secondaryWord);
            if (derivedWord) {
              horizontalDerivedWords.set(secondaryWord, derivedWord);
              console.log(`🔍 WORD DEBUG: Row ${row} - CONFIRMED secondary word "${derivedWord}" added to cosmic testing`);
              allFoundWords.push(derivedWord);
            } else {
              console.log(`🔍 WORD DEBUG: Row ${row} - No secondary word found for "${secondaryWord}"`);
            }
            console.log(`🔍 WORD DEBUG: Row ${row} - Adding primary word "${secondaryWord}" to cosmic testing`);
            allFoundWords.push(secondaryWord);
          }
          
          if (tertiaryWord) {
            console.log(`🔍 WORD DEBUG: Row ${row} - Finding secondary words for primary word "${tertiaryWord}"`);
            const derivedWord = findSecondaryWord(tertiaryWord);
            if (derivedWord) {
              horizontalDerivedWords.set(tertiaryWord, derivedWord);
              console.log(`🔍 WORD DEBUG: Row ${row} - CONFIRMED secondary word "${derivedWord}" added to cosmic testing`);
              allFoundWords.push(derivedWord);
            } else {
              console.log(`🔍 WORD DEBUG: Row ${row} - No secondary word found for "${tertiaryWord}"`);
            }
            console.log(`🔍 WORD DEBUG: Row ${row} - Adding primary word "${tertiaryWord}" to cosmic testing`);
            allFoundWords.push(tertiaryWord);
          }
          
          newHorizontalWords.push({
            main: mainWord,
            secondary: secondaryWord,
            tertiary: tertiaryWord
          });
        } else {
          newHorizontalWords.push({ main: '', secondary: '', tertiary: '' });
        }
      } catch (error) {
        console.error(`Error processing row ${row}:`, error);
        newHorizontalWords.push({ main: '', secondary: '', tertiary: '' });
      }
    }
    
    // Process vertical words (columns) with new multiple word finding system
    console.log("🎮 STREAMING - Processing columns with new independent word system");
    const verticalDerivedWords = new Map<string, string>(); // Track primary->secondary word derivations
    
    for (let col = 0; col < verticalSequences.length; col++) {
      const letters = verticalSequences[col];
      try {
        // Use new multiple word finder for independent words
        const colWords = findMultipleWords(letters);
        
        if (colWords.length > 0) {
          // Get up to 3 independent words (might be fewer)
          const mainWord = colWords[0] || '';
          const secondaryWord = colWords[1] || '';
          const tertiaryWord = colWords[2] || '';
          
          // Find secondary derived words for each primary word
          if (mainWord) {
            console.log(`🔍 WORD DEBUG: Column ${col} - Finding secondary words for primary word "${mainWord}"`);
            const derivedWord = findSecondaryWord(mainWord);
            if (derivedWord) {
              verticalDerivedWords.set(mainWord, derivedWord);
              console.log(`🔍 WORD DEBUG: Column ${col} - CONFIRMED secondary word "${derivedWord}" added to cosmic testing`);
              allFoundWords.push(derivedWord); // Add derived word to the cosmic testing collection
            } else {
              console.log(`🔍 WORD DEBUG: Column ${col} - No secondary word found for "${mainWord}"`);
            }
            console.log(`🔍 WORD DEBUG: Column ${col} - Adding primary word "${mainWord}" to cosmic testing`);
            allFoundWords.push(mainWord);
          }
          
          if (secondaryWord) {
            console.log(`🔍 WORD DEBUG: Column ${col} - Finding secondary words for primary word "${secondaryWord}"`);
            const derivedWord = findSecondaryWord(secondaryWord);
            if (derivedWord) {
              verticalDerivedWords.set(secondaryWord, derivedWord);
              console.log(`🔍 WORD DEBUG: Column ${col} - CONFIRMED secondary word "${derivedWord}" added to cosmic testing`);
              allFoundWords.push(derivedWord);
            } else {
              console.log(`🔍 WORD DEBUG: Column ${col} - No secondary word found for "${secondaryWord}"`);
            }
            console.log(`🔍 WORD DEBUG: Column ${col} - Adding primary word "${secondaryWord}" to cosmic testing`);
            allFoundWords.push(secondaryWord);
          }
          
          if (tertiaryWord) {
            console.log(`🔍 WORD DEBUG: Column ${col} - Finding secondary words for primary word "${tertiaryWord}"`);
            const derivedWord = findSecondaryWord(tertiaryWord);
            if (derivedWord) {
              verticalDerivedWords.set(tertiaryWord, derivedWord);
              console.log(`🔍 WORD DEBUG: Column ${col} - CONFIRMED secondary word "${derivedWord}" added to cosmic testing`);
              allFoundWords.push(derivedWord);
            } else {
              console.log(`🔍 WORD DEBUG: Column ${col} - No secondary word found for "${tertiaryWord}"`);
            }
            console.log(`🔍 WORD DEBUG: Column ${col} - Adding primary word "${tertiaryWord}" to cosmic testing`);
            allFoundWords.push(tertiaryWord);
          }
          
          newVerticalWords.push({
            main: mainWord,
            secondary: secondaryWord,
            tertiary: tertiaryWord
          });
        } else {
          newVerticalWords.push({ main: '', secondary: '', tertiary: '' });
        }
      } catch (error) {
        console.error(`Error processing column ${col}:`, error);
        newVerticalWords.push({ main: '', secondary: '', tertiary: '' });
      }
    }
    
    // Use the full collection of all independent words for cosmic significance
    console.log(`🎮 STREAMING - Found ${allFoundWords.length} total words with new independent word system`);
    
    // Process cosmic significance with new independent word system
    console.log(`🎮 STREAMING - Starting cosmic significance filtering with ${allFoundWords.length} independent words...`);
    console.log(`🎮 WORDS TO FILTER: ${allFoundWords.join(', ')}`);
    
    // Get all the derived secondary words
    const allDerivedSecondaryWords = [...Array.from(horizontalDerivedWords.values()), ...Array.from(verticalDerivedWords.values())];
    console.log(`🔍🔍 DERIVED WORD COUNT: Found ${allDerivedSecondaryWords.length} derived secondary words:`);
    if (allDerivedSecondaryWords.length > 0) {
      console.log(`🔍🔍 DERIVED SECONDARY WORDS: ${allDerivedSecondaryWords.join(', ')}`);
    }
    
    console.log(`🔍🔍 HORIZONTAL DERIVED MAP SIZE: ${horizontalDerivedWords.size}, Content: ${Array.from(horizontalDerivedWords.entries()).map(([k,v]) => `${k}→${v}`).join(', ') || 'Empty'}`);
    console.log(`🔍🔍 VERTICAL DERIVED MAP SIZE: ${verticalDerivedWords.size}, Content: ${Array.from(verticalDerivedWords.entries()).map(([k,v]) => `${k}→${v}`).join(', ') || 'Empty'}`);
    
    // Use real-time scoring instead of post-processing filter
    // NEVER CACHE SCORES as that breaks the decoder
    console.log(`Scoring ${allFoundWords.length} streaming mode words in full parallel mode...`);
    
    // No batching - process all words completely in parallel
    console.log(`🌟 FULL PARALLEL PROCESSING: Will score all ${allFoundWords.length} words simultaneously before displaying any results`);
    
    // Process all words completely in parallel with absolutely no staggering
    // Each word still goes through its own 50-pass evaluation with 1ms delay between index selections
    const wordPromises = allFoundWords.map((word) => {
      // No delay or staggering - start all word evaluations simultaneously
      console.log(`Starting 50-pass evaluation for streaming word: "${word}"`);
      
      // Always get a fresh score - NEVER cache cosmic scores
      return evaluateWordCosmicScore(word)
        .then(score => {
          console.log(`Streaming word score for "${word}": ${score}/50`);
          return { word, score };
        });
    });
    
    // Wait for all words to be processed
    const wordScoreResults = await Promise.all(wordPromises);
    
    console.log(`🌟 FULL PARALLEL PROCESSING: Completed scoring all ${wordScoreResults.length} words simultaneously`);
    console.log(`🌟 PARALLEL RESULTS: Sample scores: ${wordScoreResults.slice(0, 5).map(r => `${r.word}:${r.score}`).join(', ')}`);
    
    
    const allCosmicWords: CosmicWord[] = [];
    
    // Get the current cosmic threshold directly from the COSMIC_THRESHOLD export
    // This ensures we're always using the up-to-date global value
    const currentThreshold = typeof COSMIC_THRESHOLD !== 'undefined' ? COSMIC_THRESHOLD : cosmicThreshold;
    
    // Create diagnostic arrays to track all words 
    const primaryWordDiagnostics: PrimaryWordDiagnostic[] = [];
    const secondaryWordDiagnostics: SecondaryWordDiagnostic[] = [];
    
    // Log all scored words including primary and secondary
    console.log("🔍🔎 ALL SCORED WORDS (before filtering):");
    wordScoreResults.forEach(result => {
      // Check if this is a primary or derived word
      const isDerived = horizontalDerivedWords.has(result.word) || 
                        verticalDerivedWords.has(result.word) ||
                        Array.from(horizontalDerivedWords.values()).includes(result.word) ||
                        Array.from(verticalDerivedWords.values()).includes(result.word);
      
      // If it's a derived word, find its parent
      let parent = null;
      for (const [p, d] of horizontalDerivedWords.entries()) {
        if (d === result.word) {
          parent = p;
          break;
        }
      }
      if (!parent) {
        for (const [p, d] of verticalDerivedWords.entries()) {
          if (d === result.word) {
            parent = p;
            break;
          }
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
        primaryWordDiagnostics.push({
          word: result.word,
          score: result.score,
          passesThreshold,
          hasSecondary: horizontalDerivedWords.has(result.word) || verticalDerivedWords.has(result.word)
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
        
        // Check for derived words (secondary derived from primary)
        console.log(`🔍 SOURCE DEBUG: Checking if "${word}" is a horizontal derived word`);
        for (const [parent, derived] of horizontalDerivedWords.entries()) {
          if (derived === word) {
            console.log(`🔍 SOURCE DEBUG: Found "${word}" as derived from horizontal parent "${parent}"`);
            // Find the parent's row
            for (let rowIndex = 0; rowIndex < newHorizontalWords.length; rowIndex++) {
              const wordSet = newHorizontalWords[rowIndex];
              if (wordSet.main === parent || wordSet.secondary === parent || wordSet.tertiary === parent) {
                console.log(`🔍 SOURCE DEBUG: Located parent "${parent}" in row ${rowIndex}`);
                return { 
                  type: 'derived', 
                  parent, 
                  parentSource: { type: 'row', index: rowIndex } 
                };
              }
            }
          }
        }
        
        console.log(`🔍 SOURCE DEBUG: Checking if "${word}" is a vertical derived word`);
        for (const [parent, derived] of verticalDerivedWords.entries()) {
          if (derived === word) {
            console.log(`🔍 SOURCE DEBUG: Found "${word}" as derived from vertical parent "${parent}"`);
            // Find the parent's column
            for (let colIndex = 0; colIndex < newVerticalWords.length; colIndex++) {
              const wordSet = newVerticalWords[colIndex];
              if (wordSet.main === parent || wordSet.secondary === parent || wordSet.tertiary === parent) {
                console.log(`🔍 SOURCE DEBUG: Located parent "${parent}" in column ${colIndex}`);
                return { 
                  type: 'derived', 
                  parent, 
                  parentSource: { type: 'column', index: colIndex } 
                };
              }
            }
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
    
    // Process child-parent relationships to create a proper hierarchy
    // First, create a map of all words by their word text for easy lookup
    const wordMap = new Map<string, number>();
    wordsWithGeneration.forEach((word, index) => {
      wordMap.set(word.word.toLowerCase(), index);
    });
    
    // Now, build the childWords arrays for each parent
    const processedWords = [...wordsWithGeneration];
    
    // Process horizontal derived words
    console.log(`🔍 PARENT-CHILD: Processing ${horizontalDerivedWords.size} horizontal derived word relationships`);
    console.log(`🔍🔍 DERIVED WORD MAP CONTENTS: ${Array.from(horizontalDerivedWords.entries()).map(([k,v]) => `${k} → ${v}`).join(', ') || 'No entries'}`);
    console.log(`🔍🔍 WORD MAP KEYS: ${Array.from(wordMap.keys()).slice(0, 10).join(', ') || 'No entries'}`);
    
    // New approach: Mark all secondary words independent of their parents
    for (const [parent, derived] of horizontalDerivedWords.entries()) {
      const parentIndex = wordMap.get(parent.toLowerCase());
      const childIndex = wordMap.get(derived.toLowerCase());
      
      console.log(`🔍🔍 PARENT-CHILD CHECK: Parent "${parent}" (${parentIndex !== undefined ? 'FOUND' : 'NOT FOUND'}) → Child "${derived}" (${childIndex !== undefined ? 'FOUND' : 'NOT FOUND'})`);
      
      // First, if the child exists in the cosmic words, mark it as secondary
      // regardless of whether the parent exists
      if (childIndex !== undefined) {
        console.log(`🔍 PARENT-CHILD: Marking "${derived}" as a secondary word derived from "${parent}"`);
        processedWords[childIndex].isSecondary = true;
        processedWords[childIndex].parent = parent;
        processedWords[childIndex].level = 2; // Explicitly set level to 2 for secondary words
      }
      
      // If the parent also exists, maintain the relationship for reference
      if (parentIndex !== undefined && childIndex !== undefined) {
        console.log(`🔍 PARENT-CHILD: Both parent and child exist, tracking relationship`);
        
        // Initialize childWords array if it doesn't exist
        if (!processedWords[parentIndex].childWords) {
          processedWords[parentIndex].childWords = [];
        }
        
        // Add the child to the parent's childWords array
        processedWords[parentIndex].childWords.push(processedWords[childIndex]);
      }
      
      // Log outcomes for debugging
      if (parentIndex === undefined && childIndex !== undefined) {
        console.log(`🔍 PARENT-CHILD: Only child "${derived}" passed threshold - marked as secondary (derived from "${parent}")`);
      } else if (parentIndex !== undefined && childIndex === undefined) {
        console.log(`🔍 PARENT-CHILD: Parent "${parent}" passed threshold but child "${derived}" did not`);
      } else if (parentIndex === undefined && childIndex === undefined) {
        console.log(`🔍 PARENT-CHILD: Neither parent "${parent}" nor child "${derived}" passed cosmic threshold`);
      }
    }
    
    // Process vertical derived words
    console.log(`🔍 PARENT-CHILD: Processing ${verticalDerivedWords.size} vertical derived word relationships`);
    for (const [parent, derived] of verticalDerivedWords.entries()) {
      const parentIndex = wordMap.get(parent.toLowerCase());
      const childIndex = wordMap.get(derived.toLowerCase());
      
      console.log(`🔍🔍 PARENT-CHILD CHECK: Parent "${parent}" (${parentIndex !== undefined ? 'FOUND' : 'NOT FOUND'}) → Child "${derived}" (${childIndex !== undefined ? 'FOUND' : 'NOT FOUND'})`);
      
      // First, if the child exists in the cosmic words, mark it as secondary
      // regardless of whether the parent exists
      if (childIndex !== undefined) {
        console.log(`🔍 PARENT-CHILD: Marking "${derived}" as a secondary word derived from "${parent}"`);
        processedWords[childIndex].isSecondary = true;
        processedWords[childIndex].parent = parent;
        processedWords[childIndex].level = 2; // Explicitly set level to 2 for secondary words
      }
      
      // If the parent also exists, maintain the relationship for reference
      if (parentIndex !== undefined && childIndex !== undefined) {
        console.log(`🔍 PARENT-CHILD: Both parent and child exist, tracking relationship`);
        
        // Initialize childWords array if it doesn't exist
        if (!processedWords[parentIndex].childWords) {
          processedWords[parentIndex].childWords = [];
        }
        
        // Add the child to the parent's childWords array
        processedWords[parentIndex].childWords.push(processedWords[childIndex]);
      }
      
      // Log outcomes for debugging
      if (parentIndex === undefined && childIndex !== undefined) {
        console.log(`🔍 PARENT-CHILD: Only child "${derived}" passed threshold - marked as secondary (derived from "${parent}")`);
      } else if (parentIndex !== undefined && childIndex === undefined) {
        console.log(`🔍 PARENT-CHILD: Parent "${parent}" passed threshold but child "${derived}" did not`);
      } else if (parentIndex === undefined && childIndex === undefined) {
        console.log(`🔍 PARENT-CHILD: Neither parent "${parent}" nor child "${derived}" passed cosmic threshold`);
      }
    }
    
    console.log(`🌟 PARENT-CHILD: Processed ${processedWords.length} words, establishing parent-child relationships`);
    // Count how many words have children (primary words with secondary/derived words)
    const primaryWithChildrenCount = processedWords.filter(word => word.childWords && word.childWords.length > 0).length;
    console.log(`🌟 PARENT-CHILD: Found ${primaryWithChildrenCount} primary words with secondary/derived words`);
    
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
    
    // Add to local tracking set to prevent reprocessing
    processedGridsRef.current.add(currentGridGeneration);
    
    console.log(`🔄 GRID PROCESSING COMPLETE: Grid #${currentGridGeneration} finished with ${enhancedSignificantWords.length} words`);
    console.log(`🔄 GRID TRACKING: Added grid #${currentGridGeneration} to local processed grids set`);
    console.log(`🔄 GRID TRACKING: Total processed grids: ${processedGridsRef.current.size}`);
    console.log(`🕒 GRID TIMING: Grid #${currentGridGeneration} completed at ${endTime} (${new Date(endTime).toISOString()})`);
    console.log(`⏱️ GRID PROCESSING: Time since last grid: ${totalProcessingTime}ms`);
    console.log(`🔄 GRID STATE: Processing lock: UNLOCKED`);
    console.log(`🔄 GRID COMPLETE: Grid #${currentGridGeneration} completed, waiting for next attention check`);
    
    // REMOVED: Grid processing complete event dispatch
    // This was causing duplicate message log entries with different attention scores
    // StreamingSentence.tsx now exclusively manages its own message log updates using timer-cached scores
    console.log(`📝 HOME.TSX: Grid #${currentGridGeneration} processing complete with ${enhancedSignificantWords.length} words at ${new Date(endTime).toISOString()}`);
    console.log(`📝 HOME.TSX: NO EVENT DISPATCHED - StreamingSentence has exclusive control of message log`);
    
    // NOTE: Home.tsx should NEVER write to or update the message log
    // All message log updates are now centralized in StreamingSentence.tsx with consistent attention scores
    
    // CRITICAL IMPROVEMENT: Call sequence control callback if it exists
    // This ensures that StreamingSentence.tsx knows the grid calculation is complete
    if (typeof window !== 'undefined') {
      try {
        // Set a global flag to indicate this grid was successfully generated
        // This allows StreamingSentence to release the lock even if the callback isn't executed
        if (!(window as any).GRID_GENERATION_COMPLETE) {
          (window as any).GRID_GENERATION_COMPLETE = {};
        }
        
        // Record this grid as successfully generated with timestamp and additional metadata
        (window as any).GRID_GENERATION_COMPLETE[currentGridGeneration] = {
          timestamp: Date.now(),
          success: true,
          wordCount: enhancedSignificantWords.length,
          processingTime: totalProcessingTime
        };
        
        console.log(`🔄 GRID COMPLETION REGISTRY: Added grid #${currentGridGeneration} to global completion registry`);
        console.log(`🔄 GRID COMPLETION REGISTRY: Registry now contains ${Object.keys((window as any).GRID_GENERATION_COMPLETE).length} grids`);
        
        console.log(`🚩 GENERATION FLAG: Set grid #${currentGridGeneration} as successfully generated`);
        
        // Call the callback if it exists
        if (typeof (window as any).gridCalculationComplete === 'function') {
          console.log(`🔄 SEQUENCE CALLBACK: Notifying StreamingSentence that grid #${currentGridGeneration} calculation is complete`);
          (window as any).gridCalculationComplete(currentGridGeneration);
        } else {
          console.log(`⚠️ CALLBACK MISSING: gridCalculationComplete callback not found, but grid generation flag was set`);
        }
      } catch (error) {
        console.error('Error in grid completion sequence:', error);
      }
    }
    
    // GRID CYCLING: We rely on the built-in 7-second timer in StreamingSentence.tsx
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
  
  // Handle attention threshold change from the slider
  const handleAttentionThresholdChange = (value: number) => {
    // Ensure minimum value of 20 is maintained (changed from 25 to 20)
    const safeValue = Math.max(20, value);
    
    // Update local state for UI consistency
    setAttentionThreshold(safeValue);
    
    // CRITICAL FIX: Restore event dispatch to notify StreamingSentence about threshold changes
    // The events must be dispatched from Home.tsx because that's where the slider lives
    if (typeof window !== 'undefined') {
      try {
        // Create and dispatch custom event with the new threshold value
        const thresholdEvent = new CustomEvent('attentionThresholdChanged', {
          detail: {
            threshold: safeValue,
            source: 'home-slider',
            timestamp: Date.now(),
            iteration: (window as any).beginCommunicationRunCount || 0
          }
        });
        
        // Dispatch the event for StreamingSentence to handle
        window.dispatchEvent(thresholdEvent);
        console.log(`📊 THRESHOLD: Dispatched attention threshold change event with value ${safeValue}/50`);
        
        // Also update global variable for any other components
        (window as any).ATTENTION_THRESHOLD = safeValue;
        console.log(`📊 THRESHOLD: Updated global ATTENTION_THRESHOLD to ${safeValue}/50`);
      } catch (error) {
        console.error("Error dispatching attention threshold event:", error);
      }
    }
    
    console.log(`Attention threshold UI updated to ${safeValue}/50`);
  };
  
  // Note: Attention threshold initialization has been moved to StreamingSentence.tsx
  // This is part of making StreamingSentence.tsx the exclusive source of attention-related operations
  useEffect(() => {
    console.log('🔄 ATTENTION INITIALIZATION: Now exclusively managed by StreamingSentence.tsx');
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
  
  // Add a debounce ref to prevent multiple rapid clicks
  const lastToggleTimeRef = useRef<number>(0);
  const debounceTimeMs = 1500; // 1.5 seconds debounce time
  
  const handleToggleStreamingMode = () => {
    // CRITICAL FIX: Check for the global flag that prevents reactivation
    if (typeof window !== 'undefined' && (window as any).PREVENT_STREAMING_REACTIVATION === true) {
      console.log(`⚠️ CRITICAL FIX: Blocking toggle due to PREVENT_STREAMING_REACTIVATION flag`);
      // Clear the flag so future toggles will work
      (window as any).PREVENT_STREAMING_REACTIVATION = false;
      console.log(`⚠️ CRITICAL FIX: Reset PREVENT_STREAMING_REACTIVATION flag to false`);
      return;
    }
    
    // Implement debouncing to prevent double-clicks
    const now = Date.now();
    if (now - lastToggleTimeRef.current < debounceTimeMs) {
      console.log(`⛔ Toggle action ignored - debounce period (${debounceTimeMs}ms) not elapsed`);
      return;
    }
    lastToggleTimeRef.current = now;
    
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
    
    // Important: Clear any existing interval first to prevent duplicates
    if (streamingTimerRef.current) {
      console.log("🎮 STREAMING: Clearing existing timer before state change");
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }
    
    // REMOVED: No longer resetting StreamingSentence component
    // This maintains state persistence between activations
    console.log("🚀 IMPROVED: Skipping component reset to maintain state persistence between sessions");
    
    // If enabling streaming mode, activate immediately with no delay
    if (newMode) {
      // Note: Attention threshold reset now happens in StreamingSentence.tsx
      console.log("🔄 RESET: Attention threshold reset now managed by StreamingSentence.tsx");
      // Still update local state for UI consistency
      setAttentionThreshold(20);
      
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
      
      // Automatically hide the pixel grid when streaming mode is activated
      if (showPixelGrid) {
        console.log("🔄 AUTO-HIDING PIXEL GRID: Streaming mode activated");
        setShowPixelGrid(false);
      }
      
      // CRITICAL FIX: Do NOT reset the grid counter - let it maintain continuity
      // The grid counter should ONLY change through the natural attention filter
      console.log(`🎮 STREAMING: Preserving grid counter at ${gridGenerationCounterRef.current}`);
      
      // DEPRECATED: Global CURRENT_GRID_NUMBER is no longer the source of truth but kept for backwards compatibility
      // StreamingSentence.tsx now manages grid numbers exclusively via gridNumberTrackingRef
      if (typeof window !== 'undefined') {
        // Initialize global variable if needed, but this is now just for legacy logging
        if ((window as any).CURRENT_GRID_NUMBER === undefined) {
          (window as any).CURRENT_GRID_NUMBER = gridGenerationCounterRef.current;
          console.log(`📊 GLOBAL GRID NUMBER: For legacy compatibility only - initialized to ${gridGenerationCounterRef.current}`);
        } else {
          console.log(`📊 GLOBAL GRID NUMBER: Legacy variable preserved at ${(window as any).CURRENT_GRID_NUMBER}`);
        }
        
        // REMOVED: No longer dispatching gridNumberChanged events from Home.tsx
        // Grid number synchronization is now exclusively handled by StreamingSentence.tsx
        console.log(`🔢 GRID SYNC: No need to dispatch grid events from Home.tsx - managed by StreamingSentence.tsx`);
        console.log(`🔢 GRID POLICY: Home.tsx no longer manages grid numbers`);
      }
      
      // Force the processing state to be ready for streaming
      setShowResults(true);
      setProcessingComplete(true);
      console.log("🎮 STREAMING: Set showResults and processingComplete to true");
      
      // REMOVED: No longer using opening channel animation or loading state
      
      // REMOVED: No longer forcing grid generation with forceRefreshGrids event
      // This was causing duplicate attention score calculations
      // StreamingSentence.tsx now handles grid generation via its 7-second timer cycle
      console.log("🔄 STREAMING: Removed redundant forceRefreshGrids event - StreamingSentence.tsx handles this now");
      
      // Reset the grid display to ensure proper refreshing
      console.log("🔄 STREAMING: Dispatching grid display reset event");
      const resetGridEvent = new CustomEvent('resetGridDisplay', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(resetGridEvent);
      
      // Also reset any memory variables that might be causing the delay
      if (typeof window !== 'undefined') {
        console.log(`\n🔄🔄 STREAMING MODE ACTIVATION 🔄🔄`);
        console.log(`Current attention threshold: ${attentionThreshold}/50`);
        console.log(`Current global attention threshold: ${(window as any).ATTENTION_THRESHOLD || 'undefined'}/50`);
        console.log(`Current streaming mode ref: ${streamingModeRef.current}`);
        console.log(`Current streaming mode state: ${streamingMode}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`Event: Begin Communication pressed`);
        console.log(`🔄🔄 END STREAM ACTIVATION REPORT 🔄🔄\n`);
        
        // No longer resetting attention score here - this is handled by StreamingSentence.tsx
        console.log("🔄 STREAMING: Attention state variables now managed exclusively by StreamingSentence.tsx");
        
        // Verify attention threshold is properly set
        if ((window as any).ATTENTION_THRESHOLD !== attentionThreshold) {
          console.log(`⚠️ THRESHOLD MISMATCH: Setting global threshold from ${(window as any).ATTENTION_THRESHOLD} to ${attentionThreshold}`);
          (window as any).ATTENTION_THRESHOLD = attentionThreshold;
        }
        
        // Note: Attention threshold events now exclusively handled by StreamingSentence.tsx
        console.log(`📊 ATTENTION THRESHOLD: Local UI state updated to ${attentionThreshold}`);
        // We no longer dispatch attention events from Home.tsx to ensure single responsibility
      }
    } else {
      // For deactivation, perform a complete reset of all state to simulate a page refresh
      console.log(`\n🔄🔄 STREAMING MODE DEACTIVATION 🔄🔄`);
      console.log(`Current attention threshold: ${attentionThreshold}/50`);
      console.log(`Current global attention threshold: ${(window as any).ATTENTION_THRESHOLD || 'undefined'}/50`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`Event: End Communication pressed`);
      console.log(`🔄🔄 END STREAM DEACTIVATION REPORT 🔄🔄\n`);
      
      console.log("🔄 FULL RESET: Beginning complete state reset for streaming mode deactivation");
      
      // 1. First update ref and state immediately - with proper forced cleanup
      // CRITICAL FIX: Ensure the reference is set to false BEFORE updating state
      streamingModeRef.current = false;
      console.log(`🎮 STREAMING: Set streamingModeRef.current = false directly`);
      
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
        // Grid number preservation is now handled exclusively by StreamingSentence.tsx
        console.log(`🔢 GRID PRESERVATION: Home.tsx no longer manages grid numbers during deactivation`);
        console.log(`🔢 GRID POLICY: Grid number state now exclusively managed by StreamingSentence.tsx`);
      }
      
      // Also clear our processed grids tracking
      processedGridsRef.current.clear();
      console.log("🧹 RESET: Cleared processed grids tracking");
      
      // 3. Reset any global state variables
      if (typeof window !== 'undefined') {
        // No longer setting attention score here - this is handled by StreamingSentence.tsx
        console.log("🧹 RESET: Attention state variables now managed exclusively by StreamingSentence.tsx");
        
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
        detail: { active: false, fullReset: true }
      }));
      console.log("📣 RESET: Dispatched streaming mode deactivation with full reset flag");
      
      // REMOVED: No longer resetting StreamingSentence component 
      // This maintains state persistence between Begin Communication activations
      console.log("🚀 IMPROVED: Skipping StreamingSentence reset to maintain state persistence");
      
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
      // Note: Attention reset now happens in StreamingSentence.tsx
      console.log("📣 RESET: Attention score reset now managed exclusively by StreamingSentence.tsx");
    } else {
      // For activation: The event will be dispatched immediately for faster response
      // Use window instead of document for consistent event handling
      window.dispatchEvent(new CustomEvent('streamingModeChanged', { 
        detail: { active: true }
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
      
      // Clear any existing timers to avoid conflicts
      if (streamingTimerRef.current) {
        clearInterval(streamingTimerRef.current);
        streamingTimerRef.current = null;
      }
      
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
      
      // Clean up any existing timer to prevent duplicates
      if (streamingTimerRef.current) {
        console.log("STREAMING DEBUG: Cleaning up existing interval before creating new one");
        clearInterval(streamingTimerRef.current);
        streamingTimerRef.current = null;
      }
      
      console.log("🚨 STREAMING DEBUG: No more initialization grids - relying entirely on attention checks");
      console.log("🚨 STREAMING DEBUG: Grid generation will only happen when attention score passes threshold");
    } else {
      // Update ref immediately when deactivating 
      streamingModeRef.current = false;
      console.log("STREAMING DEBUG: Setting streamingModeRef to false before cleanup");
      
      // Clear the interval when deactivated
      if (streamingTimerRef.current) {
        clearInterval(streamingTimerRef.current);
        streamingTimerRef.current = null;
        console.log("Streaming mode deactivated - cleared background processing");
      }
      
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
      if (streamingTimerRef.current) {
        console.log("STREAMING DEBUG: Cleaning up timer in useEffect cleanup");
        clearInterval(streamingTimerRef.current);
        streamingTimerRef.current = null;
      }
    };
  }, [streamingMode]); // Re-run cleanup when streaming mode changes
  
  // When React state for streaming mode changes, ensure the ref value is in sync
  useEffect(() => {
    if (streamingModeRef.current !== streamingMode) {
      console.log(`🔄 STREAMING SYNC: Updating streamingModeRef to match React state: ${streamingMode}`);
      streamingModeRef.current = streamingMode;
    }
  }, [streamingMode]);
  
  // Set up event listener for grid refresh requests from StreamingSentence
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
      // No need to check any flags from StreamingSentence.tsx
      
      // Removed all shouldGenerateGrid checks and variables
      
      // AUDIT FIX: Ensure we associate the current grid number with this grid generation
      // This ensures all words found in this grid are properly tagged with the grid number
      if (typeof window !== 'undefined') {
        (window as any).CURRENT_GRID_FOR_WORD_GENERATION = gridGenerationCounterRef.current;
        console.log(`🔢 GRID-WORD LINK: Set CURRENT_GRID_FOR_WORD_GENERATION to ${gridGenerationCounterRef.current} to tag words properly`);
      }
      
      // CRITICAL FIX: Check if current grid is already being processed
      const currentGrid = gridGenerationCounterRef.current;
      const gridCurrentlyProcessing = typeof window !== 'undefined' && 
        (window as any).GRID_UNIQUE_PROCESSING && 
        (window as any).GRID_UNIQUE_PROCESSING.has(currentGrid);
      
      if (gridCurrentlyProcessing) {
        console.log(`🚨🚨 GRID CURRENTLY PROCESSING: Grid #${currentGrid} is already being processed!`);
        
        // MODIFICATION: We no longer force increment the grid here
        // Instead we wait for the next 7-second cycle to naturally increment the grid
        // when the attention check passes
        console.log(`🔢 GRID NUMBER: Not incrementing grid - waiting for natural 7-second cycle`);
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
        - Grid currently processing: ${gridCurrentlyProcessing ? 'YES' : 'NO'}
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
      console.log(`- Currently processing: ${gridCurrentlyProcessing ? 'YES' : 'NO'}`);
      console.log(`- Using fully unconditional grid generation: YES`);
      console.log(`- Current time: ${new Date().toISOString()}`);
      
      // Track all processed grids locally for debugging
      const allProcessed = processedGridsRef.current.size > 0
        ? JSON.stringify(Array.from(processedGridsRef.current))
        : 'none';
        
      console.log(`- All processed grids (from local tracking): ${allProcessed}`);
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
      <div className={`w-full ${streamingMode ? 'flex items-center justify-center' : 'flex flex-col items-center justify-center'} h-[420px] mb-8 mt-2 px-2`}>
        <StardustTransition 
          active={streamingMode}
          cosmicWords={cosmicWords ? [...cosmicWords] : []}
          connectionText={connectionText}
        />
        
        <StreamingSentence
          active={streamingMode}
          cosmicWords={cosmicWords ? [...cosmicWords] : []}
          connectionText={connectionText}
        />
        
        {/* Credits are now in App.tsx */}
      </div>
      
      {/* Streaming mode extra UI elements - only shown when streaming mode is active */}
      {(streamingMode || streamingModeRef.current) && showResults && processingComplete && (
        // Container for active streaming mode UI elements
        <div className="w-full flex flex-col items-center justify-start mt-1 sm:mt-2 md:mt-4 px-2 sm:px-3 h-auto streaming-container">
          {/* Sliders section - increased bottom margin */}
          <div className="w-full mb-14 landscape:mb-20 md:mb-16 relative z-10 flex flex-col md:flex-row justify-center items-center gap-3 sm:gap-4 md:gap-6">
            {/* Left side - Cosmic Threshold Slider */}
            <div className="w-full md:w-[350px] lg:w-[450px] max-w-[95%] md:max-w-[48%]">
              <CosmicThresholdSlider
                threshold={cosmicThreshold}
                onChange={handleCosmicThresholdChange}
              />
            </div>
            
            {/* Right side - Attention Filter Slider */}
            <div className="w-full md:w-[350px] lg:w-[450px] max-w-[95%] md:max-w-[48%] p-2 sm:p-3 rounded-lg bg-black/80 border border-blue-400/50 mt-5">
              {/* Slider header */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-blue-400 font-bold text-sm landscape:text-base">Attention Filter:</span>
                <span className="bg-blue-500 text-white font-bold rounded-md px-2 py-1 text-xs landscape:text-sm" 
                  style={{ boxShadow: '0 0 10px rgba(0, 162, 255, 0.5)' }}>
                  {attentionThreshold}/50
                </span>
              </div>
              
              {/* Range input */}
              <div className="relative py-3 landscape:py-6">
                <input
                  type="range"
                  min="20"
                  max="50"
                  step="1"
                  value={attentionThreshold}
                  onChange={(e) => handleAttentionThresholdChange(parseInt(e.target.value))}
                  className="w-full h-5 landscape:h-7 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    WebkitAppearance: 'none',
                    outline: 'none',
                    touchAction: 'manipulation'
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Pixel Grid Toggle button with FPS counter next to it - reduced margins */}
          <div className="mb-6 sm:mb-8 md:mb-10 landscape:mb-16 z-50" style={{ marginTop: '-20px' }}>
            <div className="flex flex-col items-center justify-center sticky top-4 bg-transparent">
              {/* Pixel Grid Toggle - Always visible in a separate container at the top */}
              <div className="mb-0.5 sm:mb-1"> 
                <PixelGridToggle 
                  showPixelGrid={showPixelGrid}
                  onToggle={() => setShowPixelGrid(!showPixelGrid)}
                  attentionThreshold={attentionThreshold}
                  onAttentionThresholdChange={setAttentionThreshold}
                />
              </div>
              
              {/* FPS Counter below the button with less spacing on mobile */}
              {showPixelGrid && (
                <div className="text-xs text-blue-300 bg-black/80 px-2 py-0.5 sm:py-1 rounded mt-0.5 sm:mt-1">
                  <span id="fps-counter">-- fps</span> (gpu)
                </div>
              )}
            </div>
          </div>
          
          {/* Responsive grid container with reduced vertical margins on mobile */}
          <div className="grid-component-wrapper h-[550px] sm:h-[600px] md:h-[650px] lg:h-[700px] w-full relative mt-6 sm:mt-10">
            {showPixelGrid ? (
              <div className="flex justify-center items-center w-full mb-6 sm:mb-10 md:mb-28 lg:mb-36 md:mt-4 grid-component-container h-full">
                <div className="md:pt-8 relative" style={{ marginTop: '0px' }}>
                  <OffscreenPictureStreamer 
                    streaming={streamingMode} 
                    showPixelGrid={showPixelGrid}
                  />
                </div>
              </div>
            ) : (
              /* Empty div to maintain fixed height when grid is hidden */
              <div className="invisible h-full w-full"></div>
            )}
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
    </div>
  );
};

export default Home;