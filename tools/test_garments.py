import time
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("screenshots/garment_review")
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
    print("=== Testing Desktop 1440x900 Rail Products ===")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
    page = ctx.new_page()
    page.on("pageerror", lambda err: console_errors.append(f"[Error] {err}"))
    page.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page.evaluate("window.__interaction.stopAutoDemo()")

    # 1.1 Overview: Focus on Denim Trucker (pos 3)
    page.evaluate("window.__stage.setFocus(3); window.__ui.updateCap(3)")
    time.sleep(0.6)
    page.screenshot(path=str(OUTPUT_DIR / "1_desktop_denim_trucker.png"))
    print("Saved 1_desktop_denim_trucker.png")

    # 1.2 Focus on Box Tee (pos 6) - previously flat pink strip!
    page.evaluate("window.__stage.setFocus(6); window.__ui.updateCap(6)")
    time.sleep(0.6)
    page.screenshot(path=str(OUTPUT_DIR / "2_desktop_box_tee_focused.png"))
    print("Saved 2_desktop_box_tee_focused.png")

    # 1.3 Focus on Tactical Longsleeve (pos 7) - previously lilac strip!
    page.evaluate("window.__stage.setFocus(7); window.__ui.updateCap(7)")
    time.sleep(0.6)
    page.screenshot(path=str(OUTPUT_DIR / "3_desktop_longsleeve_focused.png"))
    print("Saved 3_desktop_longsleeve_focused.png")

    # 1.4 Focus on Rib Tank (pos 8) - previously peach strip!
    page.evaluate("window.__stage.setFocus(8); window.__ui.updateCap(8)")
    time.sleep(0.6)
    page.screenshot(path=str(OUTPUT_DIR / "4_desktop_tank_focused.png"))
    print("Saved 4_desktop_tank_focused.png")

    # 1.5 Focus on Linen Shirt (pos 5) - verify realistic side profile
    page.evaluate("window.__stage.setFocus(4); window.__ui.updateCap(4)") # hoodie focused, linen shirt in side view!
    time.sleep(0.6)
    page.screenshot(path=str(OUTPUT_DIR / "5_desktop_linen_shirt_side_profile.png"))
    print("Saved 5_desktop_linen_shirt_side_profile.png")

    # 1.6 Open Detail View on Box Tee
    page.evaluate("window.__interaction.openDetail(6)")
    time.sleep(0.7)
    page.screenshot(path=str(OUTPUT_DIR / "6_desktop_box_tee_detail.png"))
    print("Saved 6_desktop_box_tee_detail.png")
    page.evaluate("window.__interaction.closeDetail()")
    time.sleep(0.5)

    # 2. Mobile Test (390x844)
    print("=== Testing Mobile 390x844 Rail Products ===")
    ctx_m = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True)
    page_m = ctx_m.new_page()
    page_m.on("pageerror", lambda err: console_errors.append(f"[Mobile Error] {err}"))
    page_m.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page_m.evaluate("window.__interaction.stopAutoDemo()")

    # Focus on Box Tee on mobile
    page_m.evaluate("window.__stage.setFocus(6); window.__ui.updateCap(6)")
    time.sleep(0.6)
    page_m.screenshot(path=str(OUTPUT_DIR / "7_mobile_box_tee.png"))
    print("Saved 7_mobile_box_tee.png")

    # Focus on Tactical Longsleeve on mobile
    page_m.evaluate("window.__stage.setFocus(7); window.__ui.updateCap(7)")
    time.sleep(0.6)
    page_m.screenshot(path=str(OUTPUT_DIR / "8_mobile_longsleeve.png"))
    print("Saved 8_mobile_longsleeve.png")

    browser.close()

    print(f"\nTotal Console Page Errors: {len(console_errors)}")
    for err in console_errors:
      print(f"  {err}")

if __name__ == "__main__":
  run_tests()
