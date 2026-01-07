/**
 * Animation Manager Module
 * Handles custom animations on specific pages with icon files
 * Animation styles are loaded from companion CSS files (e.g., zoom-hint.css)
 */

/**
 * Set to track which animation CSS files have been loaded (prevents duplicates)
 */
const loadedAnimationCSS = new Set();

/**
 * Load companion CSS file for an animation icon
 * @param {string} iconFile - Icon filename (e.g., "zoom-hint.svg")
 * @returns {Promise<boolean>} True if CSS loaded successfully, false otherwise
 */
async function loadAnimationCSS(iconFile) {
    // Extract base name from icon file (e.g., "zoom-hint" from "zoom-hint.svg")
    const baseName = iconFile.replace(/\.svg$/i, '').split('/').pop();
    
    if (!baseName) {
        ErrorHandler.warn(`Invalid icon filename for CSS loading: ${iconFile}`);
        return false;
    }
    
    // Construct CSS file path
    const cssPath = `${CONFIG.ANIMATION_HINT.ICONS_FOLDER}${baseName}.css`;
    
    try {
        // Check if CSS file exists
        const response = await fetch(cssPath);
        if (!response.ok) {
            ErrorHandler.log(`No companion CSS file found for ${iconFile} (expected: ${cssPath}) - animation will work without custom styles`);
            return false;
        }
        
        // Load CSS text
        const cssText = await response.text();
        
        // Check if a style element for this animation already exists in the DOM
        const existingStyle = document.querySelector(`style[data-animation-css="${baseName}"]`);
        
        if (existingStyle) {
            // Update existing style element with fresh CSS
            existingStyle.textContent = cssText;
            ErrorHandler.log(`Updated animation CSS: ${cssPath}`);
        } else {
            // Create and inject new <style> tag
            const styleElement = document.createElement('style');
            styleElement.setAttribute('data-animation-css', baseName);
            styleElement.textContent = cssText;
            
            // Append to <head>
            document.head.appendChild(styleElement);
            
            // Mark as loaded
            loadedAnimationCSS.add(cssPath);
            
            ErrorHandler.log(`Loaded animation CSS: ${cssPath}`);
        }
        
        return true;
        
    } catch (error) {
        ErrorHandler.warn(`Error loading animation CSS file ${cssPath}:`, error);
        return false;
    }
}

/**
 * Parse animation configuration text
 * @param {string} text - Configuration text
 * @returns {Array} Array of validated animation configs
 */
function parseAnimationConfig(text) {
    const configs = [];
    const lines = text.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        if (line === '' || line.startsWith('#')) continue;
        
        const parts = line.split(',').map(p => p.trim());
        
        // Support 6-8 parameters (with optional delay and optional trigger type)
        // New format: page_number, centerX%, centerY%, size%, icon_filename, duration_ms, delay_ms, trigger_type
        if (parts.length < 6 || parts.length > 8) {
            ErrorHandler.warn(`Invalid animation config line: ${line}`);
            continue;
        }
        
        const [pageNum, centerX, centerY, size, iconFile, duration, delay = '0', triggerType = 'visible'] = parts;
        
        // Parse and validate
        const parsedPageNum = parseInt(pageNum);
        if (!Validation.validatePageNumber(parsedPageNum)) {
            ErrorHandler.warn(`Invalid page number "${pageNum}" in animation config: ${line}`);
            continue;
        }
        
        const parsedCenterX = parseFloat(centerX);
        const parsedCenterY = parseFloat(centerY);
        const parsedSize = parseFloat(size);
        const parsedDuration = parseFloat(duration);
        const parsedDelay = parseFloat(delay);
        
        // Parse animation configuration
        
        // Validate percentages for center position and size
        if (!Validation.validatePercentage(parsedCenterX) || !Validation.validatePercentage(parsedCenterY)) {
            ErrorHandler.warn(`Invalid center position percentages in animation config: ${line}`);
            continue;
        }
        
        // Validate size as positive number (can be > 100% for oversized animations)
        if (!Validation.validatePositiveNumber(parsedSize)) {
            ErrorHandler.warn(`Invalid size value in animation config (must be > 0): ${line}`);
            continue;
        }
        
        // Validate duration
        if (!Validation.validatePositiveNumber(parsedDuration)) {
            ErrorHandler.warn(`Invalid duration in animation config: ${line}`);
            continue;
        }
        
        // Validate icon filename
        if (!iconFile || !iconFile.endsWith('.svg')) {
            ErrorHandler.warn(`Invalid icon filename "${iconFile}" in animation config: ${line}`);
            continue;
        }
        
        // Validate and normalize trigger type
        const normalizedTriggerType = triggerType.toLowerCase();
        const validTriggerTypes = ['hover', 'visible'];
        let finalTriggerType = 'visible'; // Default
        
        if (normalizedTriggerType === 'hover' || normalizedTriggerType === 'visible') {
            finalTriggerType = normalizedTriggerType;
        } else if (triggerType && triggerType !== 'visible') {
            // Only warn if trigger type was explicitly provided but invalid
            ErrorHandler.warn(`Invalid trigger type "${triggerType}" in animation config: ${line}. Defaulting to "visible".`);
        }
        
        const config = {
            pageNumber: parsedPageNum,
            centerX: parsedCenterX,
            centerY: parsedCenterY,
            size: parsedSize,
            iconFile: iconFile,
            duration: parsedDuration,
            delay: parsedDelay,
            triggerType: finalTriggerType
        };
        
        // Animation config created successfully
        
        configs.push(config);
    }
    
    return configs;
}

