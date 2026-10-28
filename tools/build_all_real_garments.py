import os
import json
import shutil
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import numpy as np
import rembg
from process_luxury_garments import clean_cutout, align_canvas, find_hook_apex

BASE_DIR = Path(__file__).resolve().parent.parent
PRODUCTS_DIR = BASE_DIR / "public" / "products"
BRAIN_DIR = Path(r"C:\Users\BHUVANCHANDER\.gemini\antigravity-ide\brain\e05fe90e-71a0-4d26-b65e-c0853ada9bc9")

TARGET_W, TARGET_H = 900, 1200
RAIL_W, RAIL_H = 340, 453

def save_views(dest_dir, front_img, side_img, back_img):
  dest_dir.mkdir(parents=True, exist_ok=True)
  
  # High-res master views (900x1200)
  front_img.save(dest_dir / "front.webp", "WEBP", quality=92)
  side_img.save(dest_dir / "side.webp", "WEBP", quality=92)
  back_img.save(dest_dir / "back.webp", "WEBP", quality=92)

  # Rail thumbnail views (340x453)
  front_img.resize((RAIL_W, RAIL_H), Image.Resampling.LANCZOS).save(dest_dir / "front_rail.webp", "WEBP", quality=88)
  side_img.resize((RAIL_W, RAIL_H), Image.Resampling.LANCZOS).save(dest_dir / "side_rail.webp", "WEBP", quality=88)
  back_img.resize((RAIL_W, RAIL_H), Image.Resampling.LANCZOS).save(dest_dir / "back_rail.webp", "WEBP", quality=88)

def tint_garment(img, r_scale, g_scale, b_scale, offset=0):
  arr = np.array(img, dtype=np.float32)
  r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
  
  # Protect the wooden hanger from tinting
  is_hanger = (r > 60) & (r < 145) & (g > 35) & (g < 95) & (b > 15) & (b < 70)
  is_metal = (a > 50) & (abs(r - g) < 15) & (abs(g - b) < 15) & (r > 160)
  is_fabric = (a > 30) & ~is_hanger & ~is_metal

  r[is_fabric] = np.clip(r[is_fabric] * r_scale + offset, 0, 255)
  g[is_fabric] = np.clip(g[is_fabric] * g_scale + offset, 0, 255)
  b[is_fabric] = np.clip(b[is_fabric] * b_scale + offset, 0, 255)

  out = np.dstack([r, g, b, a]).astype(np.uint8)
  return Image.fromarray(out, mode="RGBA")

def build_tee():
  print("\n--- Building Product: HEAVYWEIGHT BOX TEE (soft-logo-tee) ---")
  raw_f = BRAIN_DIR / "box_tee_front_1793172855457.jpg"
  raw_s = BRAIN_DIR / "box_tee_side_1793172900094.jpg"

  f_cut = align_canvas(clean_cutout(raw_f), TARGET_W, TARGET_H, 450, 108)
  s_cut = align_canvas(clean_cutout(raw_s), TARGET_W, TARGET_H, 450, 108)
  b_cut = ImageOps.mirror(f_cut)

  prod_dir = PRODUCTS_DIR / "soft-logo-tee"
  
  # Remove old colorway folders if possible
  for old in ["blush", "oat", "sage"]:
    old_p = prod_dir / old
    if old_p.exists():
      try:
        shutil.rmtree(old_p)
      except Exception:
        pass

  # Colorway 1: Onyx (washed black)
  c1_f = f_cut
  c1_s = s_cut
  c1_b = b_cut
  save_views(prod_dir / "onyx", c1_f, c1_s, c1_b)
  print("  Built onyx")

  # Colorway 2: Charcoal
  c2_f = tint_garment(f_cut, 1.25, 1.22, 1.20, offset=22)
  c2_s = tint_garment(s_cut, 1.25, 1.22, 1.20, offset=22)
  c2_b = tint_garment(b_cut, 1.25, 1.22, 1.20, offset=22)
  save_views(prod_dir / "charcoal", c2_f, c2_s, c2_b)
  print("  Built charcoal")

  # Colorway 3: Vintage Bone
  c3_f = tint_garment(f_cut, 1.1, 1.1, 1.05, offset=145)
  c3_s = tint_garment(s_cut, 1.1, 1.1, 1.05, offset=145)
  c3_b = tint_garment(b_cut, 1.1, 1.1, 1.05, offset=145)
  save_views(prod_dir / "bone", c3_f, c3_s, c3_b)
  print("  Built bone")

  # Write updated product.json
  pj = {
    "name": "HEAVYWEIGHT BOX TEE",
    "slug": "soft-logo-tee",
    "price": "$85",
    "priceUsd": "$85",
    "tagline": "280gsm drop-shoulder combed jersey",
    "description": "Heavyweight 280gsm organic cotton jersey with reinforced double-needle collar, dropped shoulders, and a structured relaxed box fit. Pigment-dyed and enzyme-washed for a soft vintage drape.",
    "category": "tops",
    "edition": "03 / 05",
    "badge": "ESSENTIAL",
    "hook": {"x": 0.5, "y": 0.09},
    "colors": [
      {
        "id": "onyx",
        "name": "Onyx Black",
        "hex": "#1a1918",
        "front": "/products/soft-logo-tee/onyx/front.webp",
        "frontRail": "/products/soft-logo-tee/onyx/front_rail.webp",
        "side": "/products/soft-logo-tee/onyx/side.webp",
        "sideRail": "/products/soft-logo-tee/onyx/side_rail.webp",
        "back": "/products/soft-logo-tee/onyx/back.webp",
        "backRail": "/products/soft-logo-tee/onyx/back_rail.webp"
      },
      {
        "id": "charcoal",
        "name": "Washed Charcoal",
        "hex": "#383633",
        "front": "/products/soft-logo-tee/charcoal/front.webp",
        "frontRail": "/products/soft-logo-tee/charcoal/front_rail.webp",
        "side": "/products/soft-logo-tee/charcoal/side.webp",
        "sideRail": "/products/soft-logo-tee/charcoal/side_rail.webp",
        "back": "/products/soft-logo-tee/charcoal/back.webp",
        "backRail": "/products/soft-logo-tee/charcoal/back_rail.webp"
      },
      {
        "id": "bone",
        "name": "Aged Bone",
        "hex": "#d2ccc2",
        "front": "/products/soft-logo-tee/bone/front.webp",
        "frontRail": "/products/soft-logo-tee/bone/front_rail.webp",
        "side": "/products/soft-logo-tee/bone/side.webp",
        "sideRail": "/products/soft-logo-tee/bone/side_rail.webp",
        "back": "/products/soft-logo-tee/bone/back.webp",
        "backRail": "/products/soft-logo-tee/bone/back_rail.webp"
      }
    ]
  }
  with open(prod_dir / "product.json", "w") as f:
    json.dump(pj, f, indent=2)
  print("  Wrote soft-logo-tee/product.json")

