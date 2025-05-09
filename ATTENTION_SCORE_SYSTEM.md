### Attention Score System: Calculation, Slider Control, and Streaming Mode Integration

This document provides a technical breakdown of the **Attention Score system**, including how it is calculated, adjusted via UI, and integrated into real-time streaming behavior.

---

### 1. Attention Score Calculation

Defined in `client/src/lib/psychicRandomizer.ts`:

```ts
export async function calculateAttentionScore(gridNumber: number): Promise<number> {
  if (typeof window !== 'undefined' && window.attentionScore !== undefined) {
    return window.attentionScore;
  }
  const binaryArray = await getPsychicBinaryArray();
  let score = 0;
  for (let i = 0; i < 50; i++) {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    const randomIndex = buffer[0] % 65000;
    score += binaryArray[randomIndex];
    await new Promise(r => setTimeout(r, 1));
  }
  if (typeof window !== 'undefined') {
    window.GRID_ATTENTION_SCORES[gridNumber] = score;
  }
  return score;
}
```

---

### 2. Threshold UI State & Slider

In `client/src/pages/Home.tsx`:

```ts
const [attentionThreshold, setAttentionThreshold] = useState<number>(
  typeof window !== 'undefined' ? window.ATTENTION_THRESHOLD || 20 : 20
);
```

```tsx
<Slider 
  min={5} 
  max={40} 
  step={1} 
  value={[attentionThreshold]} 
  onValueChange={handleAttentionSliderChange} 
/>
```

---

### 3. Slider Change Handler & Global Propagation

```ts
const handleAttentionSliderChange = (value: number[]) => {
  const newThreshold = value[0];
  setAttentionThreshold(newThreshold);
  if (typeof window !== 'undefined') {
    window.ATTENTION_THRESHOLD = newThreshold;
    window.dispatchEvent(new CustomEvent('attentionThresholdChanged', {
      detail: { threshold: newThreshold }
    }));
  }
};
```

---

### 4. Streaming Filter Integration

In `client/src/components/StreamingSentence.tsx`:

```ts
useEffect(() => {
  if (!active) return;
  const timer = setInterval(async () => {
    const currentThreshold = window.ATTENTION_THRESHOLD || 20;
    const currentGridNumber = gridNumberRef.current;
    const attentionScore = await calculateAttentionScore(currentGridNumber);
    window.GRID_ATTENTION_SCORES[currentGridNumber] = attentionScore;
    if (attentionScore >= currentThreshold) {
      const words = await findWordsInGrid(gridLetters);
      setCurrentBatch(words);
      setShowBatch(true);
      setMessageLog(prev => [...prev, {
        gridNumber: currentGridNumber,
        attentionScore,
        words,
        timestamp: Date.now()
      }]);
    } else {
      setShowBatch(false);
    }
    gridNumberRef.current += 1;
  }, 7000);
  timerRef.current = timer;
  return () => clearInterval(timer);
}, [active]);
```

---

### 5. Key Implementation Facts

* **Binary Source**: 65,000-entry array of 1s and 0s
* **Sampling**: 50 cryptographically random indices per grid, with 1ms delay each
* **Score Range**: 0–50 max per grid
* **Threshold Setting**: Controlled via slider (default 20, adjustable to 5–40)
* **Global Access**: Threshold value lives in `window.ATTENTION_THRESHOLD`
* **Events**: `attentionThresholdChanged` custom event notifies listeners
* **Score Cache**: Stored per-grid in `window.GRID_ATTENTION_SCORES`
* **Streaming Use**: 7-second timer loop checks scores and decides grid display

---

### Afterword

The attention score system links real-time randomness with user-controlled thresholds to dynamically filter visible grids in streaming mode. Scores are stable per grid and cached for consistency.