/**
 * Load animation configurations from file
 * @returns {Promise<Array>} Array of animation configs
 */
async function loadAnimationConfigs() {
    try {
        const response = await fetch(CONFIG.ANIMATION_HINT.FILE);
        if (!response.ok) {
            ErrorHandler.log('No animations.txt file found - no animations will be added');
            return [];
        }
        
        const text = await response.text();
        const configs = parseAnimationConfig(text);
        ErrorHandler.log(`Loaded ${configs.length} animation configurations`);
        return configs;
        
    } catch (error) {
        ErrorHandler.log('Could not load animations configuration: ' + error.message);
        return [];
    }
}

/**
 * Extract CSS class name from icon filename
 * @param {string} iconFile - Icon filename (e.g., "zoom-hint.svg")
 * @returns {string|null} Class name (e.g., "animation-zoom-hint") or null if invalid
 */
function extractIconClassName(iconFile) {
    if (!iconFile || typeof iconFile !== 'string') {
        return null;
    }
    
    // Remove .svg extension (case insensitive)
    let className = iconFile.replace(/\.svg$/i, '');
    
    // Remove any path components (handle cases like "folder/icon.svg")
    className = className.split('/').pop();
    
    // Sanitize: replace invalid CSS class characters with hyphens
    // Valid: letters, numbers, hyphens, underscores (but start with letter or underscore)
    className = className.replace(/[^a-zA-Z0-9_-]/g, '-');
    
    // Remove leading/trailing hyphens and multiple consecutive hyphens
    className = className.replace(/^-+|-+$/g, '').replace(/-+/g, '-');
    
    // Ensure it starts with a letter or underscore (valid CSS class requirement)
    if (!/^[a-zA-Z_]/.test(className)) {
        className = 'animation-' + className;
    }
    
    // Add animation- prefix if not already present
    if (!className.startsWith('animation-')) {
        className = 'animation-' + className;
    }
    
    // Final validation: must be non-empty and valid
    if (className.length === 0 || className === 'animation-') {
        return null;
    }
    
    return className;
}

/**
 * Extract aspect ratio from SVG element's viewBox
 * @param {HTMLElement} svgElement - SVG element
 * @returns {number|null} Aspect ratio (width/height) or null if not found
 */
function getSVGAspectRatio(svgElement) {
    if (!svgElement) {
        return null;
    }
    
    const viewBox = svgElement.getAttribute('viewBox');
    if (!viewBox) {
        ErrorHandler.warn('SVG element missing viewBox attribute');
        return null;
    }
    
    // Parse viewBox: "0 0 width height"
    const parts = viewBox.trim().split(/\s+/);
    if (parts.length < 4) {
        ErrorHandler.warn(`Invalid viewBox format: ${viewBox}`);
        return null;
    }
    
    const width = parseFloat(parts[2]);
    const height = parseFloat(parts[3]);
    
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        ErrorHandler.warn(`Invalid viewBox dimensions: ${width} x ${height}`);
        return null;
    }
    
    const aspectRatio = width / height;
    return aspectRatio;
}

