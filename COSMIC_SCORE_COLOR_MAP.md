### Cosmic Score → Word Color Mapping (HSL Spectrum)

This document defines a high-contrast HSL-based color scheme for mapping cosmic word scores (20–39) to visually distinct, meaningful hues. The goal is to represent intensity and rarity using a perceptually rich color gradient.

---

### 🔥 35–39: Hot Red Spectrum

| Score | HSL                 | Description   |
| ----- | ------------------- | ------------- |
| 39    | `hsl(340,100%,50%)` | Pink-magenta  |
| 38    | `hsl(10,100%,50%)`  | True red      |
| 37    | `hsl(25,100%,50%)`  | Hot orange    |
| 36    | `hsl(40,100%,50%)`  | Golden yellow |
| 35    | `hsl(55,100%,50%)`  | Yellow        |

---

### 🌿 30–34: Green-Yellow Transition

| Score | HSL                 | Description  |
| ----- | ------------------- | ------------ |
| 34    | `hsl(80,100%,45%)`  | Yellow-green |
| 33    | `hsl(100,100%,45%)` | Lime         |
| 32    | `hsl(130,100%,40%)` | Leaf green   |
| 31    | `hsl(160,100%,45%)` | Teal-green   |
| 30    | `hsl(180,100%,45%)` | Aqua         |

---

### ❄️ 25–29: Cyan to Blue

| Score | HSL                 | Description |
| ----- | ------------------- | ----------- |
| 29    | `hsl(200,100%,50%)` | Sky blue    |
| 28    | `hsl(220,100%,50%)` | Medium blue |
| 27    | `hsl(240,100%,50%)` | Royal blue  |
| 26    | `hsl(260,100%,55%)` | Blue-violet |
| 25    | `hsl(280,100%,60%)` | Indigo      |

---

### 🌌 20–24: Purple Spectrum

| Score | HSL                 | Description      |
| ----- | ------------------- | ---------------- |
| 24    | `hsl(300,100%,60%)` | Electric violet  |
| 23    | `hsl(315,100%,55%)` | Neon purple-pink |
| 22    | `hsl(330,100%,50%)` | Magenta-rose     |
| 21    | `hsl(345,100%,50%)` | Red-pink         |
| 20    | `hsl(0,100%,50%)`   | Pure red (wrap)  |

---

### ✨ Special Handling

* **Scores ≥ 40**: Display as **white** (`#FFFFFF`) with a **gold glow** (`text-shadow: 0 0 8px gold`)
* **Scores < 20**: Display as **black** (`#000000`) with a **red glow** (`text-shadow: 0 0 8px red`)

### Usage Notes

* Use `hsl()` CSS values directly for coloring text or UI elements.
* These values are designed for strong separation between adjacent scores.
* The range 20–39 corresponds to filtered words shown in the `StreamingSentence` component.

---
