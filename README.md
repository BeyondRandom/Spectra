# Spectra-X v2 - repositor BOM

Welcome to the **Spectra-X v2** protocol repository. This markdown file provides a complete overview of what's included in the new simplified architecture, core file structure, and how to contribute.

---

## 📁 Core Files Overview

These are the essential code files (self-contained) to understand and work with the project:

### 🧩 Main Application Structure:

* `client/src/pages/Home.tsx` – Main orchestration and UI
* `client/src/components/StreamingModule.tsx` – Real-time processing display
* `client/src/lib/simplifiedEventProcessor.ts` – Grid generation and word processing pipeline

### 🧠 Word Finding & Dictionary:

* `client/src/lib/simplifiedWordFinder.ts` – Exhaustive word finding from letter strands
* `client/src/lib/fullDictionary.ts` – Complete 9,500+ word dictionary (self-contained)
* `client/src/lib/wordUtils.ts` – Dictionary initialization and word validation

### 🔮 Cosmic Scoring System:

* `client/src/lib/psychicRandomizer.ts` – Cryptographic randomness and cosmic scoring
* `client/src/lib/gridUtils.ts` – Grid generation utilities

### ⚙️ Configuration:

* `package.json` – All dependencies listed
* `vite.config.ts` – Build configuration
* `tailwind.config.ts` – Styling configuration
* `tsconfig.json` – TypeScript configuration

---

## 🧷 What's Self-Contained:

✅ **Dictionary:** The complete 9,500+ word dictionary is embedded in `fullDictionary.ts`
✅ **Cosmic Scoring:** Uses browser's built-in `crypto.getRandomValues()` – no external APIs
✅ **Grid Generation:** Pure algorithmic generation using cryptographic randomness
✅ **Word Finding:** Exhaustive dictionary search algorithms
✅ **All Dependencies:** Listed in `package.json` and installable via npm

---

## 🧠 Why It's Plug-and-Play

You **DON'T** need to download anything else because:

1. **No External APIs:** Everything uses browser cryptography and local algorithms
2. **No External Databases:** Uses in-memory storage by default
3. **Complete Dictionary:** All 9,500+ words are included in the code
4. **Self-Contained Logic:** Grid generation, word finding, and cosmic scoring are all pure JavaScript functions

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Clone and run this repo to get the complete working application with all functionality.
The entire word-finding and cosmic scoring system is self-contained within your codebase.

Try out the live version: [https://spectra-x.replit.app/](https://spectra-x.replit.app/)

---

## 💡 How to Help

I'm looking for **beta testers** to:

* Try out the live version
* Report bugs, weird behavior, or questionable scoring
* Give feedback on the UX and word relevance

Whether you're into quantum randomness, ghost comms, or just curious—your feedback is valuable.

---

Thank you for helping evolve this strange protocol.

Sincerely,
**Flux**
