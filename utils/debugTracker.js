/**
 * Debug Tracker Module
 * Centralized debug infrastructure for tracking page rendering, image loading, DOM mutations, and network requests
 * All debug functionality is controlled by CONFIG.DEBUG.ENABLED (default: false)
 */

// ===== DEBUG STATE OBJECTS =====
// These objects store debug tracking data
const pageRenderDebug = {
    callCounter: 0,
    callsByPage: new Map(),
    callsById: new Map()
};

const imageLoadDebug = {
    imageCounter: 0,
    imagesBySrc: new Map(),
    imagesById: new Map()
};

const domMutationDebug = {
    imageClones: [],
    imageMoves: [],
    newImageElements: []
};

const initDebug = {
    initializePortfolioPagesCallCount: 0,
    backgroundLoadRemainingPagesCallCount: 0,
    loaderContextNextCallCount: 0
};

// Network request tracking (moved from script.js DOMContentLoaded closure)
const networkRequests = new Map();

// ===== HELPER FUNCTIONS =====

/**
 * Get caller information from stack trace
 * @param {Error} error - Error object with stack
 * @returns {string} Caller function name
 */
function getCallerFromStack(error) {
    const stack = error.stack || '';
    const lines = stack.split('\n');
    // Skip first 3 lines (Error, getCallerFromStack, calling function)
    for (let i = 3; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.includes('getCallerFromStack')) {
            // Extract function name from stack line
            const match = line.match(/at\s+(\w+)/);
            return match ? match[1] : line.substring(0, 50);
        }
    }
    return 'unknown';
}

// ===== DOM MUTATION TRACKING =====

/**
 * Track DOM mutations for image elements
 * Monitors cloning, moving, and creation of new image elements
 * Only runs when CONFIG.DEBUG.ENABLED && CONFIG.DEBUG.TRACK_DOM_MUTATIONS
 */
function initializeDOMMutationTracking() {
    if (!CONFIG.DEBUG.ENABLED || !CONFIG.DEBUG.TRACK_DOM_MUTATIONS) {
        return null;
    }

    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Track added nodes
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if added node is an image
                    if (node.tagName === 'IMG') {
                        const img = node;
                        const src = img.src;
                        const timestamp = performance.now();
                        const error = new Error();
                        const stack = error.stack || '';
                        const caller = stack.split('\n')[3]?.trim() || 'unknown';
                        
                        console.warn(`[DOM-MUTATION-DEBUG] New image element added to DOM`);
                        console.warn(`  ├─ Source: ${src}`);
                        console.warn(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
                        console.warn(`  ├─ Parent: ${img.parentElement?.tagName || 'N/A'}`);
                        console.warn(`  └─ Caller: ${caller}`);
                        
                        domMutationDebug.newImageElements.push({
                            src,
                            timestamp,
                            caller,
                            element: img
                        });
                    }
                    
                    // Check if added node contains images
                    const images = node.querySelectorAll && node.querySelectorAll('img');
                    if (images && images.length > 0) {
                        images.forEach((img) => {
                            const src = img.src;
                            const timestamp = performance.now();
                            const error = new Error();
                            const stack = error.stack || '';
                            const caller = stack.split('\n')[3]?.trim() || 'unknown';
                            
                            console.log(`[DOM-MUTATION-DEBUG] Image element added via parent node`);
                            console.log(`  ├─ Source: ${src}`);
                            console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
                            console.log(`  ├─ Parent: ${img.parentElement?.tagName || 'N/A'}`);
                            console.log(`  └─ Caller: ${caller}`);
                        });
                    }
                }
            });
            
            // Track removed nodes (image moves)
            mutation.removedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') {
                    const img = node;
                    const src = img.src;
                    const timestamp = performance.now();
                    
                    console.log(`[DOM-MUTATION-DEBUG] Image element removed from DOM`);
                    console.log(`  ├─ Source: ${src}`);
                    console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
                    console.log(`  └─ This may indicate image is being moved/cloned`);
                    
                    domMutationDebug.imageMoves.push({
                        src,
                        timestamp,
                        element: img
                    });
                }
            });
        });
    });
    
    // Start observing the document
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('[DOM-MUTATION-DEBUG] DOM mutation observer initialized');
    
    // Intercept cloneNode for images
    const originalCloneNode = Node.prototype.cloneNode;
    Node.prototype.cloneNode = function(deep) {
        const cloned = originalCloneNode.call(this, deep);
        
        if (this.tagName === 'IMG') {
            const src = this.src;
            const timestamp = performance.now();
            const error = new Error();
            const stack = error.stack || '';
            const caller = stack.split('\n')[2]?.trim() || 'unknown';
            
            console.warn(`[DOM-MUTATION-DEBUG] ⚠️  Image element cloned!`);
            console.warn(`  ├─ Source: ${src}`);
            console.warn(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
            console.warn(`  ├─ Deep clone: ${deep}`);
            console.warn(`  └─ Caller: ${caller}`);
            
            domMutationDebug.imageClones.push({
                src,
                timestamp,
                deep,
                caller,
                original: this,
                cloned: cloned
            });
        }
        
        return cloned;
    };
    
    return mutationObserver;
}

