/**
 * Application State Manager
 * Encapsulates all global application state to improve testability and maintainability
 */

class AppState {
    constructor() {
        // Hotspot state
        this.hotspotConfigs = [];
        this.hotspotConfigsByPage = new Map();
        this.hotspotElements = [];
        
        // Page state
        this.loadedImages = [];
        this.pagesInFlight = new Set();
        this.allPagesLoaded = false;
        this.maxLoadedPageNumber = 0;
        this.pageReadyResolvers = new Map();
        
        // Observer state
        this.pageVisibilityObserver = null;
        this.hotspotObserver = null;
        this.animatedHotspots = new Set();
        
        // Modal state
        this.lastFocusedElement = null;
        
        // Zoomist state
        this.zoomistInstances = new Map();
        
        // Loader state
        this.globalLoaderElement = null;
        this.globalLoaderLabel = null;
    }

    // Hotspot methods
    getHotspotConfigs() {
        return this.hotspotConfigs;
    }

    setHotspotConfigs(configs) {
        this.hotspotConfigs = configs;
    }

    getHotspotConfigsByPage() {
        return this.hotspotConfigsByPage;
    }

    getHotspotElements() {
        return this.hotspotElements;
    }

    addHotspotElement(element) {
        this.hotspotElements.push(element);
    }

    clearHotspotElements() {
        this.hotspotElements = [];
    }

    // Page methods
    getLoadedImages() {
        return this.loadedImages;
    }

    addLoadedImage(image) {
        if (CONFIG.DEBUG.ENABLED) {
            const timestamp = performance.now();
            const pageNumber = image.pageNumber || 'unknown';
            console.log(`[STATE-DEBUG] addLoadedImage called`);
            console.log(`  ├─ Page: ${pageNumber}`);
            console.log(`  ├─ Path: ${image.path || 'unknown'}`);
            console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
            console.log(`  └─ Total loaded images: ${this.loadedImages.length + 1}`);
        }
        this.loadedImages.push(image);
    }

    setLoadedImages(images) {
        this.loadedImages = images;
    }

    getPagesInFlight() {
        return this.pagesInFlight;
    }

    addPageInFlight(pageNumber) {
        const alreadyInFlight = this.pagesInFlight.has(pageNumber);
        
        if (CONFIG.DEBUG.ENABLED) {
            const timestamp = performance.now();
            if (alreadyInFlight) {
                console.warn(`[STATE-DEBUG] WARNING: Page ${pageNumber} already in flight!`);
                console.warn(`  └─ This may indicate duplicate rendering`);
            }
            
            this.pagesInFlight.add(pageNumber);
            console.log(`[STATE-DEBUG] Page ${pageNumber} added to pagesInFlight`);
            console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
            console.log(`  └─ Current pages in flight: [${Array.from(this.pagesInFlight).sort((a, b) => a - b).join(', ')}]`);
        } else {
            this.pagesInFlight.add(pageNumber);
        }
    }

    removePageInFlight(pageNumber) {
        const wasInFlight = this.pagesInFlight.has(pageNumber);
        
        if (CONFIG.DEBUG.ENABLED) {
            const timestamp = performance.now();
            if (!wasInFlight) {
                console.warn(`[STATE-DEBUG] WARNING: Attempted to remove page ${pageNumber} that wasn't in flight!`);
            }
            
            this.pagesInFlight.delete(pageNumber);
            console.log(`[STATE-DEBUG] Page ${pageNumber} removed from pagesInFlight`);
            console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
            console.log(`  └─ Current pages in flight: [${Array.from(this.pagesInFlight).sort((a, b) => a - b).join(', ')}]`);
        } else {
            this.pagesInFlight.delete(pageNumber);
        }
    }

    getAllPagesLoaded() {
        return this.allPagesLoaded;
    }

    setAllPagesLoaded(value) {
        if (CONFIG.DEBUG.ENABLED) {
            const timestamp = performance.now();
            console.log(`[STATE-DEBUG] setAllPagesLoaded called`);
            console.log(`  ├─ Value: ${value}`);
            console.log(`  ├─ Timestamp: ${timestamp.toFixed(2)}ms`);
            console.log(`  └─ Previous value: ${this.allPagesLoaded}`);
        }
        this.allPagesLoaded = value;
    }

    getMaxLoadedPageNumber() {
        return this.maxLoadedPageNumber;
    }

    updateMaxLoadedPageNumber(pageNumber) {
        this.maxLoadedPageNumber = Math.max(this.maxLoadedPageNumber, pageNumber);
    }

    getPageReadyResolvers() {
        return this.pageReadyResolvers;
    }

    // Observer methods
    getPageVisibilityObserver() {
        return this.pageVisibilityObserver;
    }

    setPageVisibilityObserver(observer) {
        this.pageVisibilityObserver = observer;
    }

    getHotspotObserver() {
        return this.hotspotObserver;
    }

    setHotspotObserver(observer) {
        this.hotspotObserver = observer;
    }

    getAnimatedHotspots() {
        return this.animatedHotspots;
    }

    // Modal methods
    getLastFocusedElement() {
        return this.lastFocusedElement;
    }

    setLastFocusedElement(element) {
        this.lastFocusedElement = element;
    }

    clearLastFocusedElement() {
        this.lastFocusedElement = null;
    }

    // Zoomist methods
    getZoomistInstances() {
        return this.zoomistInstances;
    }

    setZoomistInstance(pageNumber, instance) {
        this.zoomistInstances.set(pageNumber, instance);
    }

    getZoomistInstance(pageNumber) {
        return this.zoomistInstances.get(pageNumber);
    }

    // Loader methods
    getGlobalLoaderElement() {
        return this.globalLoaderElement;
    }

    setGlobalLoaderElement(element) {
        this.globalLoaderElement = element;
    }

    getGlobalLoaderLabel() {
        return this.globalLoaderLabel;
    }

    setGlobalLoaderLabel(label) {
        this.globalLoaderLabel = label;
    }
}

// Create and export singleton instance
const appState = new AppState();

