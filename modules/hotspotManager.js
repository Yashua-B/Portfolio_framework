/**
 * Hotspot Manager Module
 * Handles hotspot configuration parsing, positioning, and attachment
 */

/**
 * Extract YouTube video ID from various URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
function extractYouTubeVideoId(url) {
    for (const pattern of CONFIG.YOUTUBE.PATTERNS) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Parse a single hotspot configuration line
 * @param {string} line - Configuration line
 * @returns {Object|null} Parsed config or null
 */
function parseHotspotLine(line) {
    const parts = line.split(',').map(p => p.trim());
    if (parts.length !== 6) {
        return null;
    }
    
    const [pageNum, youtubeUrl, left, bottom, width, height] = parts;
    return {
        pageNum,
        youtubeUrl,
        left,
        bottom,
        width,
        height,
        rawLine: line
    };
}

/**
 * Validate a hotspot configuration object
 * @param {Object} config - Configuration to validate
 * @returns {Object|null} Validated config or null
 */
function validateHotspotConfig(config) {
    const { pageNum, youtubeUrl, left, bottom, width, height, rawLine } = config;
    
    // Extract video ID
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
        ErrorHandler.warn(`Could not extract video ID from: ${youtubeUrl}`);
        return null;
    }
    
    // Parse and validate page number
    const parsedPageNum = parseInt(pageNum);
    if (!Validation.validatePageNumber(parsedPageNum)) {
        ErrorHandler.warn(`Invalid page number "${pageNum}" in hotspot config: ${rawLine}`);
        return null;
    }
    
    // Parse and validate percentages
    const parsedLeft = parseFloat(left);
    const parsedBottom = parseFloat(bottom);
    const parsedWidth = parseFloat(width);
    const parsedHeight = parseFloat(height);
    
    if (!Validation.validatePercentage(parsedLeft)) {
        ErrorHandler.warn(`Invalid left% "${left}" (must be 0-100) in hotspot config: ${rawLine}`);
        return null;
    }
    
    if (!Validation.validatePercentage(parsedBottom)) {
        ErrorHandler.warn(`Invalid bottom% "${bottom}" (must be 0-100) in hotspot config: ${rawLine}`);
        return null;
    }
    
    if (!Validation.validatePositiveNumber(parsedWidth, 100)) {
        ErrorHandler.warn(`Invalid width% "${width}" (must be >0 and <=100) in hotspot config: ${rawLine}`);
        return null;
    }
    
    if (!Validation.validatePositiveNumber(parsedHeight, 100)) {
        ErrorHandler.warn(`Invalid height% "${height}" (must be >0 and <=100) in hotspot config: ${rawLine}`);
        return null;
    }
    
    return {
        pageNumber: parsedPageNum,
        videoId: videoId,
        left: parsedLeft,
        bottom: parsedBottom,
        width: parsedWidth,
        height: parsedHeight
    };
}

/**
 * Normalize hotspot configuration and organize by page
 * @param {Array} configs - Array of validated configs
 */
function normalizeHotspotConfig(configs) {
    const configsByPage = appState.getHotspotConfigsByPage();
    configsByPage.clear();
    
    configs.forEach(config => {
        const pageNumber = config.pageNumber;
        if (!configsByPage.has(pageNumber)) {
            configsByPage.set(pageNumber, []);
        }
        configsByPage.get(pageNumber).push(config);
    });
}

/**
 * Parse hotspot configuration text
 * @param {string} text - Configuration text
 * @returns {Array} Array of validated hotspot configs
 */
function parseHotspotConfig(text) {
    const configs = [];
    const lines = text.split('\n');
    
    for (let line of lines) {
        // Remove comments and whitespace
        line = line.trim();
        if (line === '' || line.startsWith('#')) continue;
        
        // Parse line
        const parsed = parseHotspotLine(line);
        if (!parsed) {
            ErrorHandler.warn(`Invalid hotspot config line: ${line}`);
            continue;
        }
        
        // Validate config
        const validated = validateHotspotConfig(parsed);
        if (!validated) {
            continue;
        }
        
        configs.push(validated);
    }
    
    normalizeHotspotConfig(configs);
    return configs;
}

/**
 * Load hotspot configurations from file
 * @returns {Promise<void>}
 */
