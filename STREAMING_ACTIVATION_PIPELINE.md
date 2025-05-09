### Technical Flow: Begin Communication Lifecycle

---

### 1. Click Handler Initialization in `Home.tsx`

```ts
const handleBeginCommunication = () => {
  if (soundEnabled) messageSound.play();
  setIsBeginningCommunication(true);
  setShowWelcome(false);
  setShowConnection(true);
  setConnectionActive(true);

  if (typeof window !== 'undefined') {
    window.alreadyRunBeginCommunication = true;
  }

  console.log("👋 BEGIN COMMUNICATION: Starting streaming sentence processing");
};
```

---

### 2. StreamingSentence Component Activation

```tsx
<StreamingSentence 
  active={connectionActive} 
  cosmicWords={cosmicWords} 
  connectionText={connectionText}
/>
```

---

### 3. StreamingSentence Effect Triggers

```ts
useEffect(() => {
  if (active && !streamingModeRef.current) {
    streamingModeRef.current = true;

    if (typeof window !== 'undefined') {
      window.STREAMING_MODE_ACTIVE = true;
      window.sessionStartTimestamp = Date.now();
      window.WORD_SCORES_CACHE = {};
      window.lastCompletedCycleTimestamp = 0;
      window.lastCompletedCycleNumber = 0;
    }

    gridNumberTrackingRef.current = 1;
    processedGridsSetRef.current.clear();
    gridCycleCompletedRef.current = 0;
    lastGridRequestTimeRef.current = 0;
    failedAttentionChecksRef.current = 0;
  }
  else if (!active && streamingModeRef.current) {
    streamingModeRef.current = false;
    if (typeof window !== 'undefined') {
      window.STREAMING_MODE_ACTIVE = false;
    }
    displayedGridsRef.current.clear();
  }
}, [active]);
```

---

### 4. Timer Setup for 7-Second Grid Processing Cycle

```ts
useEffect(() => {
  if (!streamingModeRef.current || !active) return;

  if (sevenSecondTimerRef.current) {
    clearInterval(sevenSecondTimerRef.current);
    sevenSecondTimerRef.current = null;
  }

  timerExecCountRef.current = 0;
  sevenSecondTimerRef.current = setInterval(() => {
    if (!streamingModeRef.current) {
      clearInterval(sevenSecondTimerRef.current);
      sevenSecondTimerRef.current = null;
      return;
    }

    timerExecCountRef.current += 1;
    gridNumberTrackingRef.current += 1;

    // Begin grid processing
    // ...

  }, 7000);

  return () => {
    timerExecCountRef.current = 0;
    if (sevenSecondTimerRef.current) {
      clearInterval(sevenSecondTimerRef.current);
      sevenSecondTimerRef.current = null;
    }
    if (typeof window !== 'undefined') {
      const cleanupEvent = new CustomEvent('streaming-cleanup-complete', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(cleanupEvent);
    }
  };
}, [streamingModeRef.current, active]);
```

---

### 5. Grid Processing Within the 7-Second Timer

```ts
isGettingAttentionScoreRef.current = true;
calculateAttentionScore().then((score) => {
  if (typeof window !== 'undefined') {
    window.attentionScore = score;
    window.attentionScoreLastUpdated = Date.now();
    window.GRID_ATTENTION_SCORES ||= {};
    window.GRID_ATTENTION_SCORES[gridNumberTrackingRef.current] = score;
  }

  if (score >= DYNAMIC_ATTENTION_THRESHOLD) {
    wordGenerationInProgressRef.current = true;
    const gridNumber = gridNumberTrackingRef.current;

    onGridCalculationStart(gridNumber).then(() => {
      wordGenerationInProgressRef.current = false;
      gridCycleCompletedRef.current = currentCycleNumber;
      if (typeof window !== 'undefined') {
        window.lastCompletedCycleTimestamp = Date.now();
        window.lastCompletedCycleNumber = currentCycleNumber;
      }
    });
  }
});
```

---

### 6. Word Generation and Cosmic Scoring

```ts
const processWordsInGrid = useCallback(async (gridNumber: number) => {
  const gridLetters = await generateLetterGrid();
  const wordsFound = scanGridForWords(gridLetters);

  const wordPromises = wordsFound.map(word =>
    evaluateWordCosmicScore(word).then(score => ({ word, score }))
  );

  const wordScoreResults = await Promise.all(wordPromises);
  const currentThreshold = COSMIC_THRESHOLD || cosmicThreshold;

  const highCosmicWords = wordScoreResults.filter(result => result.score >= currentThreshold);

  const sortedCosmicWords = highCosmicWords
    .sort((a, b) => b.score - a.score)
    .map(result => ({ 
      word: result.word, 
      score: result.score,
      gridGeneration: gridNumber
    }));

  return sortedCosmicWords;
}, [cosmicThreshold]);
```

---

### 7. Cosmic Word Evaluation

```ts
export const evaluateWordCosmicScore = (word: string): Promise<number> => {
  if (!word || globalPsychicBinaryArray.length === 0) return Promise.resolve(0);

  if (window.WORD_SCORES_CACHE?.[word] !== undefined) {
    return Promise.resolve(window.WORD_SCORES_CACHE[word]);
  }

  const getTrulyRandomPosition = (min: number, max: number): number => {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return min + (randomBuffer[0] % (max - min + 1));
  };

  let totalScore = 0;

  return (function processPasses(i = 0): Promise<number> {
    if (i >= 50) {
      window.WORD_SCORES_CACHE ||= {};
      window.WORD_SCORES_CACHE[word] = totalScore;
      return Promise.resolve(totalScore);
    }

    return delay(1).then(() => {
      const randomPosition = getTrulyRandomPosition(0, globalPsychicBinaryArray.length - 1);
      const binaryValue = globalPsychicBinaryArray[randomPosition];
      totalScore += binaryValue;
      return processPasses(i + 1);
    });
  })();
};
```

---

At the end of this process, the high-cosmic-score words and associated metadata are passed to the `StreamingSentence.tsx` component for real-time display, and logged into the message log for session history tracking. This forms the complete output pipeline from cryptographic word scoring to visual rendering and archival.
