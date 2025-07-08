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

async function downloadFirefox() {
  console.log("Downloading Firefox browser via Playwright...");
  await execPromise("playwright install firefox");
}

async function downloadWebKit() {
  console.log("Downloading Webkit browser via Playwright...");
  await execPromise("playwright install webkit");
}

(async () => {
  if (!isPlaywrightInstalled()) {
    await installPlaywright();
  } else {
    console.log("Playwright is already installed.");
  }
  await downloadChromium();
  console.log("Playwright and Chromium installed successfully.");

  await downloadFirefox();
  console.log("Playwright and Firefox installed successfully.");
  
  await downloadWebKit();
  console.log("Playwright and Webkit installed successfully.");
})();
