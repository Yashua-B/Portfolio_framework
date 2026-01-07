# Joshua Barzideh – Dynamic Portfolio Website

Showcase your work with a single-page scrolling experience that feels exactly the same as before—smooth fade-in animations, responsive layout, and YouTube popups—but now the site updates itself. Just drop images into the `images/` folder and list YouTube hotspots in `hotspots.txt`; no coding required.

## ✨ What's Included

### Core Files
- `index.html` – Main HTML structure
- `styles.css` – All styling and animations
- `script.js` – Main application orchestrator (coordinates all modules)
- `config.js` – Centralized configuration constants
- `config/hotspots.txt` – Simple text file where you list any clickable YouTube areas
- `config/animations.txt` – Animation configuration file
- `images/` – Place your image pages here, organized by format in subfolders (e.g., `images/avif/page_01.avif`, `images/webp/page_01.webp`, `images/png/page_01.png`)

### Directory Structure
```
Portfolio_framework-main/
├── assets/
│   ├── icons/                    # Animation icon files (SVG + CSS)
│   │   ├── mouse.svg
│   │   └── mouse.css
│   └── loading/
│       ├── bouncing-dots.css    # Loading animation styles (preview)
│       └── preview.html         # Preview file for loader
├── config/                       # Configuration files
│   ├── hotspots.txt             # Hotspot configuration
│   └── animations.txt          # Animation configuration
├── images/                       # Portfolio images folder
├── modules/                      # Application modules
│   ├── animationController.js   # Scroll animations and hotspot discovery
│   ├── animationManager.js      # Custom page animations
│   ├── hotspotManager.js        # Hotspot configuration and positioning
│   ├── imageLoader.js           # Image discovery and loading
│   ├── modalController.js       # YouTube modal functionality
│   ├── navigationController.js  # Hash navigation and page routing
│   ├── pageRenderer.js          # Page rendering logic
│   ├── performanceOptimizer.js # Performance optimizations
│   └── zoomistController.js     # Zoomist initialization and handling
├── state/
│   └── AppState.js              # Application state management
├── utils/                        # Utility modules
│   ├── debugTracker.js          # Centralized debug infrastructure
│   ├── dom.js                   # DOM helper functions
│   ├── errorHandler.js          # Centralized error handling
│   ├── loader.js                # Loading overlay management
│   ├── namespace.js             # PortfolioApp namespace setup
│   └── validation.js            # Data validation utilities
├── config.js                     # Configuration constants
├── index.html                    # Main HTML file
├── script.js                     # Application orchestrator
└── styles.css                    # Stylesheet
```

## 🚀 How It Works
### 1. Images load automatically
The site automatically discovers your images:

- Place your images in the `images/` folder, organized by format in subfolders
- **Folder structure**: Create subfolders for each format:
  - `images/avif/` – Place AVIF files here (e.g., `page_01.avif`, `page_02.avif`)
  - `images/webp/` – Place WebP files here (e.g., `page_01.webp`, `page_02.webp`)
  - `images/png/` – Place PNG files here (e.g., `page_01.png`, `page_02.png`)
- Name them with numbers: `page01.avif`, `page01.webp`, `page01.png`, etc.
- Supported formats: AVIF (primary, best compression), WebP (fallback, broad support), PNG (final fallback, universal support)
- **Format options**: You can provide images in any combination:
  - **Best**: Provide both AVIF and WebP (maximum compatibility and compression)
  - **Simple**: Provide only WebP (good compression, 97% browser support)
  - **Compatible**: Provide only PNG (works everywhere, larger files)
  - **Mixed**: Any combination works - system automatically selects best available format
- Files should be named identically across format folders (e.g., `images/avif/page_01.avif`, `images/webp/page_01.webp`, `images/png/page_01.png`)
- The site automatically finds them and displays in numerical order

### 2. Hotspots are managed in `config/hotspots.txt`
Each line follows this pattern:

```
page_number, youtube_url, left%, bottom%, width%, height%
```

Example (already included):

