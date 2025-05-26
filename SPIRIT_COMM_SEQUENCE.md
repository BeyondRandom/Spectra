# 🧿 Spirit Communication System: Function Flow Breakdown

This document details the exact function flow that occurs when the **"Begin Communication"** button is pressed within the spirit communication system.

---

## 1. 🟢 Begin Communication Button Click

* 🖱️ User clicks "Begin Communication" button in `GameInstructions` component.
* 🧩 Calls `onInvokeSpirits()` function passed from `Home.tsx`.

## 2. 🧠 `Home.tsx` - `invokeSpirits()` Function

* ✅ Sets `isInvoking` state to `true`.
* 🔊 Plays the "begin communication" sound effect.
* 🧭 Calls `startStreamingMode()` function.

## 3. 🚀 `Home.tsx` - `startStreamingMode()` Function

* 🟠 Sets `streamingMode` to `true`.
* 🔄 Sets `streamingModeRef.current` to `true`.
* 🔁 Resets grid number to `0`: `gridGenerationCounterRef.current = 0`.
* ❌ Clears any existing safety timer.
* 🕒 Calls `startSignedSafetyTimer()` function.

## 4. ⏱️ `Home.tsx` - `startSignedSafetyTimer()` Function

* ⌛ Creates a `setTimeout` with a 7-second delay.
* 📦 Stores timer ID in `safetyTimerRef.current`.
* 🧨 When the timer fires, executes the timer callback function.

## 5. 🔁 Safety Timer Callback (Every 7 Seconds)

* 🧮 Calculates current cycle: `Math.floor(Date.now() / 7000)`.
* 🔢 Increments grid number in global tracking reference.
* 🪄 Creates `gridLockReleased` `CustomEvent` with grid number and cycle data.
* 📤 Dispatches the event: `window.dispatchEvent(event)`.
* 🔄 Restarts timer for the next 7-second cycle.

## 6. 📥 `Home.tsx` - `handleGridLockReleased()` Event Handler

* 📡 Receives `gridLockReleased` event.
* 🧾 Extracts cycle ID and grid number from event details.
* 🛠️ Calls `processBackgroundGrid(true)` function.

## 7. 🧬 `Home.tsx` - `processBackgroundGrid()` Function

* 📖 Reads current grid number from global reference.
* 🔤 Calls `generateRandomGrid()` to create a 20x20 letter grid.
* 🧵 Processes the grid for words using a hierarchical approach.
* 🎯 Calculates attention score using binary file method.
* 🧊 Stores results in `GRID_CACHE`.
* 📡 Dispatches `gridPostedToCache` event for message log updates.

## 8. ♻️ Continuous 7-Second Cycle

* 🔁 Timer automatically restarts after each grid completion.
* 🔄 Process repeats indefinitely until "End Communication" is pressed.

---

✨ This architecture establishes a fully event-driven loop, where the 7-second safety timer acts as the sole authoritative driver of the spirit communication cycle.
