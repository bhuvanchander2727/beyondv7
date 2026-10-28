import os
from PIL import Image
import numpy as np
from process_luxury_garments import clean_cutout, align_canvas, find_hook_apex

raw_tee_front = r"C:\Users\BHUVANCHANDER\.gemini\antigravity-ide\brain\e05fe90e-71a0-4d26-b65e-c0853ada9bc9\box_tee_front_1793172855457.jpg"
raw_tee_side = r"C:\Users\BHUVANCHANDER\.gemini\antigravity-ide\brain\e05fe90e-71a0-4d26-b65e-c0853ada9bc9\box_tee_side_1793172900094.jpg"

print("Matting tee front...")
cutout_f = clean_cutout(raw_tee_front)
aligned_f = align_canvas(cutout_f, 900, 1200, 450, 108)
hook_x, hook_y = find_hook_apex(aligned_f)
print(f"Aligned front hook apex: ({hook_x}, {hook_y})")

print("Matting tee side...")
cutout_s = clean_cutout(raw_tee_side)
aligned_s = align_canvas(cutout_s, 900, 1200, 450, 108)
hook_s_x, hook_s_y = find_hook_apex(aligned_s)
print(f"Aligned side hook apex: ({hook_s_x}, {hook_s_y})")

aligned_f.save("tools/preview_tee_front.png")
aligned_s.save("tools/preview_tee_side.png")
print("Saved preview_tee_front.png and preview_tee_side.png successfully!")
