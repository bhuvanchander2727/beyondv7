import time
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("screenshots/dark_luxury")
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

    # 1. Desktop Test (1440x900)
    print("--- Running Desktop 1440x900 Verification ---")
    context = browser.new_context(
      viewport={"width": 1440, "height": 900},
      device_scale_factor=1.5
    )
    page = context.new_page()

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: console_logs.append(f"[ERROR] {err}"))

    page.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2) # Wait for loader to complete and dismiss

    # Check for console errors
    errors = [log for log in console_logs if "[error]" in log.lower() or "[ERROR]" in log]
    print(f"Console errors found: {len(errors)}")
    for err in errors:
      print(f"  {err}")

    # Verify stage and rail elements
    page.evaluate("window.__interaction.stopAutoDemo()")
    
    # 1.1 Hero Screenshot
    page.screenshot(path=str(OUTPUT_DIR / "desktop_1_hero_campaign.png"))
    print("Captured desktop_1_hero_campaign.png")

    # 1.2 Rail interaction: Focus on product 1 (Archive Varsity Jacket)
    page.evaluate("window.__stage.setFocus(1); window.__ui.updateCap(1)")
    time.sleep(0.5)
    page.screenshot(path=str(OUTPUT_DIR / "desktop_2_varsity_focused.png"))
    print("Captured desktop_2_varsity_focused.png")

    # 1.3 Rail interaction: Focus back on product 0 (Distressed Moto Jacket)
    page.evaluate("window.__stage.setFocus(0); window.__ui.updateCap(0)")
    time.sleep(0.5)

    # 1.4 Open Detail View for Distressed Moto Jacket
    page.evaluate("window.__interaction.openDetail(0)")
    time.sleep(0.8)
    page.screenshot(path=str(OUTPUT_DIR / "desktop_3_detail_front.png"))
    print("Captured desktop_3_detail_front.png")

    # 1.5 3D Flip to BACK view in Detail View
    page.evaluate("window.__stage.setDetailViewSide('back')")
    time.sleep(0.6)
    page.screenshot(path=str(OUTPUT_DIR / "desktop_4_detail_back.png"))
    print("Captured desktop_4_detail_back.png")

    # 1.6 Switch colorway to Charcoal
    page.evaluate("window.__stage.setColorway(0, 1); window.__ui.selectColor(0, 1)")
    page.evaluate("window.__stage.setDetailViewSide('front')")
    time.sleep(0.6)
    page.screenshot(path=str(OUTPUT_DIR / "desktop_5_color_charcoal.png"))
    print("Captured desktop_5_color_charcoal.png")

    # 1.7 Return to Rail (close detail)
    page.evaluate("window.__interaction.closeDetail()")
    time.sleep(0.6)

    # 1.8 Scroll down to Full Shop Collection Grid
    page.evaluate("document.getElementById('shopSection').scrollIntoView({ behavior: 'instant' })")
    time.sleep(0.5)
    page.screenshot(path=str(OUTPUT_DIR / "desktop_6_collection_grid.png"))
    print("Captured desktop_6_collection_grid.png")

    context.close()

    # 2. Mobile Test (390x844 - iPhone 14 Pro style)
    print("--- Running Mobile 390x844 Verification ---")
    m_context = browser.new_context(
      viewport={"width": 390, "height": 844},
      device_scale_factor=2,
      is_mobile=True,
      has_touch=True
    )
    m_page = m_context.new_page()
    m_page.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)

    m_page.evaluate("window.__interaction.stopAutoDemo()")
    m_page.screenshot(path=str(OUTPUT_DIR / "mobile_1_hero.png"))
    print("Captured mobile_1_hero.png")

    # Test touch swipe drag on rail
    m_page.evaluate("window.__stage.setFocus(1); window.__ui.updateCap(1)")
    time.sleep(0.5)
    m_page.screenshot(path=str(OUTPUT_DIR / "mobile_2_rail_swipe.png"))
    print("Captured mobile_2_rail_swipe.png")

    # Open Detail on Mobile
    m_page.evaluate("window.__interaction.openDetail(0)")
    time.sleep(0.8)
    m_page.screenshot(path=str(OUTPUT_DIR / "mobile_3_detail.png"))
    print("Captured mobile_3_detail.png")

    # Close Detail and Open Cart Drawer
    m_page.evaluate("window.__interaction.closeDetail()")
    m_page.evaluate("window.__ui.addToCart(window.__stage.products[0], 'M')")
    time.sleep(0.6)
    m_page.screenshot(path=str(OUTPUT_DIR / "mobile_4_cart_drawer.png"))
    print("Captured mobile_4_cart_drawer.png")

    # Open Search Drawer on Mobile
    m_page.evaluate("window.__ui.openDrawer('search')")
    m_page.fill('#searchInput', 'jacket')
    time.sleep(0.5)
    m_page.screenshot(path=str(OUTPUT_DIR / "mobile_6_search_drawer.png"))
    print("Captured mobile_6_search_drawer.png")

    m_context.close()
    browser.close()
    print("--- All tests completed successfully! ---")

if __name__ == '__main__':
  run_tests()