```
6, https://www.youtube.com/watch?v=62AL_IPh8bA, 2.9, 8.6, 4, 11
7, https://youtu.be/9xRQY97oVTg, 2.9, 8.6, 4, 11
```

What the numbers mean:
- `page_number` – Which portfolio page needs the hotspot (starts at 1).
- `youtube_url` – Paste the full YouTube link (any format works).
- `left%`, `bottom%` – Position of the hotspot relative to the image.
- `width%`, `height%` – Size of the clickable rectangle (automatically scales up on mobile for easier tapping).

Delete a line (or add `#` at the start) to remove a hotspot. Add more lines to create new hotspots.

**Note:** Hotspots automatically become larger on mobile devices for easier touch interaction, while maintaining their relative position.

### 3. Animations are configured in `config/animations.txt`
Define custom animations that appear on specific pages. Each line follows this pattern:

```
page_number, icon_filename, centerX%, centerY%, size%, delay_ms, duration_ms, trigger_type
```

Example:
```
2, mouse.svg, 50, 50, 110, 0, 5000, visible
```

What the parameters mean:
- `page_number` – Which portfolio page should show the animation (starts at 1).
- `icon_filename` – Name of SVG file in `assets/icons/` folder (e.g., `mouse.svg`).
- `centerX%`, `centerY%` – Position of animation center relative to image (0-100%).
- `size%` – Size of animation relative to image width (percentage).
- `delay_ms` – Delay before animation starts (milliseconds).
- `duration_ms` – How long animation plays (milliseconds).
- `trigger_type` – When to start: `visible` (when page scrolls into view) or `hover` (on mouse hover).

The corresponding CSS file (e.g., `assets/icons/mouse.css`) will be automatically loaded if it exists.

## 🔄 Update Your Portfolio (No Code)
1. **Add/remove images:** Drop files in the appropriate format subfolders (`images/avif/`, `images/webp/`, or `images/png/`) with numbered names like `page_01.avif`, `page_01.webp`, or `page_01.png`
2. **Change hotspots:** Edit `config/hotspots.txt` to adjust clickable areas
3. **Change animations:** Edit `config/animations.txt` to add or modify page animations
4. **See changes:** Refresh the page—no code editing needed!

## 👀 Preview Locally
Because modern browsers block local file access, double-clicking `index.html` will hide hotspots. Use a tiny local web server instead:

