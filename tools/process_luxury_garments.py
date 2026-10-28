import os
import shutil
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import numpy as np
import rembg

SESSION = rembg.new_session('u2netp')

def clean_cutout(img_path):
  """Removes studio background cleanly with alpha matting and edge feathering."""
  im = Image.open(img_path).convert('RGBA')
  cutout = rembg.remove(im, session=SESSION)
  
  arr = np.array(cutout)
  # Feather edge to eliminate any harsh edge fringe
  alpha = arr[:, :, 3]
  
  # Clean edge border of 3 pixels
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
  search_w = int(w * 0.20)
  top_quarter = int(h * 0.30)

  strip = alpha[:top_quarter, center_x - search_w : center_x + search_w]
  y_indices, x_indices = np.where(strip > 90)

  if len(y_indices) > 0:
    min_idx = np.argmin(y_indices)
    hook_y = int(y_indices[min_idx])
    hook_x = int(x_indices[min_idx] + center_x - search_w)
    return hook_x, hook_y
  return w // 2, int(h * 0.09)

def align_canvas(img, target_w=900, target_h=1200, target_hook_x=450, target_hook_y=108):
  hook_x, hook_y = find_hook_apex(img)
  dx = target_hook_x - hook_x
  dy = target_hook_y - hook_y

  canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
  canvas.paste(img, (dx, dy), img)
  return canvas

def shift_colorway(base_img, r_mult, g_mult, b_mult, brightness=1.0):
  arr = np.array(base_img, dtype=np.float32)
  r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

  # Don't tint the wooden hanger if it's brown
  is_hanger = (r > 60) & (r < 135) & (g > 35) & (g < 90) & (b > 15) & (b < 65)
  is_fabric = (a > 40) & ~is_hanger

  r[is_fabric] = np.clip(r[is_fabric] * r_mult * brightness, 0, 255)
  g[is_fabric] = np.clip(g[is_fabric] * g_mult * brightness, 0, 255)
  b[is_fabric] = np.clip(b[is_fabric] * b_mult * brightness, 0, 255)

  out = np.dstack([r, g, b, a]).astype(np.uint8)
  return Image.fromarray(out, mode="RGBA")
