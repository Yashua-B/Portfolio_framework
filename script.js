// ===== CONFIGURATION =====
const IMAGE_FOLDER = 'images/';
const HOTSPOTS_FILE = 'hotspots.txt';
const IMAGES_MANIFEST = 'images.txt'; // Optional: list your image filenames here

// Global variables
let hotspotConfigs = [];
let loadedImages = [];
let hotspotElements = []; // Store hotspot elements for repositioning

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Step 1: Load hotspot configurations
        await loadHotspotConfigs();
        
        // Step 2: Discover and load all images
        await discoverAndLoadImages();
        
        // Step 3: Build the portfolio pages
        buildPortfolioPages();
        
        // Step 4: Apply hotspots to pages
        applyHotspots();
        
        // Step 5: Initialize animations and interactions
        initializeAnimations();
        initializeYouTubeModal();
        initializePerformanceOptimizations();
        
    } catch (error) {
        console.error('Error initializing portfolio:', error);
    }
});

// ===== IMAGE DISCOVERY =====
// Discovers images either from a manifest file or by auto-detection
async function discoverAndLoadImages() {
    // Try manifest file first (easiest for any naming scheme)
    const manifestImages = await loadFromManifest();
    if (manifestImages.length > 0) {
        loadedImages = manifestImages;
        console.log(`Loaded ${loadedImages.length} images from manifest`);
        return loadedImages;
    }
    
    // Fall back to automatic discovery
    const discoveredImages = await autoDiscoverImages();
    loadedImages = discoveredImages;
    console.log(`Auto-discovered ${loadedImages.length} images`);
    return loadedImages;
}

// Load images from optional images.txt manifest file
async function loadFromManifest() {
    try {
        const response = await fetch(IMAGES_MANIFEST);
        if (!response.ok) return [];
        
        const text = await response.text();
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
        
        const images = [];
        for (let i = 0; i < lines.length; i++) {
            const filename = lines[i];
            const imagePath = IMAGE_FOLDER + filename;
            
            if (await imageExists(imagePath)) {
                images.push({
                    path: imagePath,
                    pageNumber: i + 1,
                    name: filename
                });
            } else {
                console.warn(`Image listed in manifest not found: ${filename}`);
            }
        }
        
        return images;
    } catch (error) {
        return []; // Manifest file doesn't exist, that's okay
    }
}

// Automatically discover images using only page_##.png pattern with parallel checking
async function autoDiscoverImages() {
    const discoveredImages = [];
    const MAX_PAGES = 100;
    const BATCH_SIZE = 10; // Check 10 images in parallel at a time
    const MAX_CONSECUTIVE_FAILURES = 5;
    
    let consecutiveFailures = 0;
    
    // Process pages in batches for parallel checking
    for (let batchStart = 1; batchStart <= MAX_PAGES; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, MAX_PAGES);
        const batchPromises = [];
        
        // Create promises for all images in this batch
        for (let i = batchStart; i <= batchEnd; i++) {
            const paddedNum = String(i).padStart(2, '0');
            const imagePath = `${IMAGE_FOLDER}page_${paddedNum}.png`;
            
            batchPromises.push(
                imageExists(imagePath).then(exists => ({
                    exists,
                    pageNumber: i,
                    path: imagePath,
                    name: `page_${paddedNum}.png`
                }))
            );
        }
        
        // Wait for all checks in this batch to complete in parallel
        const batchResults = await Promise.all(batchPromises);
        
        // Process results and track consecutive failures
        let foundInBatch = false;
        for (const result of batchResults) {
            if (result.exists) {
                discoveredImages.push({
                    path: result.path,
                    pageNumber: result.pageNumber,
                    name: result.name
                });
                consecutiveFailures = 0; // Reset counter when we find an image
                foundInBatch = true;
            } else {
                // Count consecutive missing pages
                consecutiveFailures++;
            }
        }
        
        // Stop if we've had too many consecutive failures and found at least one image
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && discoveredImages.length > 0) {
            break;
        }
    }
    
    // Sort by page number
    return discoveredImages.sort((a, b) => a.pageNumber - b.pageNumber);
}