// ===== NETWORK REQUEST TRACKING =====

let networkRequestObserver = null;

/**
 * Initialize network request tracking
 * Only runs when CONFIG.DEBUG.ENABLED && CONFIG.DEBUG.TRACK_NETWORK_REQUESTS
 */
function initializeNetworkRequestTracking() {
    if (!CONFIG.DEBUG.ENABLED || !CONFIG.DEBUG.TRACK_NETWORK_REQUESTS) {
        return;
    }

    networkRequestObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            // Track image requests
            if (entry.initiatorType === 'img' || entry.name.includes('page_')) {
                const url = entry.name;
                const requestInfo = {
                    url: url,
                    startTime: entry.startTime,
                    duration: entry.duration,
                    initiatorType: entry.initiatorType,
                    transferSize: entry.transferSize,
                    encodedBodySize: entry.encodedBodySize,
                    decodedBodySize: entry.decodedBodySize,
                    responseStatus: entry.responseStatus,
                    timestamp: performance.now()
                };
                
                // Track duplicate requests
                if (!networkRequests.has(url)) {
                    networkRequests.set(url, []);
                }
                const requests = networkRequests.get(url);
                requests.push(requestInfo);
                
                // Log the request
                console.log(`[NETWORK-DEBUG] Image request detected`);
                console.log(`  ├─ URL: ${url}`);
                console.log(`  ├─ Start time: ${entry.startTime.toFixed(2)}ms`);
                console.log(`  ├─ Duration: ${entry.duration.toFixed(2)}ms`);
                console.log(`  ├─ Initiator: ${entry.initiatorType}`);
                console.log(`  ├─ Transfer size: ${entry.transferSize} bytes`);
                console.log(`  ├─ Response status: ${entry.responseStatus || 'N/A'}`);
                console.log(`  └─ Request count for this URL: ${requests.length}`);
                
                // Warn if duplicate
                if (requests.length > 1) {
                    const firstRequest = requests[0];
                    const timeDiff = entry.startTime - firstRequest.startTime;
                    console.warn(`[NETWORK-DEBUG] ⚠️  DUPLICATE REQUEST DETECTED!`);
                    console.warn(`  ├─ URL: ${url}`);
                    console.warn(`  ├─ First request: ${firstRequest.startTime.toFixed(2)}ms`);
                    console.warn(`  ├─ Current request: ${entry.startTime.toFixed(2)}ms`);
                    console.warn(`  ├─ Time difference: ${timeDiff.toFixed(2)}ms`);
                    console.warn(`  └─ Total requests: ${requests.length}`);
                }
            }
        }
    });
    
    // Start observing network requests
    try {
        networkRequestObserver.observe({ entryTypes: ['resource'] });
        console.log('[NETWORK-DEBUG] Network request observer initialized');
    } catch (error) {
        console.warn('[NETWORK-DEBUG] PerformanceObserver not supported or failed:', error);
    }
}