/**
 * Load SVG icon file
 * @param {string} iconFile - Icon filename (e.g., "zoom-hint.svg")
 * @returns {Promise<HTMLElement|null>} SVG element or null
 */
async function loadIconFile(iconFile) {
    try {
        const iconPath = `${CONFIG.ANIMATION_HINT.ICONS_FOLDER}${iconFile}`;
        const response = await fetch(iconPath);
        
        if (!response.ok) {
            ErrorHandler.warn(`Icon file not found: ${iconPath}`);
            return null;
        }
        
        const svgText = await response.text();
        
        // Create a temporary container to parse the SVG
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgText.trim();
        
        const svgElement = tempDiv.querySelector('svg');
        if (!svgElement) {
            ErrorHandler.warn(`Invalid SVG in file: ${iconFile}`);
            return null;
        }
        
        // Make SVG responsive
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        
        return svgElement;
        
    } catch (error) {
        ErrorHandler.warn(`Error loading icon file ${iconFile}:`, error);
        return null;
    }
}

/**
 * Create animation element (hidden, timers not started)
 * @param {Object} config - Animation configuration
 * @returns {Promise<HTMLElement|null>} Animation element or null
 */
async function createAnimationElement(config) {
    // Load companion CSS file first (ensures styles are available before animation starts)
    await loadAnimationCSS(config.iconFile);
    
    // Load the icon
    const icon = await loadIconFile(config.iconFile);
    if (!icon) {
        ErrorHandler.warn(`Failed to load icon: ${config.iconFile}`);
        return null;
    }
    
    // Extract aspect ratio from SVG
    const aspectRatio = getSVGAspectRatio(icon);
    if (!aspectRatio) {
        ErrorHandler.warn(`Could not extract aspect ratio from ${config.iconFile}, using 1:1 (square)`);
    }
    
    // Calculate dimensions from size and aspect ratio
    const width = config.size;
    const height = aspectRatio ? config.size / aspectRatio : config.size;
    
    // DEBUG: Log size calculations
    // Convert center coordinates to top-left for CSS positioning
    const left = config.centerX - (width / 2);
    const top = config.centerY - (height / 2);
    
    // Extract icon-based class name for customization
    const iconClassName = extractIconClassName(config.iconFile);
    const containerClasses = iconClassName 
        ? `page-animation ${iconClassName}` 
        : 'page-animation';
    
    // Create container
    // For custom animations, don't set animation-duration inline - CSS controls it
    // For non-custom animations, use the duration from config
    const inlineStyle = `
        position: absolute;
        left: ${left}%;
        top: ${top}%;
        width: ${width}%;
        height: ${height}%;
        ${iconClassName && iconClassName === 'animation-click-hint' 
            ? '' 
            : `animation-duration: ${config.duration}ms;`}
    `;
    
    const animElement = DOM.createElement('div', containerClasses, {
        style: inlineStyle.trim()
    });
    
    // Always hide initially - will be shown when page becomes visible
    // For custom animations, CSS will handle opacity, so only set visibility
    if (iconClassName && iconClassName === 'animation-click-hint') {
        animElement.style.visibility = 'hidden';
        // Don't set opacity inline - CSS animation will control it
    } else {
        animElement.style.opacity = '0';
        animElement.style.visibility = 'hidden';
    }
    
    // Append the SVG directly to the animation element
    animElement.appendChild(icon);
    
    // For mouse animation, calculate and log actual path lengths for arrow animation
    if (iconClassName === 'animation-mouse') {
        // Wait for SVG to be in DOM, then calculate path lengths
        setTimeout(() => {
            const mainPath = icon.querySelector('#arrow-main-path');
            const arrowHead = icon.querySelector('#arrow-head-path');
            
            // Path lengths are calculated and used in CSS animations
            // No need to log them in production
        }, 100);
    }
    
    // Store config on element for later use
    animElement._animationConfig = config;
    
    return animElement;
}

