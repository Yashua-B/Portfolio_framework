# Portfolio Regression Test Checklist

Use this checklist after updating assets or code to confirm the interactive portfolio still behaves exactly as expected.

## 1. Initial Load
- Serve the site over HTTP (`python -m http.server` or Live Server).
- Confirm the loading overlay appears with animated dots and hides once content renders.
- Verify no errors appear in the browser console.

## 2. Image Rendering
- Confirm numbered files (`page_01.png`, etc.) auto-load in ascending order.
- Rename one image to a supported alternative pattern (e.g., `image01.jpg`) and confirm it is discovered.
- Confirm missing files log warnings without breaking other images.

## 3. Hotspots
- Validate hotspots defined in `hotspots.txt` render on the correct pages with proper positioning.
- Add a second hotspot to the same page and confirm both animate and respond.
- Comment out a hotspot line and confirm it disappears after refresh.
- Resize the browser window and verify hotspot rectangles reposition correctly.

## 4. Modal Behaviour
- Click a hotspot: the modal should open, autoplay the video, and trap keyboard focus.
- Press `Escape`, click the close button, and click outside the modal to ensure each closes the modal and restores focus.
- Confirm body scrolling is disabled while the modal is open and restored when closed.

## 5. Accessibility
- Navigate hotspots using keyboard (Tab + Enter/Space) and confirm focus outlines appear.
- Verify the loader message is announced by screen readers (e.g., with NVDA/VoiceOver spot-check).
- Toggle `prefers-reduced-motion` in dev tools to ensure animations respect reduced-motion settings.

## 6. Responsive Layout
- Test at 1280px, 1024px, 768px, and 480px widths to confirm spacing, shadows, and modal sizing adapt gracefully.
- On a touch device or emulator, ensure hotspot hit areas remain large enough to tap.

## 7. Regression Sweep
- Confirm the bouncing loader animation still plays.
- Verify scrolling animations (fade-in) trigger once per page and never flicker.
- Inspect Lighthouse / DevTools for console warnings or accessibility regressions.

Record pass/fail notes for each section before deploying or sharing updates.

