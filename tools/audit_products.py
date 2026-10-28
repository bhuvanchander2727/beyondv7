import json
import os
from PIL import Image
import numpy as np

base = r"public/products"
with open(os.path.join(base, "manifest.json")) as f:
  manifest = json.load(f)

for item in manifest:
  slug = item["slug"]
  pj_path = os.path.join(base, slug, "product.json")
  with open(pj_path) as f:
    pj = json.load(f)
  pname = pj.get("name")
  print(f"\n=== {slug} ({pname}) ===")
  print(f"  hook: {pj.get('hook')}")
  colors = pj.get("colors", [])
  for col in colors:
    cid = col["id"]
    f_path = os.path.join(base, slug, cid, "front.webp")
    s_path = os.path.join(base, slug, cid, "side.webp")
    im_f = Image.open(f_path) if os.path.exists(f_path) else None
    im_s = Image.open(s_path) if os.path.exists(s_path) else None
    f_box = im_f.getbbox() if im_f else None
    s_box = im_s.getbbox() if im_s else None
    if im_s:
      arr_s = np.array(im_s)
      alpha_s = arr_s[:, :, 3]
      opaque_mask = alpha_s > 20
      if np.sum(opaque_mask) > 0:
        rgb_s = arr_s[:, :, :3][opaque_mask]
        std_rgb = np.std(rgb_s, axis=0)
        num_unique = len(np.unique(rgb_s, axis=0))
        print(f"    [{cid}] front bbox={f_box}, side bbox={s_box}, unique_side_colors={num_unique}, std={std_rgb.round(1)}")

    # Check top hook pixel coordinates
    if im_f:
      arr_f = np.array(im_f)
      alpha_f = arr_f[:, :, 3]
      # Find highest point of hook
      top_ys, top_xs = np.where(alpha_f > 100)
      if len(top_ys) > 0:
        min_y = np.min(top_ys)
        hook_x = top_xs[np.argmin(top_ys)]
        print(f"         front hook apex: (x={hook_x}, y={min_y})")
    if im_s:
      arr_s = np.array(im_s)
      alpha_s = arr_s[:, :, 3]
      top_ys, top_xs = np.where(alpha_s > 100)
      if len(top_ys) > 0:
        min_y = np.min(top_ys)
        hook_x = top_xs[np.argmin(top_ys)]
        print(f"         side hook apex: (x={hook_x}, y={min_y})")