/**
 * Start animation timers (delay and duration)
 * @param {HTMLElement} animElement - Animation element
 * @param {Object} config - Animation configuration
 */
function startAnimationTimers(animElement, config) {
    // Skip if animation has been permanently hidden
    if (animElement.classList.contains('animation-hidden-permanent')) {
        return;
    }
    
    // Animation timing constants
    const ENTRANCE_DURATION = 700; // ms
    const EXIT_DURATION = 600; // ms
    const MIN_DURATION = ENTRANCE_DURATION + EXIT_DURATION; // 1300ms
    
    // Check if element has a CSS animation class (indicates custom entrance animation)
    const hasCustomAnimation = animElement.classList.contains('animation-click-hint');
    
    // Validate duration for custom animations
    if (hasCustomAnimation && config.duration < MIN_DURATION) {
        ErrorHandler.warn(`Animation duration (${config.duration}ms) is less than minimum (${MIN_DURATION}ms) for entrance + exit. Adjusting timing.`);
    }
    
    // Calculate exit timing
    const exitStartTime = config.delay + config.duration - EXIT_DURATION;
    const pulseEndTime = exitStartTime; // Stop pulse when exit starts
    
    // Show after delay (if any)
    // For custom animations, let CSS handle opacity - don't set inline styles
    if (hasCustomAnimation) {
        // Just make it visible - CSS animation will handle opacity transition
        if (config.delay > 0) {
            setTimeout(() => {
                animElement.style.visibility = 'visible';
                // Don't set opacity - CSS animation controls it
            }, config.delay);
        } else {
            animElement.style.visibility = 'visible';
            // Don't set opacity - CSS animation controls it
        }
    } else {
        // For non-custom animations, use inline opacity
        if (config.delay > 0) {
            setTimeout(() => {
                animElement.style.visibility = 'visible';
                animElement.style.opacity = '1';
                animElement.style.transition = 'opacity 0.3s ease';
            }, config.delay);
        } else {
            animElement.style.visibility = 'visible';
            animElement.style.opacity = '1';
            animElement.style.transition = 'opacity 0.3s ease';
        }
    }
    
    // For custom animations, handle exit animation with proper timing
    if (hasCustomAnimation && exitStartTime > config.delay) {
        // Stop pulse animation before exit starts
        setTimeout(() => {
            // Remove the animation class to stop pulse, but keep the base class
            const animationClass = Array.from(animElement.classList).find(cls => cls.startsWith('animation-'));
            if (animationClass) {
                // Force reflow to ensure smooth transition
                void animElement.offsetWidth;
            }
        }, pulseEndTime);
        
        // Start exit animation
        setTimeout(() => {
            animElement.classList.add('exiting');
        }, exitStartTime);
        
        // Remove element after exit completes
        setTimeout(() => {
            if (animElement.parentNode) {
                animElement.remove();
            }
        }, exitStartTime + EXIT_DURATION);
    } else {
        // Fallback for non-custom animations or very short durations
        const totalTime = config.delay + config.duration;
        setTimeout(() => {
            animElement.style.opacity = '0';
            animElement.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (animElement.parentNode) {
                    animElement.remove();
                }
            }, 500);
        }, totalTime);
    }
}

/**
 * Hide animation for a specific page by class name
 * 
 * IMPORTANT FOR FUTURE ANIMATIONS:
 * This function uses inline styles for the transition because:
 * 1. Inline styles have higher specificity than CSS classes
 * 2. startAnimationTimers() sets inline opacity/transition that can conflict with CSS
 * 3. Using inline styles ensures the transition works reliably regardless of CSS loading order
 * 
 * PATTERN FOR FUTURE ANIMATIONS:
 * 1. Set transition property via inline style FIRST
 * 2. Ensure starting value is set (e.g., opacity: 1)
 * 3. Force reflow with offsetWidth
 * 4. Use requestAnimationFrame to set target value (e.g., opacity: 0)
 * 5. This ensures browser processes transition properly
 * 
 * @param {number} pageNumber - Page number
 * @param {string} animationClassName - Animation class name (e.g., 'animation-mouse')
 * @param {boolean} permanent - If true, animation stays hidden permanently
 */
