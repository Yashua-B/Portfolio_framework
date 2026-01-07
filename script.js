/**
 * Portfolio Application Orchestrator
 * Main entry point that coordinates all modules
 * 
 * This file orchestrates the initialization and coordination of all application modules.
 * Individual functionality has been extracted to specialized modules:
 * - modules/pageRenderer.js: Page rendering logic
 * - modules/navigationController.js: Navigation and hash routing
 * - modules/performanceOptimizer.js: Performance optimizations
 */

// ===== DEBUG SUMMARY FUNCTION =====
// Debug functions are now in DebugTracker module
// Expose for backward compatibility
window.debugPageLoading = function() {
    if (typeof DebugTracker !== 'undefined' && typeof DebugTracker.debugPageLoading === 'function') {
        return DebugTracker.debugPageLoading();
    } else {
        console.warn('DebugTracker not available. Debug mode may be disabled.');
    }
};

// Also expose to PortfolioApp namespace (already done in debugTracker.js, but ensure it's available)
if (typeof window.PortfolioApp !== 'undefined' && typeof window.PortfolioApp.debug === 'undefined') {
    window.PortfolioApp.debug = {};
}

// ===== INITIALIZATION =====

/**
 * Initialize the portfolio application
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Debug: Log DOMContentLoaded timing and module availability
    if (CONFIG.DEBUG.ENABLED) {
        const domContentLoadedTime = performance.now();
        console.log(`[PERF] DOMContentLoaded fired at ${domContentLoadedTime.toFixed(2)}ms`);
    }
    
    // Network request tracking is now handled by DebugTracker (initialized automatically)
    // Expose debugNetworkRequests for backward compatibility
    window.debugNetworkRequests = function() {
        if (typeof DebugTracker !== 'undefined' && typeof DebugTracker.debugNetworkRequests === 'function') {
            return DebugTracker.debugNetworkRequests();
        } else {
            console.warn('DebugTracker not available. Debug mode may be disabled.');
        }
    };
    
    // Verify all modules are available
    const modules = {
        CONFIG: typeof CONFIG !== 'undefined',
        ErrorHandler: typeof ErrorHandler !== 'undefined',
        Validation: typeof Validation !== 'undefined',
        DOM: typeof DOM !== 'undefined',
        appState: typeof appState !== 'undefined',
        Zoomist: typeof Zoomist !== 'undefined',
        initializeAnimations: typeof initializeAnimations === 'function',
        initializeHotspotDiscovery: typeof initializeHotspotDiscovery === 'function',
        initializeYouTubeModal: typeof initializeYouTubeModal === 'function',
        loadHotspotConfigs: typeof loadHotspotConfigs === 'function',
        loadAnimationConfigs: typeof loadAnimationConfigs === 'function',
        initializePortfolioPages: typeof initializePortfolioPages === 'function',
        renderPortfolioPage: typeof renderPortfolioPage === 'function',
        setupHashNavigation: typeof setupHashNavigation === 'function',
        initializePerformanceOptimizations: typeof initializePerformanceOptimizations === 'function'
    };
    
    const availableModules = Object.entries(modules).filter(([name, available]) => available).map(([name]) => name);
    const missingModules = Object.entries(modules).filter(([name, available]) => !available).map(([name]) => name);
    
    console.log(`[DEBUG] Module availability: ${availableModules.length}/${Object.keys(modules).length} modules available`);
    if (availableModules.length > 0) {
        console.log(`[DEBUG] Available modules: ${availableModules.join(', ')}`);
    }
    if (missingModules.length > 0) {
        console.error(`[ERROR] Missing modules: ${missingModules.join(', ')}`);
    } else {
        console.log('[DEBUG] All required modules are available ✓');
    }
    
    showGlobalLoader();
    try {
        // Initialize controllers
        initializeAnimations();
        initializeHotspotDiscovery();
        initializeYouTubeModal();
        initializePerformanceOptimizations();

        // Get container ready while configs are loading (no async dependency)
        const container = document.getElementById('portfolio-container');
        if (!container) {
            ErrorHandler.error('Portfolio container not found');
            return;
        }

        // Start loading both configs in parallel
        const hotspotConfigPromise = loadHotspotConfigs().catch(error => {
            // Hotspots are optional - log warning but don't block page loading
            ErrorHandler.warn('Hotspot configs failed to load, continuing without hotspots', error);
            return null; // Return null to indicate failure
        });

        const animationConfigPromise = loadAnimationConfigs().catch(error => {
            // Animation configs are required - but empty array is acceptable
            ErrorHandler.warn('Animation configs failed to load, continuing with no animations', error);
            return []; // Return empty array as fallback
        });

        // Wait for animation configs (required for page rendering)
        const animationConfigs = await animationConfigPromise;

        // Start loading pages immediately - don't wait for hotspots
        // Hotspots will attach when their config loads, even if pages are already rendering
        await initializePortfolioPages(
            container,
            (imageData, index, container) => {
                // renderPortfolioPage is now in modules/pageRenderer.js
                return renderPortfolioPage(imageData, index, container, animationConfigs);
            },
            showGlobalLoader,
            hideGlobalLoader
        );

        // Hotspot configs continue loading in background
        // They will attach to pages when ready via attachHotspotsToPage() which checks appState
        hotspotConfigPromise.then(() => {
            // Hotspots are now loaded and will attach to any already-rendered pages
            // via the existing attachHotspotsToPage() mechanism
            ErrorHandler.log('Hotspot configs loaded - hotspots will attach to pages');
        }).catch(() => {
            // Already handled in catch above
        });
        
        // Setup hash navigation
        setupHashNavigation();
        
        // Auto-run debug summary after page load (only if debug enabled)
        if (CONFIG.DEBUG.ENABLED) {
            setTimeout(() => {
                console.log('\n\n[DEBUG] Auto-running debug summary after page load...');
                if (typeof DebugTracker !== 'undefined' && typeof DebugTracker.debugPageLoading === 'function') {
                    DebugTracker.debugPageLoading();
                }
            }, 3000); // Wait 3 seconds for all pages to load
        }

    } catch (error) {
        ErrorHandler.error('Error initializing portfolio', error);
    } finally {
        hideGlobalLoader();
    }
});
