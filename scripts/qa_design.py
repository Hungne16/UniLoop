from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path("output/design-qa")
output.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for name, width, height in [("desktop", 1440, 1000), ("mobile", 390, 844)]:
        page = browser.new_page(viewport={"width": width, "height": height})
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto("http://127.0.0.1:5173/#home", wait_until="domcontentloaded")
        page.wait_for_selector(".reference-home-hero")
        page.wait_for_timeout(1400)
        page.screenshot(path=str(output / f"home-{name}.png"), full_page=True)
        overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
        print(f"home-{name}: overflow={overflow}, console_errors={len(errors)}")
        if name == "desktop":
            page.get_by_role("button", name="Mua bán").click()
            page.wait_for_timeout(700)
            page.screenshot(path=str(output / "explore-desktop.png"), full_page=True)
            print(f"explore-desktop: url={page.url}")
        else:
            page.locator(".mobile-bottom").get_by_role("button", name="Khám phá", exact=True).click()
            page.wait_for_timeout(500)
            filters = page.locator("#explore-filters")
            collapsed = not filters.is_visible()
            page.get_by_role("button", name="Bộ lọc", exact=True).click()
            expanded = filters.is_visible()
            page.screenshot(path=str(output / "explore-mobile.png"), full_page=True)
            print(f"explore-mobile: collapsed={collapsed}, expanded={expanded}")
        page.close()

    auth = browser.new_page(viewport={"width": 1280, "height": 900})
    auth.goto("http://127.0.0.1:5173/#auth", wait_until="domcontentloaded")
    auth.wait_for_selector(".auth-shell")
    auth.wait_for_timeout(900)
    auth.screenshot(path=str(output / "auth-desktop.png"), full_page=True)
    print(f"auth: headings={auth.locator('h1').count()}, buttons={auth.locator('button').count()}")
    auth.close()

    dark = browser.new_page(viewport={"width": 1440, "height": 1000})
    dark.goto("http://127.0.0.1:5173/#home", wait_until="domcontentloaded")
    dark.evaluate("localStorage.setItem('uniloop-theme:guest', 'dark')")
    dark.reload(wait_until="domcontentloaded")
    dark.wait_for_selector(".reference-home-hero")
    dark.wait_for_timeout(1000)
    dark.screenshot(path=str(output / "home-dark.png"), full_page=False)
    print(f"home-dark: theme={dark.locator('html').get_attribute('data-theme')}")
    dark.close()
    browser.close()
