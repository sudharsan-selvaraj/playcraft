#!/usr/bin/env node

import { start, parseArgs } from "./cli";
import { config } from "./config";

if (require.main === module) {
  (async () => {
    try {
      const argv = await parseArgs();

      await start({
        serverUrl: config.serverUrl,
        appUrl: argv.url,
        browserType: argv.browser as "chromium" | "msedge" | "firefox" | "webkit",
        port: argv.port,
      });
    } catch (error: unknown) {
      console.error("Failed to start:", error);
      process.exit(1);
    }
  })();

  process.on("uncaughtException", (reason) => {
    console.error("Unaught exception reason:", reason);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });
}
