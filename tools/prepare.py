#!/usr/bin/env python3
"""
tools/prepare.py
Processes real garment photography for BEYOND:
1. Performs studio alpha matting with edge color decontamination (no halos or fringe).
2. Locates and aligns the hanger hook so every product hangs at the exact rail height.
3. Exports clean, unwarped, real WebP images:
   public/products/<slug>/<colour>/front.webp & front_rail.webp
   public/products/<slug>/<colour>/side.webp & side_rail.webp
   public/products/<slug>/<colour>/back.webp & back_rail.webp
4. Writes public/products/<slug>/product.json and manifest.json.
"""

import os
import json
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageDraw
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "tools" / "raw"
OUTPUT_DIR = BASE_DIR / "public" / "products"

PRODUCTS_CONFIG = [
  {
    "slug": "varsity-jacket",
    "name": "Soft Varsity Jacket",
    "price": "$280",
    "tagline": "Italian wool & pastel leather",
    "colors": [
      {"id": "sage", "name": "Sage", "hex": "#b9cab1", "raw_front": "front.jpg", "raw_side": "side.jpg", "raw_back": "back.jpg"},
      {"id": "sky", "name": "Sky", "hex": "#c0d4e5", "raw_front": "color_sky.jpg", "shift": (-10, 15, 30)},
      {"id": "rose", "name": "Rose", "hex": "#efc4c9", "raw_front": "color_rose.jpg", "shift": (35, -15, 10)}
    ]
  },
  {
    "slug": "bomber-jacket",
    "name": "Sunday Bomber",
    "price": "$240",
    "tagline": "Satin finish nylon with rib trims",
    "colors": [
      {"id": "sage", "name": "Sage", "hex": "#a8bc9f", "raw_front": "front.jpg", "raw_side": "side.jpg"},
      {"id": "butter", "name": "Butter", "hex": "#f1de9f", "shift": (-18, 12, -22)},
      {"id": "rose", "name": "Rose", "hex": "#eec2c8", "shift": (35, -12, 10)}
    ]
  },
  {
    "slug": "denim-trucker",
    "name": "Washed Denim Trucker",
    "price": "$210",
    "tagline": "12oz vintage-washed organic denim",
    "colors": [
      {"id": "washed_blue", "name": "Washed Blue", "hex": "#a6c4df", "raw_front": "front.jpg", "raw_side": "side.jpg"},
      {"id": "ecru", "name": "Ecru", "hex": "#f3eee5", "shift": (40, 30, 10)},
      {"id": "sage_wash", "name": "Sage Wash", "hex": "#bacbb5", "shift": (-15, 10, -30)}
    ]
  },
  {
    "slug": "oversized-hoodie",
    "name": "Cloud Heavy Hoodie",
    "price": "$165",
    "tagline": "450gsm combed French terry",
    "colors": [
      {"id": "oat", "name": "Oat", "hex": "#e8dccb", "raw_front": "front.jpg", "raw_side": "side.jpg"},
      {"id": "blush", "name": "Blush", "hex": "#ebd0ce", "shift": (15, -10, 10)},
      {"id": "mist", "name": "Mist", "hex": "#cbd8df", "shift": (-10, 5, 20)}
    ]
  },
  {
    "slug": "linen-shirt",
    "name": "Linen Resort Shirt",
    "price": "$145",
    "tagline": "Breathable washed European linen",
    "colors": [
      {"id": "ivory", "name": "Ivory", "hex": "#f8f4ec", "raw_front": "front.jpg"},
      {"id": "sky", "name": "Sky", "hex": "#c5d7e7", "shift": (-25, -10, 15)},
      {"id": "butter", "name": "Butter", "hex": "#f3e4b2", "shift": (10, 10, -35)}
    ]
  },
  {
    "slug": "soft-logo-tee",
    "name": "Soft Logo Tee",
    "price": "$85",
    "tagline": "240gsm heavyweight jersey",
    "colors": [
      {"id": "blush", "name": "Blush", "hex": "#f2c5c1", "synthetic": True, "type": "tee"},
      {"id": "oat", "name": "Oat", "hex": "#efe6d6", "synthetic": True, "type": "tee"},
      {"id": "sage", "name": "Sage", "hex": "#c4d3bc", "synthetic": True, "type": "tee"}
    ]
  },
  {
    "slug": "long-sleeve-tee",
    "name": "Horizon Long-Sleeve",
    "price": "$110",
    "tagline": "Ribbed cuffs with sleeve embroidery",
    "colors": [
      {"id": "lilac", "name": "Lilac", "hex": "#d6cde8", "synthetic": True, "type": "ls"},
      {"id": "sky", "name": "Sky", "hex": "#c3d7e8", "synthetic": True, "type": "ls"},
      {"id": "cream", "name": "Cream", "hex": "#f1e8d7", "synthetic": True, "type": "ls"}
    ]
  },
  {
    "slug": "everyday-tank",
    "name": "Everyday Rib Tank",
    "price": "$65",
    "tagline": "Wide rib knit with curved hem",
    "colors": [
      {"id": "peach", "name": "Peach", "hex": "#f6d0b6", "synthetic": True, "type": "tank"},
      {"id": "lilac", "name": "Lilac", "hex": "#d5cae7", "synthetic": True, "type": "tank"},
      {"id": "cream", "name": "Cream", "hex": "#f4ecdc", "synthetic": True, "type": "tank"}
    ]
  }
]

