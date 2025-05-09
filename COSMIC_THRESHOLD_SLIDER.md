### Cosmic Threshold Slider: Technical Implementation Overview

Technical overview of the **Cosmic Threshold Slider**, covering global state, UI integration, event propagation, and filtering logic.

---

### 1. Threshold Variable Definition

Defined in `client/src/lib/psychicRandomizer.ts`:

```ts
export let COSMIC_THRESHOLD = 33;
```

---

### 2. Global Getter/Setter Binding

The slider value is exposed globally via a `window` property:

```ts
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'COSMIC_THRESHOLD_VALUE', {
    set: function(value) {
      if (typeof value === 'number' && value >= 20 && value <= 50) {
        COSMIC_THRESHOLD = value;
      }
    },
    get: function() {
      return COSMIC_THRESHOLD;
    }
  });
}
```

---

### 3. Custom Event Listener for Updates

Also in `psychicRandomizer.ts`:

```ts
if (typeof window !== 'undefined') {
  window.addEventListener('cosmic-threshold-change', (e: any) => {
    if (e.detail && typeof e.detail.threshold === 'number') {
      COSMIC_THRESHOLD = e.detail.threshold;
    }
  });
}
```

---

### 4. Slider UI Component

Implemented in `client/src/components/CosmicThresholdSlider.tsx`:

```tsx
const handleValueChange = (value: number[]) => {
  const newThreshold = value[0];
  if (newThreshold >= 20 && newThreshold <= 50) {
    setThreshold(newThreshold);
    if (onThresholdChange) onThresholdChange(newThreshold);
    if (typeof window !== 'undefined') {
      window.COSMIC_THRESHOLD_VALUE = newThreshold;
      window.dispatchEvent(new CustomEvent('cosmic-threshold-change', {
        detail: { threshold: newThreshold, timestamp: Date.now() }
      }));
    }
  }
};
```

---

### 5. Integration in Home.tsx

```tsx
<CosmicThresholdSlider 
  defaultValue={cosmicThreshold}
  onThresholdChange={handleCosmicThresholdChange}
/>
```

```ts
const handleCosmicThresholdChange = (value: number) => {
  setCosmicThreshold(value);
};
```

---

### 6. StreamingSentence Sync

Monitors slider changes:

```ts
useEffect(() => {
  const handleCosmicThresholdChange = (e: CustomEvent) => {
    const { threshold } = e.detail;
    if (threshold !== cosmicThreshValue) {
      setCosmicThreshValue(threshold);
      if (streamingModeRef.current && active) {
        setCurrentBatch([]);
        setShowBatch(false);
        displayedGridsRef.current.clear();
        setWaitingForCosmicWords(true);
        previousWordsRef.current = [];
        setBatchIndex(0);
      }
    }
  };
  window.addEventListener('cosmic-threshold-change', handleCosmicThresholdChange);
  return () => window.removeEventListener('cosmic-threshold-change', handleCosmicThresholdChange);
}, [cosmicThreshValue]);
```

---

### 7. Threshold in Word Filtering

From `psychicRandomizer.ts`:

```ts
export const filterWordsByCosmicSignificance = (
  words: string[],
  minimumScore: number = COSMIC_THRESHOLD
): Promise<CosmicWord[]> => {
  return evaluateWordsWithDelay(words, 10).then(wordScores =>
    wordScores.filter(ws => ws.score >= minimumScore).sort((a, b) => b.score - a.score)
  );
};
```

---

### 8. Usage in Home.tsx Word Pipeline

```ts
const currentThreshold = typeof COSMIC_THRESHOLD !== 'undefined' ? COSMIC_THRESHOLD : cosmicThreshold;
const highCosmicWords = wordScoreResults.filter(result => result.score >= currentThreshold);
```

---

### 9. Monitoring in DialogueOutput

```ts
useEffect(() => {
  const handleCosmicThresholdChange = (e: any) => {
    setLocalThreshold(e.detail.threshold);
  };
  setLocalThreshold(COSMIC_THRESHOLD);
  window.addEventListener('cosmic-threshold-change', handleCosmicThresholdChange);
  return () => window.removeEventListener('cosmic-threshold-change', handleCosmicThresholdChange);
}, []);
```

---

### 🔍 System Summary

**Storage**:

* `COSMIC_THRESHOLD` (global)
* `window.COSMIC_THRESHOLD_VALUE` with live binding

**UI Constraints**:

* Min: 20, Max: 50, Step: 1

**Update Flow**:

1. User slides
2. Slider sets `window.COSMIC_THRESHOLD_VALUE`
3. Custom event dispatched
4. Listening components react

**Impact**:

* All displayed words are dynamically filtered
* Real-time UI feedback
* Processing resets gracefully

---

### Afterword

The cosmic threshold system synchronizes UI input with runtime logic via global state, custom events, and listener-driven filtering updates.
