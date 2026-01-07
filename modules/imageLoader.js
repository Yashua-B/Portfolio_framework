/**
 * Image Loader Module
 * Handles image discovery, loading, and progressive rendering
 */

// Initialization debug tracking is now handled by DebugTracker module

// Format consistency optimization: remember which format worked
let preferredFormat = null;

/**
 * Find an image candidate for a given page number
 * Uses fetch() to load images directly with status code checking for robust error handling
 * Tries formats in priority order (AVIF → WebP → PNG) with format consistency optimization
 * @param {number} pageNumber - Page number to find
 * @returns {Promise<Object|null>} Image data with imageElement or null
 */
async function findImageCandidate(pageNumber) {
    // Validate format priority configuration
    if (!CONFIG.IMAGE.FORMAT_PRIORITY || !Array.isArray(CONFIG.IMAGE.FORMAT_PRIORITY) || CONFIG.IMAGE.FORMAT_PRIORITY.length === 0) {
        ErrorHandler.error('CONFIG.IMAGE.FORMAT_PRIORITY is not configured or is empty');
        return null;
    }
    
    const paddedTwo = String(pageNumber).padStart(CONFIG.IMAGE.FILENAME_PADDING, '0');
    const baseFilename = `${CONFIG.IMAGE.FILENAME_PATTERN}${paddedTwo}`;
    const attemptedFormats = [];
    
    // Helper function to try a specific format
    const tryFormat = async (format) => {
        const filename = `${baseFilename}.${format}`;
        const imagePath = `${CONFIG.IMAGE.FOLDER}${format}/${filename}`;
        attemptedFormats.push(format);
        
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), CONFIG.IMAGE.TIMEOUT_MS);
        
        let blobUrl = null;
        let img = null;
        
        try {
            const response = await fetch(imagePath, {
                signal: abortController.signal,
                cache: 'default'
            });
            clearTimeout(timeoutId);
            
            if (response.status === 404) {
                // File doesn't exist for this format
                return null;
            }
            
            if (response.status >= 500) {
                // Transient server error - try next format
                ErrorHandler.warn(`Server error loading ${imagePath} (${response.status}), trying next format`);
                return null;
            }
            
            if (response.status === 200) {
                // File exists - try to decode
                const blob = await response.blob();
                blobUrl = URL.createObjectURL(blob);
                
                img = new Image();
                img.className = 'portfolio-image';
                img.decoding = 'async';
                
                // Attempt to decode image (will fail if browser doesn't support format)
                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        if (img.complete && img.naturalWidth > 0) {
                            resolve();
                        } else {
                            reject(new Error('Image loaded but not complete'));
                        }
                    };
                    img.onerror = () => reject(new Error(`Browser does not support ${format} format`));
                    img.src = blobUrl;
                });
                
                // Success - return image data (don't revoke blobUrl, img.src needs it)
                return {
                    path: imagePath,
                    name: filename,
                    imageElement: img,
                    format: format
                };
            }
            
            // Other HTTP errors (403, 401, etc.) - try next format
            ErrorHandler.warn(`Error loading ${imagePath} (${response.status}), trying next format`);
            return null;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Clean up on failure
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            if (img) {
                img.onload = null;
                img.onerror = null;
                img.src = '';
            }
            
            if (error.name === 'AbortError') {
                ErrorHandler.warn(`Timeout loading ${format} format (${CONFIG.IMAGE.TIMEOUT_MS}ms), trying fallback`);
            } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                ErrorHandler.warn(`Network error loading ${format} format: ${error.message}, trying fallback`);
            } else if (error.message.includes('does not support')) {
                // Format decode failure - expected, try next format
                if (CONFIG.DEBUG.ENABLED) {
                    ErrorHandler.log(`Browser does not support ${format} format, trying fallback`);
                }
            } else {
                ErrorHandler.warn(`Error loading ${format} format: ${error.message}, trying fallback`);
            }
            
            return null;
        }
    };
    
    // Try preferred format first (if we know one that works)
    if (preferredFormat) {
        const result = await tryFormat(preferredFormat);
        if (result) {
            return result; // Preferred format worked!
        }
        // Preferred format failed - might be end of portfolio or format inconsistency
        // Fall through to try all formats to be safe
    }
    
    // Try each format in priority order (skip preferred if already tried)
    for (const format of CONFIG.IMAGE.FORMAT_PRIORITY) {
        if (format === preferredFormat) continue; // Already tried
        
        const result = await tryFormat(format);
        if (result) {
            // Success! Remember this format for future pages
            preferredFormat = format;
            return result;
        }
    }
    
    // All formats failed
    ErrorHandler.log(`Page ${pageNumber} not found in any format (${attemptedFormats.join(', ')}) - end of portfolio`);
    return null;
}

/**
 * Create an auto-loader for discovering images
 * @returns {Object} Loader context with next() and finalize() methods
 */
