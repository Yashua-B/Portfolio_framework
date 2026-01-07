/**
 * Zoomist Controller Module
 * Handles Zoomist initialization and zoom/pan functionality
 */

// Testing flag is now in CONFIG.ZOOMIST.DISABLE_FOR_TESTING

/**
 * Check if device is mobile
 * @returns {boolean} True if mobile device
 */
function isMobile() {
    return window.innerWidth <= CONFIG.BREAKPOINTS.MOBILE || 'ontouchstart' in window;
}

/**
 * Initialize Zoomist for a page
 * @param {HTMLElement} pageDiv - Page div element
 * @param {HTMLElement} zoomistContainer - Zoomist container element
 * @param {number} pageNumber - Page number
 */
/**
 * Setup custom wheel zoom handler for Zoomist
 * @param {HTMLElement} zoomistContainer - Zoomist container element
 * @param {Object} zoomistInstance - Zoomist instance
 * @param {HTMLElement} pageDiv - Page div element
 * @param {number} pageNumber - Page number
 */
function setupZoomistWheelHandler(zoomistContainer, zoomistInstance, pageDiv, pageNumber) {
    zoomistContainer.addEventListener('wheel', function(event) {
        if (event.ctrlKey || event.metaKey) { // Support both Ctrl (Windows/Linux) and Cmd (Mac)
            event.preventDefault(); // Prevent default browser zoom
            
            // Get mouse position relative to the zoomist container
            const rect = zoomistContainer.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // Determine zoom direction (negative deltaY = scroll up = zoom in)
            const zoomDirection = event.deltaY < 0 ? 1 : -1;
            const zoomAmount = CONFIG.ZOOMIST.WHEEL_RATIO * zoomDirection;
            
            // Get current transform state
            const transform = zoomistInstance.transform;
            const currentScale = transform.__scale__ || transform.scale || 1;
            const currentX = transform.__translateX__ || transform.x || 0;
            const currentY = transform.__translateY__ || transform.y || 0;
            
            // Calculate new scale (clamped to min 1 and max scale)
            const newScale = Math.max(1, Math.min(CONFIG.ZOOMIST.MAX_SCALE, currentScale + zoomAmount));
            
            // Calculate mouse offset from container center
            const containerCenterX = rect.width / 2;
            const containerCenterY = rect.height / 2;
            const offsetX = mouseX - containerCenterX;
            const offsetY = mouseY - containerCenterY;
            
            // Calculate scale ratio
            const scaleRatio = newScale / currentScale;
            
            // Calculate translation to keep mouse point fixed during zoom
            // Formula: newTranslate = (mouseOffset) * (1 - scaleRatio) + currentTranslate * scaleRatio
            // This ensures the point under the mouse cursor stays fixed during zoom
            const translateX = offsetX * (1 - scaleRatio) + currentX * scaleRatio;
            const translateY = offsetY * (1 - scaleRatio) + currentY * scaleRatio;
            
            // Apply zoom and translation
            zoomistInstance.zoomTo(newScale);
            zoomistInstance.moveTo({ x: translateX, y: translateY });
            
            // Hide animation on zoom (example for page 2)
            if (pageNumber === 2 && newScale > 1) {
                const page = pageDiv.querySelector(`[data-page="2"]`) || pageDiv;
                const mouseAnimation = page.querySelector('.animation-mouse');
                
                // Check if animation exists and is not already hidden or in process of hiding
                if (mouseAnimation && 
                    !mouseAnimation.classList.contains('animation-hidden-permanent') &&
                    !mouseAnimation.classList.contains('animation-hidden')) {
                    if (typeof hidePageAnimation === 'function') {
                        hidePageAnimation(2, 'animation-mouse', true);
                    } else {
                        // Fallback: direct hide if function not available
                        mouseAnimation.classList.add('animation-hidden');
                        setTimeout(() => {
                            mouseAnimation.classList.add('animation-hidden-permanent');
                            mouseAnimation.classList.remove('animation-hidden');
                        }, 600);
                    }
                }
            }
        }
        // If Ctrl is not pressed, let the event bubble for normal page scrolling
    }, { passive: false });
}