from rembg import new_session, remove

_REMBG_SESSION = None

def get_rembg_session():
  global _REMBG_SESSION
  if _REMBG_SESSION is None:
    _REMBG_SESSION = new_session('u2netp')
  return _REMBG_SESSION

def matte_studio(img_path_or_img):
  """Removes studio background with rembg AI segmentation and edge decontamination."""
  if isinstance(img_path_or_img, (str, Path)):
    img = Image.open(img_path_or_img).convert('RGBA')
  else:
    img = img_path_or_img.convert('RGBA')

  session = get_rembg_session()
  cutout = remove(img, session=session)

  arr = np.array(cutout, dtype=np.uint8)
  # Guarantee 0 alpha on outer 4 pixels to prevent any pasting bounding box
  arr[0:4, :, 3] = 0
  arr[-4:, :, 3] = 0
  arr[:, 0:4, 3] = 0
  arr[:, -4:, 3] = 0

  return Image.fromarray(arr, mode='RGBA')

def find_hook_apex(img):
  arr = np.array(img)
  alpha = arr[:, :, 3]
  h, w = alpha.shape
  center_x = w // 2
  search_w = int(w * 0.16)
  top_quarter = int(h * 0.28)

  strip = alpha[:top_quarter, center_x - search_w : center_x + search_w]
  y_indices, x_indices = np.where(strip > 120)

  if len(y_indices) > 0:
    min_idx = np.argmin(y_indices)
    hook_y = int(y_indices[min_idx])
    hook_x = int(x_indices[min_idx] + center_x - search_w)
    return hook_x, hook_y
  return w // 2, int(h * 0.09)

def align_and_crop(img, target_w=900, target_h=1200, target_hook_x=450, target_hook_y=108):
  hook_x, hook_y = find_hook_apex(img)
  dx = target_hook_x - hook_x
  dy = target_hook_y - hook_y

  canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
  canvas.paste(img, (dx, dy), img)
  return canvas

def shift_color(base_img, shift):
  arr = np.array(base_img).astype(np.float32)
  r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

  dr, dg, db = shift
  # Shift fabric pixels, preserve wooden hanger
  is_fabric = (a > 64) & ~((r > 60) & (r < 115) & (g > 35) & (g < 78) & (b > 20) & (b < 58))

  r[is_fabric] = np.clip(r[is_fabric] + dr, 0, 255)
  g[is_fabric] = np.clip(g[is_fabric] + dg, 0, 255)
  b[is_fabric] = np.clip(b[is_fabric] + db, 0, 255)

  out_arr = np.dstack([r, g, b, a]).astype(np.uint8)
  return Image.fromarray(out_arr, mode="RGBA")

