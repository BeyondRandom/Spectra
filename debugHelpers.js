// Debug helpers for the application

/**
 * Generates a hash for a grid based on its word content
 * This allows us to identify identical grids even if they have different grid numbers
 */
function generateGridContentHash(words) {
  if (!words || !Array.isArray(words)) return 'invalid';
  
  // CRITICAL FIX: Use consistent lowercase like StreamingSentence.tsx
  // This ensures identical words with different cases hash the same way
  const sortedWords = [...words]
    .map(w => (typeof w === 'string' ? w : w.word || ''))
    .map(w => w.toLowerCase()) // CRITICAL: Using toLowerCase consistently everywhere
    .sort();
  
  // Join with a separator that wouldn't appear in words
  return sortedWords.join('||');
}

/**
 * Tracks grid content for attention score tracking
 * This keeps a record of grid content and the scores assigned to each unique grid
 */
function trackGridContent(gridNumber, gridContent, attentionScore) {
  if (typeof window === 'undefined') return;
  
  // Initialize tracking array if it doesn't exist
  if (!window.GRID_CONTENT_TRACKING) {
    window.GRID_CONTENT_TRACKING = [];
  }
  
  // Generate a content hash for this grid
  const contentHash = generateGridContentHash(gridContent);
  
  // Add to tracking
  window.GRID_CONTENT_TRACKING.push({
    gridNumber,
    contentHash,
    attentionScore,
    timestamp: new Date().toISOString(),
    contentSample: Array.isArray(gridContent) ? 
      gridContent.slice(0, 3).map(w => typeof w === 'string' ? w : w.word || '') : 
      'invalid'
  });
  
  console.log(`📊 GRID CONTENT TRACKED: Grid #${gridNumber} with hash ${contentHash.substring(0,20)}... and score ${attentionScore}/50`);
}

/**
 * Prints the attention score cache to the console
 * Helps us understand which grid numbers have what scores
 */
/**
 * Enhanced version of printAttentionScoreCache with sorting and filtering capabilities
 * Allows Replit AI to more easily debug and analyze grid numbering issues
 * 
 * @param {Object} options - Configuration options for filtering and sorting
 * @param {number} options.minGrid - Minimum grid number to display (inclusive)
 * @param {number} options.maxGrid - Maximum grid number to display (inclusive)
 * @param {number} options.minScore - Minimum score to include (inclusive)
 * @param {number} options.maxScore - Maximum score to include (inclusive)
 * @param {boolean} options.sortByGrid - Sort by grid number (default: true)
 * @param {boolean} options.sortByScore - Sort by score (overrides sortByGrid)
 * @param {boolean} options.ascending - Sort in ascending order (default: true)
 * @param {boolean} options.highlightDuplicates - Highlight duplicate scores
 * @param {boolean} options.verbose - Include additional diagnostic information
 * @returns {Object} Analysis result with statistics and filtered entries
 */
