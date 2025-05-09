### Technical Breakdown of StreamingSentence Streaming Mechanism

The `StreamingSentence` component handles two distinct UI sections:

* The **streaming section** (current grid display)
* The **message log** (historical grid display)

Here's a detailed technical breakdown of how the streaming functionality works specifically for displaying words in the current streaming section:

---

### ⚙️ Core Timer-Based Architecture

The `StreamingSentence` component operates on a timer-based system for displaying words from grids:

```
Timer Cycle → Grid Processing → Set Current Batch → Display Words → Wait → Clear → Next Grid
```

---

### 🧠 Key Technical Components

#### 1. State Management

```ts
const [currentBatch, setCurrentBatch] = useState<StreamingWord[]>([]);
const [gridNumber, setGridNumber] = useState<number>(0);
const [batchIndex, setBatchIndex] = useState<number>(0);
const [showBatch, setShowBatch] = useState<boolean>(false);
```

#### 2. Timer References and Controls

```ts
const displayTimerRef = useRef<any>(null);
const gridTimerRef = useRef<any>(null);
const ellipsisTimerRef = useRef<any>(null);
const startupTimerRef = useRef<any>(null);
```

#### 3. Grid Processing Timer Function

* Handled by `gridTimerFunction()`:

  * Runs every 7 seconds
  * Increments grid number
  * Triggers grid generation and processing
  * Dispatches event for attention score calculation

#### 4. Word Display Timer Function

* Controlled by `startDisplayCycle()`:

  * Shows words for 5 seconds
  * Hides them
  * Triggers next grid processing

---

### 🔄 Detailed Process Flow

#### ✅ Activation Trigger

* When the `active` prop becomes true:

  * `streamingModeRef.current = true`
  * Grid timer is configured

#### 🔧 Grid Processing Sequence

```
gridTimerFunction()
  → incrementGridNumber()
    → processBackgroundGrid()
      → calculateAttentionScore()
        → generateWordsForGrid()
          → dispatchGridScoreAddedEvent()
```

#### 🎞️ Display Cycle

```
startDisplayCycle()
  → setShowBatch(true)
    → [wait DISPLAY_DURATION]
      → setShowBatch(false)
        → [wait]
          → nextCycle()
```

#### 🧩 Word Batch Setting

* On receiving a valid grid in `handleGridScoreAdded()`:

  * Calls `setCurrentBatch(words)`
  * Updates current grid words shown in the streaming view

#### 🖼️ Display Rendering

```tsx
{active && showBatch && (
  <div className="flex flex-wrap justify-center p-4 mt-4 mb-8">
    {currentBatch.map((word, index) => (
      <StreamingWord 
        key={`${word.word}-${index}`}
        word={word.word}
        level={word.level}
        score={word.score}
        gridNumber={gridNumber}
        /* additional props */
      />
    ))}
  </div>
)}
```

---

### ⏱️ Timing Constants

```ts
const DISPLAY_DURATION = 5000; // 5 seconds
const GRID_INTERVAL = 7000;    // New grid every 7 seconds
```

---

### 🧵 Synchronization Mechanism

* `gridProcessingRef` prevents race conditions during grid generation
* `wordGenerationInProgressRef` ensures no concurrent word generations

---

### 🔁 Data Flow: Grid → Word → Display

1. Grid generated (20×20) in `psychicRandomizer.ts`
2. Word-finding algorithms scan grid (`wordUtils.ts`)
3. Scoring assigns cosmic values (0–50)
4. Words filtered by cosmic threshold
5. Valid words dispatched via `gridScoreAdded` event
6. `StreamingSentence` sets them as `currentBatch`
7. Render function shows them when `showBatch` is true

#### ➰ Cycle Recap

* Words **appear** for 5 seconds
* Then **disappear** briefly
* New grid generates → new words show
* **Repeat endlessly**
