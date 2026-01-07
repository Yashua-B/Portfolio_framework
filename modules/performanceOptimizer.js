/**
 * Performance Optimizer Module
 * Handles performance optimizations like debounced resize handlers
 */

/**
 * Initialize performance optimizations
 */
function initializePerformanceOptimizations() {
    // Add debounced resize handler to reposition hotspots
    const debouncedReposition = DOM.debounce(repositionAllHotspots, CONFIG.PERFORMANCE.RESIZE_DEBOUNCE_MS);
    window.addEventListener('resize', debouncedReposition);
    
    // Also handle orientation changes on mobile devices
    window.addEventListener('orientationchange', () => {
        // Wait a bit for the orientation change to complete
        setTimeout(repositionAllHotspots, CONFIG.PERFORMANCE.ORIENTATION_CHANGE_DELAY_MS);
    });
    
    ErrorHandler.log('Performance optimizations initialized');
}

