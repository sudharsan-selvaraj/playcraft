import { start } from "./cli";
import { config } from "./config";

if (require.main === module) {
  start(config.serverUrl).catch((error: Error) => {
    console.error("Failed to start:", error);
    process.exit(1);
  });
}
