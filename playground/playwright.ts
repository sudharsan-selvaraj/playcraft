import { chromium } from "playwright";

(async () => {
  const server = await chromium.launchServer({
    headless: false,
    tracesDir: "traces",
  });
  const browser = await chromium.connect(server.wsEndpoint(), {});
  const context = await browser.newContext();
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  const frame = await page.frame({ name: "aut-frame" });
  await frame?.waitForLoadState("domcontentloaded");
  console.log(await frame?.url());

  page.on("framenavigated", (f) => {
    if (f === frame) {
      console.log(f.url());
    }
  });
  await frame?.goto("https://www.playwright.dev/");
  await context.tracing.stop();
  await page.close();
  await browser.close();
  await server.close();
})();