/**
 * Hide a page animation
 * @param {number} pageNumber - Page number
 * @param {string} animationClassName - Animation CSS class name
 * @param {boolean} permanent - Whether to permanently hide (default: true)
 */
/**
 * Hide a page animation
 * @param {number} pageNumber - Page number
 * @param {string} animationClassName - Animation CSS class name
 * @param {boolean} permanent - Whether to permanently hide (default: true)
 */
function hidePageAnimation(pageNumber, animationClassName, permanent = true) {
    // Find page element
    const page = document.querySelector(`[data-page="${pageNumber}"]`);
    if (!page) {
        ErrorHandler.warn(`Page ${pageNumber} not found for animation hide`);
        return;
    }
    
    // Get animations for this page
    const animations = pageAnimationsMap.get(page);
    if (!animations || animations.length === 0) {
        return;
    }
    
    // Find animation with matching class
    animations.forEach(animElement => {
        if (animElement.classList.contains(animationClassName)) {
            // GUARD: Check if already hidden or in process of hiding
            // This prevents duplicate calls during rapid events (e.g., wheel scrolling)
            if (animElement.classList.contains('animation-hidden-permanent') || 
                animElement.classList.contains('animation-hidden')) {
                return; // Already hidden or hiding, skip
            }
            
            // ===== FADE-OUT TRANSITION IMPLEMENTATION =====
            // 
            // CRITICAL: Use inline styles for transition to ensure it works reliably
            // This is necessary because startAnimationTimers() sets inline styles that can
            // override CSS classes. Using inline styles here ensures we have full control.
            //
            // STEP 1: Get current opacity value (starting point for transition)
            const startOpacity = parseFloat(window.getComputedStyle(animElement).opacity) || 1;
            
            // STEP 2: Set transition property FIRST (must be set before changing the value)
            // Format: 'property duration timing-function'
            animElement.style.transition = 'opacity 1.5s ease-out';
            
            // STEP 3: Ensure starting value is explicitly set
            // This ensures the browser knows the starting point for the transition
            animElement.style.opacity = startOpacity.toString();
            
            // STEP 4: Force a browser reflow to ensure transition property is applied
            // This is critical - browser must process the transition property before value changes
            void animElement.offsetWidth;
            
            // STEP 5: Add CSS class for any additional styling (optional, for consistency)
            animElement.classList.add('animation-hidden');
            
            // STEP 6: Use requestAnimationFrame to set target value
            // This ensures browser has processed the transition property and is ready to animate
            requestAnimationFrame(() => {
                // Set the target opacity value - this triggers the transition
                animElement.style.opacity = '0';
                
                // Force another reflow to start the transition immediately
                void animElement.offsetWidth;
            });
            
            // STEP 7: After transition completes, make it permanent (if requested)
            // IMPORTANT: Match the transition duration exactly (1.5s = 1500ms)
            if (permanent) {
                setTimeout(() => {
                    animElement.classList.add('animation-hidden-permanent');
                    animElement.classList.remove('animation-hidden');
                    // Note: Keep inline opacity: 0 to ensure it stays hidden
                }, 1500); // Match transition duration (1.5s)
            }
            
            ErrorHandler.log(`Hiding animation ${animationClassName} on page ${pageNumber}`);
        }
    });
}

