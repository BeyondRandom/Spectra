**Message Manager Process Flow in StreamingSentence Component**

The component that manages messages in our application is called `StreamingSentence`. This component is responsible for displaying words received from grid processing and managing the message log that shows the conversation history.

---

### Event-Based Architecture

* The `StreamingSentence` component listens for `gridScoreAdded` events
* These events are dispatched when a grid's attention score is calculated

### Message Log Update Process

* `gridScoreAdded` event → `handleGridScoreAdded()` → `setMessageLog()` → UI update

### Specific Flow with Checks

1. **Event Reception**

   * `handleGridScoreAdded` receives event with grid number, score, and words

2. **Cache Check**

   * Verifies cached attention score for the grid

3. **Grid Instance Check**

   * Checks if this is the first or second instance of this grid number
   * First instances are skipped
   * Second instances continue for processing

4. **Empty Grid Check**

   * Skips grids with no words

5. **Cosmic Threshold Check**

   * Filters out grids with no words above cosmic threshold

6. **Duplicate Content Check**

   * Prevents consecutive identical content (ignoring grid numbers)

7. **Final Update**

   * If all checks pass, the grid is added to the message log

### Key Components of the Message Log Entry

```ts
{
  gridNumber: number,
  attentionScore: number,
  words: StreamingWord[],
  timestamp: number,
  _source: string,
  _messageId: string,
  _stackTrace: string
}
```

### New Grid Instance Tracking

* We use a global tracking object: `window.GRID_INSTANCES_COUNTER`
* This maintains a count of how many times each grid number has been processed
* Our current implementation only displays the **second instance** of each grid number

---

### Why This Approach Works

This method ensures each grid number appears **once** in the final message log, but with the properly processed content from its second appearance — effectively solving the duplicate grid issue.
