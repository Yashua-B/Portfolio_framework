/**
 * Page Renderer Module
 * Handles rendering of individual portfolio pages
 */

/**
 * Render a single portfolio page
 * @param {Object} imageData - Image data object
 * @param {number} index - Page index
 * @param {HTMLElement} container - Container element
 * @param {Array} animationConfigs - Animation configurations
 */
async function renderPortfolioPage(imageData, index, container, animationConfigs = []) {
    const pageNumber = imageData.pageNumber;
    const timestamp = performance.now();
    
    // Debug tracking (only if enabled)
    const debugInfo = typeof DebugTracker !== 'undefined' ? DebugTracker.trackPageRender(pageNumber) : null;
    const callId = debugInfo ? debugInfo.callId : null;
    
    ErrorHandler.log(`Starting to render page ${imageData.pageNumber}`);
    appState.addPageInFlight(imageData.pageNumber);
    
    // DOM Element Tracking - Check for existing elements
    const existingPage = container.querySelector(`[data-page="${pageNumber}"]`);
    if (existingPage && CONFIG.DEBUG.ENABLED) {
        console.warn(`[DOM-DEBUG] WARNING: Page element already exists for page ${pageNumber}!`);
        console.warn(`  ├─ Existing element:`, existingPage);
        console.warn(`  └─ This may cause duplicate rendering`);
    }
    
    // Create page div with loader
    const pageDiv = DOM.createElement('div', 'portfolio-page loading', {
        'data-page': imageData.pageNumber,
        'aria-busy': 'true'
    });
    
    const loader = DOM.createSkeletonElement();
    pageDiv.appendChild(loader);
    container.appendChild(pageDiv);
    observePageForAnimations(pageDiv);
    
    try {
        // Load image (reuse image element from fetch() if available to avoid duplicate requests)
        const imageElement = imageData.imageElement || null;
        const img = await loadImageSequential(imageData.path, imageData.pageNumber, index, imageElement);
        
        img.alt = `Portfolio Page ${imageData.pageNumber}`;
        
        // Create zoomist structure
        const zoomistContainer = DOM.createZoomistStructure(img);
        
        pageDiv.classList.remove('loading');
        pageDiv.setAttribute('aria-busy', 'false');
        pageDiv.replaceChildren(zoomistContainer);
        appState.updateMaxLoadedPageNumber(imageData.pageNumber);
        
        // Initialize zoomist on desktop only
        initializeZoomistForPage(pageDiv, zoomistContainer, imageData.pageNumber);
        
        // Attach hotspots
        attachHotspotsToPage(pageDiv, imageData.pageNumber, window.openYouTubeModal);
        registerPageForHotspotDiscovery(pageDiv);
        repositionAllHotspots();
        
        // Attach animations (async)
        attachAnimationsToPage(pageDiv, imageData.pageNumber, animationConfigs).catch(error => {
            ErrorHandler.warn(`Error attaching animations to page ${imageData.pageNumber}`, error);
        });
    } catch (error) {
        ErrorHandler.warn(`Failed to load image: ${imageData.path}`, error);
        pageDiv.classList.add('load-error');
        pageDiv.setAttribute('aria-busy', 'false');
        const fallback = DOM.createFallbackElement('Unable to load this page.');
        pageDiv.replaceChildren(fallback);
    }
    
    appState.removePageInFlight(imageData.pageNumber);
    notifyPageReady(imageData.pageNumber, pageDiv);
    
    // Debug tracking completion
    if (callId && typeof DebugTracker !== 'undefined') {
        DebugTracker.trackPageRenderComplete(pageNumber, callId, timestamp);
    }
}

/**
 * Notify that a page is ready
 * @param {number} pageNumber - Page number
 * @param {HTMLElement} pageElement - Page element
 */
function notifyPageReady(pageNumber, pageElement) {
    const resolvers = appState.getPageReadyResolvers().get(pageNumber);
    if (!resolvers) return;
    
    appState.getPageReadyResolvers().delete(pageNumber);
    resolvers.forEach(resolve => resolve(pageElement));
}

/**
 * Wait for a page to be ready
 * @param {number} pageNumber - Page number
 * @returns {Promise<HTMLElement|null>} Page element or null
 */
function waitForPageReady(pageNumber) {
    const existingPage = document.querySelector(`${CONFIG.SELECTORS.PORTFOLIO_PAGE}[data-page="${pageNumber}"]`);
    if (existingPage && !existingPage.classList.contains('loading')) {
        return Promise.resolve(existingPage);
    }
    
    if (appState.getAllPagesLoaded()) {
        return Promise.resolve(null);
    }
    
    return new Promise((resolve) => {
        const resolvers = appState.getPageReadyResolvers();
        if (!resolvers.has(pageNumber)) {
            resolvers.set(pageNumber, []);
        }
        resolvers.get(pageNumber).push((pageElement) => {
            resolve(pageElement);
        });
    });
}

