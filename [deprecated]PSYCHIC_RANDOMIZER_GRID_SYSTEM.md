### Psychic Randomizer: Grid Generation Code Structure & Alphabet System

This section documents the architecture and code-level implementation of the **psychic randomizer** responsible for generating 20×20 letter grids and scoring words for downstream message processing.

---

### 1. Letter Array Structure (Psychic Alphabet)

The psychic letter array is a static, predetermined pattern where each letter appears in 5 consecutive positions:

```
AAAAABBBBBCCCCCDDDDDEEEEE...ZZZZZAAAAA...
```

Defined in `client/src/lib/letterArrayUtils.ts`:

```ts
export const generateStaticLetterArray = (): string[] => {
  const letterArray: string[] = [];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let i = 0; i < 2500; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      const letter = alphabet[j];
      for (let k = 0; k < 5; k++) {
        letterArray.push(letter);
      }
    }
  }

  return letterArray;
};

let globalLetterArray: string[] = generateStaticLetterArray();
export const getLetterArray = (): string[] => globalLetterArray;
```

---

### 2. Grid Generation Process

Implemented in `client/src/lib/gridUtils.ts`:

```ts
export const generateLetterGrid = async (): Promise<string[][]> => {
  const grid: string[][] = Array(20).fill(null).map(() => Array(20).fill(''));

  const getRandomLetter = () => {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    const randomIndex = randomBuffer[0] % getLetterArray().length;
    return getLetterArray()[randomIndex];
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      grid[y][x] = getRandomLetter();
      await delay(3);
    }
  }

  return grid;
};
```

---

### 3. Grid Usage in `Home.tsx`

```ts
const processWordsInGrid = useCallback(async (gridNumber: number) => {
  const gridLetters = await generateLetterGrid();

  const wordsFound = scanGridForWords(gridLetters);
  // ... further processing
}, []);
```

---

### 4. Word Scanning Logic

Defined in `client/src/lib/wordUtils.ts`:

```ts
export const scanGridForWords = (grid: string[][]): string[] => {
  const words: string[] = [];
  const minWordLength = 4;

  // Horizontal scanning
  for (let y = 0; y < grid.length; y++) {
    const rowLetters = grid[y].join('');
    for (let start = 0; start <= rowLetters.length - minWordLength; start++) {
      for (let len = minWordLength; len <= rowLetters.length - start; len++) {
        const word = rowLetters.substring(start, start + len);
        if (dictionary.includes(word.toLowerCase())) words.push(word.toLowerCase());
      }
    }
  }

  // Vertical scanning
  for (let x = 0; x < grid[0].length; x++) {
    let col = '';
    for (let y = 0; y < grid.length; y++) col += grid[y][x];
    for (let start = 0; start <= col.length - minWordLength; start++) {
      for (let len = minWordLength; len <= col.length - start; len++) {
        const word = col.substring(start, start + len);
        if (dictionary.includes(word.toLowerCase())) words.push(word.toLowerCase());
      }
    }
  }

  return [...new Set(words)];
};
```

---

### 5. Binary Array for Cosmic Scoring

Defined in `client/src/lib/psychicRandomizer.ts`:

```ts
let globalPsychicBinaryArray: number[] = [];
for (let i = 0; i < 6500; i++) {
  globalPsychicBinaryArray.push(1,1,1,1,1,0,0,0,0,0);
}

const onesCount = globalPsychicBinaryArray.reduce((sum, val) => sum + val, 0);
const zerosCount = globalPsychicBinaryArray.length - onesCount;
```

---

### 🔍 Summary of Grid Generation Process

**Pattern Structure**

* **Letter array**: 5x pattern per letter: `AAAAABBBBBCCCCC...`
* **Binary array**: 5 ones, 5 zeros repeated: `11111000001111100000...`

**Grid Generation Direction**

* Fills **left-to-right**, **top-to-bottom** (reading order)
* Each cell filled with cryptographically secure random letter
* 3ms delay between each cell to avoid UI blocking

**Grid Dimensions**

* `20×20` cells = 400 total

**Word Scanning**

* Horizontal and vertical
* Words must be ≥4 characters
* Compared against static dictionary

**Cosmic Scoring**

* Uses 65,000-entry binary array
* 50 passes → each picks a random binary value
* Score = sum of selected values (range 0–50)

---

This is the complete architecture and behavior of the psychic randomizer system, including letter and binary patterns, grid timing, word scanning, and scoring logic. It provides the structural backbone for all grid-based word generation in the application.
