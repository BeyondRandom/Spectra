# 🔄 Complete Spirit Communication Event Flow

## 1. ⏱️ Master Timer (Every \~7 seconds)

* `safetyTimer` (in `Home.tsx`) → dispatches `'gridLockReleased'` event

## 2. 🔓 Event Trigger

* `'gridLockReleased'` event → triggers `processBackgroundGrid()`

## 3. 🧬 Grid Processing Pipeline

`processBackgroundGrid()` executes:

* 🔤 Grid letter generation (20x20 = 400 letters)
* 🧠 Word extraction (rows/columns)
* ⚙️ Parallel word scoring
* 🧩 Secondary word derivation
* 🎯 Attention score calculation (binary file method)
* 🌌 Cosmic score calculation

## 4. 🗃️ Cache Storage

* `processBackgroundGrid()` stores data in `GRID_CACHE`
* Dispatches `'gridPostedToCache'` event

## 5. 📝 Message Log Processing

* `'gridPostedToCache'` event → 50ms delay → adds to message log (50-entry limit)

## 6. 🎥 Display Updates

* `'gridPostedToCache'` event → updates Cosmic Insights panel → 5-second display timeout

---

## 🎯 Key Function Names

* `safetyTimer` → Master controller (7-second intervals)
* `processBackgroundGrid()` → Main processing pipeline
* Grid generation → Creates 20x20 letter matrix
* Word extraction → Finds valid words in rows/columns
* Attention calculation → Binary file scoring method
* Message log processing → 50ms delayed cache-to-display