function printAttentionScoreCache(options = {}) {
  if (typeof window === 'undefined' || !window.GRID_ATTENTION_SCORES) {
    console.log('No attention score cache available');
    return { error: 'No cache available' };
  }
  
  // Default options
  const opts = {
    minGrid: -Infinity,
    maxGrid: Infinity,
    minScore: -Infinity,
    maxScore: Infinity,
    sortByGrid: true,
    sortByScore: false,
    ascending: true,
    highlightDuplicates: true,
    verbose: true,
    ...options
  };
  
  const attentionScores = window.GRID_ATTENTION_SCORES || {};
  
  // Parse and filter entries
  let entries = Object.entries(attentionScores)
    .map(([gridNum, score]) => {
      const gridNumber = parseInt(gridNum, 10);
      let numericScore;
      
      // Handle special values like "FAILED_ATTENTION"
      if (score === "FAILED_ATTENTION") {
        numericScore = 0; // Treat as 0 for sorting purposes
      } else {
        numericScore = typeof score === 'string' ? parseInt(score, 10) : score;
      }
      
      return {
        gridNumber,
        score, // Original score value
        numericScore, // Numeric representation for sorting
        displayScore: score === "FAILED_ATTENTION" 
          ? `"FAILED_ATTENTION" (below threshold)` 
          : `${score}/50`
      };
    })
    .filter(entry => {
      return (
        entry.gridNumber >= opts.minGrid &&
        entry.gridNumber <= opts.maxGrid &&
        entry.numericScore >= opts.minScore &&
        entry.numericScore <= opts.maxScore
      );
    });
  
  // Sort entries
  if (opts.sortByScore) {
    entries.sort((a, b) => {
      return opts.ascending ? 
        a.numericScore - b.numericScore : 
        b.numericScore - a.numericScore;
    });
  } else {
    entries.sort((a, b) => {
      return opts.ascending ? 
        a.gridNumber - b.gridNumber : 
        b.gridNumber - a.gridNumber;
    });
  }
  
  // Find duplicates if requested
  const duplicateScores = {};
  const duplicateGrids = {};
  
  if (opts.highlightDuplicates) {
    // Find grid numbers that share the same score
    entries.forEach(entry => {
      const scoreKey = entry.score.toString();
      if (!duplicateScores[scoreKey]) {
        duplicateScores[scoreKey] = [];
      }
      duplicateScores[scoreKey].push(entry.gridNumber);
    });
    
    // Keep only those with duplicates
    Object.keys(duplicateScores).forEach(score => {
      if (duplicateScores[score].length <= 1) {
        delete duplicateScores[score];
      }
    });
    
    // Find scores that share the same grid number (should be impossible, but check anyway)
    entries.forEach(entry => {
      const gridKey = entry.gridNumber.toString();
      if (!duplicateGrids[gridKey]) {
        duplicateGrids[gridKey] = [];
      }
      duplicateGrids[gridKey].push(entry.score);
    });
    
    // Keep only those with duplicates
    Object.keys(duplicateGrids).forEach(grid => {
      if (duplicateGrids[grid].length <= 1) {
        delete duplicateGrids[grid];
      }
    });
  }
  
  // Analyze sequence gaps
  const gridNumbers = entries.map(e => e.gridNumber).sort((a, b) => a - b);
  const gaps = [];
  
  if (gridNumbers.length > 1) {
    // Find missing numbers in the sequence
    for (let i = 1; i < gridNumbers.length; i++) {
      const current = gridNumbers[i];
      const previous = gridNumbers[i - 1];
      
      if (current - previous > 1) {
        // There's a gap
        const missing = [];
        for (let j = previous + 1; j < current; j++) {
          missing.push(j);
        }
        gaps.push({
          start: previous,
          end: current,
          missing
        });
      }
    }
  }
  
  // Print out the results
  console.log(`\n📊📊📊 ENHANCED ATTENTION SCORE CACHE ANALYSIS 📊📊📊`);
  console.log(`Total entries in cache: ${Object.keys(attentionScores).length}`);
  console.log(`Filtered entries: ${entries.length} (Grid #${opts.minGrid}-${opts.maxGrid}, Score ${opts.minScore}-${opts.maxScore})`);
  console.log(`Sorting: By ${opts.sortByScore ? 'score' : 'grid number'} (${opts.ascending ? 'ascending' : 'descending'})`);
  
  // Print each entry
  if (entries.length > 0) {
    console.log(`\n📋 FILTERED ENTRIES:`);
    entries.forEach(entry => {
      // Check for duplicates to highlight
      const hasDuplicateScore = duplicateScores[entry.score.toString()]?.length > 1;
      const hasDuplicateGrid = duplicateGrids[entry.gridNumber.toString()]?.length > 1;
      
      // Basic entry info
      let entryText = `Grid #${entry.gridNumber.toString().padStart(2, '0')}: ${entry.displayScore}`;
      
      // Add warning indicators if duplicates exist
      if (hasDuplicateScore) {
        entryText += ` ⚠️ DUPLICATE SCORE: ${duplicateScores[entry.score.toString()].length} grids have this score`;
      }
      
      if (hasDuplicateGrid) {
        entryText += ` ⚠️ DUPLICATE GRID: Grid #${entry.gridNumber} has ${duplicateGrids[entry.gridNumber.toString()].length} different scores`;
      }
      
      console.log(entryText);
    });
  } else {
    console.log(`No entries match the filter criteria.`);
  }
  
  // Print sequence analysis
  if (opts.verbose && gridNumbers.length > 0) {
    console.log(`\n🔢 SEQUENCE ANALYSIS:`);
    console.log(`Grid number range: #${Math.min(...gridNumbers)} to #${Math.max(...gridNumbers)}`);
    
    if (gaps.length > 0) {
      console.log(`Found ${gaps.length} gaps in the sequence:`);
      gaps.forEach((gap, i) => {
        console.log(`  Gap #${i+1}: Between #${gap.start} and #${gap.end}, missing: ${gap.missing.join(', ')}`);
      });
    } else {
      console.log(`✓ No gaps detected in the sequence`);
    }
    
    // Check for potential reset points (consecutive numbers with large gaps)
    const potentialResets = [];
    for (let i = 1; i < gridNumbers.length; i++) {
      if (gridNumbers[i] < gridNumbers[i-1]) {
        potentialResets.push({
          from: gridNumbers[i-1],
          to: gridNumbers[i],
          index: i
        });
      }
    }
    
    if (potentialResets.length > 0) {
      console.log(`\n⚠️ POTENTIAL GRID NUMBER RESETS DETECTED:`);
      potentialResets.forEach((reset, i) => {
        console.log(`  Reset #${i+1}: Grid #${reset.from} → #${reset.to} (dropped by ${reset.from - reset.to})`);
      });
    } else {
      console.log(`✓ No grid number resets detected`);
    }
  }
  
  // Print duplicate analysis summaries
  if (opts.highlightDuplicates) {
    // Duplicate scores summary
    if (Object.keys(duplicateScores).length > 0) {
      console.log(`\n⚠️ DUPLICATE SCORES SUMMARY:`);
      Object.entries(duplicateScores).forEach(([score, grids]) => {
        console.log(`  Score ${score} appears in ${grids.length} grids: ${grids.sort((a, b) => a - b).join(', ')}`);
      });
    }
    
    // Duplicate grids summary (should be impossible, but check anyway)
    if (Object.keys(duplicateGrids).length > 0) {
      console.log(`\n⚠️ DUPLICATE GRID ENTRIES SUMMARY (CRITICAL ERROR):`);
      Object.entries(duplicateGrids).forEach(([grid, scores]) => {
        console.log(`  Grid #${grid} has ${scores.length} different scores: ${scores.join(', ')}`);
      });
    }
  }
  
  console.log(`📊📊📊 END ENHANCED ATTENTION SCORE CACHE ANALYSIS 📊📊📊\n`);
  
  // Return analysis results for programmatic use
  return {
    totalCacheEntries: Object.keys(attentionScores).length,
    filteredEntries: entries,
    gridNumberRange: gridNumbers.length > 0 ? 
      { min: Math.min(...gridNumbers), max: Math.max(...gridNumbers) } : 
      null,
    gaps,
    duplicateScores,
    duplicateGrids,
    potentialResets: gridNumbers.length > 1 ? 
      gridNumbers.filter((num, i) => i > 0 && num < gridNumbers[i-1])
        .map((num, i) => ({ 
          from: gridNumbers[i], 
          to: num, 
          difference: gridNumbers[i] - num 
        })) : 
      []
  };
}