function createAutoLoader() {
    let nextPage = 1;
    let consecutiveFailures = 0;
    let foundAny = false;
    let loadedCount = 0;
    
    return {
        mode: 'auto',
        async next() {
            // Debug tracking
            if (typeof DebugTracker !== 'undefined') {
                DebugTracker.trackInit('loaderContextNext');
            }
            
            while (nextPage <= CONFIG.IMAGE.MAX_PAGES) {
                const pageToCheck = nextPage;
                nextPage++;
                const candidate = await findImageCandidate(pageToCheck);
                
                if (candidate) {
                    foundAny = true;
                    consecutiveFailures = 0;
                    loadedCount++;
                    // Debug logging handled by DebugTracker
                    const result = {
                        path: candidate.path,
                        pageNumber: pageToCheck,
                        name: candidate.name,
                        format: candidate.format
                    };
                    // Include image element if available (loaded via fetch)
                    if (candidate.imageElement) {
                        result.imageElement = candidate.imageElement;
                    }
                    return result;
                }
                
                consecutiveFailures++;
                if (foundAny && consecutiveFailures >= CONFIG.IMAGE.MAX_CONSECUTIVE_FAILURES) {
                    // Debug logging handled by DebugTracker
                    break;
                }
            }
            
            // Debug logging handled by DebugTracker
            return null;
        },
        finalize() {
            if (loadedCount > 0) {
                ErrorHandler.log(`Auto-discovered ${loadedCount} images`);
            } else {
                ErrorHandler.warn('Automatic discovery did not find any images.');
            }
        }
    };
}

/**
 * Load an image element
 * Reuses image element from fetch() if available to avoid duplicate network requests
 * @param {string} src - Image source URL
 * @param {number} pageNumber - Page number (for error context)
 * @param {number} index - Image index (unused, kept for compatibility)
 * @param {HTMLImageElement} imageElement - Optional pre-loaded image element from fetch()
 * @returns {Promise<HTMLImageElement>} Loaded image element
 */
function loadImageSequential(src, pageNumber, index, imageElement = null) {
    // If we have an image element from fetch(), use it directly
    if (imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
        return Promise.resolve(imageElement);
    }
    
    // Fall back to normal loading if no image element available
    return DOM.loadImage(src, 'portfolio-image');
}

/**
 * Background load remaining pages after first page is shown
 * @param {Object} loaderContext - Loader context
 * @param {HTMLElement} container - Container element
 * @param {number} startIndex - Starting index
 * @param {Function} renderPage - Function to render a page
 * @returns {Promise<void>}
 */
async function backgroundLoadRemainingPages(loaderContext, container, startIndex, renderPage) {
    // Debug tracking
    if (typeof DebugTracker !== 'undefined') {
        DebugTracker.trackInit('backgroundLoadRemainingPages');
    }
    
    ErrorHandler.log(`Starting background loading of remaining pages from index ${startIndex}`);
    let renderIndex = startIndex;
    let imageData;
    
    while ((imageData = await loaderContext.next())) {
        // Background loading progress (only log if debug enabled)
        if (CONFIG.DEBUG.ENABLED) {
            ErrorHandler.log(`Background loading page ${imageData.pageNumber} (index ${renderIndex})`);
        }
        appState.addLoadedImage(imageData);
        await renderPage(imageData, renderIndex, container);
        renderIndex++;
    }
    
    if (typeof loaderContext.finalize === 'function') {
        loaderContext.finalize();
    }
    
    appState.setAllPagesLoaded(true);
    
    // Resolve any pending page ready promises
    appState.getPageReadyResolvers().forEach(resolvers => {
        resolvers.forEach(resolve => resolve(null));
    });
    appState.getPageReadyResolvers().clear();
}

/**
 * Initialize portfolio pages - progressive loading
 * @param {HTMLElement} container - Container element
 * @param {Function} renderPage - Function to render a page
 * @param {Function} showLoader - Function to show loader
 * @param {Function} hideLoader - Function to hide loader
 * @returns {Promise<void>}
 */
async function initializePortfolioPages(container, renderPage, showLoader, hideLoader) {
    // Debug tracking
    if (typeof DebugTracker !== 'undefined') {
        DebugTracker.trackInit('initializePortfolioPages');
    }
    
    container.innerHTML = '';
    appState.clearHotspotElements();
    
    const loaderContext = createAutoLoader();
    if (!loaderContext) {
        hideLoader('No portfolio pages found');
        container.innerHTML = `
            <div class="page-fallback">
                <div class="page-fallback-icon">⚠️</div>
                <p>No portfolio images were found.</p>
            </div>
        `;
        appState.setAllPagesLoaded(true);
        return;
    }
    
    const firstImage = await loaderContext.next();
    if (!firstImage) {
        hideLoader('No portfolio pages found');
        container.innerHTML = `
            <div class="page-fallback">
                <div class="page-fallback-icon">⚠️</div>
                <p>No portfolio images were found.</p>
            </div>
        `;
        appState.setAllPagesLoaded(true);
        return;
    }
    
    appState.setLoadedImages([firstImage]);
    
    // Debug: Log first page load timing
    const firstPageStartTime = performance.now();
    if (CONFIG.DEBUG.ENABLED) {
        ErrorHandler.log(`First page rendering started at ${firstPageStartTime.toFixed(2)}ms`);
    }
    
    await renderPage(firstImage, 0, container);
    
    const firstPageEndTime = performance.now();
    const firstPageLoadTime = firstPageEndTime - firstPageStartTime;
    if (CONFIG.DEBUG.ENABLED) {
        ErrorHandler.log(`First page rendered in ${firstPageLoadTime.toFixed(2)}ms (completed at ${firstPageEndTime.toFixed(2)}ms)`);
    }
    ErrorHandler.log(`Hiding global spinner, starting background page loading`);
    
    hideLoader();
    
    // Continue loading remaining images in the background
    backgroundLoadRemainingPages(loaderContext, container, 1, renderPage).catch(error => {
        ErrorHandler.error('Error loading remaining portfolio pages', error);
    });
}

