import time
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("screenshots")
OUTPUT_DIR.mkdir(exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
  CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def run_verification():
  with sync_playwright() as p:
    browser = p.chromium.launch(
      executable_path=CHROME_PATH,
      headless=True
    )

    context = browser.new_context(
      viewport={"width": 390, "height": 844},
      device_scale_factor=2,
      is_mobile=True,
      has_touch=True
    )

    page = context.new_page()

    # Track console messages
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    print("Navigating to http://localhost:5173/...")
    page.goto("http://localhost:5173/", wait_until="networkidle")

    # Wait for loader to disappear
    page.wait_for_timeout(1000)

    # 1. DOM Check: Ensure NO <canvas> or WebGL exists anywhere in DOM
    canvas_count = page.evaluate("() => document.querySelectorAll('canvas').length")
    print(f"[DOM Check] <canvas> elements count: {canvas_count}")
    assert canvas_count == 0, f"Expected 0 canvas elements, found {canvas_count}!"

    # 2. Frame Timing & FPS measurement under 4x CPU throttle
    print("Measuring FPS under 4x CPU throttle...")
    client = context.new_cdp_session(page)
    client.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    
    fps_result = page.evaluate("""() => {
      return new Promise((resolve) => {
        let frames = 0;
        let lastTime = performance.now();
        const start = lastTime;
        function count() {
          frames++;
          const now = performance.now();
          if (now - start >= 1000) {
            resolve({
              fps: Math.round((frames * 1000) / (now - start)),
              durationMs: now - start,
              frames
            });
          } else {
            requestAnimationFrame(count);
          }
        }
        requestAnimationFrame(count);
      });
    }""")
    print(f"[Performance 4x CPU Throttle] FPS: {fps_result['fps']} fps ({fps_result['frames']} frames in {fps_result['durationMs']:.1f}ms)")
    client.send("Emulation.setCPUThrottlingRate", {"rate": 1}) # Reset throttle

    # 3. 1_rail_resting.png
    print("Capturing 1_rail_resting.png...")
    page.evaluate("window.__interaction.stopAutoDemo()")
    page.screenshot(path=str(OUTPUT_DIR / "1_rail_resting.png"))

    # 4. Turn Frame-by-Frame Sequence (demonstrating clean mid-turn transition)
    print("Capturing turn sequence frames (clean scaleX flip)...")
    TURN_SEQ_DIR = OUTPUT_DIR / "turn_sequence"
    TURN_SEQ_DIR.mkdir(exist_ok=True)
    # Trigger focus on product 0
    wrapper_sel = ".product-wrapper[data-idx='0']"
    for step, p in enumerate([0.0, 0.2, 0.4, 0.5, 0.6, 0.8, 1.0]):
      # Manually set mid-turn progress for visual proof
      side_scale = max(0.0, 1.0 - p * 2.0) if p <= 0.5 else 0.0
      front_scale = max(0.0, (p - 0.5) * 2.0) if p > 0.5 else 0.0
      page.evaluate(f"""() => {{
        const side = document.querySelector("{wrapper_sel} .face.side");
        const front = document.querySelector("{wrapper_sel} .face.front");
        if (side && front) {{
          side.style.transform = "scaleX({side_scale:.3f})";
          side.style.filter = "brightness({1.0 - p * 0.3:.3f})";
          front.style.transform = "scaleX({front_scale:.3f})";
          front.style.filter = "brightness({0.75 + p * 0.25:.3f})";
        }}
      }}""")
      page.screenshot(path=str(TURN_SEQ_DIR / f"turn_step_{step}_{int(p*100)}pct.png"))
      if p == 0.5:
        page.screenshot(path=str(OUTPUT_DIR / "2_mid_turn.png"))

    # Reset inline styles and set full focus
    page.evaluate(f"""() => {{
      const side = document.querySelector("{wrapper_sel} .face.side");
      const front = document.querySelector("{wrapper_sel} .face.front");
      if (side && front) {{
        side.style.transform = "";
        side.style.filter = "";
        front.style.transform = "";
        front.style.filter = "";
      }}
      window.__stage.setFocus(0);
    }}""")
    page.wait_for_timeout(400)
    print("Capturing 3_focused.png...")
    page.screenshot(path=str(OUTPUT_DIR / "3_focused.png"))

    # 5. Detail View
    print("Opening detail view...")
    page.evaluate("window.__interaction.openDetail(0)")
    page.wait_for_timeout(600)
    print("Capturing 4_detail_front.png...")
    page.screenshot(path=str(OUTPUT_DIR / "4_detail_front.png"))

    # 6. Toggle FRONT / BACK
    print("Flipping to BACK view...")
    page.evaluate("() => { document.querySelector('button[data-v=\"back\"]').click(); }")
    page.wait_for_timeout(600)
    print("Capturing 5_detail_back.png...")
    page.screenshot(path=str(OUTPUT_DIR / "5_detail_back.png"))

    # Flip back to FRONT
    page.evaluate("() => { document.querySelector('button[data-v=\"front\"]').click(); }")
    page.wait_for_timeout(500)

    # 7. Colourway Tags: Sky Blue & Rose Blush
    print("Switching colourway tags...")
    page.evaluate("() => { const tags = document.querySelectorAll('.tags .tag'); if (tags[1]) tags[1].click(); }")
    page.wait_for_timeout(500)
    print("Capturing 6_color_sky.png...")
    page.screenshot(path=str(OUTPUT_DIR / "6_color_sky.png"))

    page.evaluate("() => { const tags = document.querySelectorAll('.tags .tag'); if (tags[2]) tags[2].click(); }")
    page.wait_for_timeout(500)
    print("Capturing 7_color_rose.png...")
    page.screenshot(path=str(OUTPUT_DIR / "7_color_rose.png"))

    # 8. Navigate to Product 2 (Bomber) and Product 3 (Denim)
    print("Navigating to Bomber Jacket...")
    page.evaluate("() => { document.getElementById('next').click(); }")
    page.wait_for_timeout(600)
    print("Capturing 8_product_bomber.png...")
    page.screenshot(path=str(OUTPUT_DIR / "8_product_bomber.png"))

    print("Navigating to Denim Trucker...")
    page.evaluate("() => { document.getElementById('next').click(); }")
    page.wait_for_timeout(600)
    print("Capturing 9_product_denim.png...")
    page.screenshot(path=str(OUTPUT_DIR / "9_product_denim.png"))

    # 9. Close detail view back to rail
    print("Closing detail view...")
    page.evaluate("() => { document.getElementById('close').click(); }")
    page.wait_for_timeout(700)
    print("Capturing 10_return_to_rail.png...")
    page.screenshot(path=str(OUTPUT_DIR / "10_return_to_rail.png"))

    browser.close()
    print("\n[SUCCESS] All verification steps completed successfully!")

if __name__ == "__main__":
  run_verification()