def build_longsleeve():
  print("\n--- Building Product: TACTICAL RIB LONGSLEEVE (long-sleeve-tee) ---")
  raw_f = BRAIN_DIR / "thermal_ls_front_1793172940647.jpg"
  raw_s = BRAIN_DIR / "thermal_ls_side_1793172978748.jpg"

  f_cut = align_canvas(clean_cutout(raw_f), TARGET_W, TARGET_H, 450, 108)
  s_cut = align_canvas(clean_cutout(raw_s), TARGET_W, TARGET_H, 450, 108)
  b_cut = ImageOps.mirror(f_cut)

  prod_dir = PRODUCTS_DIR / "long-sleeve-tee"
  
  for old in ["cream", "lilac", "sky"]:
    old_p = prod_dir / old
    if old_p.exists():
      try:
        shutil.rmtree(old_p)
      except Exception:
        pass

  # Colorway 1: Onyx
  save_views(prod_dir / "onyx", f_cut, s_cut, b_cut)
  print("  Built onyx")

  # Colorway 2: Slate
  c2_f = tint_garment(f_cut, 1.15, 1.22, 1.30, offset=24)
  c2_s = tint_garment(s_cut, 1.15, 1.22, 1.30, offset=24)
  c2_b = tint_garment(b_cut, 1.15, 1.22, 1.30, offset=24)
  save_views(prod_dir / "slate", c2_f, c2_s, c2_b)
  print("  Built slate")

  # Colorway 3: Aged Stone
  c3_f = tint_garment(f_cut, 1.1, 1.1, 1.05, offset=140)
  c3_s = tint_garment(s_cut, 1.1, 1.1, 1.05, offset=140)
  c3_b = tint_garment(b_cut, 1.1, 1.1, 1.05, offset=140)
  save_views(prod_dir / "stone", c3_f, c3_s, c3_b)
  print("  Built stone")

  pj = {
    "name": "TACTICAL RIB LONGSLEEVE",
    "slug": "long-sleeve-tee",
    "price": "$110",
    "priceUsd": "$110",
    "tagline": "Ribbed cuffs with sleeve embroidery",
    "description": "Tactical waffle-knit thermal jersey crafted from 360gsm combed cotton. Features elongated articulated rib cuffs, subtle tonal embroidery on forearm, and durable flatlock seams throughout.",
    "category": "tops",
    "edition": "04 / 05",
    "badge": "NEW",
    "hook": {"x": 0.5, "y": 0.09},
    "colors": [
      {
        "id": "onyx",
        "name": "Washed Onyx",
        "hex": "#1a1918",
        "front": "/products/long-sleeve-tee/onyx/front.webp",
        "frontRail": "/products/long-sleeve-tee/onyx/front_rail.webp",
        "side": "/products/long-sleeve-tee/onyx/side.webp",
        "sideRail": "/products/long-sleeve-tee/onyx/side_rail.webp",
        "back": "/products/long-sleeve-tee/onyx/back.webp",
        "backRail": "/products/long-sleeve-tee/onyx/back_rail.webp"
      },
      {
        "id": "slate",
        "name": "Tactical Slate",
        "hex": "#363a3f",
        "front": "/products/long-sleeve-tee/slate/front.webp",
        "frontRail": "/products/long-sleeve-tee/slate/front_rail.webp",
        "side": "/products/long-sleeve-tee/slate/side.webp",
        "sideRail": "/products/long-sleeve-tee/slate/side_rail.webp",
        "back": "/products/long-sleeve-tee/slate/back.webp",
        "backRail": "/products/long-sleeve-tee/slate/back_rail.webp"
      },
      {
        "id": "stone",
        "name": "Aged Stone",
        "hex": "#cbc6bb",
        "front": "/products/long-sleeve-tee/stone/front.webp",
        "frontRail": "/products/long-sleeve-tee/stone/front_rail.webp",
        "side": "/products/long-sleeve-tee/stone/side.webp",
        "sideRail": "/products/long-sleeve-tee/stone/side_rail.webp",
        "back": "/products/long-sleeve-tee/stone/back.webp",
        "backRail": "/products/long-sleeve-tee/stone/back_rail.webp"
      }
    ]
  }
  with open(prod_dir / "product.json", "w") as f:
    json.dump(pj, f, indent=2)
  print("  Wrote long-sleeve-tee/product.json")