// ===== DEBUG TRACKING FUNCTIONS =====

/**
 * Track a page render call
 * @param {number} pageNumber - Page number being rendered
 * @param {string} caller - Function that called renderPortfolioPage
 * @returns {Object|null} Object with callId and timestamp, or null if debug disabled
 */
function trackPageRender(pageNumber, caller) {
    if (!CONFIG.DEBUG.ENABLED || !CONFIG.DEBUG.TRACK_PAGE_RENDERS) {
        return null;
    }

    const callId = ++pageRenderDebug.callCounter;
    const timestamp = performance.now();
    const error = new Error();
    const actualCaller = caller || getCallerFromStack(error);
    
    // Track call
    if (!pageRenderDebug.callsByPage.has(pageNumber)) {
        pageRenderDebug.callsByPage.set(pageNumber, []);
    }
    const pageCalls = pageRenderDebug.callsByPage.get(pageNumber);
    const callInfo = {
        callId,
        pageNumber,
        timestamp,
        caller: actualCaller,
        stack: error.stack
    };
    pageCalls.push(callInfo);
    pageRenderDebug.callsById.set(callId, callInfo);
    
    // Check for duplicates
    if (pageCalls.length > 1) {
        const firstCall = pageCalls[0];
        console.warn(`[DUPLICATE-DEBUG] WARNING: renderPortfolioPage called ${pageCalls.length} times for page ${pageNumber}`);
        console.warn(`  ├─ First call: #${firstCall.callId} at ${firstCall.timestamp.toFixed(2)}ms (caller: ${firstCall.caller})`);
        console.warn(`  └─ Current call: #${callId} at ${timestamp.toFixed(2)}ms (caller: ${actualCaller})`);
    }
    
    // Log call details
    console.log(`[PAGE-DEBUG] renderPortfolioPage called`);
    console.log(`  ├─ Call ID: #${callId}`);
    console.log(`  ├─ Page: ${pageNumber}`);
    console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
    console.log(`  ├─ Call count for page ${pageNumber}: ${pageCalls.length}`);
    console.log(`  └─ Caller: ${actualCaller}`);
    
    // Performance mark
    performance.mark(`render-start-${pageNumber}-${callId}`);
    
    return { callId, timestamp };
}

/**
 * Track page render completion
 * @param {number} pageNumber - Page number
 * @param {number} callId - Call ID from trackPageRender
 * @param {number} startTime - Start timestamp
 */
function trackPageRenderComplete(pageNumber, callId, startTime) {
    if (!CONFIG.DEBUG.ENABLED || !CONFIG.DEBUG.TRACK_PAGE_RENDERS || !callId) {
        return;
    }

    const endTime = performance.now();
    performance.mark(`render-complete-${pageNumber}-${callId}`);
    performance.measure(`page-render-${pageNumber}-${callId}`, `render-start-${pageNumber}-${callId}`, `render-complete-${pageNumber}-${callId}`);
    
    console.log(`[PAGE-DEBUG] renderPortfolioPage completed for page ${pageNumber} (Call #${callId}) in ${(endTime - startTime).toFixed(2)}ms`);
}

/**
 * Track an image load
 * @param {string} src - Image source URL
 * @returns {string} Image ID for tracking
 */
