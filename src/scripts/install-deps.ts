import { exec } from "child_process";
import { isPlaywrightInstalled } from "../utils";
import util from "util";

const execPromise = util.promisify(exec);

async function installPlaywright() {
  console.log("Installing Playwright...");
  await execPromise("npm install playwright");
}

async function downloadChromium() {
  console.log("Downloading Chromium browser via Playwright...");
  await execPromise("playwright install chromium");
}

(async () => {
  if (!isPlaywrightInstalled()) {
    await installPlaywright();
  } else {
    console.log("Playwright is already installed.");
  }
  await downloadChromium();
  console.log("Playwright and Chromium installed successfully.");
})();
