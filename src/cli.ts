import { isPlaywrightInstalled, getIndexHtmlContent } from "./utils";
import { getServerUrl, startServer } from "./server/index";
import { launchAndStoreSession } from "./server/playwright/browserManager";

export async function start(url?: string) {
  if (!isPlaywrightInstalled()) {
    console.error("Playwright is not installed");
    process.exit(1);
  }
  // Start the server first
  await startServer();

  // Get the index.html content
  const indexHtml = getIndexHtmlContent();

  // Launch browser, open app, and store session with injected DOM
  await launchAndStoreSession(url || getServerUrl(), indexHtml);
}
