import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// Import psychic randomizer types
import { CosmicWord, evaluateWordCosmicScore, COSMIC_THRESHOLD } from "../lib/psychicRandomizer";
// Import findSecondaryWord function for derived words
import { findSecondaryWord } from "../lib/wordUtils";

// Type for the word hierarchy
interface WordHierarchy {
  main: string;
  secondary: string;
  tertiary: string;
}

// Type for word scores cache
interface WordScoreCache {
  [word: string]: number;
}

interface DialogueOutputProps {
  horizontalWords: WordHierarchy[];
  verticalWords: WordHierarchy[];
  showResults: boolean;
  processingComplete: boolean;
  cosmicWords?: CosmicWord[];
}

const DialogueOutput = ({ 
  horizontalWords,
  verticalWords,
  showResults,
  processingComplete,
  cosmicWords = []
}: DialogueOutputProps) => {
  // State to control local display state for resetting
  const [localShowResults, setLocalShowResults] = useState<boolean>(showResults);
  
  // State for word scores to avoid async calls in render
  const [wordScores, setWordScores] = useState<WordScoreCache>({});
  
  // State to track if we're computing scores
  const [computingScores, setComputingScores] = useState<boolean>(false);
  
  // Ref for the current cosmic threshold value
  const thresholdRef = useRef<number>(COSMIC_THRESHOLD);
  
  // Update local state when props change
  useEffect(() => {
    setLocalShowResults(showResults);
  }, [showResults]);
  
  // Pre-compute and cache all word scores when words change
  useEffect(() => {
    const allWords = new Set<string>();
    
    // Collect all words from horizontal rows
    horizontalWords.forEach(wordSet => {
      if (wordSet.main) {
        allWords.add(wordSet.main);
        const derivedWord = findSecondaryWord(wordSet.main);
        if (derivedWord) allWords.add(derivedWord);
      }
      if (wordSet.secondary) {
        allWords.add(wordSet.secondary);
        const derivedWord = findSecondaryWord(wordSet.secondary);
        if (derivedWord) allWords.add(derivedWord);
      }
      if (wordSet.tertiary) {
        allWords.add(wordSet.tertiary);
        const derivedWord = findSecondaryWord(wordSet.tertiary);
        if (derivedWord) allWords.add(derivedWord);
      }
    });
    
    // Collect all words from vertical columns
    verticalWords.forEach(wordSet => {
      if (wordSet.main) {
        allWords.add(wordSet.main);
        const derivedWord = findSecondaryWord(wordSet.main);
        if (derivedWord) allWords.add(derivedWord);
      }
      if (wordSet.secondary) {
        allWords.add(wordSet.secondary);
        const derivedWord = findSecondaryWord(wordSet.secondary);
        if (derivedWord) allWords.add(derivedWord);
      }
      if (wordSet.tertiary) {
        allWords.add(wordSet.tertiary);
        const derivedWord = findSecondaryWord(wordSet.tertiary);
        if (derivedWord) allWords.add(derivedWord);
      }
    });
    
    // Don't compute scores if we don't have any words or if we're not showing results
    if (!allWords.size || !showResults || !processingComplete) return;
    
    // NEVER cache scores as that defeats the purpose of the quantum decoder
    // Always recompute ALL scores each time for true quantum approximation behavior
    const wordsToCompute = Array.from(allWords);
    
    // Reset scores entirely each time
    setWordScores({});
    
    console.log(`Pre-computing scores for ${wordsToCompute.length} new words...`);
    setComputingScores(true);
    
    // Process words in controlled batches to prevent overloading, but NEVER cache results
    const computeScores = async () => {
      // Maximum words to process in parallel 
      // Increased from 3 to 10 now that we've fixed the promise issues
      const BATCH_SIZE = 10;
      const tempScores: {word: string, score: number}[] = [];
      let processedCount = 0;
      
      try {
        // Process words in batches to limit parallel operations
        for (let i = 0; i < wordsToCompute.length; i += BATCH_SIZE) {
          console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(wordsToCompute.length/BATCH_SIZE)}`);
          
          // Get the current batch of words
          const batch = wordsToCompute.slice(i, i + BATCH_SIZE);
          
          // Process batch in parallel, but with controlled concurrency
          const batchPromises = batch.map(async (word) => {
            try {
              // Add a small stagger time between words in the same batch
              // This helps prevent all words from starting their 50 passes simultaneously
              await new Promise(resolve => setTimeout(resolve, 50 * (batch.indexOf(word))));
              
              // Get a FRESH score every time - NEVER cache cosmic scores as that breaks the decoder
              const score = await evaluateWordCosmicScore(word);
              processedCount++;
              
              // Update progress after each word
              if (processedCount % 5 === 0 || processedCount === wordsToCompute.length) {
                console.log(`Word scoring progress: ${processedCount}/${wordsToCompute.length}`);
              }
              
              return { word, score };
            } catch (error) {
              console.error(`Error computing score for word "${word}":`, error);
              return { word, score: 0 };
            }
          });
          
          // Wait for current batch to complete before starting next batch
          const batchResults = await Promise.all(batchPromises);
          tempScores.push(...batchResults);
          
          // Add a small pause between batches
          if (i + BATCH_SIZE < wordsToCompute.length) {
            console.log('Pausing between batches...');
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Store current scores just to display in UI but discard after rendering
        const currentScores: WordScoreCache = {};
        tempScores.forEach(({ word, score }) => {
          currentScores[word] = score;
        });
        
        console.log(`Computed ${tempScores.length} fresh word scores (not cached)`);
        
        // Set current scores for this render cycle
        // No need to clear them after a delay as we are no longer dependent on wordScores changes
        setWordScores(currentScores);
      } catch (error) {
        console.error("Error computing word scores:", error);
      } finally {
        setComputingScores(false);
      }
    };
    
    computeScores();
  }, [horizontalWords, verticalWords, showResults, processingComplete]);
  
  // Listen for cosmic threshold changes
  useEffect(() => {
    const handleCosmicThresholdChange = (e: CustomEvent) => {
      if (e.detail && typeof e.detail.threshold === 'number') {
        thresholdRef.current = e.detail.threshold;
        console.log(`🔮 DialogueOutput: Updated threshold reference to ${thresholdRef.current}`);
      }
    };
    
    window.addEventListener('cosmic-threshold-change', handleCosmicThresholdChange as EventListener);
    
    return () => {
      window.removeEventListener('cosmic-threshold-change', handleCosmicThresholdChange as EventListener);
    };
  }, []);
  
  // Listen for application reset events
  useEffect(() => {
    const handleResetGridDisplay = (e: CustomEvent) => {
      console.log("🧹 RESET: Received reset grid display event in DialogueOutput", e.detail);
      
      // Reset local display state to hide results immediately
      setLocalShowResults(false);
      
      // Clear word scores cache
      setWordScores({});
      
      console.log("🧹 RESET: DialogueOutput component reset completed");
    };
    
    window.addEventListener('resetGridDisplay', handleResetGridDisplay as EventListener);
    
    return () => {
      window.removeEventListener('resetGridDisplay', handleResetGridDisplay as EventListener);
    };
  }, []);

  // Helper function to safely get a word score
  const getWordScore = (word: string | undefined): string => {
    if (!word) return '0';
    
    const score = wordScores[word];
    if (score === undefined) return '...';
    return score.toString(); // Keep the actual numeric value
  };

  return (
    <motion.div 
      className="w-full max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hidden section that maintains background functionality but isn't visible */}
      <div className="grid grid-cols-1 landscape:grid-cols-3 md:grid-cols-3 gap-3 px-3 mx-auto max-w-[98%] sm:max-w-[96%] opacity-0 absolute pointer-events-none">
        {/* Panel 1 - Row Words (hidden visually but still functional) */}
        <div className="overflow-hidden dialogue-box">
          <div className="hidden">
            Row Words
          </div>
          <div className="p-4 text-primary/90">
            {localShowResults ? (
              processingComplete ? (
                horizontalWords.length > 0 ? (
                  // Filter only rows with words and display them in sequence
                  horizontalWords
                    .map((wordSet, index) => ({ wordSet, index }))
                    .filter(item => item.wordSet.main) // Only show rows with words
                    .sort((a, b) => a.index - b.index) // Ensure sequential order
                    .map(({ wordSet, index }) => (
                      <div key={index} className="mb-4 border-b border-gold/30 last:border-b-0 pb-2">
                        <p className="font-bold text-primary">Row {index + 1}:</p>
                        <div className="flex flex-col space-y-2 mt-1">
                          {/* Primary word with its derived secondary word */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="w-6 text-gold/90">1.</span>
                                <span className="text-gold font-medium">{wordSet.main}</span>
                              </div>
                              <span className="text-gold/70 text-xs">{getWordScore(wordSet.main)}/50</span>
                            </div>
                            
                            {/* Show derived secondary word from main word */}
                            {wordSet.main && (
                              <div className="pl-6 flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-gold/50 mr-1">→</span>
                                  <span className="text-gold/70 text-sm font-light italic">
                                    {findSecondaryWord(wordSet.main) || "No derived word"}
                                  </span>
                                </div>
                                {findSecondaryWord(wordSet.main) && (
                                  <span className="text-gold/70 text-xs">
                                    {getWordScore(findSecondaryWord(wordSet.main))}/50
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Secondary word (independent) with its derived word */}
                          {wordSet.secondary && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="w-6 text-gold/70">2.</span>
                                  <span className="text-gold/80">{wordSet.secondary}</span>
                                </div>
                                <span className="text-gold/70 text-xs">{getWordScore(wordSet.secondary)}/50</span>
                              </div>
                              
                              {/* Show derived secondary word */}
                              <div className="pl-6 flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-gold/40 mr-1">→</span>
                                  <span className="text-gold/60 text-sm font-light italic">
                                    {findSecondaryWord(wordSet.secondary) || "No derived word"}
                                  </span>
                                </div>
                                {findSecondaryWord(wordSet.secondary) && (
                                  <span className="text-gold/70 text-xs">
                                    {getWordScore(findSecondaryWord(wordSet.secondary))}/50
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Tertiary word (independent) with its derived word */}
                          {wordSet.tertiary && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="w-6 text-gold/60">3.</span>
                                  <span className="text-gold/60">{wordSet.tertiary}</span>
                                </div>
                                <span className="text-gold/70 text-xs">{getWordScore(wordSet.tertiary)}/50</span>
                              </div>
                              
                              {/* Show derived secondary word */}
                              <div className="pl-6 flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-gold/30 mr-1">→</span>
                                  <span className="text-gold/50 text-sm font-light italic">
                                    {findSecondaryWord(wordSet.tertiary) || "No derived word"}
                                  </span>
                                </div>
                                {findSecondaryWord(wordSet.tertiary) && (
                                  <span className="text-gold/70 text-xs">
                                    {getWordScore(findSecondaryWord(wordSet.tertiary))}/50
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-primary/80">No words found in rows</p>
                )
              ) : (
                <div className="flex justify-center items-center h-full">
                  <motion.div
                    className="w-8 h-8 border-4 border-primary rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="ml-2">Processing rows...</p>
                </div>
              )
            ) : (
              <p className="text-primary/80 text-center italic">
                Invoke the spirits to reveal row words
              </p>
            )}
          </div>
        </div>
        
        {/* Panel 2 - Column Words (hidden visually but still functional) */}
        <div className="overflow-hidden dialogue-box">
          <div className="hidden">
            Column Words
          </div>
          <div className="p-4 text-primary/90">
            {localShowResults ? (
              processingComplete ? (
                verticalWords.length > 0 ? (
                  // Filter only columns with words and display them in sequence
                  verticalWords
                    .map((wordSet, index) => ({ wordSet, index }))
                    .filter(item => item.wordSet.main) // Only show columns with words
                    .sort((a, b) => a.index - b.index) // Ensure sequential order
                    .map(({ wordSet, index }) => (
                      <div key={index} className="mb-4 border-b border-gold/30 last:border-b-0 pb-2">
                        <p className="font-bold text-primary">Column {index + 1}:</p>
                        <div className="flex flex-col space-y-2 mt-1">
                          {/* Primary word with its derived secondary word */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="w-6 text-gold/90">1.</span>
                                <span className="text-gold font-medium">{wordSet.main}</span>
                              </div>
                              <span className="text-gold/70 text-xs">{getWordScore(wordSet.main)}/50</span>
                            </div>
                            
                            {/* Show derived secondary word from main word */}
                            {wordSet.main && (
                              <div className="pl-6 flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-gold/50 mr-1">→</span>
                                  <span className="text-gold/70 text-sm font-light italic">
                                    {findSecondaryWord(wordSet.main) || "No derived word"}
                                  </span>
                                </div>
                                {findSecondaryWord(wordSet.main) && (
                                  <span className="text-gold/70 text-xs">
                                    {getWordScore(findSecondaryWord(wordSet.main))}/50
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Secondary word (independent) with its derived word */}
                          {wordSet.secondary && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="w-6 text-gold/70">2.</span>
                                  <span className="text-gold/80">{wordSet.secondary}</span>
                                </div>
                                <span className="text-gold/70 text-xs">{getWordScore(wordSet.secondary)}/50</span>
                              </div>
                              
                              {/* Show derived secondary word */}
                              <div className="pl-6 flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-gold/40 mr-1">→</span>
                                  <span className="text-gold/60 text-sm font-light italic">
                                    {findSecondaryWord(wordSet.secondary) || "No derived word"}
                                  </span>
                                </div>
                                {findSecondaryWord(wordSet.secondary) && (
                                  <span className="text-gold/70 text-xs">
                                    {getWordScore(findSecondaryWord(wordSet.secondary))}/50
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Tertiary word (independent) with its derived word */}
                          {wordSet.tertiary && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="w-6 text-gold/60">3.</span>
                                  <span className="text-gold/60">{wordSet.tertiary}</span>
                                </div>
                                <span className="text-gold/70 text-xs">{getWordScore(wordSet.tertiary)}/50</span>
                              </div>
                              
                              {/* Show derived secondary word */}
                              <div className="pl-6 flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-gold/30 mr-1">→</span>
                                  <span className="text-gold/50 text-sm font-light italic">
                                    {findSecondaryWord(wordSet.tertiary) || "No derived word"}
                                  </span>
                                </div>
                                {findSecondaryWord(wordSet.tertiary) && (
                                  <span className="text-gold/70 text-xs">
                                    {getWordScore(findSecondaryWord(wordSet.tertiary))}/50
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-primary/80">No words found in columns</p>
                )
              ) : (
                <div className="flex justify-center items-center h-full">
                  <motion.div
                    className="w-8 h-8 border-4 border-primary rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="ml-2">Processing columns...</p>
                </div>
              )
            ) : (
              <p className="text-primary/80 text-center italic">
                Invoke the spirits to reveal column words
              </p>
            )}
          </div>
        </div>
        
        {/* Panel 3 - Cosmic Words (part of the panel still has functionality) */}
        <div className="overflow-hidden dialogue-box">
          <div className="p-4 text-primary/90">
            {localShowResults ? (
              processingComplete ? (
                <div className="space-y-4">
                  <div className="mb-2">
                    <p className="text-blue-400 font-medium">Cosmic Significance</p>
                    
                    {cosmicWords.length > 0 ? (
                      <div className="space-y-3 text-gold/90">
                        {cosmicWords.map((word, idx) => (
                          <div key={idx} className="mt-2">
                            <div className="flex items-start">
                              <div className="flex-1">
                                {/* Check for extended word properties */}
                                {(word as any).primaryWord && (word as any).secondaryWords && (word as any).secondaryWords.length > 0 ? (
                                  // This is a primary word with higher-scoring secondary words
                                  <>
                                    {(word as any).secondaryWords
                                      .sort((a: any, b: any) => b.score - a.score)
                                      .map((secWord: any, secIdx: number) => (
                                        <div 
                                          key={`${idx}-${secIdx}`} 
                                          className="mb-2 last:mb-0"
                                        >
                                          <p className="text-xs text-blue-400/80 italic">
                                            <span>Replaced primary word: </span>
                                            <span className="text-blue-400/70">{word.word}</span>
                                            <span className="text-blue-400/50 text-[10px] ml-1">[{word.score}/50]</span>
                                          </p>
                                        </div>
                                      ))
                                    }
                                  </>
                                ) : (
                                  // This is a normal primary word with no higher-scoring secondary words
                                  <div className="rounded p-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-blue-400/90 font-medium">{word.word}</p>
                                      <span className="text-blue-400/70 text-sm">[{word.score}/50]</span>
                                    </div>
                                    {word.parent && (
                                      <p className="text-xs text-blue-400/60 italic pt-1">
                                        <span>Secondary of: </span>
                                        <span className="text-blue-400/70">{word.parent}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : computingScores ? (
                      <div className="flex flex-col items-center justify-center p-4 text-primary/60">
                        <motion.div
                          className="w-8 h-8 border-4 border-primary rounded-full border-t-transparent mb-2"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <p>Computing cosmic scores...</p>
                      </div>
                    ) : (
                      <p className="text-primary/70 text-center italic">
                        No cosmically significant words found
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center h-full space-y-4">
                  <motion.div
                    className="w-10 h-10 border-4 border-blue-400 rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="text-center">
                    <p className="text-blue-400 mb-1">Analyzing cosmic significance...</p>
                    <p className="text-blue-400/70 text-xs">Conducting 50-pass quantum evaluation</p>
                  </div>
                </div>
              )
            ) : (
              <p className="text-primary/80 text-center italic">
                Invoke the spirits to reveal cosmic insights
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DialogueOutput;