### 📊 Cryptographic Scoring: Cosmic Word Evaluation via Binary Sampling

This section details the implementation of the **Cosmic Score system**, which uses the same cryptographic sampling method as the attention score system. Both systems rely on `crypto.getRandomValues` and a shared 65,000-entry binary array to generate entropy-based scores.

---

### 1. 🔐 Cosmic Score Calculation

Defined in `client/src/lib/wordUtils.ts`:

```ts
export async function calculateCosmicScore(word: string, gridNumber: number): Promise<number> {
  if (typeof window !== 'undefined' && window.WORD_SCORES_CACHE?.[word] !== undefined) {
    return window.WORD_SCORES_CACHE[word];
  }
  try {
    const binaryArray = await getPsychicBinaryArray();
    let totalScore = 0;

    for (let i = 0; i < 50; i++) {
      const randomBuffer = new Uint32Array(1);
      crypto.getRandomValues(randomBuffer);
      const randomIndex = randomBuffer[0] % 65000;
      totalScore += binaryArray[randomIndex];
      await new Promise(r => setTimeout(r, 1));
    }

    if (typeof window !== 'undefined') {
      window.WORD_SCORES_CACHE ||= {};
      window.WORD_SCORES_CACHE[word] = totalScore;
    }

    console.log(`🔮 COSMIC SCORE: Word "${word}" calculated as ${totalScore}/50`);
    return totalScore;
  } catch (error) {
    console.error(`Error calculating cosmic score for "${word}":`, error);
    return 0;
  }
}
```

---

### 2. 🔁 Technical Parallels with Attention Score

* **Randomness Source** → `crypto.getRandomValues`
* **Entropy Pool** → 65,000-entry binary array
* **Samples Per Evaluation** → 50 samples per word/grid
* **Sample Delay** → 1ms between random reads
* **Score Range** → Integer from 0–50
* **Caching** → Results stored in `window.WORD_SCORES_CACHE`

---

### 🧾 Afterword

The cosmic score system mirrors the attention scoring protocol in its cryptographic sampling method. Its entropy-driven structure enables consistent, deterministic-free evaluation—suitable for unbiased word scoring in streaming or filtered contexts.