function trackImageLoad(src) {
    if (!CONFIG.DEBUG.ENABLED || !CONFIG.DEBUG.TRACK_IMAGE_LOADS) {
        return null;
    }

    const imageId = `img-${++imageLoadDebug.imageCounter}`;
    const timestamp = performance.now();
    const error = new Error();
    const stack = error.stack || '';
    const caller = stack.split('\n')[2]?.trim() || 'unknown';
    
    // Track image load
    if (!imageLoadDebug.imagesBySrc.has(src)) {
        imageLoadDebug.imagesBySrc.set(src, []);
    }
    const srcLoads = imageLoadDebug.imagesBySrc.get(src);
    const imageInfo = {
        imageId,
        src,
        timestamp,
        caller,
        stack
    };
    srcLoads.push(imageInfo);
    imageLoadDebug.imagesById.set(imageId, imageInfo);
    
    // Check for duplicate loads of same src
    if (srcLoads.length > 1) {
        const firstLoad = srcLoads[0];
        console.warn(`[DUPLICATE-DEBUG] WARNING: loadImage called ${srcLoads.length} times for ${src}`);
        console.warn(`  ├─ First load: ${imageLoadDebug.imagesById.get(firstLoad.imageId)?.imageId} at ${firstLoad.timestamp.toFixed(2)}ms`);
        console.warn(`  └─ Current load: ${imageId} at ${timestamp.toFixed(2)}ms`);
    }
    
    // Log image load start
    console.log(`[IMAGE-DEBUG] loadImage called`);
    console.log(`  ├─ Image ID: ${imageId}`);
    console.log(`  ├─ Source: ${src}`);
    console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
    console.log(`  └─ Caller: ${caller}`);
    
    // Performance mark
    performance.mark(`image-load-start-${imageId}`);
    
    return imageId;
}

/**
 * Track image load completion
 * @param {string} imageId - Image ID from trackImageLoad
 * @param {string} src - Image source URL
 * @param {number} startTime - Start timestamp
 */
function trackImageLoadComplete(imageId, src, startTime) {
    if (!CONFIG.DEBUG.ENABLED || !CONFIG.DEBUG.TRACK_IMAGE_LOADS || !imageId) {
        return;
    }

    const loadTime = performance.now();
    const loadDuration = loadTime - startTime;
    console.log(`[IMAGE-DEBUG] Image loaded`);
    console.log(`  ├─ Image ID: ${imageId}`);
    console.log(`  ├─ Source: ${src}`);
    console.log(`  ├─ Load time: ${loadDuration.toFixed(2)}ms`);
    console.log(`  └─ Success: true`);
    
    performance.mark(`image-load-complete-${imageId}`);
    performance.measure(`image-load-${imageId}`, `image-load-start-${imageId}`, `image-load-complete-${imageId}`);
}

/**
 * Track image load error
 * @param {string} imageId - Image ID from trackImageLoad
 * @param {string} src - Image source URL
 * @param {number} startTime - Start timestamp
 */
function trackImageLoadError(imageId, src, startTime) {
    if (!CONFIG.DEBUG.ENABLED || !CONFIG.DEBUG.TRACK_IMAGE_LOADS || !imageId) {
        return;
    }

    const errorTime = performance.now();
    const errorDuration = errorTime - startTime;
    console.error(`[IMAGE-DEBUG] Image load error`);
    console.error(`  ├─ Image ID: ${imageId}`);
    console.error(`  ├─ Source: ${src}`);
    console.error(`  ├─ Error time: ${errorDuration.toFixed(2)}ms`);
    console.error(`  └─ Success: false`);
    
    performance.mark(`image-load-error-${imageId}`);
}

/**
 * Track initialization call
 * @param {string} functionName - Name of initialization function
 */
function trackInit(functionName) {
    if (!CONFIG.DEBUG.ENABLED) {
        return;
    }

    if (functionName === 'initializePortfolioPages') {
        const callCount = ++initDebug.initializePortfolioPagesCallCount;
        const timestamp = performance.now();
        const error = new Error();
        const stack = error.stack || '';
        const caller = stack.split('\n')[2]?.trim() || 'unknown';
        
        if (callCount > 1) {
            console.warn(`[INIT-DEBUG] WARNING: initializePortfolioPages called ${callCount} times!`);
            console.warn(`  └─ This will cause duplicate page loading`);
        }
        
        console.log(`[INIT-DEBUG] initializePortfolioPages called`);
        console.log(`  ├─ Call count: ${callCount}`);
        console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
        console.log(`  ├─ Caller: ${caller}`);
    } else if (functionName === 'backgroundLoadRemainingPages') {
        const callCount = ++initDebug.backgroundLoadRemainingPagesCallCount;
        const timestamp = performance.now();
        
        if (callCount > 1) {
            console.warn(`[INIT-DEBUG] WARNING: backgroundLoadRemainingPages called ${callCount} times!`);
            console.warn(`  └─ This may cause duplicate page loading`);
        }
        
        console.log(`[INIT-DEBUG] backgroundLoadRemainingPages called`);
        console.log(`  ├─ Call count: ${callCount}`);
        console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
    } else if (functionName === 'loaderContextNext') {
        const callCount = ++initDebug.loaderContextNextCallCount;
        const timestamp = performance.now();
        
        console.log(`[INIT-DEBUG] loaderContext.next() called`);
        console.log(`  ├─ Call count: ${callCount}`);
        console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
    }
}

