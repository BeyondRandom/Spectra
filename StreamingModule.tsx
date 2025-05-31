import { useState, useRef, useEffect } from "react";
import squareCompass from "@assets/squarecompass2.png";
import accButton from "@assets/acc_button.png";
import showHideButton from "@assets/showhide.png";
import CycleSpeedSlider from "./CycleSpeedSlider";

// Inject fade-in animation CSS
const fadeInStyle = `
  @keyframes animate-fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: animate-fade-in 0.4s ease-out;
  }
`;

// Inject the style if it doesn't exist
if (typeof document !== 'undefined' && !document.getElementById('streaming-animations')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'streaming-animations';
  styleEl.textContent = fadeInStyle;
  document.head.appendChild(styleEl);
}



// Sandstone color palette array for cycling
const SANDSTONE_PALETTE = [
  '#1A4E0E', '#2E1B0A', '#42260F', '#563114', '#6E5C31', '#7A5E3A', 
  '#9C4E2F', '#A8573D', '#B56F34', '#C68642', '#DA9A66', '#E8AE77', 
  '#F2C79B', '#0B7707', '#086105', '#064B04', '#043603', '#032202', '#021201'
];

/**
 * Gets color for qualifying words using post-threshold mapping with cycling
 * This function maps colors only to words that passed the cosmic threshold
 * @param qualifyingWords Array of words that passed the threshold
 * @param wordScore The specific word's score 
 * @param cycleOffset Color cycling offset for the color bar rotation
 * @returns CSS color value in sandstone palette
 */
function getPostThresholdColor(qualifyingWords: any[], wordScore: number, cycleOffset: number = 0): string {
  if (qualifyingWords.length === 0) return SANDSTONE_PALETTE[0];
  
  // Sort qualifying words by score to determine relative positioning
  const sortedScores = qualifyingWords.map(w => w.cosmicScore).sort((a, b) => b - a);
  const wordIndex = sortedScores.findIndex(score => score === wordScore);
  
  // Map the word's position among qualifying words to our color palette
  const colorIndex = Math.floor((wordIndex / Math.max(1, sortedScores.length - 1)) * (SANDSTONE_PALETTE.length - 1));
  
  // Apply cycling offset to rotate through the palette
  const cycledIndex = (colorIndex + cycleOffset) % SANDSTONE_PALETTE.length;
  
  return SANDSTONE_PALETTE[cycledIndex];
}

/**
 * Legacy function - kept for backward compatibility but no longer used
 * Color assignment now happens after threshold filtering
 */
function getCosmicColor(score: number, baseHue: number = 200): string {
  // This function is no longer used - colors are assigned post-threshold
  // Keeping for any legacy references
  const normalizedScore = Math.max(0, Math.min(100, score));
  const paletteIndex = Math.floor((normalizedScore / 100) * (SANDSTONE_PALETTE.length - 1));
  return SANDSTONE_PALETTE[paletteIndex];
}

/**
 * Gets a lighter version of any hex color (2 shades lighter)
 * @param hexColor The original hex color (e.g., "#F2C79B")
 * @returns CSS color value that's 2 shades lighter
 */
