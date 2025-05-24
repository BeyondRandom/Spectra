# Spectra Grid Lifecycle: Event-Driven Architecture

## 🧭 Master Timing Authority

**Home.tsx** contains the **7-second safety timer**, the sole controller of grid timing.

---

## 1. ⏱️ `safetyTimer → processGrid()`

Triggered every 7 seconds. Calls `processGrid()` — the central orchestrator for grid cycles.

## 2. 🔓 `processGrid()` dispatches `gridLockReleased`

Universal signal that initiates a new grid generation cycle.

## 3. 🧬 `gridLockReleased → grid generation`

`Home.tsx` listens for this event and creates a new grid of letters.

## 4. 🔤 `gridLettersGenerated`

Fired once letters are placed into the grid.

## 5. 🧠 `gridLettersGenerated → word extraction`

A dedicated word processor listens and extracts valid words.

## 6. 🧮 `gridWordsExtracted` → parallel scoring

Triggers attention and cosmic scoring pipelines.

## 7. 🗃️ `→ gridPostedToCache`

Processed words, scores, and metadata are cached. A `gridPostedToCache` event is dispatched with full grid info.

## 8. 🎥 `StreamingSentence.tsx`

Listens **only** for `gridPostedToCache`. Displays words for 5 seconds, **without** ever triggering grid logic.

---

## ✅ Core Principles

* **Single source of truth**: `Home.tsx`
* **Event chaining** for asynchronous separation
* **Strict component responsibilities**

---

## 📌 Component Responsibilities

This flow ensures a clean, event-driven architecture where each component has a specific role:

* **Home.tsx**: Controls the safety timer and grid generation
* **Word extraction**: Processes the grid to find words
* **Scoring system**: Evaluates attention/cosmic scores
* **Cache system**: Stores processed grid data
* **StreamingSentence.tsx**: Displays the words from cache when notified
