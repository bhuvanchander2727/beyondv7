# BEYOND — Mobile Hero Experience (Photographic Product Turn Engine)

A mobile-first, luxury e-commerce hero experience for the **BEYOND** clothing store. Built with **Vite** and vanilla ES modules. The experience replaces the flat SVG garments and broken procedural meshes with **photorealistic, studio-shot product imagery and a smooth 24-frame spring-scrubbed turn sequence** (side-on profile to front) with resting pendulum sway, sliding hooks, detail view orbit with inertia, pinch-zoom, and hanging colorway tags.

> **Note on Concept Products:** The products currently displayed are AI-generated concept studio photographs produced specifically for this collection. They can be replaced with real physical studio photography by dropping images into `tools/raw/<slug>/` and running `python tools/prepare.py`.

---

## 🌟 Key Features

1. **Photographic Products on a Brushed-Steel Rail**:
   - 8 products hanging on real dark walnut wooden hangers with silver hooks.
   - Every product's hook apex is calibrated and aligned to the brushed-steel rail rod.
   - Resting state: all products hang **side-on** (showing profile and sleeve) with an organic ±1.1° pendulum sway (phase-offset per item).
   - Rail drift: On mobile (390px / 360px), products remain in view while the rail gently drifts to keep the active product centered.

2. **Clean Mid-Turn Transition (No Fake Morphing/Ghosting)**:
   - Touching or sliding along the rail focuses the item under your finger.
   - The focused garment executes a clean mid-turn transition: `side.webp` scales horizontally down to 0 around the hanger's center line (ease-in, ~0.24 s) with a subtle dimming, while `front.webp` scales up from 0 to 1 (ease-out, ~0.32 s).
   - Zero interpolated, morphed, or cross-faded in-betweens: garments never ghost or double-edge over each other.
   - Soft contact drop-shadow follows the garment against the seamless wall.

3. **Detail View**:
   - Tapping the focused item opens detail view: the rail and other items blur into ghosts while the selected garment transitions to center stage.
   - **Interactive Parallax Tilt**: Dragging horizontally or tilting the device applies a gentle, subtle 3D parallax tilt (up to ±14°).
   - **180° FRONT / BACK 3D Flip**: Quick flip between the real front and back photographs with backface culling.
   - **Hanging Colourway Tags**: 3 swaying tags that instantly swap the product to that colorway's real photographs with a clean cross-fade.
   - **Swipe Gestures**: Swipe left/right switches products; swipe down closes back to the rail.

4. **Auto-Demo**:
   - Until first user touch, the hero cycles focus across the rail every 2.4s.

5. **Performance**:
   - Ultra-lightweight bundle: JavaScript bundle is only **16.6 KB** (4.9 KB gzipped).
   - Zero runtime 3D physics, WebGL, or Canvas overhead.
   - Measured **59 FPS** under 4× CPU throttling.
   - Progressive preloading with `img.decode()` for instant, stutter-free display.

---

## 📁 Project Structure

