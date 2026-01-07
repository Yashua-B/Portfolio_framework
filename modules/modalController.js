/**
 * Modal Controller Module
 * Handles YouTube modal functionality with focus management and accessibility
 */

/**
 * Create modal handlers for opening and closing
 * @param {HTMLElement} modal - Modal element
 * @param {HTMLElement} youtubePlayer - YouTube iframe element
 * @param {HTMLElement} modalClose - Close button element
 * @returns {Object} Handler functions
 */
function createModalHandlers(modal, youtubePlayer, modalClose) {
    const openModal = (videoId) => {
        const embedUrl = `${CONFIG.YOUTUBE.EMBED_BASE_URL}${videoId}?${CONFIG.YOUTUBE.EMBED_PARAMS}`;
        youtubePlayer.src = embedUrl;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        appState.setLastFocusedElement(document.activeElement instanceof HTMLElement ? document.activeElement : null);
        document.body.style.overflow = 'hidden';
        
        const focusableElements = Array.from(modal.querySelectorAll(CONFIG.SELECTORS.FOCUSABLE));
        const firstFocusable = focusableElements.find(el => el.offsetParent !== null) || modalClose;
        if (firstFocusable) {
            firstFocusable.focus();
        }
    };
    
    const closeModal = () => {
        modal.classList.remove('active');
        youtubePlayer.src = '';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        const lastFocused = appState.getLastFocusedElement();
        if (lastFocused && typeof lastFocused.focus === 'function') {
            lastFocused.focus();
        }
        appState.clearLastFocusedElement();
    };
    
    return { openModal, closeModal };
}

/**
 * Setup keyboard navigation for modal
 * @param {HTMLElement} modal - Modal element
 * @param {Function} closeModal - Close modal function
 */
function setupKeyboardNavigation(modal, closeModal) {
    // Handle Escape key
    document.addEventListener('keydown', (e) => {
        if (!(e.target instanceof Element)) return;
        
        const hotspot = e.target.closest(CONFIG.SELECTORS.HOTSPOT);
        if (hotspot && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            const videoId = hotspot.getAttribute('data-video-id');
            if (videoId && typeof window.openYouTubeModal === 'function') {
                window.openYouTubeModal(videoId);
            }
        }
        
        // Close modal on Escape key
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
    
    // Handle Tab key for focus trap
    modal.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || !modal.classList.contains('active')) {
            return;
        }

        const focusableElements = Array.from(modal.querySelectorAll(CONFIG.SELECTORS.FOCUSABLE))
            .filter(el => el.offsetParent !== null);
        
        if (focusableElements.length === 0) {
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        } else if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        }
    });
}

/**
 * Setup click handlers for hotspots and modal
 * @param {Function} openModal - Open modal function
 * @param {HTMLElement} modalOverlay - Modal overlay element
 * @param {HTMLElement} modalClose - Close button element
 * @param {Function} closeModal - Close modal function
 */
function setupClickHandlers(openModal, modalOverlay, modalClose, closeModal) {
    // Add click listeners to all YouTube hotspots (using event delegation)
    document.addEventListener('click', (e) => {
        if (!(e.target instanceof Element)) return;
        const hotspot = e.target.closest(CONFIG.SELECTORS.HOTSPOT);
        if (hotspot) {
            const videoId = hotspot.getAttribute('data-video-id');
            openModal(videoId);
        }
    });
    
    // Close modal when clicking the close button
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking the overlay
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
    }
}

/**
 * Initialize YouTube modal functionality
 */
function initializeYouTubeModal() {
    const modal = document.getElementById('youtube-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalClose = document.querySelector('.modal-close');
    const youtubePlayer = document.getElementById('youtube-player');
    
    if (!modal || !youtubePlayer) {
        ErrorHandler.warn('Modal elements not found');
        return;
    }
    
    // Create handlers
    const { openModal, closeModal } = createModalHandlers(modal, youtubePlayer, modalClose);
    
    // Expose openModal globally for hotspot click handlers
    window.openYouTubeModal = openModal;
    
    // Also expose to PortfolioApp namespace with documentation
    if (typeof window.PortfolioApp !== 'undefined') {
        /**
         * Open YouTube modal with a video
         * Opens a modal dialog and plays the specified YouTube video.
         * 
         * @function PortfolioApp.openYouTubeModal
         * @param {string} videoId - YouTube video ID (11 characters, e.g., 'dQw4w9WgXcQ')
         * @returns {void}
         * 
         * @example
         * // Open a video by ID
         * PortfolioApp.openYouTubeModal('dQw4w9WgXcQ');
         * 
         * @example
         * // Extract ID from URL and open
         * const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
         * const videoId = url.match(/[?&]v=([^&]+)/)?.[1];
         * if (videoId) PortfolioApp.openYouTubeModal(videoId);
         */
        window.PortfolioApp.openYouTubeModal = openModal;
    }
    
    // Setup keyboard navigation
    setupKeyboardNavigation(modal, closeModal);
    
    // Setup click handlers
    setupClickHandlers(openModal, modalOverlay, modalClose, closeModal);
}

