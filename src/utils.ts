import path from "path";
import fs from "fs";
import { JSDOM } from "jsdom";
import { chromium, firefox, webkit } from "playwright-extra";
import {Browser, Page} from "playwright";
import { http, https } from "follow-redirects";
import robot from "robotjs";

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

export async function launchBrowser(
  browserType: "chromium" | "firefox" | "edge" | "webkit" = "chromium"
): Promise<Page> {
  let browser: Browser;
  let disableIsolationTrials: string = "--disable-site-isolation-trials";
  let disableWebSecurity: string = "--disable-web-security";
  let centerWindowPosition: string = "--window-position=0,0";
  if (browserType === "chromium") {
    chromium.use(stealth);
  }
  switch (browserType) {
    case "chromium":
    default:
      browser = await chromium.launch({
        headless: false,
        args: [centerWindowPosition, disableIsolationTrials, disableWebSecurity]
      });
      break;
    case "edge":
      browser = await chromium.launch({
        headless: false,
        channel: 'msedge',
        args: [centerWindowPosition, disableIsolationTrials, disableWebSecurity]
      })
      break;
    // Firefox does not support --window-position. Any unknown argument is treated as a URL.
    case "firefox":
      browser = await firefox.launch({
        headless: false,
        args: [disableIsolationTrials, disableWebSecurity]
      });
      break;
    case "webkit":
      browser = await webkit.launch({
        headless: false,
        args: [centerWindowPosition, disableIsolationTrials, disableWebSecurity]
      });
      break;
  }

  // Get the screen size using robotjs
  const screenSize = robot.getScreenSize();
  const context = await browser.newContext({
    viewport: {
      width: screenSize.width,
      height: screenSize.height,
    },
  });
  const page = await context.newPage();

  return page;
}

export function patchHeaders(headers: Record<string, string>) {
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

export async function getRedirectUrl(url: string): Promise<string> {
  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;
    const headers = {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    const redirectUrl = (await new Promise((resolve, reject) => {
      const request = protocol.request(url, { headers }, (response: any) => {
        resolve(response.responseUrl);
      });
      request.on("error", (error: any) => {
        reject(error);
      });
      request.end();
    })) as string;
    return redirectUrl;
  } catch (err) {
    return url;
  }
}
