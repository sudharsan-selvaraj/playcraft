import path from "path";
import fs from "fs";
import { JSDOM } from "jsdom";
import { chromium } from "playwright-extra";
const stealth = require("puppeteer-extra-plugin-stealth")();

export function isPlaywrightInstalled() {
  try {
    require.resolve("playwright");
    return true;
  } catch (e) {
    return false;
  }
}

export function isSameDomain(url1: string, url2: string): boolean {
  try {
    return new URL(url1).hostname === new URL(url2).hostname;
  } catch {
    return false;
  }
}

export function getIndexHtmlPath(): string {
  return path.join(__dirname, "../lib/public/index.html");
}

export function getIndexHtmlContent(): string {
  return fs.readFileSync(getIndexHtmlPath(), "utf-8");
}

export function updateResourcePaths(html: string, baseUrl: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Update script src
  document.querySelectorAll("script[src]").forEach((script: Element) => {
    const src = script.getAttribute("src");
    if (src && src.startsWith("/")) {
      script.setAttribute("src", `${baseUrl}${src}`);
    }
  });

  // Update link href
  document.querySelectorAll("link[href]").forEach((link: Element) => {
    const href = link.getAttribute("href");
    if (href && href.startsWith("/")) {
      link.setAttribute("href", `${baseUrl}${href}`);
    }
  });

  // Update img src
  document.querySelectorAll("img[src]").forEach((img: Element) => {
    const src = img.getAttribute("src");
    if (src && src.startsWith("/")) {
      img.setAttribute("src", `${baseUrl}${src}`);
    }
  });

  return dom.serialize();
}

export async function launchBrowser() {
  chromium.use(stealth);
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-site-isolation-trials", "--disable-web-security"],
  });
  const context = await browser.newContext({
    viewport: null,
  });
  const page = await context.newPage();

  return page;
}

export function patchHeaders(headers: Record<string, string>, serverUrl: string) {
  let isHeaderUpdated = false;
  const frameAncestorsRegex = /frame-ancestors\s+[^;]+;?/gi;
  if (
    headers["content-security-policy"] &&
    frameAncestorsRegex.test(headers["content-security-policy"])
  ) {
    headers["content-security-policy"] = headers["content-security-policy"].replace(
      frameAncestorsRegex,
      "frame-ancestors *;"
    );
    isHeaderUpdated = true;
  }

  if (headers["x-frame-options"]) {
    delete headers["x-frame-options"];
    isHeaderUpdated = true;
  }
  return isHeaderUpdated;
}