/**
 * Logs information about grid content just before it gets posted to message log
 * This helps identify if the same grid content gets different scores
 */
function logPreMessageLogGridInfo(gridNumber, gridContent, attentionScore) {
  if (typeof window === 'undefined') return;
  
  console.log(`\n🔍🔍 PRE-MESSAGE LOG GRID INFO 🔍🔍`);
  console.log(`Grid #${gridNumber} is about to be added to message log`);
  console.log(`Attention score: ${attentionScore}/50`);
  
  // Generate content hash
  const contentHash = generateGridContentHash(gridContent);
  console.log(`Grid content hash: ${contentHash.substring(0, 30)}...`);
  
  // Look for this content hash in our tracking
  if (window.GRID_CONTENT_TRACKING) {
    const matchingEntries = window.GRID_CONTENT_TRACKING.filter(
      entry => entry.contentHash === contentHash
    );
    
    if (matchingEntries.length > 1) {
      // We found the same grid content tracked multiple times!
      console.log(`🚨🚨 DUPLICATE GRID CONTENT DETECTED! 🚨🚨`);
      console.log(`This exact grid content appears ${matchingEntries.length} times:`);
      
      matchingEntries.forEach((entry, i) => {
        console.log(`[${i+1}] Grid #${entry.gridNumber}: Score ${entry.attentionScore}/50 at ${entry.timestamp}`);
      });
      
      // Check if scores are different
      const uniqueScores = new Set(matchingEntries.map(e => e.attentionScore));
      if (uniqueScores.size > 1) {
        console.log(`🚨🚨 CRITICAL ERROR: SAME GRID CONTENT HAS DIFFERENT SCORES: ${Array.from(uniqueScores).join(', ')}`);
      } else {
        console.log(`✓ Same grid content has consistent score: ${Array.from(uniqueScores)[0]}/50`);
      }
    } else if (matchingEntries.length === 1) {
      console.log(`✓ This grid content was seen once before as grid #${matchingEntries[0].gridNumber}`);
      console.log(`Previous score: ${matchingEntries[0].attentionScore}/50`);
      
      if (matchingEntries[0].attentionScore !== attentionScore) {
        console.log(`🚨 SCORE MISMATCH: Previous=${matchingEntries[0].attentionScore}/50, Current=${attentionScore}/50`);
      } else {
        console.log(`✓ Score matches previous occurrence`);
      }
    } else {
      console.log(`✓ This is the first time seeing this grid content`);
      
      // Track this grid content
      trackGridContent(gridNumber, gridContent, attentionScore);
    }
  } else {
    console.log(`No grid content tracking available yet`);
    
    // Initialize and track
    window.GRID_CONTENT_TRACKING = [];
    trackGridContent(gridNumber, gridContent, attentionScore);
  }
  
  // Quick sample of the content
  if (Array.isArray(gridContent) && gridContent.length > 0) {
    console.log(`Grid content sample (${gridContent.length} words):`);
    const sample = gridContent.slice(0, 5);
    sample.forEach((w, i) => {
      const wordStr = typeof w === 'string' ? w : (w.word || 'undefined');
      console.log(`  [${i+1}] ${wordStr.toUpperCase()}`);
    });
    
    if (gridContent.length > 5) {
      console.log(`  ... (${gridContent.length - 5} more words)`);
    }
  } else {
    console.log(`No valid grid content to display`);
  }
  
  console.log(`🔍🔍 END PRE-MESSAGE LOG GRID INFO 🔍🔍\n`);
}

