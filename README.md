# Joshua Barzideh – Dynamic Portfolio Website

Showcase your work with a single-page scrolling experience that feels exactly the same as before—smooth fade-in animations, responsive layout, and YouTube popups—but now the site updates itself. Just drop images into the `images/` folder and list YouTube hotspots in `hotspots.txt`; no coding required.

## ✨ What’s Included
- `index.html` – Blank container that the script fills for you.
- `styles.css` – All styling and animations (unchanged).
- `script.js` – Automatically finds images, builds pages, and wires up hotspots.
- `hotspots.txt` – Simple text file where you list any clickable YouTube areas.
- `images/` – Place your PNG pages here (named with numbers, e.g., `bowtie clip_01.png`).

## 🚀 How It Works
### 1. Images load automatically
The site discovers your images in one of two ways:

**Option A: Automatic Discovery (Easiest)**
- Place your images in the `images/` folder
- Name them with numbers: `page01.png`, `page02.png`, etc.
- Supported formats: PNG, JPG, JPEG, GIF, WEBP
- Works with various naming patterns:
  - `page_01.png`, `page01.png`
  - `image01.png`, `slide01.png`
  - `01.png`, `001.png` (just numbers with or without leading zeroes)
- The site automatically finds them and displays in numerical order
- Want to use descriptive filenames (e.g., `project-alpha.png`)? Switch to Option B for full control.

**Option B: Manual Control (For non-numbered names)**
- Create an `images.txt` file in the root folder
- List your image filenames in the order you want (one per line)
- Example:
  ```
  my-cover.png
  about-me.png
  project-alpha.png
  ```
- This gives you complete control over any naming scheme

### 2. Hotspots are managed in `hotspots.txt`
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

## 🔄 Update Your Portfolio (No Code)
1. **Add/remove images:** Drop files in `images/` or update `images.txt` if using manual mode
2. **Change hotspots:** Edit `hotspots.txt` to adjust clickable areas
3. **See changes:** Refresh the page—no code editing needed!

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

## 🌐 Deploy to GitHub Pages
1. Create a new GitHub repository (Public).
2. Upload these files/folders:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `hotspots.txt`
   - `images.txt` (optional - only if you want manual control)
   - `images/` (drag in all your image files)
3. In **Settings → Pages**, set **Branch: main**, **Folder: /(root)**, then Save.
4. Wait a minute, then visit `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`.

**Note:** After deployment, you can update just by uploading new images or editing the txt files—no need to touch the code!

## 🎨 Customization Tips
- Colors, fonts, or animation tweaks live in `styles.css`.
- Want to highlight a hotspot in words? Add a caption directly into the image so it stays perfectly aligned.
- Keep each image under ~5 MB for faster loading.

## 🛠️ Troubleshooting
- **Hotspots missing locally?** Run the site through a local server (see "Preview Locally").
- **A new page isn't showing?** 
  - Check that the filename has a number (e.g., `page01.png` not `mypage.png`)
  - Or create `images.txt` and list all filenames manually
  - Supported formats: PNG, JPG, JPEG, GIF, WEBP
- **Video won't play?** Make sure the YouTube link is public and copied correctly into `hotspots.txt`.
- **Images loading in wrong order?** 
  - For automatic mode: rename with consistent numbering (`01`, `02`, `03`...)
  - For precise control: create `images.txt` and list them in your preferred order
- **Hotspots too small on mobile?** They automatically scale up 3-4x on phones; test in actual device or browser dev tools mobile view.

## ❤️ Credits
Built with pure HTML, CSS, and JavaScript. Drop in new images, adjust `hotspots.txt`, and the site stays fresh with zero coding.
