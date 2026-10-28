import time
import os
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("screenshots/editorial_verification")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
  CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def run_verification():
  with sync_playwright() as p:
    browser = p.chromium.launch(
      executable_path=CHROME_PATH,
      headless=True
    )

    console_errors = []

    # ─────────────────────────────────────────────────────────────
    # 1. Desktop 1440px Viewport
    # ─────────────────────────────────────────────────────────────
    print("=== Testing 1: Desktop 1440x900 ===")
    ctx_desktop = browser.new_context(
      viewport={"width": 1440, "height": 900},
      device_scale_factor=1.5
    )
    page_d = ctx_desktop.new_page()
    page_d.on("console", lambda msg: console_errors.append(f"[CONSOLE {msg.type}] {msg.text}") if msg.type == "error" else None)
    page_d.on("pageerror", lambda err: console_errors.append(f"[PAGE ERROR] {err}"))

    page_d.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page_d.evaluate("window.__interaction.stopAutoDemo()")

    # 1.1 Verify Header & Top Controls
    header_styles = page_d.evaluate("""() => {
      const top = document.getElementById('topHeader');
      const logo = document.getElementById('brandLogo');
      const menu = document.getElementById('menuBtn');
      const search = document.getElementById('searchBtn');
      const bottomNav = document.getElementById('bottomNav');
      const compTop = window.getComputedStyle(top);
      const compLogo = window.getComputedStyle(logo);
      const compMenu = window.getComputedStyle(menu);
      const compSearch = window.getComputedStyle(search);
      const compBottomNav = window.getComputedStyle(bottomNav);

      const logoRect = logo.getBoundingClientRect();
      const viewportMid = window.innerWidth / 2;
      const logoMid = logoRect.left + logoRect.width / 2;

      return {
        topBackground: compTop.backgroundColor,
        topBorder: compTop.borderBottomWidth,
        logoCenteredDelta: Math.abs(viewportMid - logoMid),
        menuBg: compMenu.backgroundColor,
        searchBg: compSearch.backgroundColor,
        bottomNavDisplay: compBottomNav.display
      };
    }""")
    print("Desktop Styles Audit:", json.dumps(header_styles, indent=2))
    assert header_styles['bottomNavDisplay'] == 'none', "Desktop bottom nav must be hidden!"
    assert header_styles['logoCenteredDelta'] < 2.0, "Logo must be genuinely horizontally centered!"

    # 1.2 Hero Product Verification
    hero_info = page_d.evaluate("""() => {
      const cap = document.getElementById('cap').textContent.trim();
      const price = document.getElementById('heroPrice').textContent.trim();
      const priceSub = document.getElementById('heroPriceSub');
      const counter = document.getElementById('heroCounter').textContent.trim();
      const edition = document.getElementById('editionTag').textContent.trim();
      return {
        cap,
        price,
        priceSubVisible: priceSub ? window.getComputedStyle(priceSub).display !== 'none' : false,
        counter,
        edition
      };
    }""")
    print("Hero Info Audit:", json.dumps(hero_info, indent=2))
    assert "BOX TEE" in hero_info['cap'], f"Expected Box Tee hero, got {hero_info['cap']}"
    assert hero_info['price'] == "$85", f"Expected $85 price, got {hero_info['price']}"
    assert not hero_info['priceSubVisible'], "Fake comparison price must not be displayed!"

    # Screenshot 1: Desktop Hero
    page_d.screenshot(path=str(OUTPUT_DIR / "1_desktop_1440_hero.png"))
    print("Saved 1_desktop_1440_hero.png")

    # 1.3 Test Menu Drawer & Navigation to Saved / Bag
    page_d.click("#menuBtn")
    time.sleep(0.5)
    page_d.screenshot(path=str(OUTPUT_DIR / "2_desktop_menu_drawer.png"))
    print("Saved 2_desktop_menu_drawer.png")

    # Open Saved Pieces from Menu Drawer
    page_d.click("#menuSavedBtn")
    page_d.wait_for_selector("#savedDrawer.open", timeout=3000)
    time.sleep(0.5)
    page_d.screenshot(path=str(OUTPUT_DIR / "3_desktop_saved_drawer.png"))
    print("Saved 3_desktop_saved_drawer.png")
    page_d.click("#savedClose")
    time.sleep(0.5)

    # 1.4 Test View Piece Product Detail Reveal
    page_d.click("#avail")
    page_d.wait_for_selector(".detail-ui", timeout=3000)
    time.sleep(0.7)
    detail_data = page_d.evaluate("""() => {
      const dname = document.getElementById('dname').textContent.trim();
      const dprice = document.getElementById('dprice').textContent.trim();
      const ddesc = document.getElementById('ddesc').textContent.trim();
      return { dname, dprice, ddescLen: ddesc.length };
    }""")
    print("Detail View Audit:", json.dumps(detail_data, indent=2))
    page_d.screenshot(path=str(OUTPUT_DIR / "4_desktop_detail_reveal.png"))
    print("Saved 4_desktop_detail_reveal.png")

    # Add to Bag in Detail View
    page_d.click("#detailAddToCart")
    page_d.wait_for_selector("#cartDrawer.open", timeout=3000)
    time.sleep(0.5)
    page_d.screenshot(path=str(OUTPUT_DIR / "5_desktop_cart_drawer_added.png"))
    print("Saved 5_desktop_cart_drawer_added.png")
    page_d.click("#cartClose")
    time.sleep(0.5)

    # Close Detail View and Return to Rail
    page_d.click("#close")
    time.sleep(0.6)

    # 1.5 Drag Rail to next piece (Moto Jacket)
    page_d.evaluate("window.__stage.setFocus(1); window.__ui.updateCap(1)")
    time.sleep(0.5)
    page_d.screenshot(path=str(OUTPUT_DIR / "6_desktop_rail_drag_moto.png"))
    print("Saved 6_desktop_rail_drag_moto.png")

    ctx_desktop.close()

    # ─────────────────────────────────────────────────────────────
    # 2. Tablet 768px Viewport
    # ─────────────────────────────────────────────────────────────
    print("=== Testing 2: Tablet 768x1024 ===")
    ctx_tablet = browser.new_context(
      viewport={"width": 768, "height": 1024},
      device_scale_factor=1.5
    )
    page_t = ctx_tablet.new_page()
    page_t.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page_t.evaluate("window.__interaction.stopAutoDemo()")
    page_t.screenshot(path=str(OUTPUT_DIR / "7_tablet_768_hero.png"))
    print("Saved 7_tablet_768_hero.png")
    ctx_tablet.close()

    # ─────────────────────────────────────────────────────────────
    # 3. Mobile 390px Viewport (iPhone 14)
    # ─────────────────────────────────────────────────────────────
    print("=== Testing 3: Mobile 390x844 ===")
    ctx_mobile = browser.new_context(
      viewport={"width": 390, "height": 844},
      device_scale_factor=2,
      is_mobile=True,
      has_touch=True
    )
    page_m = ctx_mobile.new_page()
    page_m.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page_m.evaluate("window.__interaction.stopAutoDemo()")

    mobile_audit = page_m.evaluate("""() => {
      const bottomNav = document.getElementById('bottomNav');
      const logo = document.getElementById('brandLogo');
      const compBottomNav = window.getComputedStyle(bottomNav);
      const viewportMid = window.innerWidth / 2;
      const logoRect = logo.getBoundingClientRect();
      const logoMid = logoRect.left + logoRect.width / 2;

      return {
        bottomNavDisplay: compBottomNav.display,
        logoCenteredDelta: Math.abs(viewportMid - logoMid),
        hasOverflow: document.body.scrollWidth > window.innerWidth
      };
    }""")
    print("Mobile 390px Audit:", json.dumps(mobile_audit, indent=2))
    assert mobile_audit['bottomNavDisplay'] == 'flex', "Mobile bottom nav must be visible!"
    assert mobile_audit['logoCenteredDelta'] < 2.0, "Mobile logo must be genuinely centered!"
    assert not mobile_audit['hasOverflow'], "No horizontal overflow permitted on mobile!"

    page_m.screenshot(path=str(OUTPUT_DIR / "8_mobile_390_hero.png"))
    print("Saved 8_mobile_390_hero.png")

    # Mobile View Piece Detail
    page_m.click("#avail")
    time.sleep(0.7)
    page_m.screenshot(path=str(OUTPUT_DIR / "9_mobile_390_detail.png"))
    print("Saved 9_mobile_390_detail.png")
    page_m.click("#close")
    time.sleep(0.5)

    ctx_mobile.close()

    # ─────────────────────────────────────────────────────────────
    # 4. Small Mobile 360px Viewport (Android compact)
    # ─────────────────────────────────────────────────────────────
    print("=== Testing 4: Small Mobile 360x740 ===")
    ctx_small = browser.new_context(
      viewport={"width": 360, "height": 740},
      device_scale_factor=2,
      is_mobile=True,
      has_touch=True
    )
    page_s = ctx_small.new_page()
    page_s.goto("http://localhost:5173/", wait_until="networkidle")
    time.sleep(1.2)
    page_s.evaluate("window.__interaction.stopAutoDemo()")

    small_audit = page_s.evaluate("""() => {
      return {
        hasOverflow: document.body.scrollWidth > window.innerWidth,
        ctaVisible: window.getComputedStyle(document.getElementById('avail')).display !== 'none'
      };
    }""")
    print("Small Mobile 360px Audit:", json.dumps(small_audit, indent=2))
    assert not small_audit['hasOverflow'], "Small mobile must have no horizontal overflow!"
    assert small_audit['ctaVisible'], "Small mobile CTA must be visible!"

    page_s.screenshot(path=str(OUTPUT_DIR / "10_small_mobile_360_hero.png"))
    print("Saved 10_small_mobile_360_hero.png")

    ctx_small.close()
    browser.close()

    print("\n--- Console Errors Count:", len(console_errors))
    for err in console_errors:
      print("  ", err)
    assert len(console_errors) == 0, f"Found {len(console_errors)} console errors!"
    print("\n=== ALL VERIFICATION CHECKS PASSED PERFECTLY ===")

if __name__ == '__main__':
  run_verification()
