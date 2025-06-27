import { isPlaywrightInstalled, getIndexHtmlContent } from "./utils";
import { startServer } from "./server/index";
import sessionService from "./services/session-service";

export async function start(url: string) {
  if (!isPlaywrightInstalled()) {
    throw new Error("Dependecy Error: Playwright is not installed");
  }
  await startServer();
  const indexHtml = getIndexHtmlContent();
  await sessionService.createSession(url, indexHtml);
}