function getLighterShade(hexColor: string): string {
  // Remove the # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Lighten by increasing each component by 20% towards white (2 shades lighter)
  const lightenFactor = 0.2;
  const newR = Math.min(255, Math.round(r + (255 - r) * lightenFactor));
  const newG = Math.min(255, Math.round(g + (255 - g) * lightenFactor));
  const newB = Math.min(255, Math.round(b + (255 - b) * lightenFactor));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Gets a darker version of any hex color (5 shades darker)
 * @param hexColor The original hex color (e.g., "#F2C79B")
 * @returns CSS color value that's 5 shades darker
 */
function getDarkerShade(hexColor: string): string {
  // Remove the # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Darken by reducing each component by 40% (5 shades darker)
  const darkenFactor = 0.6;
  const newR = Math.round(r * darkenFactor);
  const newG = Math.round(g * darkenFactor);
  const newB = Math.round(b * darkenFactor);
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Gets a darker version of the sandstone color for text shadows
 * @param score The cosmic score (0-100)
 * @param baseHue Optional base hue for the middle range (default: 200)
 * @returns CSS color value
 */
function getDarkerCosmicColor(score: number, baseHue: number = 200): string {
  // Get darker versions for text shadows using the same color palette
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  // Much darker versions for shadows - maintaining color relationships
  if (normalizedScore >= 95) {
    return '#0B2805'; // Very dark green shadow
  } else if (normalizedScore >= 90) {
    return '#1C0F05'; // Very dark brown shadow
  } else if (normalizedScore >= 85) {
    return '#2A1307'; // Dark chocolate shadow
  } else if (normalizedScore >= 80) {
    return '#38210A'; // Dark sandstone shadow
  } else if (normalizedScore >= 75) {
    return '#453D1D'; // Medium brown shadow
  } else if (normalizedScore >= 70) {
    return '#4F3F22'; // Warm brown shadow
  } else if (normalizedScore >= 65) {
    return '#632F1A'; // Reddish brown shadow
  } else if (normalizedScore >= 60) {
    return '#6F3621'; // Medium sandstone shadow
  } else if (normalizedScore >= 55) {
    return '#7A4B1E'; // Light brown shadow
  } else if (normalizedScore >= 50) {
    return '#855A27'; // Golden brown shadow
  } else if (normalizedScore >= 45) {
    return '#9A6542'; // Light tan shadow
  } else if (normalizedScore >= 40) {
    return '#A5734C'; // Warm tan shadow
  } else if (normalizedScore >= 35) {
    return '#C28A5E'; // Light sandstone shadow
  } else if (normalizedScore >= 30) {
    return '#054F03'; // Green accent shadow
  } else if (normalizedScore >= 25) {
    return '#043F02'; // Darker green shadow
  } else if (normalizedScore >= 20) {
    return '#033102'; // Deep green shadow
  } else if (normalizedScore >= 15) {
    return '#022301'; // Very dark green shadow
  } else if (normalizedScore >= 10) {
    return '#021701'; // Almost black green shadow
  } else {
    return '#010B00'; // Darkest shadow
  }
}

/**
 * Gets a darker version of the cosmic color for borders
 * @param score The cosmic score (0-100)
 * @param baseHue Optional base hue for the middle range (default: 200)
 * @returns CSS color value of the darker border color
 */
function getDarkerCosmicBorderColor(score: number, baseHue: number = 200): string {
  // Get moderately darker versions for borders using the same color palette
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  // Moderately darker versions for borders - a few shades darker than base
  if (normalizedScore >= 95) {
    return '#103307'; // Dark green border
  } else if (normalizedScore >= 90) {
    return '#201407'; // Dark brown border
  } else if (normalizedScore >= 85) {
    return '#2E1A0B'; // Dark chocolate border
  } else if (normalizedScore >= 80) {
    return '#3C2310'; // Dark sandstone border
  } else if (normalizedScore >= 75) {
    return '#4A3F1F'; // Medium brown border
  } else if (normalizedScore >= 70) {
    return '#533E25'; // Warm brown border
  } else if (normalizedScore >= 65) {
    return '#6B331D'; // Reddish brown border
  } else if (normalizedScore >= 60) {
    return '#743826'; // Medium sandstone border
  } else if (normalizedScore >= 55) {
    return '#7E4A23'; // Light brown border
  } else if (normalizedScore >= 50) {
    return '#8A5A2D'; // Golden brown border
  } else if (normalizedScore >= 45) {
    return '#986A45'; // Light tan border
  } else if (normalizedScore >= 40) {
    return '#A07656'; // Warm tan border
  } else if (normalizedScore >= 35) {
    return '#B98B6E'; // Light sandstone border
  } else if (normalizedScore >= 30) {
    return '#075204'; // Green accent border
  } else if (normalizedScore >= 25) {
    return '#054003'; // Darker green border
  } else if (normalizedScore >= 20) {
    return '#042E02'; // Deep green border
  } else if (normalizedScore >= 15) {
    return '#032001'; // Very dark green border
  } else if (normalizedScore >= 10) {
    return '#021501'; // Almost black green border
  } else {
    return '#010E00'; // Darkest border
  }
}

// Default font size for grid words (increased for better readability)
const GRID_WORD_FONT_SIZE = '1.3rem'; // ~21px (increased from 18px)

/**
 * Simple communication interface that displays streaming messages
 * Shows a blue glass container when "Begin Communication" is active
 */
export default function StreamingModule(props: {
  active: boolean;
  attentionThreshold?: number;
  cosmicThreshold?: number;
  soundEnabled?: boolean;
}) {
  const { active, attentionThreshold = 15, cosmicThreshold = 33 } = props;
  
  // Track the current grid number - starting at 1
  const gridNumberRef = useRef<number>(1);
  
  // Local state for attention threshold (updated by slider events)
  const [localAttentionThreshold, setLocalAttentionThreshold] = useState<number>(attentionThreshold);
  
  // Local state for cosmic threshold (updated by slider events)
  const [localCosmicThreshold, setLocalCosmicThreshold] = useState<number>(cosmicThreshold);
  
  // State for hiding empty message log entries - default to true (hide empty grids on startup)
  const [hideEmptyEntries, setHideEmptyEntries] = useState<boolean>(true);
  
  // Reference for the grid incrementer timer
  const gridTimerRef = useRef<number | null>(null);
  
  // Track if we should show the interface
  const [isVisible, setIsVisible] = useState<boolean>(active);
  
  // State for color cycling offset (rotates the color bar)
  const [colorCycleOffset, setColorCycleOffset] = useState<number>(0);
  
  // Timer for cycling through colors
  const colorCycleTimerRef = useRef<number | null>(null);
  
  // State for message log freeze functionality
  const [isMessageLogFrozen, setIsMessageLogFrozen] = useState(false);
  const [frozenScrollTop, setFrozenScrollTop] = useState(0);
  

  
  // Current display state for the streaming section
  const [currentDisplay, setCurrentDisplay] = useState<{
    gridNumber: number;
    attentionScore: number;
    emoji?: string;
    words: Array<{
      word: string;
      attentionScore: number;
      cosmicScore: number;
      frequency?: number;
    }>;
  }>({
    gridNumber: 0,
    attentionScore: 0,
    words: []
  });
  
  // Message log state for historical record
  const [messageLog, setMessageLog] = useState<Array<{
    gridNumber: number;
    words: Array<{ 
      word: string; 
      attentionScore: number; 
      cosmicScore: number; 
      frequency?: number;
    }>;
    timestamp: number;
    attentionScore: number; // Grid's attention score for filtering
    emoji?: string; // Emoji for this grid
  }>>([]);
  
  // Reading anchor system - tracks which grid the user is currently viewing
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const readingAnchorRef = useRef<{
    anchoredGridNumber: number | null;
    isUserScrolling: boolean;
    lastScrollPosition: number;
  }>({
    anchoredGridNumber: null,
    isUserScrolling: false,
    lastScrollPosition: 0
  });
  
  // Handle prop changes
  useEffect(() => {
    setIsVisible(active);
  }, [active]);
  
  // Event-based scroll position preservation system
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleMessageLogUpdate = (event: CustomEvent) => {
      const { gridNumber, wordCount } = event.detail;
      
      // Capture scroll position BEFORE the React state update causes DOM re-render
      const currentScrollTop = container.scrollTop;
      const beforeScrollHeight = container.scrollHeight;
      
      console.log(`📜 EVENT: Grid #${gridNumber} added, capturing scroll=${currentScrollTop}px, height=${beforeScrollHeight}px`);
      
      // Wait for React to re-render the message log with new content
      setTimeout(() => {
        const afterScrollHeight = container.scrollHeight;
        const addedHeight = afterScrollHeight - beforeScrollHeight;
        
        if (currentScrollTop > 0 && addedHeight > 0) {
          // Compensate scroll position by the exact height that was added
          const newScrollTop = currentScrollTop + addedHeight;
          container.scrollTop = newScrollTop;
          
          console.log(`📜 COMPENSATED: ${currentScrollTop}px → ${newScrollTop}px (+${addedHeight}px for grid #${gridNumber})`);
        } else if (currentScrollTop === 0) {
          console.log(`📜 AT TOP: Natural scroll for new grid #${gridNumber}`);
        } else {
          console.log(`📜 NO CHANGE: scroll=${currentScrollTop}px, heightDiff=${addedHeight}px`);
        }
      }, 10); // Short delay to allow React re-render
    };

    // Listen for the custom event dispatched after message log updates
    window.addEventListener('messageLogUpdated', handleMessageLogUpdate as EventListener);
    
    return () => {
      window.removeEventListener('messageLogUpdated', handleMessageLogUpdate as EventListener);
    };
  }, []);
  
  // Listen for attention threshold changes from the slider
  useEffect(() => {
    const handleAttentionThresholdChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.threshold === 'number') {
        setLocalAttentionThreshold(event.detail.threshold);
        console.log(`🎚️ STREAMING MODULE: Updated attention threshold to ${event.detail.threshold}/50 for message log filtering`);
      }
    };

    window.addEventListener('attentionThresholdChanged', handleAttentionThresholdChange as EventListener);
    
    return () => {
      window.removeEventListener('attentionThresholdChanged', handleAttentionThresholdChange as EventListener);
    };
  }, []);

  // Listen for cosmic threshold changes from the slider
  useEffect(() => {
    const handleCosmicThresholdChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.threshold === 'number') {
        setLocalCosmicThreshold(event.detail.threshold);
        console.log(`🔮 STREAMING MODULE: Updated cosmic threshold to ${event.detail.threshold}/100 for word filtering`);
      }
    };

    // Listen for multiple event types to ensure we catch threshold changes
    window.addEventListener('cosmic-threshold-change', handleCosmicThresholdChange as EventListener);
    window.addEventListener('cosmic-threshold-update', handleCosmicThresholdChange as EventListener);
    document.addEventListener('cosmic-threshold-update', handleCosmicThresholdChange as EventListener);
    
    return () => {
      window.removeEventListener('cosmic-threshold-change', handleCosmicThresholdChange as EventListener);
      window.removeEventListener('cosmic-threshold-update', handleCosmicThresholdChange as EventListener);
      document.removeEventListener('cosmic-threshold-update', handleCosmicThresholdChange as EventListener);
    };
  }, []);

  // Color cycling is now user-controlled via slider, no auto-cycling

  
  // Listen for communication events
  useEffect(() => {
    // Make grid number ref available globally
    if (typeof window !== 'undefined') {
      (window as any).gridNumberTrackingRef = gridNumberRef;
    }
    
    // Begin communication handler
    const handleBegin = () => {
      setIsVisible(true);
      gridNumberRef.current = 0;
      
      // Reset message log when communication begins
      setMessageLog([]);
      
      // Reset current display
      setCurrentDisplay({
        gridNumber: 0,
        attentionScore: 0,
        words: []
      });
      
      console.log('🔄 BEGIN COMMUNICATION: Reset message log and display');
      
      // Dispatch beginCommunication event back to Home.tsx to trigger the full initialization chain
      // This ensures the background grid processing starts properly
      const beginEvent = new CustomEvent('beginCommunication', {
        detail: { 
          source: 'streamingModule',
          timestamp: Date.now(),
          resetGrid: true
        }
      });
      window.dispatchEvent(beginEvent);
      
      console.log('🔄 STREAMING MODULE: Dispatched beginCommunication event to start background processing');
    };
    
    // End communication handler
    const handleEnd = () => {
      setIsVisible(false);
    };
    
    // Register event listeners
    window.addEventListener('beginCommunication', handleBegin);
    window.addEventListener('endCommunication', handleEnd);
    
    // Cleanup
    return () => {
      window.removeEventListener('beginCommunication', handleBegin);
      window.removeEventListener('endCommunication', handleEnd);
      
      if (typeof window !== 'undefined') {
        delete (window as any).gridNumberTrackingRef;
      }
    };
  }, []);
  
  // Reference to store the display timeout
  const displayTimeoutRef = useRef<number | null>(null);
  
  /**
   * DualDisplayManagerNew - Central handler for updating both displays
   * Only listens to gridPostedToCache event for all data
   * Uses a staggered approach for updating display components
   */
  useEffect(() => {
    // Handle grid posted to cache event
    const handleGridPostedToCache = (event: CustomEvent) => {
      if (!event.detail) {
        console.log('⚠️ WARNING: Received gridPostedToCache event with no detail');
        return;
      }
      
      // Store event details for staggered processing
      const eventDetail = event.detail;
      
      // FIXED: Don't update streaming display immediately - wait for filtered results
      // The streaming display should only show words that pass the cosmic threshold
      // updateStreamingDisplay(eventDetail); // REMOVED - causes premature word flash
      
      // Process the message log which will handle both filtering AND streaming display updates
      setTimeout(() => {
        console.log('📝 MESSAGE LOG: Processing gridPostedToCache event with 100ms delay', eventDetail);
        updateMessageLog(eventDetail);
      }, 100);
    };
    
    // Simple function to update the streaming display component
    const updateStreamingDisplay = async (detail: any) => {
      const { gridNumber, attentionScore = 0, words = [] } = detail;
      
      console.log(`🎯 TOP DISPLAY: Received ${words.length} words for grid ${gridNumber}`);
      
      if (words.length > 0) {
        console.log(`🚀 TOP DISPLAY: Starting parallel word formatting for ${words.length} words`);
        
        // PARALLEL: Format all words simultaneously using Promise.all
        const formattedWords = await Promise.all(words.map(async (word: any) => {
          return {
            word: word.word || '',
            attentionScore: word.attentionScore || 0,
            cosmicScore: word.cosmicScore || word.score || 0,
            frequency: word.frequency || 1
          };
        }));
        
        console.log(`🚀 TOP DISPLAY: Completed parallel formatting of ${formattedWords.length} words`);
        
        // SEQUENTIAL: Sort by cosmic score (highest first) - this remains sequential as intended
        const sortedWords = formattedWords.sort((a, b) => b.cosmicScore - a.cosmicScore);
        
        console.log(`📊 TOP DISPLAY: Sequential cosmic score ordering complete`);
        
        // Get emoji from GRID_CACHE if available
        const gridEmoji = (typeof window !== 'undefined' && (window as any).GRID_CACHE?.emoji) || '😶';
        
        // Update display state
        setCurrentDisplay({
          gridNumber: gridNumber,
          attentionScore: attentionScore,
          emoji: gridEmoji,
          words: sortedWords
        });
        
        console.log(`✅ TOP DISPLAY: Updated with ${sortedWords.length} words for grid ${gridNumber}`);
      }
    };
    
    // Forward declaration to fix reference error
    const updateMessageLog = (detail: any): void => {
      // Get grid data from event with 30ms delay to avoid race conditions
      const { 
        gridNumber, 
        attentionScore = 0, 
        words = [], 
        timestamp = Date.now() 
      } = detail;
      
      // Use cached grid number - NEVER create our own counter
      const cachedGridNumber = gridNumber !== undefined ? gridNumber : gridNumberRef.current;
      
      // Update the ref to match cached value (read-only, never modify)
      gridNumberRef.current = cachedGridNumber;
      
      // Log the exact data structure for debugging
      console.log("📊 WORD DATA STRUCTURE:", words && words.length > 0 ? JSON.stringify(words[0]) : "No words");
      
      // COSMIC THRESHOLD CHECK ENABLED - Filter words by cosmic score
      console.log(`🔮 COSMIC THRESHOLD CHECK ENABLED - Using threshold ${localCosmicThreshold}/100`);
      
      // Process ALL words using parallel threshold evaluation with Promise.all
      const allWords = Array.isArray(words) ? words.filter(word => !!word) : [];
      
      // Parallel threshold evaluation for ALL words using Promise.all
      const thresholdEvaluationPromises = allWords.map(word => {
        return Promise.resolve().then(() => {
          const wordScore = word.cosmicScore || word.score || 0;
          const passesThreshold = wordScore >= localCosmicThreshold;
          
          // Log each word evaluation
          console.log(`📊 WORD: ${word.word}, SCORE: ${wordScore}, THRESHOLD: ${localCosmicThreshold} (${passesThreshold ? 'PASS' : 'FAIL'})`);
          
          return { word, passesThreshold, score: wordScore };
        });
      });
      
      // Use Promise.all for parallel processing, then continue with message log logic
      Promise.all(thresholdEvaluationPromises).then(evaluatedWords => {
        // Filter only the words that pass threshold for display
        const qualifiedWords = evaluatedWords.filter(item => item.passesThreshold).map(item => item.word);
        
        console.log(`🔮 COSMIC FILTER: ${qualifiedWords.length} of ${allWords.length} words passed threshold ${localCosmicThreshold}`);
        
        // Continue with the rest of the message log processing (synchronously)
        processMessageLogEntry(qualifiedWords, cachedGridNumber, attentionScore, timestamp, allWords.length);
      });
    };
    
    // Helper function to complete message log processing
    const processMessageLogEntry = (qualifiedWords: any[], cachedGridNumber: number, attentionScore: number, timestamp: number, totalWords: number) => {
      
      // TRULY PARALLEL: Sort words by cosmic score and transform them simultaneously
      // This approach uses Web Workers-like concurrency via Promise to handle both operations in parallel
      
      // First, split the work into concurrent chunks for truly parallel processing
      const parallelSortAndTransform = (() => {
        // Short circuit for trivial cases
        if (qualifiedWords.length <= 1) {
          // For single words, just format directly
          if (qualifiedWords.length === 1) {
            const word = qualifiedWords[0];
            // Create formatted word without tier levels
            return [{
              word: word.word || '',
              attentionScore: word.attentionScore || 0,
              cosmicScore: word.cosmicScore || word.score || 0
            }];
          } else {
            // Empty array case
            return [];
          }
        }
        
        // For multiple words, use massively parallel approach
        
        // Step 1: Create word-score mapping for each word in parallel
        const prepareWordPromises = qualifiedWords.map((word: any) => {
          return new Promise<{word: any, score: number}>(resolve => {
            // Each word gets processed in its own microtask
            const score = word.cosmicScore || word.score || 0;
            resolve({ word, score });
          });
        });
        
        // Step 2: Process all words simultaneously
        return Promise.all(prepareWordPromises)
          .then(wordsWithScores => {
            // Sort them all at once (JavaScript's sort runs on the main thread but is very fast)
            const sorted = [...wordsWithScores].sort((a, b) => b.score - a.score);
            return sorted.map(item => item.word);
          })
          .then(sortedWords => {
            // Transform all words simultaneously with Promise.all
            return Promise.all(sortedWords.map((word: any) => {
              return new Promise(resolve => {
                // Each word transformation happens in parallel
                let levelStr: 'primary' | 'secondary' | 'tertiary';
                
                if (typeof word.level === 'number') {
                  levelStr = [null, 'primary', 'secondary', 'tertiary'][word.level] as 'primary' | 'secondary' | 'tertiary' || 'primary';
                } else {
                  levelStr = word.isSecondary ? 'secondary' : 'primary';
                }
                
                // Create formatted word object
                resolve({
                  word: word.word || '',
                  attentionScore: word.attentionScore || 0,
                  cosmicScore: word.cosmicScore || word.score || 0,
                  frequency: word.frequency || 1,
                  level: levelStr
                });
              });
            }));
          });
      })();
      
      // For synchronous React state updates, we need to handle both Promise and direct results
      // We'll use the same pattern as before but with a crucial fix for Promises
      
      // Create a default empty array for formatted words
      const formattedWords = Array.isArray(qualifiedWords) && qualifiedWords.length > 0
        ? qualifiedWords.map((word: any) => {
            return {
              word: word.word || '',
              attentionScore: word.attentionScore || 0,
              cosmicScore: word.cosmicScore || word.score || 0,
              frequency: word.frequency || 1
            };
          })
          .sort((a, b) => b.cosmicScore - a.cosmicScore) // Sort by cosmic score (highest first)
        : [];
      
      // Launch the parallel processing in the background for future optimizations
      if (qualifiedWords.length > 1 && parallelSortAndTransform instanceof Promise) {
        // Run the parallel processing in the background
        parallelSortAndTransform.then((result: any[]) => {
          console.log(`🚀 PARALLEL PROCESSING: Completed parallel sort and transform of ${result.length} words`);
        });
      }
      
      // Clear any existing timeout
      if (displayTimeoutRef.current !== null) {
        clearTimeout(displayTimeoutRef.current);
        displayTimeoutRef.current = null;
      }
      
      // Get emoji from GRID_CACHE if available - must be before setCurrentDisplay
      const gridEmoji = (typeof window !== 'undefined' && (window as any).GRID_CACHE?.emoji) || '😶';
      
      // Update current display state only if there's an actual change to prevent unnecessary re-renders
      setCurrentDisplay(prevDisplay => {
        // Check if we really need to update to prevent flicker
        if (prevDisplay.gridNumber === cachedGridNumber && 
            prevDisplay.attentionScore === attentionScore &&
            prevDisplay.words.length === formattedWords.length) {
          // If the grid number and word count are the same, keep the existing display
          return prevDisplay;
        }
        
        return {
          gridNumber: cachedGridNumber,
          attentionScore: attentionScore,
          emoji: gridEmoji,
          words: formattedWords
        };
      });
      
      // REMOVED: No more timeout clearing - words stay visible until replaced
      // This completely eliminates the mind flashing issue
      
      // ALWAYS add to message log - every grid gets logged regardless of qualifying words
      
      // Create appropriate entry based on whether there are qualifying words
      const newEntry = formattedWords.length > 0 ? {
        gridNumber: cachedGridNumber,
        words: formattedWords,
        timestamp: timestamp,
        attentionScore: attentionScore,
        emoji: gridEmoji
      } : {
        gridNumber: cachedGridNumber,
        words: [], // Empty words array for grids with no qualifying words
        timestamp: timestamp,
        attentionScore: attentionScore,
        emoji: gridEmoji,
        noQualifyingWords: true, // Flag to indicate this grid had no qualifying words
        message: "No words above cosmic threshold to display..."
      };
      
      // Add to message log with optimization to avoid creating unnecessary arrays
      setMessageLog(prevLog => {
        // Convert any existing entries that might not have attentionScore property
        const convertedPrevLog = prevLog.map(entry => ({
          ...entry,
          // If entry doesn't have an attentionScore, default to 0
          attentionScore: entry.attentionScore !== undefined ? entry.attentionScore : 0
        }));
        
        // Keep only the most recent 50 grids for message history
        if (convertedPrevLog.length >= 50) {
          // Create a new array but reuse most existing elements
          const newLog = [newEntry, ...convertedPrevLog.slice(0, 49)];
          return newLog;
        } else {
          // Simply add to the beginning
          return [newEntry, ...convertedPrevLog];
        }
      });
      
      // FIXED: Update streaming display with FILTERED results only (no premature word flash)
      // Update current display state only if there's an actual change to prevent unnecessary re-renders
      setCurrentDisplay(prevDisplay => {
        // Check if we really need to update to prevent flicker
        if (prevDisplay.gridNumber === cachedGridNumber && 
            prevDisplay.attentionScore === attentionScore &&
            prevDisplay.words.length === formattedWords.length) {
          // If the grid number and word count are the same, keep the existing display
          return prevDisplay;
        }
        
        return {
          gridNumber: cachedGridNumber,
          attentionScore: attentionScore,
          words: formattedWords
        };
      });
      
      // Log results in a non-blocking way using setTimeout
      setTimeout(() => {
        if (formattedWords.length > 0) {
          console.log(`📝 MESSAGE LOG: Added grid #${cachedGridNumber} with ${formattedWords.length} words (scores: ${formattedWords.map((w: any) => w.cosmicScore).join(', ')})`);
        } else {
          console.log(`📝 MESSAGE LOG: Added grid #${cachedGridNumber} with no qualifying words above cosmic threshold ${localCosmicThreshold}`);
        }
        
        // Dispatch scroll preservation event AFTER message log is updated
        window.dispatchEvent(new CustomEvent('messageLogUpdated', {
          detail: { gridNumber: cachedGridNumber, wordCount: formattedWords.length }
        }));
      }, 0);
    };
    
    // Register event listener
    window.addEventListener('gridPostedToCache', handleGridPostedToCache as EventListener);
    
    // Clean up event listener and timeout when component unmounts
    return () => {
      window.removeEventListener('gridPostedToCache', handleGridPostedToCache as EventListener);
      
      // Clear any pending display timeout
      if (displayTimeoutRef.current !== null) {
        clearTimeout(displayTimeoutRef.current);
        displayTimeoutRef.current = null;
      }
    };
  }, [cosmicThreshold]); // Re-run effect if cosmic threshold changes
  
  // Don't render if not visible (either by prop or event-driven state)
  if (!isVisible && !active) {
    return null;
  }
  
  // Main component rendering
  return (
    <div className="w-full max-w-4xl mx-auto py-4">
      <div className="slate-glass-container rounded-xl border border-slate-400/40 
                     bg-slate-700/30 relative flex flex-col" 
                     style={{ height: 'auto', maxHeight: '800px' }}>
        {/* Communication Area Header */}
        <div className="border-b border-slate-500/20 bg-slate-600/10 px-4 py-3">
          <div className="flex justify-between items-center">
            <h3 className="text-slate-300 font-semibold">Communication Session</h3>
            
            {/* Sandstone color cycling display */}
            <div className="flex flex-col items-end space-y-1">
              {/* Sandstone "Word Color" text using our palette */}
              <div className="text-xs whitespace-nowrap text-center mb-1 font-medium">
                <span style={{ color: SANDSTONE_PALETTE[(0 + colorCycleOffset) % SANDSTONE_PALETTE.length] }}>W</span>
                <span style={{ color: SANDSTONE_PALETTE[(2 + colorCycleOffset) % SANDSTONE_PALETTE.length] }}>o</span>
                <span style={{ color: SANDSTONE_PALETTE[(4 + colorCycleOffset) % SANDSTONE_PALETTE.length] }}>r</span>
                <span style={{ color: SANDSTONE_PALETTE[(6 + colorCycleOffset) % SANDSTONE_PALETTE.length] }}>d</span>
                <span> </span>
                <span style={{ color: SANDSTONE_PALETTE[(8 + colorCycleOffset) % SANDSTONE_PALETTE.length] }}>C</span>
                <span style={{ color: SANDSTONE_PALETTE[(10 + colorCycleOffset) % SANDSTONE_PALETTE.length] }}>o</span>
                <span style={{ color: SANDSTONE_PALETTE[(12 + colorCycleOffset) % SANDSTONE_PALETTE.length] }}>l</span>
                <span style={{ color: SANDSTONE_PALETTE[(14 + colorCycleOffset) % SANDSTONE_PALETTE.length] }}>o</span>
                <span style={{ color: SANDSTONE_PALETTE[(16 + colorCycleOffset) % SANDSTONE_PALETTE.length] }}>r</span>
              </div>
              
              <div className="relative w-36 h-8 flex items-center">
                {/* Sandstone gradient background */}
                <div className="absolute inset-0 rounded-full overflow-hidden border border-white/20">
                  <div 
                    className="w-full h-full" 
                    style={{
                      background: `linear-gradient(to right, ${SANDSTONE_PALETTE.slice(0, 8).join(', ')})`
                    }}
                  />
                </div>
                {/* Range slider for user control */}
                <input
                  type="range"
                  min="0"
                  max={SANDSTONE_PALETTE.length - 1}
                  value={colorCycleOffset}
                  onChange={(e) => setColorCycleOffset(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {/* Golden slider knob */}
                <div 
                  className="absolute w-6 h-6 rounded-full shadow-lg transform -translate-x-1/2 pointer-events-none z-20" 
                  style={{ 
                    left: `${((colorCycleOffset / (SANDSTONE_PALETTE.length - 1)) * 100)}%`,
                    background: 'radial-gradient(circle at center, #FFD700 30%, #FFA500 100%)',
                    border: '2px solid white',
                    boxShadow: '0 0 8px rgba(255, 215, 0, 0.8)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Simple Top Display - Matches Message Log Format */}
        <div className="p-4 min-h-[210px]">
          <div className="w-full bg-slate-600/15 rounded-lg p-4 text-center min-h-[170px] 
                         flex items-center justify-center">
            {currentDisplay.words.length > 0 ? (
              <div className="w-full transition-opacity duration-300 ease-in-out">
                {/* Emoji display - consistent location above words */}
                {currentDisplay.emoji && (
                  <div className="mb-4 flex justify-center">
                    <span className="text-4xl" style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                      textShadow: '0 0 8px rgba(255,255,255,0.2)'
                    }}>
                      {currentDisplay.emoji}
                    </span>
                  </div>
                )}
                {/* Word list - Inline flow layout matching message log exactly */}
                <div className="flex flex-wrap justify-center">
                  {currentDisplay.words.map((word, index) => (
                    <span key={`word-${index}-${word.word}`}
                        className="mx-2 my-1 inline-flex flex-col items-center 
                                   transition-all duration-300 ease-in-out"
                        style={{
                          opacity: 1,
                          transform: 'translateY(0)',
                          transitionDelay: `${index * 50}ms`
                        }}>
                      <span
                        style={{
                          color: getLighterShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset)),
                          fontWeight: word.cosmicScore > 70 ? 'bold' : 'bold',
                          fontSize: GRID_WORD_FONT_SIZE,
                          filter: 'brightness(1.4) saturate(1.2)',
                          // Clean, crisp border using 5 shades darker of the same color
                          textShadow: `
                            -1px -1px 0 ${getDarkerShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset))},
                             1px -1px 0 ${getDarkerShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset))},
                            -1px  1px 0 ${getDarkerShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset))},
                             1px  1px 0 ${getDarkerShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset))}
                          `
                        }}
                      >
                        {word.word}
                        {word.frequency && word.frequency > 1 && (
                          <sup style={{
                            color: getLighterShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset)),
                            fontSize: '0.7em',
                            marginLeft: '1px',
                            textShadow: `
                              -1px -1px 0 ${getDarkerShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset))},
                               1px -1px 0 ${getDarkerShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset))},
                              -1px  1px 0 ${getDarkerShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset))},
                               1px  1px 0 ${getDarkerShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset))}
                            `
                          }}>
                            {word.frequency}
                          </sup>
                        )}
                      </span>
                      <span className="text-xs opacity-50" style={{ 
                        color: getLighterShade(getPostThresholdColor(currentDisplay.words, word.cosmicScore, colorCycleOffset)),
                        textShadow: '0 0 1px rgba(0,0,0,0.8), -0.5px -0.5px 0 rgba(0,0,0,0.5), 0.5px -0.5px 0 rgba(0,0,0,0.5), -0.5px 0.5px 0 rgba(0,0,0,0.5), 0.5px 0.5px 0 rgba(0,0,0,0.5)',
                        marginTop: '2px'
                      }}>
                        {word.cosmicScore}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Grid and Attention Score Display */}
        <div className="border-t border-slate-600/20 bg-slate-700/10 px-4 py-2">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-slate-300 text-xs">
                Grid #{currentDisplay.gridNumber} - Attention: {currentDisplay.attentionScore}/50
              </div>
            </div>
            

          </div>
        </div>
        

        
        {/* Message Log Section */}
        <div className="message-log flex flex-col h-[400px] max-h-[400px]">
          {/* Message Log Header */}
          <div className="border-b border-slate-600/20 bg-slate-700/10 px-4 py-3 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-slate-300 font-semibold">Message Log</h3>
              <div className="flex items-center gap-2">
                {/* Toggle button for hiding empty entries */}
                <button
                  onClick={() => setHideEmptyEntries(!hideEmptyEntries)}
                  className="flex flex-col items-center p-2 text-slate-300 transition-opacity duration-200 hover:opacity-80"
                  title={hideEmptyEntries ? "Show empty entries" : "Hide empty entries"}
                >
                  <img 
                    src={showHideButton}
                    alt="Toggle Empty Entries"
                    className="w-7 h-7 opacity-70 hover:opacity-90 transition-opacity duration-200"
                  />
                  <span className="text-xs mt-1">
                    {hideEmptyEntries ? "Show" : "Hide"}
                  </span>
                </button>
                
                {/* Copy button */}
                <button 
                onClick={() => {
                  // Format messages for clipboard
                  const formattedText = messageLog
                    .filter(entry => entry.attentionScore >= localAttentionThreshold)
                    // Filter out empty entries if hideEmptyEntries is enabled
                    .filter(entry => !hideEmptyEntries || entry.words.length > 0)
                    .map(entry => {
                      // Format header with grid number and scores
                      const header = `Grid #${entry.gridNumber} | Attention Score: ${entry.attentionScore}/50 | Cosmic Score: ${entry.words.length}`;
                      
                      // Format words with their scores
                      const wordsText = entry.words
                        .map(word => `${word.word} (${word.cosmicScore})`)
                        .join(' | ');
                      
                      // Combine header and words
                      return `${header}\n${wordsText}`;
                    })
                    .join('\n\n');
                  
                  // Copy to clipboard
                  navigator.clipboard.writeText(formattedText)
                    .then(() => {
                      // Show temporary "Copied!" message
                      const button = document.getElementById('copy-button');
                      const buttonText = button?.querySelector('.copy-text');
                      if (buttonText) {
                        const originalText = buttonText.textContent;
                        buttonText.textContent = 'Copied!';
                        button.classList.add('bg-slate-500/50');
                        
                        // Reset after 2 seconds
                        setTimeout(() => {
                          buttonText.textContent = originalText;
                          button.classList.remove('bg-slate-500/50');
                        }, 2000);
                      }
                    })
                    .catch(err => {
                      console.error('Failed to copy: ', err);
                    });
                }}
                id="copy-button"
                className="flex flex-col items-center p-2 text-slate-300 transition-opacity duration-200 hover:opacity-80 mt-0 sm:mt-0 mt-1.5"
              >
                <img 
                  src={squareCompass}
                  alt="Copy"
                  className="w-7 h-7 opacity-70 hover:opacity-90 transition-opacity duration-200"
                />
                <span className="copy-text text-slate-300 text-xs mt-0.5">Copy</span>
              </button>
            </div>
          </div>
          
          {/* Scrollable Message Area - explicit height and overflow settings */}
          <div 
               ref={scrollContainerRef}
               className="flex-grow p-3 message-log-scrollable overflow-y-auto overflow-x-hidden" 
               style={{
                 height: "340px",
                 maxHeight: "340px",
                 overflowAnchor: "auto", // Enable scroll anchoring
                 scrollTop: isMessageLogFrozen ? frozenScrollTop : undefined
               }}
               onMouseDown={(e) => {
                 e.preventDefault();
                 setIsMessageLogFrozen(true);
                 if (scrollContainerRef.current) {
                   setFrozenScrollTop(scrollContainerRef.current.scrollTop);
                 }
               }}
               onMouseUp={() => {
                 setIsMessageLogFrozen(false);
               }}
               onMouseLeave={() => {
                 setIsMessageLogFrozen(false);
               }}
               onTouchStart={(e) => {
                 e.preventDefault();
                 setIsMessageLogFrozen(true);
                 if (scrollContainerRef.current) {
                   setFrozenScrollTop(scrollContainerRef.current.scrollTop);
                 }
               }}
               onTouchEnd={() => {
                 setIsMessageLogFrozen(false);
               }}
               onTouchCancel={() => {
                 setIsMessageLogFrozen(false);
               }}
            >
            {messageLog.length === 0 ? (
              /* Empty State */
              <div className="text-center text-slate-300 opacity-50 py-8">
                Messages will appear here during communication
              </div>
            ) : (
              /* Message Log Entries */
              <div className="space-y-4 pb-4">
                {messageLog
                  // Filter messages by attention threshold for display only
                  .filter(entry => entry.attentionScore >= localAttentionThreshold)
                  // Filter out empty entries if hideEmptyEntries is enabled
                  .filter(entry => !hideEmptyEntries || entry.words.length > 0)
                  .map((entry, index) => (
                  <div key={`log-${entry.gridNumber}-${index}`} 
                      className={`bg-slate-700/20 rounded-lg p-3 ${index === 0 ? 'message-box-appear' : ''}`}>
                    {/* Grid header with emoji and timestamp */}
                    <div className="flex justify-between items-center mb-2 border-b border-slate-500/30 pb-1">
                      <div className="text-slate-200 font-medium flex items-center gap-2">
                        {entry.emoji && (
                          <span className="text-lg">{entry.emoji}</span>
                        )}
                        <span className="text-xs">Grid {entry.gridNumber} - Attn {entry.attentionScore}</span> 
                      </div>
                      <div className="text-slate-300/80 text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {/* Word list - Inline flow layout without boxes */}
                    <div className="flex flex-wrap justify-center">
                      {entry.words.map((word, wordIndex) => (
                        <span key={`word-${entry.gridNumber}-${wordIndex}`}
                            className="mx-2 my-1 inline-flex flex-col items-center">
                          <span
                            style={{
                              color: getLighterShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset)),
                              fontWeight: word.cosmicScore > 70 ? 'bold' : 'bold',
                              fontSize: GRID_WORD_FONT_SIZE,
                              filter: 'brightness(1.4) saturate(1.2)',
                              // Clean, crisp border using 5 shades darker of the same color
                              textShadow: `
                                -1px -1px 0 ${getDarkerShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset))},
                                 1px -1px 0 ${getDarkerShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset))},
                                -1px  1px 0 ${getDarkerShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset))},
                                 1px  1px 0 ${getDarkerShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset))}
                              `
                            }}
                          >
                            {word.word}
                            {word.frequency && word.frequency > 1 && (
                              <sup style={{
                                color: getLighterShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset)),
                                fontSize: '0.7em',
                                marginLeft: '1px',
                                textShadow: `
                                  -1px -1px 0 ${getDarkerShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset))},
                                   1px -1px 0 ${getDarkerShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset))},
                                  -1px  1px 0 ${getDarkerShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset))},
                                   1px  1px 0 ${getDarkerShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset))}
                                `
                              }}>
                                {word.frequency}
                              </sup>
                            )}
                          </span>
                          <span className="text-xs opacity-50" style={{ 
                            color: getLighterShade(getPostThresholdColor(entry.words, word.cosmicScore, colorCycleOffset)),
                            textShadow: '0 0 1px rgba(0,0,0,0.8), -0.5px -0.5px 0 rgba(0,0,0,0.5), 0.5px -0.5px 0 rgba(0,0,0,0.5), -0.5px 0.5px 0 rgba(0,0,0,0.5), 0.5px 0.5px 0 rgba(0,0,0,0.5)',
                            marginTop: '2px'
                          }}>
                            {word.cosmicScore}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Glass effect overlay with smoother transition */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400/5 to-transparent pointer-events-none opacity-70 transition-opacity duration-300"></div>
      </div>
      </div>
      
      {/* Speed Control Slider - positioned below display, above message log */}
      <div className="mt-2 !mb-0 flex justify-center" style={{ marginBottom: '0 !important' }}>
        <div className="w-full max-w-[280px]">
          <CycleSpeedSlider />
        </div>
      </div>
    </div>
  );
}