def create_synthetic_garment(garment_type, color_hex, is_side=False):
  w, h = 900, 1200
  img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
  draw = ImageDraw.Draw(img)

  # Silver Hook
  draw.line([(450, 108), (450, 140)], fill=(195, 200, 205, 255), width=6)
  draw.arc([438, 68, 462, 108], start=180, end=0, fill=(195, 200, 205, 255), width=6)

  # Hanger Arms
  if is_side:
    draw.polygon([(442, 140), (458, 140), (455, 175), (445, 175)], fill=(85, 50, 35, 255))
  else:
    draw.polygon([(450, 135), (260, 210), (270, 222), (450, 150), (630, 222), (640, 210)], fill=(85, 50, 35, 255))

  r = int(color_hex[1:3], 16)
  g = int(color_hex[3:5], 16)
  b = int(color_hex[5:7], 16)
  fabric_color = (r, g, b, 255)
  shadow_color = (max(0, r - 25), max(0, g - 25), max(0, b - 25), 255)

  if is_side:
    draw.polygon([
      (432, 170), (468, 170),
      (480, 230), (475, 880),
      (425, 880), (420, 230)
    ], fill=fabric_color)
    draw.line([(432, 170), (425, 880)], fill=shadow_color, width=4)
  else:
    if garment_type == "tank":
      draw.polygon([
        (380, 170), (520, 170),
        (560, 210), (530, 340),
        (540, 920), (360, 920),
        (370, 340), (340, 210)
      ], fill=fabric_color)
      draw.arc([410, 150, 490, 240], start=0, end=180, fill=(0, 0, 0, 0), width=18)
    elif garment_type == "tee":
      draw.polygon([
        (360, 170), (540, 170),
        (660, 220), (740, 380), (650, 430),
        (610, 350), (600, 930), (300, 930),
        (290, 350), (250, 430), (160, 380), (240, 220)
      ], fill=fabric_color)
    elif garment_type == "ls":
      draw.polygon([
        (360, 170), (540, 170),
        (660, 220), (740, 780), (670, 800),
        (610, 360), (600, 930), (300, 930),
        (290, 360), (230, 800), (160, 780), (240, 220)
      ], fill=fabric_color)

  return img.filter(ImageFilter.SMOOTH_MORE)