// Helper function to check if image exists (with timeout)
function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        let resolved = false;
        
        // Timeout after 5 seconds
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        }, 5000);
        
        img.onload = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve(true);
            }
        };
        
        img.onerror = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve(false);
            }
        };
        
        img.src = url;
    });
}

// ===== BUILD PORTFOLIO PAGES =====
function buildPortfolioPages() {
    const container = document.getElementById('portfolio-container');
    
    loadedImages.forEach((imageData, index) => {
        // Create page element
        const pageDiv = document.createElement('div');
        pageDiv.className = 'portfolio-page';
        pageDiv.setAttribute('data-page', imageData.pageNumber);
        
        // Create image element
        const img = document.createElement('img');
        img.src = imageData.path;
        img.alt = `Portfolio Page ${imageData.pageNumber}`;
        
        // Add lazy loading for images after the first 2
        if (index > 1) {
            img.setAttribute('loading', 'lazy');
        }
        
        // Add error handling for failed image loads
        img.addEventListener('error', () => {
            console.warn(`Failed to load image: ${imageData.path}`);
            // Hide the page if image fails to load
            pageDiv.style.display = 'none';
        });
        
        pageDiv.appendChild(img);
        container.appendChild(pageDiv);
    });
}

// ===== HOTSPOT CONFIGURATION LOADER =====
async function loadHotspotConfigs() {
    try {
        const response = await fetch(HOTSPOTS_FILE);
        if (!response.ok) {
            console.log('No hotspots.txt file found - no hotspots will be added');
            return;
        }
        
        const text = await response.text();
        hotspotConfigs = parseHotspotConfig(text);
        console.log(`Loaded ${hotspotConfigs.length} hotspot configurations`);
        
    } catch (error) {
        console.log('Could not load hotspots configuration:', error.message);
    }
}

