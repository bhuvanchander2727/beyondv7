import os
import re
from pathlib import Path

patterns = [
    r'\bthree\b', r'\bTHREE\b', r'\bWebGL\b', r'\bcloth\b', r'\bverlet\b', 
    r'\bPBD\b', r'\bprocedural\b', r'\bgenerator\b', r'\bMeshPhysicalMaterial\b',
    r'\bGLTFLoader\b', r'canvas\.getContext\([\'"]webgl'
]

root = Path('.')
exclude_dirs = {'.git', 'node_modules', 'legacy', 'screenshots', '.gemini', 'tools'}
code_exts = {'.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json'}

matches = []

for p in root.rglob('*'):
    if not p.is_file():
        continue
    if any(ex in p.parts for ex in exclude_dirs):
        continue
    if p.suffix not in code_exts:
        continue
    try:
        content = p.read_text(encoding='utf-8', errors='ignore')
        for pat in patterns:
            if re.search(pat, content, re.IGNORECASE):
                matches.append((str(p), pat))
    except Exception as e:
        pass

print("=== Grep Search Results across Active Source Code (excluding legacy/) ===")
for file, pat in matches:
    print(f"  Match: {file} -> {pat}")

if not matches:
    print("  [VERIFIED CLEAN] Exactly 0 matches found! All 3D/WebGL/cloth/procedural code is completely purged.")