/**
 * Checks for duplicate words that appear in multiple grids with different attention scores
 * This is critical for debugging the grid generation issue
 */
function findDuplicateWordsWithDifferentScores() {
  if (typeof window !== 'undefined') {
    // Check if we have a message log and attention scores
    if (!window.messageLogRef || !window.messageLogRef.current || !window.GRID_ATTENTION_SCORES) {
      console.log("Can't check for duplicates - message log or attention scores not available");
      return;
    }

    const messageLog = window.messageLogRef.current;
    const attentionScores = window.GRID_ATTENTION_SCORES;
    
    console.log(`\n🔍🔍 DUPLICATE WORD DETECTOR 🔍🔍`);
    console.log(`Analyzing ${messageLog.length} message log entries...`);
    
    // Create a map of words to their occurrences in different grids
    const wordMap = {};
    
    // Process all words in the message log
    messageLog.forEach(entry => {
      if (entry && entry.words && Array.isArray(entry.words)) {
        entry.words.forEach(wordObj => {
          const word = wordObj.word.toUpperCase();
          if (!wordMap[word]) {
            wordMap[word] = [];
          }
          
          // Add this occurrence with grid number and attention score
          wordMap[word].push({
            gridNum: entry.gridNumber,
            attentionScore: entry.attentionScore
          });
        });
      }
    });
    
    // Find words that appear in multiple grids with different attention scores
    const duplicatesFound = [];
    
    Object.entries(wordMap).forEach(([word, occurrences]) => {
      // Check if this word appears in multiple grids
      if (occurrences.length > 1) {
        // Check if it has different attention scores
        const uniqueScores = new Set(occurrences.map(o => o.attentionScore));
        if (uniqueScores.size > 1) {
          duplicatesFound.push({
            word, 
            occurrences,
            uniqueScores: Array.from(uniqueScores)
          });
        }
      }
    });
    
    // Print results
    if (duplicatesFound.length > 0) {
      console.log(`🚨🚨 FOUND ${duplicatesFound.length} WORDS WITH DIFFERENT ATTENTION SCORES:`);
      
      duplicatesFound.forEach(({ word, occurrences, uniqueScores }) => {
        console.log(`\n🚨 "${word}" appears in ${occurrences.length} grids with scores: ${uniqueScores.join(', ')}`);
        
        occurrences.forEach(occ => {
          console.log(`   - Grid #${occ.gridNum}: Score ${occ.attentionScore}/50 (${attentionScores[occ.gridNum] || 'not in cache'})`);
        });
      });
    } else {
      console.log("✅ No duplicate words with different attention scores found.");
    }
    
    console.log(`🔍🔍 END DUPLICATE WORD DETECTOR 🔍🔍\n`);
  }
}

