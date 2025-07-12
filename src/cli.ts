import { isPlaywrightInstalled, getIndexHtmlContent } from "./utils";
import { startServer } from "./server/index";
import sessionService from "./services/session-service";
import figlet from "figlet";

export async function start(url: string) {
  if (!isPlaywrightInstalled()) {
    throw new Error("Dependecy Error: Playwright is not installed");
  }
  await startServer();
  const indexHtml = getIndexHtmlContent();
  const browserType = process.argv[2] as "chromium" | "edge" | "firefox" | "webkit" || "chromium";
  await sessionService.createSession(url, indexHtml, browserType);

  // Beautified ready message
  try {
    const msg = figlet.textSync("PlayCraft", {
      font: "Standard",
    });
    console.log(msg);
  } catch (e) {
    // Fallback ASCII art if figlet fails
    console.log(
      `\n  ____    _                    ____                   __   _   \n |  _ \\ | |   __ _   _   _   / ___|  _ __    __ _   / _| | |_ \n | |_) | | |  / _\` | | | | | | |     | '__|  / _\` | | |_  | __|\n |  __/  | | | (_| | | |_| | | |___  | |    | (_| | |  _| | |_ \n |_|     |_|  \\__,_|  \\__, |  \\____| |_|     \\__,_| |_|    \\__|\n                      |___/                                    \n`
    );
  }
  console.log("\x1b[36mReady to play around! 🚀 \x1b[0m");
}