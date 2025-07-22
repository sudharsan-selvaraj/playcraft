import { isPlaywrightInstalled, getIndexHtmlContent } from "./utils";
import { startServer } from "./server/index";
import sessionService from "./services/session-service";
import figlet from "figlet";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export async function start(options: {
  serverUrl: string;
  appUrl: string | undefined;
  browserType: "chromium" | "msedge" | "firefox" | "webkit";
  port?: number;
}) {
  if (!isPlaywrightInstalled()) {
    throw new Error("Dependecy Error: Playwright is not installed");
  }

  if (options.port) {
    process.env.PORT = options.port.toString();
  }

  await startServer();
  const indexHtml = getIndexHtmlContent();
  await sessionService.createSession(
    options.serverUrl,
    options.appUrl,
    indexHtml,
    options.browserType
  );

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

export function parseArgs() {
  return yargs(hideBin(process.argv))
    .usage("$0 [options]")
    .option("browser", {
      alias: "b",
      type: "string",
      choices: ["chromium", "firefox", "webkit", "msedge"],
      default: "chromium",
      describe: "Browser to use for automation",
    })
    .option("url", {
      alias: "u",
      type: "string",
      describe: "URL to open in the browser (optional)",
    })
    .option("port", {
      alias: "p",
      type: "number",
      default: 3000,
      describe: "Port for the PlayCraft server",
    })
    .help("h")
    .alias("h", "help")
    .version()
    .alias("v", "version")
    .example("$0", "Start PlayCraft with default browser (chromium)")
    .example("$0 --browser firefox", "Start PlayCraft with Firefox browser")
    .example(
      "$0 -b webkit -u https://example.com",
      "Start PlayCraft with WebKit browser and open example.com"
    )
    .example("$0 --port 8080", "Start PlayCraft server on port 8080")
    .epilog("For more information, visit: https://github.com/sudharsan-selvaraj/playcraft").argv;
}