/**
 * Analyzes grid content tracking to find duplicate grids with different scores
 * This specifically looks for the entire grid content being the same, not just individual words
 */
function findDuplicateGridsWithDifferentScores() {
  if (typeof window === 'undefined' || !window.GRID_CONTENT_TRACKING) {
    console.log("No grid content tracking available");
    return;
  }
  
  console.log(`\n🔍🔍 DUPLICATE GRID DETECTOR 🔍🔍`);
  console.log(`Analyzing ${window.GRID_CONTENT_TRACKING.length} tracked grids...`);
  
  // Group entries by content hash
  const contentHashMap = {};
  
  window.GRID_CONTENT_TRACKING.forEach(entry => {
    if (!contentHashMap[entry.contentHash]) {
      contentHashMap[entry.contentHash] = [];
    }
    contentHashMap[entry.contentHash].push(entry);
  });
  
  // Find content hashes with multiple entries but different scores
  const duplicatesWithDifferentScores = [];
  
  Object.entries(contentHashMap).forEach(([contentHash, entries]) => {
    // Only interested in duplicates
    if (entries.length > 1) {
      // Check if they have different scores
      const uniqueScores = new Set(entries.map(e => e.attentionScore));
      if (uniqueScores.size > 1) {
        duplicatesWithDifferentScores.push({
          contentHash,
          entries,
          uniqueScores: Array.from(uniqueScores)
        });
      }
    }
  });
  
  // Print results
  if (duplicatesWithDifferentScores.length > 0) {
    console.log(`🚨🚨 FOUND ${duplicatesWithDifferentScores.length} DUPLICATE GRIDS WITH DIFFERENT SCORES:`);
    
    duplicatesWithDifferentScores.forEach(({ contentHash, entries, uniqueScores }) => {
      console.log(`\n🚨 Grid content hash ${contentHash.substring(0, 20)}... appears in ${entries.length} grids with scores: ${uniqueScores.join(', ')}`);
      
      console.log(`Content sample: ${entries[0].contentSample}`);
      
      entries.forEach(entry => {
        console.log(`   - Grid #${entry.gridNumber}: Score ${entry.attentionScore}/50 at ${entry.timestamp}`);
      });
    });
  } else {
    console.log("✅ No duplicate grids with different attention scores found.");
  }
  
  console.log(`🔍🔍 END DUPLICATE GRID DETECTOR 🔍🔍\n`);
}

/**
 * Enhanced diagnostic tool for comprehensive grid duplication analysis
 * This directly analyzes the message log to find and track duplicates
 */