// Parse hotspot configuration text
function parseHotspotConfig(text) {
    const configs = [];
    const lines = text.split('\n');
    
    for (let line of lines) {
        // Remove comments and whitespace
        line = line.trim();
        if (line === '' || line.startsWith('#')) continue;
        
        // Parse: page_number, youtube_url, left%, bottom%, width%, height%
        const parts = line.split(',').map(p => p.trim());
        if (parts.length !== 6) {
            console.warn(`Invalid hotspot config line: ${line}`);
            continue;
        }
        
        const [pageNum, youtubeUrl, left, bottom, width, height] = parts;
        
        // Extract video ID from YouTube URL
        const videoId = extractYouTubeVideoId(youtubeUrl);
        if (!videoId) {
            console.warn(`Could not extract video ID from: ${youtubeUrl}`);
            continue;
        }
        
        // Validate numeric values
        const parsedPageNum = parseInt(pageNum);
        const parsedLeft = parseFloat(left);
        const parsedBottom = parseFloat(bottom);
        const parsedWidth = parseFloat(width);
        const parsedHeight = parseFloat(height);
        
        // Check for invalid numbers
        if (isNaN(parsedPageNum) || parsedPageNum < 1) {
            console.warn(`Invalid page number "${pageNum}" in hotspot config: ${line}`);
            continue;
        }
        if (isNaN(parsedLeft) || parsedLeft < 0 || parsedLeft > 100) {
            console.warn(`Invalid left% "${left}" (must be 0-100) in hotspot config: ${line}`);
            continue;
        }
        if (isNaN(parsedBottom) || parsedBottom < 0 || parsedBottom > 100) {
            console.warn(`Invalid bottom% "${bottom}" (must be 0-100) in hotspot config: ${line}`);
            continue;
        }
        if (isNaN(parsedWidth) || parsedWidth <= 0 || parsedWidth > 100) {
            console.warn(`Invalid width% "${width}" (must be >0 and <=100) in hotspot config: ${line}`);
            continue;
        }
        if (isNaN(parsedHeight) || parsedHeight <= 0 || parsedHeight > 100) {
            console.warn(`Invalid height% "${height}" (must be >0 and <=100) in hotspot config: ${line}`);
            continue;
        }
        
        configs.push({
            pageNumber: parsedPageNum,
            videoId: videoId,
            left: parsedLeft,
            bottom: parsedBottom,
            width: parsedWidth,
            height: parsedHeight
        });
    }
    
    return configs;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeVideoId(url) {
    // Handle different YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/  // Direct video ID
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

// ===== DYNAMIC HOTSPOT POSITIONING =====
function positionHotspot(hotspot, config, page) {
    // Get the actual rendered image dimensions
    const img = page.querySelector('img');
    if (!img || !img.complete) {
        // Image not loaded yet, try again after it loads
        if (img) {
            img.addEventListener('load', () => positionHotspot(hotspot, config, page), { once: true });
        }
        return;
    }
    
    const imgRect = img.getBoundingClientRect();
    
    // Rendered image dimensions
    const imageWidth = imgRect.width;
    const imageHeight = imgRect.height;
    
    // Natural image dimensions (for consistent scaling)
    const naturalWidth = img.naturalWidth || imageWidth;
    const naturalHeight = img.naturalHeight || imageHeight;
    
    if (!naturalWidth || !naturalHeight) {
        return;
    }
    
    const scaleX = imageWidth / naturalWidth;
    const scaleY = imageHeight / naturalHeight;
    
    // Convert hotspot percentages to natural image coordinates
    const naturalWidthPx = (naturalWidth * config.width) / 100;
    const naturalHeightPx = (naturalHeight * config.height) / 100;
    const naturalLeft = (naturalWidth * config.left) / 100;
    const naturalBottom = (naturalHeight * config.bottom) / 100;
    const naturalTop = naturalHeight - naturalBottom - naturalHeightPx;
    
    // Scale natural coordinates to rendered pixels
    let actualWidth = naturalWidthPx * scaleX;
    let actualHeight = naturalHeightPx * scaleY;
    let actualLeft = naturalLeft * scaleX;
    let actualTop = naturalTop * scaleY;
    
    // Ensure minimum touch-friendly sizes on smaller screens using proportional scaling
    const MIN_TOUCH_SIZE = 5; // Slightly smaller minimum while remaining touch-friendly
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        const minImageDimension = Math.min(imageWidth, imageHeight);
        const targetMinSide = Math.max(MIN_TOUCH_SIZE, minImageDimension * 0.04);
        const currentMinSide = Math.min(actualWidth, actualHeight);
        const touchScale = currentMinSide < targetMinSide ? targetMinSide / currentMinSide : 1;
        
        if (touchScale > 1) {
            const baseWidth = actualWidth;
            const baseHeight = actualHeight;
            
            actualWidth *= touchScale;
            actualHeight *= touchScale;
            
            // Offset to keep hotspot centered on original position before clamping
            actualLeft -= (actualWidth - baseWidth) / 2;
            actualTop -= (actualHeight - baseHeight) / 2;
        }
    }
    
    // Clamp hotspot within image bounds
    actualWidth = Math.min(actualWidth, imageWidth);
    actualHeight = Math.min(actualHeight, imageHeight);
    
    actualLeft = Math.max(0, Math.min(actualLeft, imageWidth - actualWidth));
    actualTop = Math.max(0, Math.min(actualTop, imageHeight - actualHeight));
    
    // Apply absolute pixel positioning using top/left for stability
    hotspot.style.left = `${actualLeft}px`;
    hotspot.style.top = `${actualTop}px`;
    hotspot.style.width = `${actualWidth}px`;
    hotspot.style.height = `${actualHeight}px`;
    hotspot.style.removeProperty('bottom');
    
    // Update SVG border stroke-dasharray based on hotspot perimeter for smooth animation
    const perimeter = 2 * (actualWidth + actualHeight);
    const svg = hotspot.querySelector('.border-rect');
    if (svg) {
        svg.setAttribute('stroke-dasharray', perimeter);
        svg.setAttribute('stroke-dashoffset', perimeter);
    }
}

// Reposition all hotspots (called on resize)
function repositionAllHotspots() {
    hotspotElements.forEach(({ hotspot, config, page }) => {
        positionHotspot(hotspot, config, page);
    });
}

// ===== APPLY HOTSPOTS TO PAGES =====
function applyHotspots() {
    hotspotConfigs.forEach(config => {
        const page = document.querySelector(`.portfolio-page[data-page="${config.pageNumber}"]`);
        if (!page) {
            console.warn(`Page ${config.pageNumber} not found for hotspot`);
            return;
        }
        
        // Create hotspot element
        const hotspot = document.createElement('div');
        hotspot.className = 'youtube-hotspot';
        hotspot.setAttribute('data-video-id', config.videoId);
        hotspot.setAttribute('aria-label', 'Watch Video');
        hotspot.setAttribute('tabindex', '0');
        hotspot.setAttribute('role', 'button');
        
        // Create SVG border for animation
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('hotspot-border');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.classList.add('border-rect');
        rect.setAttribute('x', '1');
        rect.setAttribute('y', '1');
        rect.setAttribute('rx', '4');
        rect.setAttribute('ry', '4');
        
        svg.appendChild(rect);
        hotspot.appendChild(svg);
        page.appendChild(hotspot);
        
        // Store reference for repositioning
        hotspotElements.push({ hotspot, config, page });
        
        // Position the hotspot dynamically
        positionHotspot(hotspot, config, page);
    });
}

// ===== FADE-IN ANIMATION ON SCROLL =====
function initializeAnimations() {
    // Create an Intersection Observer to watch when pages come into view
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe all portfolio pages
    const portfolioPages = document.querySelectorAll('.portfolio-page');
    portfolioPages.forEach(page => {
        observer.observe(page);
    });
    
    // Initialize hotspot discovery animation
    initializeHotspotDiscovery();
}

// ===== YOUTUBE HOTSPOT DISCOVERY ANIMATION =====
function initializeHotspotDiscovery() {
    const animatedHotspots = new Set();
    
    const hotspotObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const hotspot = entry.target.querySelector('.youtube-hotspot');
                
                if (hotspot && !animatedHotspots.has(hotspot)) {
                    setTimeout(() => {
                        hotspot.classList.add('discover');
                        animatedHotspots.add(hotspot);
                        
                        // Remove after animation completes (3s duration * 1 iteration = 3000ms)
                        setTimeout(() => {
                            hotspot.classList.remove('discover');
                        }, 3000);
                    }, 2500);
                }
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '0px'
    });
    
    // Observe all pages with hotspots
    hotspotConfigs.forEach(config => {
        const page = document.querySelector(`.portfolio-page[data-page="${config.pageNumber}"]`);
        if (page) {
            hotspotObserver.observe(page);
        }
    });
}