/**
 * Initialize Zoomist for a page
 * @param {HTMLElement} pageDiv - Page div element
 * @param {HTMLElement} zoomistContainer - Zoomist container element
 * @param {number} pageNumber - Page number
 */
function initializeZoomistForPage(pageDiv, zoomistContainer, pageNumber) {
    // Testing: Disable Zoomist if flag is set
    if (CONFIG.ZOOMIST.DISABLE_FOR_TESTING) {
        if (CONFIG.DEBUG.ENABLED) {
            console.log(`[ZOOMIST-DEBUG] Zoomist initialization DISABLED for testing (page ${pageNumber})`);
        }
        return;
    }
    
    // Mobile detection: disable zoomist on mobile devices
    if (isMobile()) {
        // On mobile, don't initialize zoomist - rely on native pinch-to-zoom
        return;
    }
    
    // Check if Zoomist is available (loaded from CDN)
    if (typeof Zoomist === 'undefined') {
        ErrorHandler.warn('Zoomist library not loaded');
        return;
    }
    
    // Mobile detection: disable zoomist on mobile devices
    if (isMobile()) {
        // On mobile, don't initialize zoomist - rely on native pinch-to-zoom
        return;
    }
    
    // Check if Zoomist is available (loaded from CDN)
    if (typeof Zoomist === 'undefined') {
        ErrorHandler.warn('Zoomist library not loaded');
        return;
    }
    
    try {
        // Debug tracking (only if enabled)
        let imageStateBefore = null;
        if (CONFIG.DEBUG.ENABLED) {
            const zoomistInitStartTime = performance.now();
            const img = zoomistContainer.querySelector('img');
            
            if (img) {
                imageStateBefore = {
                    src: img.src,
                    complete: img.complete,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight
                };
                
                console.log(`[ZOOMIST-DEBUG] Before Zoomist initialization for page ${pageNumber}`);
                console.log(`  ├─ Timestamp: ${zoomistInitStartTime.toFixed(2)}ms`);
                console.log(`  ├─ Image src: ${imageStateBefore.src}`);
                console.log(`  └─ Image dimensions: ${imageStateBefore.naturalWidth}x${imageStateBefore.naturalHeight}`);
            }
        }
        
        // Initialize zoomist with options - disable default wheel zooming
        const zoomistInstance = new Zoomist(zoomistContainer, {
            maxScale: CONFIG.ZOOMIST.MAX_SCALE,        // Allow 4x zoom
            bounds: true,       // Prevent panning beyond image edges
            slider: false,      // No UI slider
            zoomer: false,      // No UI zoom buttons
            wheelable: false    // Disable default wheel zoom - we'll handle it with Ctrl+wheel
        });
        
        // Store instance for potential cleanup
        appState.setZoomistInstance(pageNumber, zoomistInstance);
        
        // Setup custom wheel handler
        setupZoomistWheelHandler(zoomistContainer, zoomistInstance, pageDiv, pageNumber);
        
        // Debug tracking completion (only if enabled)
        if (CONFIG.DEBUG.ENABLED && imageStateBefore) {
            const zoomistInitEndTime = performance.now();
            const img = zoomistContainer.querySelector('img');
            
            if (img) {
                const imageStateAfter = {
                    src: img.src,
                    complete: img.complete,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight
                };
                
                console.log(`[ZOOMIST-DEBUG] After Zoomist initialization for page ${pageNumber}`);
                console.log(`  ├─ Init duration: ${(zoomistInitEndTime - performance.now()).toFixed(2)}ms`);
                console.log(`  └─ Image dimensions: ${imageStateAfter.naturalWidth}x${imageStateAfter.naturalHeight}`);
                
                // Check for changes
                if (imageStateBefore.src !== imageStateAfter.src) {
                    console.warn(`[ZOOMIST-DEBUG] ⚠️  WARNING: Image src changed after Zoomist init!`);
                }
            }
        }
        
    } catch (error) {
        ErrorHandler.warn(`Failed to initialize zoomist for page ${pageNumber}`, error);
    }
}

