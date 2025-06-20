import { start } from "./cli";

export { start };

// Start the process when the module is loaded
if (require.main === module) {
  start().catch((error: Error) => {
    console.error("Failed to start:", error);
    process.exit(1);
  });
}