/**
 * SUMMARY: How to add fade-out animations for future animations
 * 
 * 1. IN YOUR CSS FILE (e.g., assets/icons/your-animation.css):
 *    Add these rules:
 *    
 *    .page-animation.your-animation-class {
 *      transition: opacity 1.5s ease-out;
 *    }
 *    
 *    .page-animation.your-animation-class.animation-hidden {
 *      opacity: 0;
 *      pointer-events: none;
 *    }
 *    
 *    .page-animation.your-animation-class.animation-hidden-permanent {
 *      display: none;
 *    }
 * 
 * 2. IN YOUR TRIGGER CODE (e.g., zoomistController.js, scroll handlers, etc.):
 *    Call hidePageAnimation when you want to hide the animation:
 *    
 *    hidePageAnimation(pageNumber, 'your-animation-class', true);
 *    
 *    Parameters:
 *    - pageNumber: The page number (e.g., 2)
 *    - 'your-animation-class': The CSS class name (e.g., 'animation-mouse')
 *    - true: Permanent hide (stays hidden) or false (can be shown again)
 * 
 * 3. THE FUNCTION HANDLES:
 *    - Finding the animation element by class name
 *    - Setting up the transition via inline styles (ensures it works)
 *    - Smoothly fading from current opacity to 0 over 1.5 seconds
 *    - Making it permanent after the fade completes
 *    - Preventing duplicate calls if already hidden
 * 
 * 4. WHY INLINE STYLES?
 *    - startAnimationTimers() sets inline opacity/transition that can conflict
 *    - Inline styles have higher specificity than CSS classes
 *    - Ensures transition works reliably regardless of CSS loading order
 *    - Full control over the transition timing and behavior
 * 
 * 5. CUSTOMIZING THE TRANSITION:
 *    To change duration or easing, modify the inline style in hidePageAnimation:
 *    - Change '1.5s' to your desired duration (e.g., '2s', '0.8s')
 *    - Change 'ease-out' to your desired easing (e.g., 'ease-in', 'linear', 'cubic-bezier(...)')
 *    - Update the setTimeout duration to match (1500ms = 1.5s)
 */

// ===== VISIBILITY OBSERVER FOR ANIMATIONS =====

/**
 * Map to store page animations (key: page element, value: array of animation elements)
 */
const pageAnimationsMap = new Map();

/**
 * Set to track which pages have already triggered their animations
 */
const triggeredPages = new Set();

/**
 * IntersectionObserver for animation visibility
 */
let animationVisibilityObserver = null;

/**
 * Initialize animation visibility observer
 */
function initializeAnimationVisibilityObserver() {
    if (animationVisibilityObserver) {
        return; // Already initialized
    }
    
    const observerOptions = {
        threshold: CONFIG.ANIMATION.THRESHOLD,
        rootMargin: CONFIG.ANIMATION.ROOT_MARGIN
    };
    
    animationVisibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Check if visible animations for this page have already been triggered
                const pageNum = entry.target.getAttribute('data-page') || 'unknown';
                const pageVisibleKey = `visible_page_${pageNum}`;
                if (!triggeredPages.has(pageVisibleKey)) {
                    // Only start animations with 'visible' trigger type
                    startPageAnimations(entry.target, 'visible');
                    triggeredPages.add(pageVisibleKey);
                }
            }
        });
    }, observerOptions);
}

/**
 * Start animations for a page, optionally filtered by trigger type
 * @param {HTMLElement} page - Page element
 * @param {string|null} triggerTypeFilter - Optional trigger type to filter by ('hover' or 'visible'), null for all
 */
function startPageAnimations(page, triggerTypeFilter = null) {
    const animations = pageAnimationsMap.get(page);
    if (!animations || animations.length === 0) {
        return;
    }
    
    let triggeredCount = 0;
    animations.forEach(animElement => {
        const config = animElement._animationConfig;
        if (!config) return;
        
        // If trigger type filter is specified, only start matching animations
        if (triggerTypeFilter !== null && config.triggerType !== triggerTypeFilter) {
            return;
        }
        
        startAnimationTimers(animElement, config);
        triggeredCount++;
    });
    
    if (triggeredCount > 0) {
        const pageNum = page.getAttribute('data-page') || 'unknown';
        const triggerInfo = triggerTypeFilter ? ` (${triggerTypeFilter} trigger)` : '';
        ErrorHandler.log(`Started ${triggeredCount} animation(s) for page ${pageNum}${triggerInfo}`);
    }
}

/**
 * Setup hover trigger for a page
 * @param {HTMLElement} page - Page element
 * @param {Array<HTMLElement>} animationElements - Array of animation elements (hover type only)
 */
function setupHoverTrigger(page, animationElements) {
    page.addEventListener('mouseenter', () => {
        // Only trigger if page hasn't already been triggered for hover animations
        // Check visibility before triggering (page must be in viewport)
        const rect = page.getBoundingClientRect();
        const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
        
        if (!isVisible) {
            return; // Don't trigger if page is not visible
        }
        
        // Check if hover animations for this page have already been triggered
        const pageNum = page.getAttribute('data-page') || 'unknown';
        const pageHoverKey = `hover_page_${pageNum}`;
        if (triggeredPages.has(pageHoverKey)) {
            return; // Already triggered
        }
        
        // Start only hover-triggered animations
        startPageAnimations(page, 'hover');
        triggeredPages.add(pageHoverKey);
    }, { passive: true });
}

