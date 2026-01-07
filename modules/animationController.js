/**
 * Animation Controller Module
 * Handles scroll animations and hotspot discovery animations
 */

/**
 * Initialize page visibility animations (fade-in on scroll)
 */
function initializeAnimations() {
    const observerOptions = {
        threshold: CONFIG.ANIMATION.THRESHOLD,
        rootMargin: CONFIG.ANIMATION.ROOT_MARGIN
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    appState.setPageVisibilityObserver(observer);
}

/**
 * Observe a page for animations
 * @param {HTMLElement} page - Page element
 */
function observePageForAnimations(page) {
    const observer = appState.getPageVisibilityObserver();
    if (observer) {
        observer.observe(page);
    }
}

/**
 * Initialize hotspot discovery animation
 */
function initializeHotspotDiscovery() {
    appState.getAnimatedHotspots().clear();
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const hotspots = entry.target.querySelectorAll(CONFIG.SELECTORS.HOTSPOT);
                
                hotspots.forEach(hotspot => {
                    const animatedHotspots = appState.getAnimatedHotspots();
                    if (hotspot && !animatedHotspots.has(hotspot)) {
                        setTimeout(() => {
                            hotspot.classList.add('discover');
                            animatedHotspots.add(hotspot);
                            
                            // Remove after animation completes
                            setTimeout(() => {
                                hotspot.classList.remove('discover');
                            }, CONFIG.HOTSPOT.DISCOVERY_ANIMATION_DURATION);
                        }, CONFIG.HOTSPOT.DISCOVERY_DELAY);
                    }
                });
            }
        });
    }, {
        threshold: CONFIG.ANIMATION.HOTSPOT_THRESHOLD,
        rootMargin: CONFIG.ANIMATION.HOTSPOT_ROOT_MARGIN
    });
    
    appState.setHotspotObserver(observer);
}

/**
 * Register a page for hotspot discovery
 * @param {HTMLElement} page - Page element
 */
function registerPageForHotspotDiscovery(page) {
    const observer = appState.getHotspotObserver();
    if (!observer) return;
    
    if (page.querySelector(CONFIG.SELECTORS.HOTSPOT)) {
        observer.observe(page);
    }
}

