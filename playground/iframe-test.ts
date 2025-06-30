import { chromium } from "playwright";

(async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.addInitScript(`window.SERVER_URL="http://localhost:3000"`);
  await page.goto("http://localhost:3000/");
  await page.getByRole("textbox", { name: "Enter URL" }).click();
  await page
    .getByRole("textbox", { name: "Enter URL" })
    .fill("https://netbanking.hdfcbank.com/netbanking/");
  await page.getByRole("textbox", { name: "Enter URL" }).press("Enter");

  await new Promise((resolve) => setTimeout(resolve, 10000));
})();