async function loadHotspotConfigs() {
    try {
        const response = await fetch(CONFIG.HOTSPOT.FILE);
        if (!response.ok) {
            ErrorHandler.log('No hotspots.txt file found - no hotspots will be added');
            return;
        }
        
        const text = await response.text();
        const configs = parseHotspotConfig(text);
        appState.setHotspotConfigs(configs);
        ErrorHandler.log(`Loaded ${configs.length} hotspot configurations`);
        
    } catch (error) {
        ErrorHandler.log('Could not load hotspots configuration: ' + error.message);
    }
}

/**
 * Calculate hotspot position for mobile (with touch scaling)
 * @param {Object} config - Hotspot configuration
 * @param {Object} imageDimensions - Image dimensions
 * @returns {Object} Position and dimensions in percentages
 */
function calculateMobileHotspotPosition(config, imageDimensions) {
    const { naturalWidth, naturalHeight, imageWidth, imageHeight } = imageDimensions;
    
    // Convert config percentages to pixel values
    const naturalWidthPx = (naturalWidth * config.width) / 100;
    const naturalHeightPx = (naturalHeight * config.height) / 100;
    const naturalLeft = (naturalWidth * config.left) / 100;
    const naturalBottom = (naturalHeight * config.bottom) / 100;
    const naturalTop = naturalHeight - naturalBottom - naturalHeightPx;
    
    // Scale natural coordinates to rendered pixels
    const scaleX = imageWidth / naturalWidth;
    const scaleY = imageHeight / naturalHeight;
    let actualWidth = naturalWidthPx * scaleX;
    let actualHeight = naturalHeightPx * scaleY;
    let actualLeft = naturalLeft * scaleX;
    let actualTop = naturalTop * scaleY;
    
    // Apply mobile touch scaling
    const minImageDimension = Math.min(imageWidth, imageHeight);
    const targetMinSide = Math.max(CONFIG.HOTSPOT.MIN_TOUCH_SIZE, minImageDimension * CONFIG.HOTSPOT.MIN_TOUCH_SCALE);
    const currentMinSide = Math.min(actualWidth, actualHeight);
    const touchScale = currentMinSide < targetMinSide ? targetMinSide / currentMinSide : 1;
    
    if (touchScale > 1) {
        const baseWidth = actualWidth;
        const baseHeight = actualHeight;
        
        actualWidth *= touchScale;
        actualHeight *= touchScale;
        
        // Offset to keep hotspot centered
        actualLeft -= (actualWidth - baseWidth) / 2;
        actualTop -= (actualHeight - baseHeight) / 2;
    }
    
    // Clamp within image bounds
    actualWidth = Math.min(actualWidth, imageWidth);
    actualHeight = Math.min(actualHeight, imageHeight);
    actualLeft = Math.max(0, Math.min(actualLeft, imageWidth - actualWidth));
    actualTop = Math.max(0, Math.min(actualTop, imageHeight - actualHeight));
    
    // Convert to percentages
    return {
        left: (actualLeft / imageWidth) * 100,
        top: (actualTop / imageHeight) * 100,
        width: (actualWidth / imageWidth) * 100,
        height: (actualHeight / imageHeight) * 100,
        renderedWidth: actualWidth,
        renderedHeight: actualHeight
    };
}

/**
 * Calculate hotspot position for desktop
 * @param {Object} config - Hotspot configuration
 * @param {Object} imageDimensions - Image dimensions
 * @returns {Object} Position and dimensions in percentages
 */
function calculateDesktopHotspotPosition(config, imageDimensions) {
    const topPercent = 100 - config.bottom - config.height;
    
    return {
        left: config.left,
        top: topPercent,
        width: config.width,
        height: config.height,
        renderedWidth: (config.width / 100) * imageDimensions.imageWidth,
        renderedHeight: (config.height / 100) * imageDimensions.imageHeight
    };
}

/**
 * Update SVG border stroke-dasharray based on dimensions
 * @param {HTMLElement} hotspot - Hotspot element
 * @param {number} renderedWidth - Rendered width
 * @param {number} renderedHeight - Rendered height
 */
function updateSVGBorder(hotspot, renderedWidth, renderedHeight) {
    const perimeter = 2 * (renderedWidth + renderedHeight);
    const svg = hotspot.querySelector('.border-rect');
    if (svg) {
        svg.setAttribute('stroke-dasharray', perimeter);
        svg.setAttribute('stroke-dashoffset', perimeter);
    }
}