// ===== DEBUG SUMMARY FUNCTIONS =====

/**
 * Debug summary function - displays comprehensive summary of page loading activity
 * Accessible via window.PortfolioApp.debug.debugPageLoading()
 * 
 * @function PortfolioApp.debug.debugPageLoading
 * @description Displays a comprehensive debug summary including:
 * - Page rendering statistics and duplicate call detection
 * - Image loading statistics and duplicate load detection
 * - Application state information
 * - Initialization call counts
 * - Performance marks and measures
 * - Network request analysis
 * - DOM mutation tracking
 * 
 * @returns {Object} Debug summary object with detailed statistics
 * 
 * @example
 * // Enable debug mode first
 * CONFIG.DEBUG.ENABLED = true;
 * 
 * // Then call the debug function
 * const summary = PortfolioApp.debug.debugPageLoading();
 * console.log('Pages rendered:', summary.pageRenders);
 */
function debugPageLoading() {
    if (!CONFIG.DEBUG.ENABLED) {
        console.log('Debug mode is disabled. Set CONFIG.DEBUG.ENABLED = true to enable.');
        return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('PAGE LOADING DEBUG SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Page render summary
    console.log('\n📄 PAGE RENDERING:');
    console.log(`  Total render calls: ${pageRenderDebug.callCounter}`);
    const pagesWithMultipleCalls = Array.from(pageRenderDebug.callsByPage.entries())
        .filter(([page, calls]) => calls.length > 1);
    
    if (pagesWithMultipleCalls.length > 0) {
        console.warn(`  ⚠️  Pages with multiple calls: ${pagesWithMultipleCalls.length}`);
        pagesWithMultipleCalls.forEach(([page, calls]) => {
            console.warn(`    Page ${page}: ${calls.length} calls`);
            calls.forEach((call, idx) => {
                console.warn(`      Call #${call.callId}: ${call.timestamp.toFixed(2)}ms (caller: ${call.caller})`);
            });
        });
    } else {
        console.log(`  ✓ No duplicate render calls detected`);
    }
    
    // Image loading summary
    console.log('\n🖼️  IMAGE LOADING:');
    console.log(`  Total image loads: ${imageLoadDebug.imageCounter}`);
    const imagesWithMultipleLoads = Array.from(imageLoadDebug.imagesBySrc.entries())
        .filter(([src, loads]) => loads.length > 1);
    
    if (imagesWithMultipleLoads.length > 0) {
        console.warn(`  ⚠️  Images loaded multiple times: ${imagesWithMultipleLoads.length}`);
        imagesWithMultipleLoads.forEach(([src, loads]) => {
            console.warn(`    ${src}: ${loads.length} loads`);
            loads.forEach((load, idx) => {
                console.warn(`      Load ${idx + 1}: ${load.imageId} at ${load.timestamp.toFixed(2)}ms`);
            });
        });
    } else {
        console.log(`  ✓ No duplicate image loads detected`);
    }
    
    // State summary
    console.log('\n📊 STATE MANAGEMENT:');
    try {
        if (typeof appState !== 'undefined') {
            const pagesInFlight = Array.from(appState.getPagesInFlight()).sort((a, b) => a - b);
            console.log(`  Pages in flight: [${pagesInFlight.join(', ') || 'none'}]`);
            console.log(`  All pages loaded: ${appState.getAllPagesLoaded()}`);
            console.log(`  Max loaded page number: ${appState.getMaxLoadedPageNumber()}`);
            console.log(`  Total loaded images: ${appState.getLoadedImages().length}`);
        } else {
            console.log('  AppState not available');
        }
    } catch (error) {
        console.log('  State management data not available');
    }
    
    // Initialization summary
    console.log('\n🚀 INITIALIZATION:');
    console.log(`  initializePortfolioPages calls: ${initDebug.initializePortfolioPagesCallCount}`);
    console.log(`  backgroundLoadRemainingPages calls: ${initDebug.backgroundLoadRemainingPagesCallCount}`);
    console.log(`  loaderContext.next() calls: ${initDebug.loaderContextNextCallCount}`);
    
    if (initDebug.initializePortfolioPagesCallCount > 1) {
        console.warn(`  ⚠️  initializePortfolioPages called multiple times!`);
    }
    if (initDebug.backgroundLoadRemainingPagesCallCount > 1) {
        console.warn(`  ⚠️  backgroundLoadRemainingPages called multiple times!`);
    }
    
    // Performance marks summary
    console.log('\n⏱️  PERFORMANCE MARKS:');
    const marks = performance.getEntriesByType('mark');
    const measures = performance.getEntriesByType('measure');
    console.log(`  Total marks: ${marks.length}`);
    console.log(`  Total measures: ${measures.length}`);
    
    // Network requests summary
    console.log('\n🌐 NETWORK REQUESTS:');
    if (typeof window.PortfolioApp?.debug?.debugNetworkRequests === 'function') {
        window.PortfolioApp.debug.debugNetworkRequests();
    } else {
        console.log('  Check Network tab in DevTools for detailed request information');
        console.log('  Look for duplicate image requests with same URL');
    }
    
    // DOM Mutation summary
    console.log('\n🔍 DOM MUTATIONS:');
    try {
        if (typeof window !== 'undefined' && domMutationDebug) {
            console.log(`  Image clones detected: ${domMutationDebug.imageClones.length}`);
            console.log(`  Image moves detected: ${domMutationDebug.imageMoves.length}`);
            console.log(`  New image elements created: ${domMutationDebug.newImageElements.length}`);
            
            if (domMutationDebug.imageClones.length > 0) {
                console.warn(`  ⚠️  ${domMutationDebug.imageClones.length} image clone(s) detected!`);
                domMutationDebug.imageClones.forEach((clone, idx) => {
                    console.warn(`    Clone ${idx + 1}: ${clone.src} at ${clone.timestamp.toFixed(2)}ms`);
                });
            }
            
            if (domMutationDebug.newImageElements.length > 0) {
                console.warn(`  ⚠️  ${domMutationDebug.newImageElements.length} new image element(s) created!`);
                domMutationDebug.newImageElements.forEach((newImg, idx) => {
                    console.warn(`    New image ${idx + 1}: ${newImg.src} at ${newImg.timestamp.toFixed(2)}ms`);
                });
            }
        } else {
            console.log('  DOM mutation tracking data not accessible (check console for [DOM-MUTATION-DEBUG] logs)');
        }
    } catch (error) {
        console.log('  DOM mutation tracking not available');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (pagesWithMultipleCalls.length > 0 || imagesWithMultipleLoads.length > 0) {
        console.warn('  ⚠️  Duplicate loading detected!');
        console.warn('  - Check stack traces in console for duplicate calls');
        console.warn('  - Verify event listeners are not firing multiple times');
        console.warn('  - Check if initialization functions are called multiple times');
    } else {
        console.log('  ✓ No obvious duplicate loading detected in logs');
        console.log('  - Check Chrome Performance tab for network-level duplicates');
        console.log('  - Verify browser cache is not causing issues');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    
    const result = {
        pageRenders: pageRenderDebug.callsByPage,
        imageLoads: imageLoadDebug.imagesBySrc,
        initialization: {
            initializePortfolioPages: initDebug.initializePortfolioPagesCallCount,
            backgroundLoadRemainingPages: initDebug.backgroundLoadRemainingPagesCallCount,
            loaderContextNext: initDebug.loaderContextNextCallCount
        }
    };
    
    // Add state info if appState is available
    try {
        if (typeof appState !== 'undefined') {
            result.state = {
                pagesInFlight: Array.from(appState.getPagesInFlight()),
                allPagesLoaded: appState.getAllPagesLoaded(),
                maxLoadedPage: appState.getMaxLoadedPageNumber()
            };
        }
    } catch (error) {
        // appState not available, skip
    }
    
    return result;
}

/**
 * Debug network requests summary
 * Accessible via window.PortfolioApp.debug.debugNetworkRequests()
 * 
 * @function PortfolioApp.debug.debugNetworkRequests
 * @description Displays network request analysis including:
 * - Duplicate request detection
 * - Request timing information
 * - Total request counts
 * 
 * @returns {void}
 * 
 * @example
 * // Enable debug mode and network tracking first
 * CONFIG.DEBUG.ENABLED = true;
 * CONFIG.DEBUG.TRACK_NETWORK_REQUESTS = true;
 * 
 * // Then call the debug function
 * PortfolioApp.debug.debugNetworkRequests();
 */
function debugNetworkRequests() {
    if (!CONFIG.DEBUG.ENABLED || !CONFIG.DEBUG.TRACK_NETWORK_REQUESTS) {
        console.log('Network request tracking is disabled. Set CONFIG.DEBUG.TRACK_NETWORK_REQUESTS = true to enable.');
        return;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('NETWORK REQUEST DEBUG SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    
    const duplicateUrls = Array.from(networkRequests.entries())
        .filter(([url, requests]) => requests.length > 1);
    
    if (duplicateUrls.length > 0) {
        console.warn(`\n⚠️  Found ${duplicateUrls.length} URLs with duplicate requests:`);
        duplicateUrls.forEach(([url, requests]) => {
            console.warn(`\n  ${url}: ${requests.length} requests`);
            requests.forEach((req, idx) => {
                console.warn(`    Request ${idx + 1}:`);
                console.warn(`      ├─ Start: ${req.startTime.toFixed(2)}ms`);
                console.warn(`      ├─ Duration: ${req.duration.toFixed(2)}ms`);
                console.warn(`      ├─ Initiator: ${req.initiatorType}`);
                console.warn(`      └─ Status: ${req.responseStatus || 'N/A'}`);
            });
        });
    } else {
        console.log('\n✓ No duplicate network requests detected');
    }
    
    console.log(`\nTotal unique image URLs: ${networkRequests.size}`);
    const totalRequests = Array.from(networkRequests.values())
        .reduce((sum, requests) => sum + requests.length, 0);
    console.log(`Total image requests: ${totalRequests}`);
    console.log('\n═══════════════════════════════════════════════════════════');
}

// ===== PUBLIC API =====

const DebugTracker = {
    // Tracking functions
    trackPageRender,
    trackPageRenderComplete,
    trackImageLoad,
    trackImageLoadComplete,
    trackImageLoadError,
    trackInit,
    
    // Initialization functions
    initializeDOMMutationTracking,
    initializeNetworkRequestTracking,
    
    // Debug summary functions
    debugPageLoading,
    debugNetworkRequests,
    
    // Access to debug objects (for advanced debugging)
    getPageRenderDebug: () => pageRenderDebug,
    getImageLoadDebug: () => imageLoadDebug,
    getDomMutationDebug: () => domMutationDebug,
    getInitDebug: () => initDebug
};

// Expose debug functions to PortfolioApp namespace
if (typeof window.PortfolioApp !== 'undefined') {
    window.PortfolioApp.debug.debugPageLoading = debugPageLoading;
    window.PortfolioApp.debug.debugNetworkRequests = debugNetworkRequests;
}

// Initialize network request tracking when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        DebugTracker.initializeNetworkRequestTracking();
    });
} else {
    DebugTracker.initializeNetworkRequestTracking();
}

// Initialize DOM mutation tracking when DOM is ready (if enabled)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        DebugTracker.initializeDOMMutationTracking();
    });
} else {
    DebugTracker.initializeDOMMutationTracking();
}

