#!/usr/bin/env node

import { start } from "./cli";
import { config } from "./config";

if (require.main === module) {
  start(config.serverUrl).catch((error: Error) => {
    console.error("Failed to start:", error);
    process.exit(1);
  });

  process.on("uncaughtException", (reason) => {
    console.error("Unaught exception reason:", reason);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });
}