```
BEYONDv7/
├── index.html                   # Mobile-first app container, rail, stage, and UI overlays
├── package.json                 # Scripts and dependencies (Vite)
├── PRODUCT_PROMPTS.md           # Exact image generation prompts for all products & angles
├── README.md                    # Documentation, workflow, and customization guide
├── legacy/
│   └── index.html               # Original 2D prototype (backed up for reference)
├── screenshots/                 # Playwright 390×844 (DPR 2) verification screenshots
├── tools/
│   ├── prepare.py               # AI matte (rembg u2netp), hook apex alignment, WebP export
│   ├── verify_screenshots.py    # Playwright automated test suite (DOM checks, FPS, screenshots)
│   ├── check_purge.py           # Grep verification script confirming 0 WebGL/Three.js code
│   └── raw/                     # Master photographic assets per product
│       ├── varsity-jacket/      # Front, side 90°, 30° three-quarter, back, sky & rose colourways
│       ├── bomber-jacket/       # Front & side 90° photos
│       ├── denim-trucker/       # Front & side 90° photos
│       ├── oversized-hoodie/    # Front & side 90° photos
│       ├── linen-shirt/         # Front photo
│       ├── soft-logo-tee/       # Synthetic studio assets
│       ├── long-sleeve-tee/     # Synthetic studio assets
│       └── everyday-tank/       # Synthetic studio assets
├── public/
│   └── products/
│       ├── manifest.json        # Collection catalog metadata
│       └── <slug>/
│           ├── product.json     # Name, price, hook coordinate, colourways list
│           └── <colour>/
│               ├── front.webp   # Detail front view (900x1200)
│               ├── side.webp    # Detail side view (900x1200)
│               ├── back.webp    # Detail back view (900x1200)
│               ├── front_rail.webp # Rail thumbnail (340x453)
│               ├── side_rail.webp  # Rail thumbnail (340x453)
│               └── back_rail.webp  # Rail thumbnail (340x453)
└── src/
    ├── main.js                  # App bootstrap, asset loading, and 60fps render loop
    ├── stage.js                 # 8 products on rail, hook alignment, clean mid-turn, sway
    ├── interaction.js           # Rail slide, touch impulse, tilt parallax, swipes, gyro
    ├── ui.js                    # Captions, price, FRONT/BACK toggle, swaying color tags, marquee
    ├── products.js              # Manifest loader and img.decode() preloader
    └── style.css                # Mobile-first CSS, pastel gradients, typography, and animations
```

---

## 🚀 Running the Project

### Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser. Set mobile emulation (iPhone 14 / 15 at 390×844 or 360×640).

### Automated Acceptance & Screenshot Verification
```bash
python tools/verify_screenshots.py
```
Validates:
1. DOM check for 0 `<canvas>` / WebGL elements.
2. 59 FPS frame rate under 4× CPU throttling.
3. Captures all 10 DPR 2 screenshots to `screenshots/`.

### Production Build
```bash
npm run build
npm run preview
```

---

## 📸 How to Add a New Product or Replace with Real Photos

1. **Place raw studio photographs** into `tools/raw/<slug>/`:
   - `front.jpg` (front view, hanging on dark walnut hanger)
   - `side.jpg` (90° side profile)
   - `back.jpg` (rear view with branding / details)
   - `color_<name>.jpg` (optional alternate colourways)

2. **Add product configuration** in `tools/prepare.py` inside `PRODUCTS_CONFIG`:
   ```python
   {
     "slug": "knit-cardigan",
     "name": "Chunky Knit Cardigan",
     "price": "$195",
     "tagline": "Italian spun merino wool",
     "colors": [
       {"id": "oat", "name": "Oat", "hex": "#e8dccb", "raw_front": "front.jpg", "raw_side": "side.jpg"},
       {"id": "sage", "name": "Sage", "hex": "#b9cab1", "shift": (-15, 10, -20)}
     ]
   }
   ```

3. **Run the preparation script**:
   ```bash
   python tools/prepare.py
   ```
   The script automatically:
   - Removes background using AI segmentation (`rembg u2netp`).
   - Clears outer borders and decontaminates edge colors.
   - Detects the silver hook apex to ensure alignment across all products.
   - Exports rail (340×453) and detail (900×1200) WebP images into `public/products/<slug>/<colour>/`.
   - Writes `public/products/<slug>/product.json` and updates `manifest.json`.

---

## 🎨 Image Generation Prompts
See [`PRODUCT_PROMPTS.md`](./PRODUCT_PROMPTS.md) for the exact prompts used to generate the collection.

---

## ⚡ Performance Summary
- **First Load JS**: 16.6 KB (4.95 KB gzip).
- **CSS**: 13.27 KB (3.2 KB gzip).
- **Total Initial Page Weight**: ~285 KB (HTML + CSS + JS + 8 rail thumbnails + 1 active front image).
- **Frame Rate**: 59 FPS under 4× CPU throttling.