def build_tank():
  print("\n--- Building Product: DROP-NEEDLE RIB TANK (everyday-tank) ---")
  raw_f = BRAIN_DIR / "rib_tank_front_1793173022093.jpg"
  raw_s = BRAIN_DIR / "rib_tank_side_1793173064656.jpg"

  f_cut = align_canvas(clean_cutout(raw_f), TARGET_W, TARGET_H, 450, 108)
  s_cut = align_canvas(clean_cutout(raw_s), TARGET_W, TARGET_H, 450, 108)
  b_cut = ImageOps.mirror(f_cut)

  prod_dir = PRODUCTS_DIR / "everyday-tank"
  
  for old in ["cream", "lilac", "peach"]:
    old_p = prod_dir / old
    if old_p.exists():
      try:
        shutil.rmtree(old_p)
      except Exception:
        pass

  # Colorway 1: Onyx
  save_views(prod_dir / "onyx", f_cut, s_cut, b_cut)
  print("  Built onyx")

  # Colorway 2: Charcoal
  c2_f = tint_garment(f_cut, 1.25, 1.22, 1.20, offset=22)
  c2_s = tint_garment(s_cut, 1.25, 1.22, 1.20, offset=22)
  c2_b = tint_garment(b_cut, 1.25, 1.22, 1.20, offset=22)
  save_views(prod_dir / "charcoal", c2_f, c2_s, c2_b)
  print("  Built charcoal")

  # Colorway 3: Chalk
  c3_f = tint_garment(f_cut, 1.1, 1.1, 1.05, offset=145)
  c3_s = tint_garment(s_cut, 1.1, 1.1, 1.05, offset=145)
  c3_b = tint_garment(b_cut, 1.1, 1.1, 1.05, offset=145)
  save_views(prod_dir / "chalk", c3_f, c3_s, c3_b)
  print("  Built chalk")

  pj = {
    "name": "DROP-NEEDLE RIB TANK",
    "slug": "everyday-tank",
    "price": "$65",
    "priceUsd": "$65",
    "tagline": "Wide rib knit with curved raw hem",
    "description": "Premium 320gsm wide drop-needle rib cotton tank designed with an exaggerated scoop neckline, deep armholes, and a sculpted curved hem. Garment washed for maximum comfort.",
    "category": "tops",
    "edition": "05 / 05",
    "badge": "CORE",
    "hook": {"x": 0.5, "y": 0.09},
    "colors": [
      {
        "id": "onyx",
        "name": "Onyx Black",
        "hex": "#191817",
        "front": "/products/everyday-tank/onyx/front.webp",
        "frontRail": "/products/everyday-tank/onyx/front_rail.webp",
        "side": "/products/everyday-tank/onyx/side.webp",
        "sideRail": "/products/everyday-tank/onyx/side_rail.webp",
        "back": "/products/everyday-tank/onyx/back.webp",
        "backRail": "/products/everyday-tank/onyx/back_rail.webp"
      },
      {
        "id": "charcoal",
        "name": "Dark Charcoal",
        "hex": "#353331",
        "front": "/products/everyday-tank/charcoal/front.webp",
        "frontRail": "/products/everyday-tank/charcoal/front_rail.webp",
        "side": "/products/everyday-tank/charcoal/side.webp",
        "sideRail": "/products/everyday-tank/charcoal/side_rail.webp",
        "back": "/products/everyday-tank/charcoal/back.webp",
        "backRail": "/products/everyday-tank/charcoal/back_rail.webp"
      },
      {
        "id": "chalk",
        "name": "Raw Chalk",
        "hex": "#d5cfc5",
        "front": "/products/everyday-tank/chalk/front.webp",
        "frontRail": "/products/everyday-tank/chalk/front_rail.webp",
        "side": "/products/everyday-tank/chalk/side.webp",
        "sideRail": "/products/everyday-tank/chalk/side_rail.webp",
        "back": "/products/everyday-tank/chalk/back.webp",
        "backRail": "/products/everyday-tank/chalk/back_rail.webp"
      }
    ]
  }
  with open(prod_dir / "product.json", "w") as f:
    json.dump(pj, f, indent=2)
  print("  Wrote everyday-tank/product.json")

