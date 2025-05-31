# Spectra-X – Event Flow Reference

This document outlines the complete event flow architecture for Spectra-X, including adjustable timers, processing logic, and scoring systems.

---

## 🔄 Spectra-X Complete Event Flow

### ⏱️ Adjustable Safety Timer

* **Range:** 1000ms – 6000ms (1.0 – 6.0 seconds via Cycle Speed Slider)
* **Default:** 3300ms (3.3 seconds)
* **Control:** Horizontal slider (left = faster, right = slower)
* **Function:** `safetyTimer` in `Home.tsx` dispatches `gridLockReleased` event

### 🚨 Event Trigger

* `gridLockReleased` event → triggers `processStrandDirectly()`

---

## 🧬 Simplified 5-Strand Processing Pipeline

```ts
processStrandDirectly() => {
  Generate 5 letter strands (20 letters each = 100 total)
  Exhaustive dictionary search (~9,575 words checked per strand)
  Letter frequency validation (ensure words can be formed)
  Hybrid frequency filtering (free ≥ 2 in length & length ≥ 4)
  Parallel cosmic scoring (crypto.getRandomValues, 100 passes per word)
  Attention score calculation (50 cryptographic samples, range 0–50)
  Emoji generation (A–Z emotional mapping with crypto randomness)
}
```

---

## 🧠 Scoring Systems

* **Cosmic Scoring:** 0–100 range using cryptographic randomness (100 passes per word)
* **Attention Scoring:** 0–50 range using cryptographic sampling (50 samples per grid)
* **Cosmic Threshold:** 40–100 (configurable, default 66)
* **Logic:** Only words with cosmic score ≥ threshold pass to display

---

## 💾 Cache & Event Chain

1. Results stored in `GRID_CACHE` (replaces previous entry)
2. Includes emoji metadata for each grid
3. Dispatches `cosmicScoringComplete` event
4. Triggers `gridPostedToCache` event (still active)
5. `gridPostedToCache` → \~100ms delay → message log processing

---

## 🔁 Complete Event Chain

* **1. Timer:** `safetyTimer` → `gridLockReleased`
* **2. Processing:** `processStrandDirectly()` → strand generation → word finding
* **3. Scoring:** Cosmic (0–100) + Attention (0–50) scoring
* **4. Filtering:** Apply cosmic threshold (40–100 range)
* **5. Caching:** Store in `GRID_CACHE` with emoji
* **6. Event Cascade:** `cosmicScoringComplete` → `gridPostedToCache`
* **7. Display Coordination:** `StreamingModule + DualDisplayManagerNew`
* **8. Message Log:** 100ms delayed historical entry via `gridPostedToCache`

---

## 🖥️ Display Architecture

* **StreamingModule.tsx:** Real-time word display with cosmic filtering
* **DualDisplayManagerNew:** Coordinates between streaming and message log displays
* **Top Streaming Display:** Current words with emoji context
* **Cosmic Insights Panel:** Words above threshold with scores
* **Message Log:** Historical entries triggered by `gridPostedToCache` event

---

## 📊 Key Performance Metrics

* **75% fewer letters:** 100 vs 400 (5 strands vs 20×20 grid)
* **Complete word discovery:** Exhaustive dictionary search
* **Dual scoring:** Cosmic (0–100) and Attention (0–50)
* **Event-driven updates:** `gridPostedToCache` ensures display synchronization
* **Faster cycles:** 1.0–6.0s range vs previous fixed 7s

---

## 🎛️ User Controls

* **Cycle Speed:** 1.0s – 6.0s intervals
* **Cosmic Threshold:** 40–100 sensitivity levels
* **Real-time adjustment:** Changes take effect on next cycle
