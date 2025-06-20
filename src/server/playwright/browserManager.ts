import { chromium, Page, Browser, BrowserContext } from "playwright";
import { Session } from "../session/session";
import { setSession } from "../session/currentSession";
import { JSDOM } from "jsdom";

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

function updateResourcePaths(html: string, baseUrl: string): string {
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

export async function launchAndStoreSession(
  url: string = "http://localhost:3000",
  injectedDOM: string = ""
) {
  browser = await chromium.launch({ headless: false });
  context = await browser.newContext({
    viewport: null,
  });
  page = await context.newPage();

  // If injectedDOM is provided, update its resource paths
  if (injectedDOM) {
    injectedDOM = updateResourcePaths(injectedDOM, url);
  }

  await page.goto(url);
  const session = new Session(page, injectedDOM);
  setSession(session);
}

export function getBrowser() {
  return browser;
}
export function getContext() {
  return context;
}
export function getPage() {
  return page;
}
