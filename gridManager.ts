/**
 * Grid Manager - Central management of grid numbers to prevent multiple increments
 * 
 * This module provides a central point of control for grid number management,
 * ensuring that grid numbers are only incremented once per cycle.
 */

// Initialize the request tracking set to prevent duplicate increment requests
const gridIncrementRequestsTracking = new Set<string>();

// Track the last grid increment time to prevent rapid increments
let lastGridIncrementTime = 0;

// Minimum time between grid increments in milliseconds (to prevent rapid multiple increments)
const MIN_INCREMENT_INTERVAL = 2000; // 2 seconds

/**
 * Request a grid number increment, ensuring only one request per cycle is processed
 * 
 * @param currentGrid - The current grid number 
 * @param source - The component/source requesting the increment
 * @returns boolean - Whether the request was accepted (true) or ignored as duplicate (false)
 */
export function requestGridIncrement(currentGrid: number, source: string): boolean {
  // Generate a unique key for this increment cycle
  // Based on the grid number and a 7-second time window to match grid display cycle
  const cycleKey = `${currentGrid}_${Math.floor(Date.now() / 7000)}`;
  
  // Check if this specific request has already been processed within this cycle
  if (gridIncrementRequestsTracking.has(cycleKey)) {
    console.log(`🚫 GRID INCREMENT: Duplicate request for grid #${currentGrid} from ${source} in cycle ${cycleKey} - ignored`);
    return false;
  }
  
  // Check if enough time has passed since the last increment
  const now = Date.now();
  if (now - lastGridIncrementTime < MIN_INCREMENT_INTERVAL) {
    console.log(`🚫 GRID INCREMENT: Request too soon (${now - lastGridIncrementTime}ms) for grid #${currentGrid} from ${source} - ignored`);
    return false;
  }
  
  // Add this request to tracking to prevent duplicates
  gridIncrementRequestsTracking.add(cycleKey);
  
  // Prune old entries (keep only most recent 10 entries)
  if (gridIncrementRequestsTracking.size > 10) {
    const entries = Array.from(gridIncrementRequestsTracking);
    for (let i = 0; i < entries.length - 10; i++) {
      gridIncrementRequestsTracking.delete(entries[i]);
    }
  }
  
  // Dispatch the grid increment request event
  if (typeof window !== 'undefined') {
    console.log(`✅ GRID INCREMENT: Dispatching increment request for grid #${currentGrid} from ${source}`);
    
    // Update last increment time
    lastGridIncrementTime = now;
    
    // Create and dispatch the event
    const event = new CustomEvent('gridIncrementRequest', {
      detail: {
        currentGrid,
        source,
        timestamp: now
      }
    });
    window.dispatchEvent(event);
    return true;
  }
  
  return false;
}

/**
 * Get the current grid number - DEPRECATED
 * 
 * This function is no longer used for global grid tracking.
 * The only source of truth for grid numbers is now the local
 * gridNumberTrackingRef in StreamingSentence.tsx
 * 
 * @returns number - Always returns 0 as global tracking is removed
 */
export function getCurrentGridNumber(): number {
  console.log("ℹ️ NOTICE: getCurrentGridNumber is deprecated. Grid number tracking is now local to StreamingSentence.tsx");
  return 0;
}

/**
 * DEPRECATED: Check if a grid has already been processed
 * 
 * This function no longer uses global tracking variables.
 * Should be replaced with local tracking in the component that needs it.
 * 
 * @param gridNumber - The grid number to check (unused)
 * @returns boolean - Always returns false as global tracking is removed
 */
export function isGridAlreadyProcessed(gridNumber: number): boolean {
  console.log("ℹ️ NOTICE: isGridAlreadyProcessed is deprecated. Grid tracking is now local to each component.");
  return false;
}

/**
 * DEPRECATED: Mark a grid as processed
 * 
 * This function no longer uses global tracking variables.
 * Should be replaced with local tracking in the component that needs it.
 * 
 * @param gridNumber - The grid number to mark as processed (unused)
 */
export function markGridAsProcessed(gridNumber: number): void {
  console.log("ℹ️ NOTICE: markGridAsProcessed is deprecated. Grid tracking is now local to each component.");
  console.log(`ℹ️ GRID TRACKING: Grid #${gridNumber} should be tracked locally in the component that needs it.`);
}