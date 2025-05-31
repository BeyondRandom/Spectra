# Spectra Grid System

The Spectra Grid System utilizes a 20x20 square array, where each cell is populated with a letter derived from a structured random selection process. Letter selection begins in the top-left corner of the grid and proceeds sequentially across each row, moving left-to-right and then top-to-bottom.

### Alphabet Source File

A dedicated file containing 65,000 entries is used to supply the letter pool. This file is formatted as repeated sequences of the English alphabet:

```
AAAAABBBBBCCCCCDDDDDEEEEE...ZZZZZAAAAA
```

* The structure repeats the alphabet 500 times, with each letter appearing exactly 5 times per cycle.
* This redundancy allows each letter to remain in view longer within the entropy stream, increasing the opportunity for interaction by external forces.
* Without this pacing, letters would shift too quickly, making meaningful selection less likely.

### Entropic Timing

* Each letter selection is spaced with an intentional **3ms delay**.
* This delay introduces a critical window of influence where randomness can be subtly shaped or "tuned."
* Removing this delay results in incoherent outputs, as the system moves too quickly for thought-forms or external intention to influence the outcome.
* You can adjust this delay in your own implementation to experiment with signal clarity.

### Word Discovery Phase

Once the full 20x20 grid is generated:

* An algorithm scans **each row and column** to identify the **3 longest non-overlapping words** per line.
* From each primary word, a **secondary word** is derived (the next longest word formed from its letters).
* This two-tier system is necessary to ensure longer, coherent messages, rather than only receiving short or fragmented terms.

### Cosmic Score Filter

Each primary and secondary word undergoes a scoring process called the **Cosmic Score Filter**:

* 50 indices are selected from a separate **binary file** consisting of 65,000 entries formatted like:

```
11111000001111100000...
```

* This file contains an even distribution of ones and zeroes (50/50), eliminating bias.
* A **1ms delay** is introduced between each of the 50 binary selections to maintain entropic fidelity.
* The resulting score represents the **intention or energetic pressure** behind a given word.
* Higher scores suggest stronger thought-forms or clearer transmission.

### Streaming and Message Logging

* Words are ranked by Cosmic Score and displayed in the **Streaming Sentence** interface.
* Processed words, along with their scores, are added to the **Message Log**, formatted for easy copying and external AI analysis.

### Attention Check Filter

Prior to grid generation, an **Attention Check** determines whether a new grid should be created:

* This process runs a single 50-pass entropy test using the same binary file and 1ms delay per index.
* If the result does not meet the attention threshold, no grid is displayed.
* This filter serves to block ambient field noise and confirms a deliberate "intent to transmit" before committing system resources.

### Summary

The Spectra Grid System is built on a pipeline of structured randomness, entropic spacing, and layered validation filters. Each part of the system is intentionally delayed and balanced to allow for subtle influence from external energetic forces, enabling the emergence of coherent communication through randomized components.
