const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const PAGE_URL = "file://" + path.join(__dirname, "index.html");
const OUT_DIR = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

(async () => {
  const browser = await chromium.launch();
  const consoleIssues = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.on("console", (msg) => {
      if (["error", "warning"].includes(msg.type())) {
        consoleIssues.push(`[${vp.name}] ${msg.type()}: ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => consoleIssues.push(`[${vp.name}] pageerror: ${err.message}`));

    await page.goto(PAGE_URL);
    await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}.png`), fullPage: true });

    // Check for horizontal overflow (content wider than viewport)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) consoleIssues.push(`[${vp.name}] horizontal overflow: ${overflow}px`);

    // Exercise the nav toggle on mobile/tablet
    if (vp.name !== "desktop") {
      const toggle = await page.$("#navToggle");
      if (toggle) {
        await toggle.click();
        await page.screenshot({ path: path.join(OUT_DIR, `${vp.name}-nav-open.png`), fullPage: true });
        const isVisible = await page.isVisible("#navLinks");
        consoleIssues.push(`[${vp.name}] nav toggle click -> #navLinks visible: ${isVisible}`);
      }
    }

    await page.close();
  }

  await browser.close();

  console.log("--- Console/page issues ---");
  console.log(consoleIssues.length ? consoleIssues.join("\n") : "(none)");
  console.log("--- Screenshots written to", OUT_DIR, "---");
})();