/**
 * Register a page and its animations for visibility observation or hover trigger
 * @param {HTMLElement} page - Page element
 * @param {Array<HTMLElement>} animationElements - Array of animation elements
 */
function registerPageForAnimationVisibility(page, animationElements) {
    // Store animations for this page
    pageAnimationsMap.set(page, animationElements);
    
    // Determine which trigger types are present in this page's animations
    const triggerTypes = new Set();
    animationElements.forEach(animElement => {
        const config = animElement._animationConfig;
        if (config && config.triggerType) {
            triggerTypes.add(config.triggerType);
        }
    });
    
    const hasHoverTriggers = triggerTypes.has('hover');
    const hasVisibleTriggers = triggerTypes.has('visible');
    
    // Set up hover trigger if any animations use hover
    if (hasHoverTriggers) {
        setupHoverTrigger(page, animationElements);
    }
    
    // Set up visibility observer if any animations use visible trigger
    if (hasVisibleTriggers) {
        if (!animationVisibilityObserver) {
            initializeAnimationVisibilityObserver();
        }
        
        // Check if page is already visible
        const rect = page.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        const pageNum = page.getAttribute('data-page') || 'unknown';
        const pageVisibleKey = `visible_page_${pageNum}`;
        
        if (isVisible && !triggeredPages.has(pageVisibleKey)) {
            // Page is already visible - start visible animations immediately
            startPageAnimations(page, 'visible');
            triggeredPages.add(pageVisibleKey);
        } else {
            // Observe page for visibility
            animationVisibilityObserver.observe(page);
        }
    }
}

/**
 * Attach animations to a page
 * @param {HTMLElement} page - Page element
 * @param {number} pageNumber - Page number
 * @param {Array} animationConfigs - Array of animation configs
 */
async function attachAnimationsToPage(page, pageNumber, animationConfigs) {
    const pageAnimations = animationConfigs.filter(config => config.pageNumber === pageNumber);
    
    if (pageAnimations.length === 0) {
        return;
    }
    
    // Find the zoomist-image container (where animations should be attached)
    const zoomistImage = page.querySelector(CONFIG.SELECTORS.ZOOMIST_IMAGE);
    const container = zoomistImage || page;
    
    if (!container) {
        ErrorHandler.warn(`Could not find container for animations on page ${pageNumber}`);
        return;
    }
    
    // Load and attach each animation (but don't start timers yet)
    const animationElements = [];
    for (const config of pageAnimations) {
        const animElement = await createAnimationElement(config);
        if (animElement) {
            container.appendChild(animElement);
            animationElements.push(animElement);
            ErrorHandler.log(`Attached animation to page ${pageNumber} at center (${config.centerX}%, ${config.centerY}%) with size ${config.size}%`);
        } else {
            ErrorHandler.warn(`Failed to create animation element for page ${pageNumber}`);
        }
    }
    
    // Register page for visibility observation (will start animations when page becomes visible)
    if (animationElements.length > 0) {
        registerPageForAnimationVisibility(page, animationElements);
    }
}

// Expose hidePageAnimation to PortfolioApp namespace with documentation
if (typeof window.PortfolioApp !== 'undefined') {
    /**
     * Hide a page animation
     * Hides an animation on a specific page with an optional fade-out transition.
     * 
     * @function PortfolioApp.hidePageAnimation
     * @param {number} pageNumber - Page number where the animation is located
     * @param {string} animationClassName - CSS class name of the animation (e.g., 'animation-mouse')
     * @param {boolean} [permanent=true] - Whether to permanently hide (true) or allow showing again (false)
     * @returns {void}
     * 
     * @example
     * // Permanently hide mouse animation on page 2
     * PortfolioApp.hidePageAnimation(2, 'animation-mouse', true);
     * 
     * @example
     * // Temporarily hide an animation (can be shown again)
     * PortfolioApp.hidePageAnimation(3, 'animation-zoom-hint', false);
     */
    window.PortfolioApp.hidePageAnimation = hidePageAnimation;
}