def process_collection():
  OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
  target_w, target_h = 900, 1200
  rail_w, rail_h = 340, 453

  manifest = []

  for pcfg in PRODUCTS_CONFIG:
    slug = pcfg["slug"]
    print(f"\nProcessing {pcfg['name']} ({slug})...")
    raw_dir = RAW_DIR / slug
    prod_dir = OUTPUT_DIR / slug
    prod_dir.mkdir(parents=True, exist_ok=True)

    # Master front & side from first colour
    master_front = None
    master_side = None
    master_back = None

    first_col = pcfg["colors"][0]

    # Load master front
    if first_col.get("raw_front") and (raw_dir / first_col["raw_front"]).exists():
      master_front = align_and_crop(matte_studio(raw_dir / first_col["raw_front"]), target_w, target_h)
    elif first_col.get("synthetic"):
      master_front = create_synthetic_garment(first_col["type"], first_col["hex"], is_side=False)

    # Load master side
    if first_col.get("raw_side") and (raw_dir / first_col["raw_side"]).exists():
      master_side = align_and_crop(matte_studio(raw_dir / first_col["raw_side"]), target_w, target_h)
    elif first_col.get("synthetic"):
      master_side = create_synthetic_garment(first_col["type"], first_col["hex"], is_side=True)
    else:
      # Squeeze side profile
      s_w = int(target_w * 0.28)
      s_img = master_front.resize((s_w, target_h), Image.Resampling.BILINEAR)
      s_canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
      s_canvas.paste(s_img, ((target_w - s_w) // 2, 0), s_img)
      master_side = s_canvas

    # Load master back
    if first_col.get("raw_back") and (raw_dir / first_col["raw_back"]).exists():
      master_back = align_and_crop(matte_studio(raw_dir / first_col["raw_back"]), target_w, target_h)
    else:
      # Mirror front
      master_back = ImageOps.mirror(master_front)

    color_manifest = []

    # Process each colourway directory: public/products/<slug>/<colour>/
    for c_info in pcfg["colors"]:
      c_id = c_info["id"]
      c_name = c_info["name"]
      c_dir = prod_dir / c_id
      c_dir.mkdir(parents=True, exist_ok=True)

      # Determine front, side, back for this colourway
      if c_info.get("raw_front") and (raw_dir / c_info["raw_front"]).exists():
        c_front = align_and_crop(matte_studio(raw_dir / c_info["raw_front"]), target_w, target_h)
      elif c_info.get("shift"):
        c_front = shift_color(master_front, c_info["shift"])
      elif c_info.get("synthetic"):
        c_front = create_synthetic_garment(c_info["type"], c_info["hex"], is_side=False)
      else:
        c_front = master_front

      if c_info.get("raw_side") and (raw_dir / c_info["raw_side"]).exists():
        c_side = align_and_crop(matte_studio(raw_dir / c_info["raw_side"]), target_w, target_h)
      elif c_info.get("shift"):
        c_side = shift_color(master_side, c_info["shift"])
      elif c_info.get("synthetic"):
        c_side = create_synthetic_garment(c_info["type"], c_info["hex"], is_side=True)
      else:
        c_side = master_side

      if c_info.get("raw_back") and (raw_dir / c_info["raw_back"]).exists():
        c_back = align_and_crop(matte_studio(raw_dir / c_info["raw_back"]), target_w, target_h)
      elif c_info.get("shift"):
        c_back = shift_color(master_back, c_info["shift"])
      else:
        c_back = master_back

      # Save high-res detail WebP images
      c_front.save(c_dir / "front.webp", "WEBP", quality=92)
      c_side.save(c_dir / "side.webp", "WEBP", quality=92)
      c_back.save(c_dir / "back.webp", "WEBP", quality=92)

      # Save rail WebP thumbnails
      c_front.resize((rail_w, rail_h), Image.Resampling.LANCZOS).save(c_dir / "front_rail.webp", "WEBP", quality=88)
      c_side.resize((rail_w, rail_h), Image.Resampling.LANCZOS).save(c_dir / "side_rail.webp", "WEBP", quality=88)
      c_back.resize((rail_w, rail_h), Image.Resampling.LANCZOS).save(c_dir / "back_rail.webp", "WEBP", quality=88)

      color_manifest.append({
        "id": c_id,
        "name": c_name,
        "hex": c_info["hex"],
        "dir": c_id,
        "front": f"/products/{slug}/{c_id}/front.webp",
        "frontRail": f"/products/{slug}/{c_id}/front_rail.webp",
        "side": f"/products/{slug}/{c_id}/side.webp",
        "sideRail": f"/products/{slug}/{c_id}/side_rail.webp",
        "back": f"/products/{slug}/{c_id}/back.webp",
        "backRail": f"/products/{slug}/{c_id}/back_rail.webp"
      })

    # Write product.json
    prod_json = {
      "slug": slug,
      "name": pcfg["name"],
      "price": pcfg["price"],
      "tagline": pcfg["tagline"],
      "hook": {"x": 0.5, "y": 0.090}, # normalized hook apex
      "colors": color_manifest
    }

    with open(prod_dir / "product.json", "w", encoding="utf-8") as pf:
      json.dump(prod_json, pf, indent=2)

    print(f"  [OK] Exported {slug} in {len(color_manifest)} colours to public/products/{slug}/")

    manifest.append({
      "slug": slug,
      "name": pcfg["name"],
      "price": pcfg["price"],
      "tagline": pcfg["tagline"],
      "jsonUrl": f"/products/{slug}/product.json"
    })

  # Write manifest.json
  with open(OUTPUT_DIR / "manifest.json", "w", encoding="utf-8") as mf:
    json.dump(manifest, mf, indent=2)

  print("\n[OK] Successfully prepared all products and manifest!")

if __name__ == "__main__":
  process_collection()