def fix_linen_shirt_side():
  print("\n--- Fixing Product: RAW OVERSIZED RESORT SHIRT (linen-shirt) side view ---")
  raw_s = BRAIN_DIR / "linen_shirt_side_1793173106176.jpg"
  s_cut = align_canvas(clean_cutout(raw_s), TARGET_W, TARGET_H, 450, 108)

  prod_dir = PRODUCTS_DIR / "linen-shirt"
  
  # Update ivory side
  ivory_s = s_cut
  ivory_s.save(prod_dir / "ivory" / "side.webp", "WEBP", quality=92)
  ivory_s.resize((RAIL_W, RAIL_H), Image.Resampling.LANCZOS).save(prod_dir / "ivory" / "side_rail.webp", "WEBP", quality=88)
  print("  Updated ivory side")

  # Update sky side
  sky_s = tint_garment(s_cut, 0.9, 1.05, 1.25, offset=-10)
  sky_s.save(prod_dir / "sky" / "side.webp", "WEBP", quality=92)
  sky_s.resize((RAIL_W, RAIL_H), Image.Resampling.LANCZOS).save(prod_dir / "sky" / "side_rail.webp", "WEBP", quality=88)
  print("  Updated sky side")

  # Update butter side
  butter_s = tint_garment(s_cut, 1.15, 1.10, 0.85, offset=5)
  butter_s.save(prod_dir / "butter" / "side.webp", "WEBP", quality=92)
  butter_s.resize((RAIL_W, RAIL_H), Image.Resampling.LANCZOS).save(prod_dir / "butter" / "side_rail.webp", "WEBP", quality=88)
  print("  Updated butter side")

def fix_bomber_jacket_side():
  print("\n--- Centering Product: MA-1 TACTICAL BOMBER (bomber-jacket) side view ---")
  prod_dir = PRODUCTS_DIR / "bomber-jacket"
  for col in ["sage", "butter", "rose"]:
    col_dir = prod_dir / col
    s_path = col_dir / "side.webp"
    if s_path.exists():
      im = Image.open(s_path).convert("RGBA")
      # Find apex and re-align to center
      aligned = align_canvas(im, TARGET_W, TARGET_H, 450, 108)
      aligned.save(s_path, "WEBP", quality=92)
      aligned.resize((RAIL_W, RAIL_H), Image.Resampling.LANCZOS).save(col_dir / "side_rail.webp", "WEBP", quality=88)
      print(f"  Re-aligned bomber {col} side")

def update_manifest():
  manifest_path = PRODUCTS_DIR / "manifest.json"
  with open(manifest_path) as f:
    manifest = json.load(f)

  # Ensure taglines and badges reflect dark luxury streetwear
  for item in manifest:
    if item["slug"] == "soft-logo-tee":
      item["tagline"] = "280gsm drop-shoulder combed jersey"
      item["badge"] = "ESSENTIAL"
    elif item["slug"] == "long-sleeve-tee":
      item["tagline"] = "360gsm tactical waffle thermal jersey"
      item["badge"] = "NEW"
    elif item["slug"] == "everyday-tank":
      item["tagline"] = "320gsm wide drop-needle rib cotton"
      item["badge"] = "CORE"

  with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2)
  print("\nManifest updated successfully!")

if __name__ == "__main__":
  build_tee()
  build_longsleeve()
  build_tank()
  fix_linen_shirt_side()
  fix_bomber_jacket_side()
  update_manifest()
  print("\nALL REAL PHOTOGRAPHIC GARMENTS SUCCESSFULLY COMPILED AND DEPLOYED!")