function runComprehensiveGridDiagnostic() {
  if (typeof window === 'undefined') return;
  
  const attentionScores = window.GRID_ATTENTION_SCORES || {};
  
  console.log(`\n🧪🧪🧪 COMPREHENSIVE GRID DEBUG DIAGNOSTIC 🧪🧪🧪`);
  console.log(`Diagnostic run at: ${new Date().toISOString()}`);
  console.log(`=== ATTENTION SCORE CACHE ===`);
  console.log(`Total cached grid scores: ${Object.keys(attentionScores).length}`);
  
  // Track word occurrences across all grids
  const wordToGridMap = {};
  
  // Track which words appear in each grid
  const gridToWordsMap = {};
  
  // Use the message log reference if available
  if (!window.messageLogRef || !window.messageLogRef.current) {
    console.log("⚠️ No message log reference available");
    return;
  }
  
  const messageLogEntries = window.messageLogRef.current;
  
  // First gather all grid and word data
  console.log(`\n=== MESSAGE LOG CONTENTS (${messageLogEntries.length} entries) ===`);
  messageLogEntries.forEach((entry, index) => {
    const gridNum = entry.gridNumber;
    const words = entry.words || [];
    const wordsList = words.map(w => (typeof w === 'string' ? w : w.word || '').toUpperCase());
    const timestamp = entry.timestamp || 0;
    const source = entry._source || 'unknown';
    
    // Store grid data
    if (!gridToWordsMap[gridNum]) {
      gridToWordsMap[gridNum] = {
        words: wordsList,
        timestamp,
        source
      };
    } else {
      console.log(`⚠️ DUPLICATE GRID #${gridNum} IN MESSAGE LOG! Previous words: ${gridToWordsMap[gridNum].words.join(', ')}`);
      console.log(`⚠️ Current words: ${wordsList.join(', ')}`);
    }
    
    // Log grid content
    console.log(`\n🔢 GRID #${gridNum.toString().padStart(2, '0')} (Entry #${index+1})`);
    console.log(`  Time: ${new Date(timestamp).toISOString()}`);
    console.log(`  Source: ${source}`);
    console.log(`  Attention: ${attentionScores[gridNum] || 'unknown'}/50`);
    console.log(`  Words (${wordsList.length}): ${wordsList.join(', ') || 'none'}`);
    
    // Build word to grid map
    words.forEach(wordObj => {
      const word = (typeof wordObj === 'string' ? wordObj : wordObj.word || '').toUpperCase();
      if (!wordToGridMap[word]) {
        wordToGridMap[word] = [];
      }
      
      // Store word occurrence
      wordToGridMap[word].push({
        gridNum,
        score: attentionScores[gridNum],
        timestamp
      });
    });
  });
  
  // Calculate important grid statistics
  const gridNumbers = Object.keys(gridToWordsMap).map(Number).sort((a, b) => a - b);
  const minGrid = gridNumbers.length > 0 ? Math.min(...gridNumbers) : 0;
  const maxGrid = gridNumbers.length > 0 ? Math.max(...gridNumbers) : 0;
  
  console.log(`\n=== GRID SEQUENCE ANALYSIS ===`);
  if (gridNumbers.length > 0) {
    console.log(`Grids in message log: ${gridNumbers.map(n => n.toString().padStart(2, '0')).join(', ')}`);
    console.log(`Range: Grid #${minGrid} to #${maxGrid}`);
    
    // Check for gaps in the sequence
    const expectedCount = maxGrid - minGrid + 1;
    const missingGrids = [];
    
    for (let i = minGrid; i <= maxGrid; i++) {
      if (!gridNumbers.includes(i)) {
        missingGrids.push(i);
      }
    }
    
    if (missingGrids.length > 0) {
      console.log(`⚠️ MISSING GRIDS: ${missingGrids.map(n => n.toString().padStart(2, '0')).join(', ')}`);
      
      // Check if these missing grids failed attention
      missingGrids.forEach(gridNum => {
        const attentionResult = attentionScores[gridNum];
        if (attentionResult === "FAILED_ATTENTION") {
          console.log(`  ✓ Grid #${gridNum.toString().padStart(2, '0')}: EXPECTED - Failed attention check`);
        } else if (attentionResult !== undefined) {
          console.log(`  ⚠️ Grid #${gridNum.toString().padStart(2, '0')}: UNEXPECTED - Has attention score ${attentionResult} but missing from log`);
        } else {
          console.log(`  ⚠️ Grid #${gridNum.toString().padStart(2, '0')}: No attention score recorded`);
        }
      });
    } else {
      console.log(`✓ Sequence complete - No missing grids between #${minGrid} and #${maxGrid}`);
    }
  } else {
    console.log(`No grids in message log yet.`);
  }
  
  // Find duplicate words across grids
  console.log(`\n=== DUPLICATE WORD ANALYSIS ===`);
  const duplicateWords = [];
  
  Object.keys(wordToGridMap).forEach(word => {
    const occurrences = wordToGridMap[word];
    if (occurrences.length > 1) {
      duplicateWords.push(word);
      
      // Sort occurrences by timestamp (oldest first)
      const sortedOccurrences = [...occurrences].sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`⚠️ DUPLICATE: "${word}" appears in ${occurrences.length} grids:`);
      sortedOccurrences.forEach((occ, idx) => {
        const gridTime = new Date(occ.timestamp).toISOString();
        const otherWords = gridToWordsMap[occ.gridNum]?.words.filter(w => w !== word) || [];
        console.log(`  ${idx+1}. Grid #${occ.gridNum.toString().padStart(2, '0')} @ ${gridTime}`);
        console.log(`     Score: ${occ.score || 'unknown'}/50`);
        console.log(`     Other words: ${otherWords.join(', ') || 'none'}`);
      });
    }
  });
  
  if (duplicateWords.length === 0) {
    console.log(`✓ No duplicate words found across grids.`);
  } else {
    console.log(`⚠️ Found ${duplicateWords.length} duplicate words: ${duplicateWords.join(', ')}`);
  }
  
  // Also run the other diagnostic functions for comprehensive analysis
  findDuplicateWordsWithDifferentScores();
  findDuplicateGridsWithDifferentScores();
  
  console.log(`\n🧪🧪🧪 END COMPREHENSIVE GRID DEBUG DIAGNOSTIC 🧪🧪🧪\n`);
}

