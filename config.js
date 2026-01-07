/**
 * Configuration constants for the portfolio application
 * Centralizes all magic numbers, strings, and configuration values
 */

const CONFIG = {
    IMAGE: {
        FOLDER: 'images/',
        MAX_PAGES: 100,
        MAX_CONSECUTIVE_FAILURES: 5,
        TIMEOUT_MS: 5000,
        // Format priority: tried in order, first successful format cached for subsequent pages
        // PNG included as final fallback for backward compatibility
        FORMAT_PRIORITY: ['avif', 'webp', 'png'],
        FILENAME_PATTERN: 'page_',
        FILENAME_PADDING: 2
    },
    HOTSPOT: {
        FILE: 'config/hotspots.txt',
        MIN_TOUCH_SIZE: 5,
        MIN_TOUCH_SCALE: 0.04,
        DISCOVERY_DELAY: 2500,
        DISCOVERY_ANIMATION_DURATION: 3000
    },
    BREAKPOINTS: {
        MOBILE: 768,
        TABLET: 1024
    },
    ZOOMIST: {
        MAX_SCALE: 4,
        WHEEL_RATIO: 0.1,
        DISABLE_FOR_TESTING: false  // Set to true to disable Zoomist initialization (for testing)
    },
    LOADER: {
        ID: 'loading-overlay',
        HIDDEN_CLASS: 'is-hidden',
        DEFAULT_MESSAGE: 'Loading content…'
    },
    ANIMATION: {
        THRESHOLD: 0.15,
        ROOT_MARGIN: '0px 0px -50px 0px',
        HOTSPOT_THRESHOLD: 0.3,
        HOTSPOT_ROOT_MARGIN: '0px'
    },
    ANIMATION_HINT: {
        FILE: 'config/animations.txt',
        ICONS_FOLDER: 'assets/icons/',
        DEFAULT_DELAY: 0
    },
    PERFORMANCE: {
        RESIZE_DEBOUNCE_MS: 150,
        ORIENTATION_CHANGE_DELAY_MS: 200
    },
    YOUTUBE: {
        EMBED_BASE_URL: 'https://www.youtube-nocookie.com/embed/',
        EMBED_PARAMS: 'autoplay=1&rel=0&modestbranding=1&enablejsapi=1&vq=hd720',
        PATTERNS: [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ]
    },
    SELECTORS: {
        FOCUSABLE: 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        HOTSPOT: '.youtube-hotspot',
        PORTFOLIO_PAGE: '.portfolio-page',
        ZOOMIST_IMAGE: '.zoomist-image'
    },
    DEBUG: {
        ENABLED: false,  // Set to true to enable debug mode
        TRACK_PAGE_RENDERS: true,
        TRACK_IMAGE_LOADS: true,
        TRACK_NETWORK_REQUESTS: true,
        TRACK_DOM_MUTATIONS: false  // Expensive, disable by default
    }
};

