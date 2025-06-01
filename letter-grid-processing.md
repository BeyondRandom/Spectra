# Letter Grid Processing and Word Discovery System

This section documents the full process of generating and interpreting a 250-letter grid using parallel randomness, dictionary comparison, and intelligent deduplication to surface the most meaningful word signals from a cryptographic letter space.

---

## 🧱 Grid Architecture

### Grid Dimensions and Structure

* **Grid Size:** 5 strands × 50 letters each = 250 total letters
* **Processing Method:** Parallel row and column analysis
* **Coverage:** 55 total sequences (5 rows + 50 columns)

---

## 🔡 Parallel Letter Mapping Process

```ts
// Generate 250 random indices simultaneously
const randomArray = new Uint32Array(250);
crypto.getRandomValues(randomArray);

// Map each position to alphabet array in parallel
const gridPositions = await Promise.all(
  randomArray.map(async (randomValue, index) => {
    const alphabetIndex = randomValue % globalAlphabetArray.length;
    return globalAlphabetArray[alphabetIndex];
  })
);
```

---

## 🧠 Word Discovery Pipeline

### 1. Parallel Sequence Processing

```ts
// Process all 55 sequences simultaneously
const allSequences = [
  ...rows.map((row, index) => ({ type: 'row', index, letters: row })),
  ...columns.map((col, index) => ({ type: 'column', index, letters: col }))
];

const wordResults = await Promise.all(
  allSequences.map(sequence => findWordsInSequence(sequence.letters))
);
```

---

### 2. Dictionary Comparison Method

* **Dictionary Size:** 9,539 validated English words
* **Comparison Process:** Each sequence checked against full dictionary
* **Frequency Mapping:** Words scored by letter frequency analysis
* **Match Detection:** Substring matching within each 50-letter sequence

---

### 3. Duplicate Detection and Marking System

**Basically, we remove the duplicates to pass only one of each word to the Cosmic Scoring function (could be simplified)**

#### Initial Classification

```ts
// Count word occurrences across all sequences
const wordCounts = {};
foundWords.forEach(word => {
  wordCounts[word.text] = (wordCounts[word.text] || 0) + 1;
});

// Mark duplicates and triplicates
const categorizedWords = foundWords.map(word => ({
  ...word,
  isDuplicate: wordCounts[word.text] === 2,
  isTriplicate: wordCounts[word.text] >= 3,
  occurrenceCount: wordCounts[word.text]
}));
```

#### Deduplication Process

```ts
// Remove duplicate short words (3 letters or less)
const deduplicated = categorizedWords.filter(word => {
  if (word.text.length <= 3 && word.occurrenceCount > 1) {
    return false; // Remove short duplicates
  }
  return true;
});
```

---

### 4. Long Word Preservation Logic

#### Singular Long Word Retention

```ts
// Preserve words 4+ letters that appear only once
const preservedLongWords = foundWords.filter(word => {
  return word.text.length >= 4 && wordCounts[word.text] === 1;
});

// These bypass normal deduplication rules
const finalWordSet = [
  ...deduplicatedShortWords,
  ...preservedLongWords
];
```

#### Rationale for Length-Based Processing

* **Short Words (≤3 letters):** High probability of random coincidence, duplicates removed
* **Long Words (≥4 letters):** Lower probability of chance formation, preserved if singular
* **Cross-Sequence Analysis:** Words found in multiple row/column intersections counted to be passed to the display module in StreamingModule.tsx

---

## ⚙️ Parallel Processing Architecture

### Row Processing

```ts
// Process all 5 rows simultaneously
const rowPromises = rows.map(async (row, index) => {
  console.log(`⭐ PARALLEL ROW ${index + 1}: ${row.join('')}`);
  return await findMultipleWords(row);
});

const rowResults = await Promise.all(rowPromises);
```

### Column Processing

```ts
// Process all 50 columns simultaneously
const columnPromises = columns.map(async (column, index) => {
  console.log(`⭐ PARALLEL COLUMN ${index + 1}: ${column.join('')}`);
  return await findMultipleWords(column);
});

const columnResults = await Promise.all(columnPromises);
```

---

## 🔍 Technical Implementation Details

### Performance Optimization

* **Total Parallel Operations:** 55 sequences processed simultaneously
* **Dictionary Lookups:** Optimized substring matching algorithms
* **Memory Management:** Efficient deduplication prevents memory bloat
* **Processing Time:** Sub-second completion for entire 250-letter grid

---

## 🧩 Word Validation Pipeline

* **Sequence Extraction:** Letters pulled from grid positions
* **Dictionary Matching:** Validated against 9,539-word English dictionary
* **Frequency Scoring:** Letter frequency analysis for word probability
* **Duplicate Classification:** Multi-occurrence detection and marking
* **Length-Based Filtering:** Preservation rules based on word length
* **Final Compilation:** Deduplicated set with preserved long words

---

This system ensures comprehensive word discovery while maintaining processing efficiency through parallel operations and intelligent filtering based on word characteristics and occurrence patterns.