/**
 * Analyzes message log entries with shared grid numbers
 * This is for information only - duplicate grid numbers are now expected and allowed
 */
function findMessageLogDuplicates() {
  if (typeof window === 'undefined' || !window.messageLogRef || !window.messageLogRef.current) {
    console.log("Cannot analyze message log - reference not available");
    return;
  }
  
  const messageLogEntries = window.messageLogRef.current;
  
  console.log(`\n🔍🔍 RUNNING DIAGNOSTIC: Message Log Duplicates 🔍🔍`);
  console.log(`Total message log entries: ${messageLogEntries.length}`);
  
  // Extract all grid numbers
  const gridNumbers = messageLogEntries.map(entry => entry.gridNumber);
  const uniqueGridNumbers = [...new Set(gridNumbers)];
  console.log(`Unique grid numbers: ${uniqueGridNumbers.length}`);
  
  // Check for shared grid numbers (no longer called "duplicates" since this is expected)
  if (uniqueGridNumbers.length < gridNumbers.length) {
    console.log(`📊 SHARED GRID NUMBERS DETECTED IN MESSAGE LOG (EXPECTED)`);
    
    // Find all shared grid numbers
    const occurrences = {};
    gridNumbers.forEach(num => {
      occurrences[num] = (occurrences[num] || 0) + 1;
    });
    
    // Get the list of shared grid numbers
    const sharedNumbers = Object.keys(occurrences)
      .filter(num => occurrences[num] > 1)
      .map(num => parseInt(num, 10));
      
    console.log(`Shared grid numbers: ${sharedNumbers.join(', ')}`);
    
    // Show details for each shared grid number
    sharedNumbers.forEach(gridNum => {
      const entriesWithThisGrid = messageLogEntries.filter(entry => entry.gridNumber === gridNum);
      console.log(`\nGrid #${gridNum} appears ${entriesWithThisGrid.length} times:`);
      
      entriesWithThisGrid.forEach((entry, i) => {
        const words = entry.words?.map(w => typeof w === 'string' ? w : w.word || '').join(', ');
        console.log(`  [${i+1}] Timestamp: ${new Date(entry.timestamp || 0).toISOString()}`);
        console.log(`      Words: ${words}`);
        
        // Show the source of this entry if available
        if (entry._source) {
          console.log(`      Source: ${entry._source}`);
        }
        
        // Check if entries have different content (for information only)
        if (i === 0 && entriesWithThisGrid.length > 1) {
          const firstWordSet = new Set(entry.words?.map(w => typeof w === 'string' ? w : w.word || ''));
          const allSameContent = entriesWithThisGrid.every(e => {
            const wordSet = new Set(e.words?.map(w => typeof w === 'string' ? w : w.word || ''));
            return wordSet.size === firstWordSet.size && 
                  [...wordSet].every(word => firstWordSet.has(word));
          });
          
          if (allSameContent) {
            console.log(`  📊 Note: All entries have identical word content`);
          } else {
            console.log(`  📊 Note: Entries have different word content (expected behavior)`);
          }
        }
      });
    });
  } else {
    console.log(`📊 NO SHARED GRID NUMBERS YET (This is normal when first starting)`);
  }
  
  // Second, check for gaps in the sequence
  if (uniqueGridNumbers.length > 0) {
    const minGrid = Math.min(...uniqueGridNumbers);
    const maxGrid = Math.max(...uniqueGridNumbers);
    const expectedCount = maxGrid - minGrid + 1;
    
    console.log(`\nGrid number range: #${minGrid} to #${maxGrid}`);
    console.log(`Expected count in sequence: ${expectedCount}`);
    console.log(`Actual unique count: ${uniqueGridNumbers.length}`);
    
    if (uniqueGridNumbers.length < expectedCount) {
      console.log(`⚠️ GAPS IN GRID SEQUENCE DETECTED`);
      
      // Find missing numbers
      const missingGrids = [];
      for (let i = minGrid; i <= maxGrid; i++) {
        if (!uniqueGridNumbers.includes(i)) {
          missingGrids.push(i);
        }
      }
      
      console.log(`Missing grid numbers: ${missingGrids.join(', ')}`);
      
      // Check if these missing grids have attention scores
      if (window.GRID_ATTENTION_SCORES) {
        missingGrids.forEach(gridNum => {
          const score = window.GRID_ATTENTION_SCORES[gridNum];
          if (score !== undefined) {
            if (score === "FAILED_ATTENTION") {
              console.log(`Grid #${gridNum}: FAILED attention check (expected behavior)`);
            } else {
              console.log(`⚠️ Grid #${gridNum}: Has score ${score}/50 but NOT in message log`);
            }
          } else {
            console.log(`Grid #${gridNum}: No attention score recorded`);
          }
        });
      }
    } else {
      console.log(`✅ No gaps in grid sequence`);
    }
  }
  
  console.log(`🔍🔍 END MESSAGE LOG DUPLICATE DETECTOR 🔍🔍\n`);
}

