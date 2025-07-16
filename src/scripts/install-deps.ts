import { exec } from "child_process";
import { isPlaywrightInstalled } from "../utils";
import util from "util";

const execPromise = util.promisify(exec);

async function installPlaywright() {
  console.log("Installing Playwright...");
  await execPromise("npm install playwright");
}

async function downloadBrowser(browser: string) {
  console.log(`Downloading ${browser} browser via Playwright...`);
  await execPromise(`playwright install ${browser}`);
  console.log(`Playwright and ${browser.charAt(0).toUpperCase() + browser.slice(1)} installed successfully.`);
}

(async () => {
  if (!isPlaywrightInstalled()) {
    await installPlaywright();
  } else {
    console.log("Playwright is already installed.");
  }

  for (const browser of ["chromium", "firefox", "webkit"]) {
    await downloadBrowser(browser);
  }
})();