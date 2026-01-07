/**
 * Navigation Controller Module
 * Handles page navigation via hash URLs and imperative navigation
 */

/**
 * Handle page navigation request
 * Navigates to a specific portfolio page by number. If the page is already loaded, scrolls to it.
 * If not loaded yet, shows a loader and waits for the page to be ready.
 * 
 * @param {number} pageNumber - Page number to navigate to (must be >= 1)
 * @returns {Promise<void>} Resolves when navigation is complete
 * 
 * @example
 * // Navigate to page 3
 * await handlePageNavigationRequest(3);
 * 
 * @example
 * // Using the PortfolioApp namespace
 * PortfolioApp.navigateToPortfolioPage(3);
 */
async function handlePageNavigationRequest(pageNumber) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        return;
    }
    
    const pageSelector = `${CONFIG.SELECTORS.PORTFOLIO_PAGE}[data-page="${pageNumber}"]`;
    const existingPage = document.querySelector(pageSelector);
    if (existingPage && !existingPage.classList.contains('loading')) {
        existingPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    
    let loaderActive = false;
    const paddedPage = String(pageNumber).padStart(CONFIG.IMAGE.FILENAME_PADDING, '0');
    
    showGlobalLoader(`Loading page ${paddedPage}…`);
    loaderActive = true;
    
    try {
        const page = await waitForPageReady(pageNumber);
        if (page) {
            page.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (appState.getAllPagesLoaded() && pageNumber > appState.getMaxLoadedPageNumber()) {
            ErrorHandler.warn(`Requested page ${pageNumber} is not available.`);
            hideGlobalLoader(`Page ${paddedPage} not found`);
            loaderActive = false;
        }
    } finally {
        if (loaderActive) {
            hideGlobalLoader();
        }
    }
}

/**
 * Setup hash navigation
 */
function setupHashNavigation() {
    function handleHashChange() {
        const match = window.location.hash.match(/^#page-(\d+)$/i);
        if (match) {
            const requestedPage = parseInt(match[1], 10);
            handlePageNavigationRequest(requestedPage);
        }
    }
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    
    // Expose helper for imperative navigation
    window.navigateToPortfolioPage = handlePageNavigationRequest;
    
    // Also expose to PortfolioApp namespace with documentation
    if (typeof window.PortfolioApp !== 'undefined') {
        /**
         * Navigate to a specific portfolio page
         * Scrolls to the specified page if it's already loaded, or shows a loader and waits for it to load.
         * 
         * @function PortfolioApp.navigateToPortfolioPage
         * @param {number} pageNumber - Page number to navigate to (must be >= 1)
         * @returns {Promise<void>} Resolves when navigation is complete
         * 
         * @example
         * // Navigate to page 3
         * PortfolioApp.navigateToPortfolioPage(3);
         * 
         * @example
         * // Navigate and wait for completion
         * await PortfolioApp.navigateToPortfolioPage(5);
         * console.log('Navigation complete!');
         */
        window.PortfolioApp.navigateToPortfolioPage = handlePageNavigationRequest;
    }
}

