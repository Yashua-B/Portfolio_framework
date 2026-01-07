/**
 * Loader Utility
 * Manages the global loading overlay
 */

/**
 * Ensure global loader element references exist
 * @returns {HTMLElement|null} Loader element or null
 */
function ensureGlobalLoaderRefs() {
    const loaderElement = appState.getGlobalLoaderElement();
    if (!loaderElement) {
        const element = document.getElementById(CONFIG.LOADER.ID);
        if (element) {
            appState.setGlobalLoaderElement(element);
            const label = element.querySelector('.loading-overlay-label');
            if (label) {
                appState.setGlobalLoaderLabel(label);
            }
        }
    }
    return appState.getGlobalLoaderElement();
}

/**
 * Show the global loader
 * @param {string} message - Optional message to display
 */
function showGlobalLoader(message = CONFIG.LOADER.DEFAULT_MESSAGE) {
    const loader = ensureGlobalLoaderRefs();
    if (!loader) return;
    
    const label = appState.getGlobalLoaderLabel();
    if (label && message) {
        label.textContent = message;
    }
    
    loader.classList.remove(CONFIG.LOADER.HIDDEN_CLASS);
    loader.setAttribute('aria-hidden', 'false');
    loader.setAttribute('aria-busy', 'true');
}

/**
 * Hide the global loader
 * @param {string} message - Optional message to display before hiding
 */
function hideGlobalLoader(message) {
    const loader = ensureGlobalLoaderRefs();
    if (!loader) return;
    
    const label = appState.getGlobalLoaderLabel();
    if (label && message) {
        label.textContent = message;
    }
    
    loader.classList.add(CONFIG.LOADER.HIDDEN_CLASS);
    loader.setAttribute('aria-hidden', 'true');
    loader.removeAttribute('aria-busy');
}

