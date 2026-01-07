/**
 * DOM manipulation utilities
 * Provides helper functions for common DOM operations
 */

// DOM mutation tracking is now handled by DebugTracker module

const DOM = {
    /**
     * Create a DOM element with attributes and children
     * @param {string} tag - HTML tag name
     * @param {string} className - Optional CSS class name
     * @param {Object} attributes - Optional attributes object
     * @param {Array|Node} children - Optional children (array of nodes or single node)
     * @returns {HTMLElement} Created element
     */
    createElement: (tag, className = null, attributes = {}, children = null) => {
        const element = document.createElement(tag);
        
        if (className) {
            element.className = className;
        }
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Append children
        if (children) {
            if (Array.isArray(children)) {
                children.forEach(child => {
                    if (child) element.appendChild(child);
                });
            } else {
                element.appendChild(children);
            }
        }
        
        return element;
    },

    /**
     * Create the zoomist structure for an image
     * @param {HTMLImageElement} img - Image element
     * @returns {HTMLElement} Zoomist container element
     */
    createZoomistStructure: (img) => {
        const zoomistContainer = DOM.createElement('div', 'zoomist-container');
        const zoomistWrapper = DOM.createElement('div', 'zoomist-wrapper');
        const zoomistImage = DOM.createElement('div', 'zoomist-image', {}, img);
        
        zoomistWrapper.appendChild(zoomistImage);
        zoomistContainer.appendChild(zoomistWrapper);
        
        return zoomistContainer;
    },

    /**
     * Create a page loader element with bouncing dots animation
     * Creates a loader with three bouncing dots that animate while the page is loading
     * @returns {HTMLElement} Page loader element with bouncing dots
     */
    createSkeletonElement: () => {
        console.log('[LOADER] Creating page loader with bouncing dots');
        const loaderContainer = DOM.createElement('div', 'page-loader');
        const loader = DOM.createElement('div', 'loader');
        
        // Create three bouncing dots (same structure as global spinner)
        for (let i = 0; i < 3; i++) {
            const ball = DOM.createElement('span', 'ball');
            loader.appendChild(ball);
        }
        
        loaderContainer.appendChild(loader);
        console.log('[LOADER] Page loader created with', loader.children.length, 'bouncing dots');
        return loaderContainer;
    },

    /**
     * Create a fallback error element
     * @param {string} message - Error message
     * @returns {HTMLElement} Fallback container
     */
    createFallbackElement: (message = 'Unable to load this page.') => {
        const fallback = DOM.createElement('div', 'page-fallback');
        const icon = DOM.createElement('div', 'page-fallback-icon', {}, '⚠️');
        const text = DOM.createElement('p', null, { textContent: message });
        
        fallback.appendChild(icon);
        fallback.appendChild(text);
        
        return fallback;
    },

    /**
     * Create SVG element with namespace
     * @param {string} tag - SVG tag name (rect, svg, etc.)
     * @param {Object} attributes - Attributes object
     * @returns {SVGElement} SVG element
     */
    createSVGElement: (tag, attributes = {}) => {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    },

    /**
     * Load an image element
     * @param {string} src - Image source URL
     * @param {string} className - Optional CSS class
     * @returns {Promise<HTMLImageElement>} Loaded image element
     */
    loadImage: (src, className = 'portfolio-image') => {
        // Debug tracking (only if enabled)
        const timestamp = performance.now();
        const imageId = typeof DebugTracker !== 'undefined' ? DebugTracker.trackImageLoad(src) : null;
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.className = className;
            img.decoding = 'async';
            
            // Store debug info on image element (only if debug enabled)
            if (imageId && CONFIG.DEBUG.ENABLED && CONFIG.DEBUG.TRACK_IMAGE_LOADS) {
                img._debugImageId = imageId;
                img._debugSrc = src;
                
                // ===== IMAGE SRC INTERCEPTOR =====
                // Only intercept src property when debug is enabled
                let srcReadCount = 0;
                let srcWriteCount = 0;
                const originalSrcValue = src;
                
                // Get the original property descriptor
                const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
                
                // Intercept src property
                Object.defineProperty(img, 'src', {
                    get() {
                        srcReadCount++;
                        const accessTime = performance.now();
                        const error = new Error();
                        const stack = error.stack || '';
                        const caller = stack.split('\n')[2]?.trim() || 'unknown';
                        
                        // Log src access (only warn after first read, as first read is expected)
                        if (srcReadCount > 1) {
                            console.warn(`[IMAGE-DEBUG] img.src accessed (read #${srcReadCount})`);
                            console.warn(`  ├─ Image ID: ${imageId}`);
                            console.warn(`  ├─ Source: ${originalSrcValue}`);
                            console.warn(`  ├─ Timestamp: ${accessTime.toFixed(2)}ms`);
                            console.warn(`  └─ Caller: ${caller}`);
                        }
                        
                        return originalSrcDescriptor.get.call(this);
                    },
                    set(value) {
                        srcWriteCount++;
                        const writeTime = performance.now();
                        const error = new Error();
                        const stack = error.stack || '';
                        const caller = stack.split('\n')[2]?.trim() || 'unknown';
                        
                        // Warn if src is being set again (should not happen after initial load)
                        console.warn(`[IMAGE-DEBUG] ⚠️  WARNING: img.src being set again!`);
                        console.warn(`  ├─ Image ID: ${imageId}`);
                        console.warn(`  ├─ Original src: ${originalSrcValue}`);
                        console.warn(`  ├─ New src: ${value}`);
                        console.warn(`  ├─ Write count: ${srcWriteCount}`);
                        console.warn(`  ├─ Timestamp: ${writeTime.toFixed(2)}ms`);
                        console.warn(`  └─ Caller: ${caller}`);
                        
                        originalSrcDescriptor.set.call(this, value);
                    },
                    configurable: true
                });
                
                // Store interceptor stats on image for later access
                img._srcInterceptorStats = {
                    readCount: () => srcReadCount,
                    writeCount: () => srcWriteCount,
                    originalSrc: originalSrcValue
                };
            }
            
            // Set src (triggers load)
            img.src = src;
            
            img.onload = () => {
                // Debug tracking completion
                if (typeof DebugTracker !== 'undefined' && imageId) {
                    DebugTracker.trackImageLoadComplete(imageId, src, timestamp);
                }
                resolve(img);
            };
            
            img.onerror = (event) => {
                // Debug tracking error
                if (typeof DebugTracker !== 'undefined' && imageId) {
                    DebugTracker.trackImageLoadError(imageId, src, timestamp);
                }
                reject(event);
            };
        });
    },

    /**
     * Debounce a function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
};