### Option A – Python (installed on most computers)
```
cd path/to/your/project
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

### Option B – VS Code “Live Server” extension
Install the extension, open the project, right-click `index.html`, choose **Open with Live Server**.

Once hosted over HTTP, the hotspots load correctly.

### Converting Images to AVIF/WebP

To optimize your portfolio images, convert PNG files to AVIF and WebP formats:

**Recommended Tools:**
- **Squoosh** (https://squoosh.app) - Web-based, easy to use, no installation
- **ImageMagick** - Command line: `magick input.png -quality 80 output.avif`
- **XnConvert** - Free batch converter with GUI (Windows/Mac/Linux)

**Recommended Quality Settings:**
- **AVIF**: Quality 60-80 (visually lossless at ~70, excellent compression)
- **WebP**: Quality 75-85 (good balance of quality and file size)

**Workflow:**
1. Keep original PNG files as backup
2. Convert to AVIF (for modern browsers)
3. Convert to WebP (for broader compatibility)
4. Organize files in format subfolders:
   - Place AVIF files in `images/avif/` folder
   - Place WebP files in `images/webp/` folder
   - Place PNG files in `images/png/` folder
5. Use same base name across formats (e.g., `page_01.avif`, `page_01.webp`, `page_01.png`)
6. System automatically selects best format for each browser

## 🌐 Deploy to GitHub Pages
1. Create a new GitHub repository (Public).
2. Upload these files/folders:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `config.js`
   - `config/` folder (with `hotspots.txt` and `animations.txt`)
   - `images/` folder (all your image files)
   - `assets/` folder (icon files and CSS)
   - `modules/` folder (all JavaScript modules)
   - `state/` folder (AppState.js)
   - `utils/` folder (all utility files)
3. In **Settings → Pages**, set **Branch: main**, **Folder: /(root)**, then Save.
4. Wait a minute, then visit `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`.

**Note:** After deployment, you can update just by uploading new images or editing `config/hotspots.txt` and `config/animations.txt`—no need to touch the code!

## 🎨 Customization Tips

### Styling
- Colors, fonts, or animation tweaks live in `styles.css`
- CSS custom properties (variables) are defined in `:root` for easy customization
- Want to highlight a hotspot in words? Add a caption directly into the image so it stays perfectly aligned
- Keep each image under ~5 MB for faster loading (AVIF files will be significantly smaller)

### Configuration
- Edit `config.js` to adjust application settings:
  - Image discovery settings (MAX_PAGES, MAX_CONSECUTIVE_FAILURES)
  - Breakpoints for responsive design (MOBILE, TABLET)
  - Hotspot touch-friendly sizing (MIN_TOUCH_SIZE)
  - Zoomist settings (MAX_SCALE, WHEEL_RATIO)
  - Animation thresholds and delays

### Code Structure
- The application is modularized for easier maintenance:
  - `modules/` - Feature-specific modules (image loading, hotspots, modal, animations, etc.)
  - `utils/` - Reusable utility functions (DOM helpers, error handling, debug tracking)
  - `state/` - Centralized state management
  - `config/` - Configuration files (hotspots, animations)
  - `config.js` - All configuration constants in one place

### Public API (PortfolioApp Namespace)
The application exposes a public API through the `window.PortfolioApp` namespace:

#### Navigation
- `PortfolioApp.navigateToPortfolioPage(pageNumber)` - Navigate to a specific page by number
  ```javascript
  PortfolioApp.navigateToPortfolioPage(3); // Scrolls to page 3
  ```

#### Modal Control
- `PortfolioApp.openYouTubeModal(videoId)` - Open YouTube modal with a video
  ```javascript
  PortfolioApp.openYouTubeModal('dQw4w9WgXcQ'); // Opens video in modal
  ```

#### Animation Control
- `PortfolioApp.hidePageAnimation(pageNumber, animationClassName, permanent)` - Hide an animation
  ```javascript
  PortfolioApp.hidePageAnimation(2, 'animation-mouse', true); // Permanently hide mouse animation on page 2
  ```

#### Debug Tools (when `CONFIG.DEBUG.ENABLED = true`)
- `PortfolioApp.debug.debugPageLoading()` - Display comprehensive debug summary of page loading
- `PortfolioApp.debug.debugNetworkRequests()` - Display network request analysis

**Note:** For backward compatibility, the old global functions (`window.navigateToPortfolioPage`, `window.openYouTubeModal`, `window.debugPageLoading`, etc.) still work but are deprecated. Use the `PortfolioApp` namespace for new code.

## 🛠️ Troubleshooting
- **Hotspots missing locally?** Run the site through a local server (see "Preview Locally").
- **A new page isn't showing?** 
  - Check that the filename has a number (e.g., `page01.avif` not `mypage.avif`)
  - Use consistent numbering (`page_01.avif`, `page_02.webp`, etc.)
  - Supported formats: AVIF (primary), WebP (fallback), PNG (final fallback)
- **Video won't play?** Make sure the YouTube link is public and copied correctly into `config/hotspots.txt`.
- **Images loading in wrong order?** Rename files with consistent numbering (`01`, `02`, `03`...) to ensure correct order.
- **Hotspots too small on mobile?** They automatically scale up 3-4x on phones; test in actual device or browser dev tools mobile view.
- **Debug mode not working?** Set `CONFIG.DEBUG.ENABLED = true` in `config.js` to enable debug tracking and logging.
- **Animation not appearing?** Check that the icon file exists in `assets/icons/` and the configuration in `config/animations.txt` is correct.

## ❤️ Credits
Built with pure HTML, CSS, and JavaScript. Drop in new images (AVIF, WebP, or PNG), adjust `hotspots.txt`, and the site stays fresh with zero coding.