/**
 * Records a message log update for debugging purposes
 * This function should be called right after a new entry is added to the message log
 */
function recordMessageLogUpdate(gridNumber, words, source) {
  if (typeof window === 'undefined') return;
  
  // Initialize tracking array if needed
  if (!window.MESSAGE_LOG_UPDATES) {
    window.MESSAGE_LOG_UPDATES = [];
  }
  
  // Add this update to the tracking array
  window.MESSAGE_LOG_UPDATES.push({
    gridNumber,
    wordCount: words?.length || 0,
    words: words?.map(w => typeof w === 'string' ? w : w.word || ''),
    timestamp: Date.now(),
    source,
    stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
  });
  
  console.log(`📝 MESSAGE LOG UPDATE RECORDED: Grid #${gridNumber} with ${words?.length || 0} words from ${source}`);
}

/**
 * Debug checker to run multiple diagnostics in one go
 */
function runFullDiagnostics() {
  console.log("\n🔧🔧🔧 RUNNING FULL DIAGNOSTICS 🔧🔧🔧");
  printAttentionScoreCache();
  findDuplicateWordsWithDifferentScores();
  findDuplicateGridsWithDifferentScores();
  findMessageLogDuplicates();
  runComprehensiveGridDiagnostic();
  console.log("🔧🔧🔧 DIAGNOSTICS COMPLETE 🔧🔧🔧\n");
}

/**
 * Initialize diagnostic tools on the window object for easy console access
 * This allows you to run diagnostics directly from the browser console 
 */
function initializeWindowDiagnostics() {
  if (typeof window !== 'undefined') {
    // Create a runDiagnostics object on window
    window.runDiagnostics = {
      printAttentionScoreCache,
      findDuplicateWordsWithDifferentScores,
      findDuplicateGridsWithDifferentScores,
      findMessageLogDuplicates,
      recordMessageLogUpdate,
      logPreMessageLogGridInfo,
      trackGridContent,
      generateGridContentHash,
      runComprehensiveGridDiagnostic,
      runFullDiagnostics,
      
      // Add helper functions for different common diagnostic scenarios
      analyzeGridNumbers: () => {
        return printAttentionScoreCache({
          sortByGrid: true,
          ascending: true,
          verbose: true
        });
      },
      
      findResets: () => {
        const result = printAttentionScoreCache();
        if (result.potentialResets && result.potentialResets.length > 0) {
          console.log(`\n🚨 FOUND ${result.potentialResets.length} GRID NUMBER RESETS:`);
          result.potentialResets.forEach((reset, i) => {
            console.log(`  Reset #${i+1}: Grid #${reset.from} → Grid #${reset.to} (dropped by ${reset.difference})`);
          });
        } else {
          console.log("✅ No grid number resets detected in the current cache.");
        }
        return result.potentialResets || [];
      },
      
      searchRange: (minGrid, maxGrid) => {
        return printAttentionScoreCache({
          minGrid,
          maxGrid,
          sortByGrid: true,
          ascending: true
        });
      }
    };
    
    console.log("🧪 DEBUG TOOLS: Initialized window.runDiagnostics - available in browser console");
    console.log("🧪 USAGE: runDiagnostics.printAttentionScoreCache() or runDiagnostics.findResets()");
  }
}

// Initialize diagnostics when this module is loaded
initializeWindowDiagnostics();

// Export the functions
export { 
  printAttentionScoreCache,
  findDuplicateWordsWithDifferentScores,
  findDuplicateGridsWithDifferentScores,
  findMessageLogDuplicates,
  recordMessageLogUpdate,
  logPreMessageLogGridInfo,
  trackGridContent,
  generateGridContentHash,
  runComprehensiveGridDiagnostic,
  runFullDiagnostics
};