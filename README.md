# Portfolio Framework

A lightweight single-page portfolio viewer built with vanilla HTML, CSS, and JavaScript.

It auto-loads numbered images, supports YouTube hotspots, and allows page-specific icon animations through simple text config files.

## What It Does

- Automatically discovers and renders portfolio pages from `images/`
- Supports format fallback: AVIF -> WebP -> PNG
- Opens configured YouTube videos in a modal from clickable hotspots
- Supports configurable page animations from `config/animations.txt`
- Runs as a static site (no build step required)

## Quick Start

1. Clone the repo.
2. Start a local server from the project folder:

```bash
python -m http.server 8000
```

3. Open `http://localhost:8000`.

## Updating Content

- Add or replace images in `images/avif/`, `images/webp/`, and `images/png/` using numbered names like `page_01.avif`
- Edit `config/hotspots.txt` to add, remove, or reposition YouTube hotspots
- Edit `config/animations.txt` to control page animations

## Key Files

- `index.html`: App markup
- `styles.css`: Styling and responsive layout
- `script.js`: Application bootstrap/orchestration
- `config.js`: Runtime settings
- `modules/`: Feature modules (loading, rendering, hotspots, modal, animations)
- `utils/`: Shared helpers
- `state/AppState.js`: Central app state

## Deployment

This project can be deployed to any static host (for example GitHub Pages or Cloudflare Pages).

## More Documentation

- `QUICK_START.md`: GitHub CLI workflow and repo operations
- `TESTING.md`: Manual regression checklist

## Tech Stack

- HTML
- CSS
- JavaScript (ES modules, no framework)