/**
 * Position a hotspot element
 * @param {HTMLElement} hotspot - Hotspot element
 * @param {Object} config - Hotspot configuration
 * @param {HTMLElement} page - Page element
 */
function positionHotspot(hotspot, config, page) {
    // Get the image element
    const img = page.querySelector('img');
    if (!img || !img.complete) {
        // Image not loaded yet, try again after it loads
        if (img) {
            img.addEventListener('load', () => positionHotspot(hotspot, config, page), { once: true });
        }
        return;
    }
    
    // Natural image dimensions
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    if (!naturalWidth || !naturalHeight) {
        return;
    }
    
    // Get rendered image dimensions
    const imgRect = img.getBoundingClientRect();
    const imageWidth = imgRect.width;
    const imageHeight = imgRect.height;
    
    const imageDimensions = {
        naturalWidth,
        naturalHeight,
        imageWidth,
        imageHeight
    };
    
    // Check if mobile
    const isMobile = window.innerWidth <= CONFIG.BREAKPOINTS.MOBILE;
    
    // Calculate position
    let position;
    if (isMobile) {
        position = calculateMobileHotspotPosition(config, imageDimensions);
    } else {
        position = calculateDesktopHotspotPosition(config, imageDimensions);
    }
    
    // Apply CSS positioning
    hotspot.style.left = `${position.left}%`;
    hotspot.style.top = `${position.top}%`;
    hotspot.style.width = `${position.width}%`;
    hotspot.style.height = `${position.height}%`;
    hotspot.style.removeProperty('bottom');
    
    // Update SVG border
    updateSVGBorder(hotspot, position.renderedWidth, position.renderedHeight);
}

/**
 * Reposition all hotspots (called on resize)
 */
function repositionAllHotspots() {
    const hotspotElements = appState.getHotspotElements();
    hotspotElements.forEach(({ hotspot, config, page }) => {
        positionHotspot(hotspot, config, page);
    });
}

/**
 * Create a hotspot element
 * @param {Object} config - Hotspot configuration
 * @returns {HTMLElement} Hotspot element
 */
function createHotspotElement(config) {
    const hotspot = DOM.createElement('div', 'youtube-hotspot', {
        'data-video-id': config.videoId,
        'aria-label': 'Watch Video',
        tabindex: '0',
        role: 'button'
    });
    
    // Create SVG border
    const svg = DOM.createSVGElement('svg', {
        class: 'hotspot-border',
        xmlns: 'http://www.w3.org/2000/svg'
    });
    
    const rect = DOM.createSVGElement('rect', {
        class: 'border-rect',
        x: '1',
        y: '1',
        rx: '4',
        ry: '4'
    });
    
    svg.appendChild(rect);
    hotspot.appendChild(svg);
    
    return hotspot;
}

/**
 * Attach hotspots to a page
 * @param {HTMLElement} page - Page element
 * @param {number} pageNumber - Page number
 * @param {Function} openModal - Function to open modal
 */
function attachHotspotsToPage(page, pageNumber, openModal) {
    const configsByPage = appState.getHotspotConfigsByPage();
    const configs = configsByPage.get(pageNumber);
    if (!configs || configs.length === 0) {
        return;
    }
    
    configs.forEach(config => {
        const hotspot = createHotspotElement(config);
        
        // Attach to .zoomist-image
        const zoomistImage = page.querySelector(CONFIG.SELECTORS.ZOOMIST_IMAGE);
        if (zoomistImage) {
            zoomistImage.appendChild(hotspot);
        } else {
            ErrorHandler.warn(`.zoomist-image not found for page ${pageNumber}, attaching hotspot to page`);
            page.appendChild(hotspot);
        }
        
        // Prevent zoomist from capturing drag/pan events
        hotspot.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        // Handle click to open modal
        hotspot.addEventListener('click', (e) => {
            if (config.videoId && openModal) {
                openModal(config.videoId);
            }
            e.stopPropagation();
        });
        
        // Add to state
        appState.addHotspotElement({ hotspot, config, page });
        
        // Position hotspot
        positionHotspot(hotspot, config, page);
    });
}

