import path from "path";
import fs from "fs";

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
