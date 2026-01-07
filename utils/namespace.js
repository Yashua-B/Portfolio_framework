/**
 * Portfolio Application Namespace
 * Creates and manages the global PortfolioApp namespace for public API
 * 
 * @namespace PortfolioApp
 * @description Public API for the Portfolio Application. All public functions are exposed through this namespace.
 * 
 * @example
 * // Navigate to a specific page
 * PortfolioApp.navigateToPortfolioPage(3);
 * 
 * @example
 * // Open YouTube modal
 * PortfolioApp.openYouTubeModal('dQw4w9WgXcQ');
 * 
 * @example
 * // Hide an animation
 * PortfolioApp.hidePageAnimation(2, 'animation-mouse', true);
 * 
 * @example
 * // Debug functions (when CONFIG.DEBUG.ENABLED = true)
 * PortfolioApp.debug.debugPageLoading();
 * PortfolioApp.debug.debugNetworkRequests();
 */

// Create namespace object
window.PortfolioApp = window.PortfolioApp || {};

/**
 * Debug sub-namespace
 * @namespace PortfolioApp.debug
 * @description Debug utilities available when CONFIG.DEBUG.ENABLED is true
 */
window.PortfolioApp.debug = window.PortfolioApp.debug || {};