// ===== YOUTUBE MODAL FUNCTIONALITY =====
function initializeYouTubeModal() {
    const modal = document.getElementById('youtube-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalClose = document.querySelector('.modal-close');
    const youtubePlayer = document.getElementById('youtube-player');
    
    // Function to open modal with specific video
    function openModal(videoId) {
        const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&vq=hd720`;
        youtubePlayer.src = embedUrl;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Function to close modal
    function closeModal() {
        modal.classList.remove('active');
        youtubePlayer.src = '';
        document.body.style.overflow = '';
    }
    
    // Add click listeners to all YouTube hotspots (using event delegation)
    document.addEventListener('click', (e) => {
        const hotspot = e.target.closest('.youtube-hotspot');
        if (hotspot) {
            const videoId = hotspot.getAttribute('data-video-id');
            openModal(videoId);
        }
    });
    
    // Add keyboard accessibility
    document.addEventListener('keydown', (e) => {
        const hotspot = e.target.closest('.youtube-hotspot');
        if (hotspot && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            const videoId = hotspot.getAttribute('data-video-id');
            openModal(videoId);
        }
        
        // Close modal on Escape key
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
    
    // Close modal when clicking the close button
    modalClose.addEventListener('click', closeModal);
    
    // Close modal when clicking the overlay
    modalOverlay.addEventListener('click', closeModal);
}

// ===== SMOOTH PERFORMANCE ENHANCEMENTS =====
function initializePerformanceOptimizations() {
    // Debounce function for performance
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
    
    // Add debounced resize handler to reposition hotspots
    const debouncedReposition = debounce(repositionAllHotspots, 150);
    window.addEventListener('resize', debouncedReposition);
    
    // Also handle orientation changes on mobile devices
    window.addEventListener('orientationchange', () => {
        // Wait a bit for the orientation change to complete
        setTimeout(repositionAllHotspots, 200);
    });
    
    console.log('Performance optimizations initialized');
}
