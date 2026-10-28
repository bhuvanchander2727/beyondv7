import time
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("screenshots/concrete_review")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
  CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def run_tests():
  with sync_playwright() as p:
    browser = p.chromium.launch(
      executable_path=CHROME_PATH,
      headless=True
    )

    console_errors = []

    # 1. Desktop Test (1440x900)
    print("=== Testing Desktop 1440x900 ===")
    ctx_desktop = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
    page_d = ctx_desktop.new_page()
    page_d.on("pageerror", lambda err: console_errors.append(f"[Desktop Error] {err}"))
    page_d.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page_d.evaluate("window.__interaction.stopAutoDemo()")
    
    # Check background style
    bg_info = page_d.evaluate("""() => {
      const el = document.querySelector('.concrete-texture');
      const cs = window.getComputedStyle(el);
      return {
        bgImage: cs.backgroundImage,
        bgPos: cs.backgroundPosition,
        bgSize: cs.backgroundSize,
        opacity: cs.opacity,
        filter: cs.filter
      };
    }""")
    print("Desktop Background Info:", bg_info)

    page_d.screenshot(path=str(OUTPUT_DIR / "1_desktop_1440_hero.png"))
    print("Saved 1_desktop_1440_hero.png")

    # Open detail view
    page_d.evaluate("window.__interaction.openDetail(0)")
    time.sleep(0.7)
    page_d.screenshot(path=str(OUTPUT_DIR / "1_desktop_1440_detail.png"))
    print("Saved 1_desktop_1440_detail.png")
    page_d.evaluate("window.__interaction.closeDetail()")
    time.sleep(0.5)

    # 2. Tablet Test (768x1024)
    print("=== Testing Tablet 768x1024 ===")
    ctx_tablet = browser.new_context(viewport={"width": 768, "height": 1024}, device_scale_factor=2)
    page_t = ctx_tablet.new_page()
    page_t.on("pageerror", lambda err: console_errors.append(f"[Tablet Error] {err}"))
    page_t.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page_t.evaluate("window.__interaction.stopAutoDemo()")
    
    page_t.screenshot(path=str(OUTPUT_DIR / "2_tablet_768_hero.png"))
    print("Saved 2_tablet_768_hero.png")

    # 3. Mobile Test (390x844)
    print("=== Testing Mobile 390x844 ===")
    ctx_mobile = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True)
    page_m = ctx_mobile.new_page()
    page_m.on("pageerror", lambda err: console_errors.append(f"[Mobile Error] {err}"))
    page_m.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page_m.evaluate("window.__interaction.stopAutoDemo()")

    page_m.screenshot(path=str(OUTPUT_DIR / "3_mobile_390_hero.png"))
    print("Saved 3_mobile_390_hero.png")

    # Drag rail on mobile
    page_m.evaluate("window.__stage.setFocus(1); window.__ui.updateCap(1)")
    time.sleep(0.5)
    page_m.screenshot(path=str(OUTPUT_DIR / "3_mobile_390_rail_dragged.png"))
    print("Saved 3_mobile_390_rail_dragged.png")

    # Open detail view on mobile
    page_m.evaluate("window.__interaction.openDetail(1)")
    time.sleep(0.7)
    page_m.screenshot(path=str(OUTPUT_DIR / "3_mobile_390_detail.png"))
    print("Saved 3_mobile_390_detail.png")
    page_m.evaluate("window.__interaction.closeDetail()")
    time.sleep(0.5)

    # 4. Small Mobile Test (360x740)
    print("=== Testing Small Mobile 360x740 ===")
    ctx_small = browser.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=3, is_mobile=True)
    page_s = ctx_small.new_page()
    page_s.on("pageerror", lambda err: console_errors.append(f"[Small Mobile Error] {err}"))
    page_s.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page_s.evaluate("window.__interaction.stopAutoDemo()")

    page_s.screenshot(path=str(OUTPUT_DIR / "4_small_mobile_360_hero.png"))
    print("Saved 4_small_mobile_360_hero.png")

    browser.close()

    print(f"Total console page errors: {len(console_errors)}")
    for err in console_errors:
      print(f"  {err}")

if __name__ == "__main__":
  run_tests()
