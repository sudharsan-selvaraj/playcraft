import path from "path";
import os from "os";
import fs from "fs";

export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const basePath = path.join(os.homedir(), ".cache", "playcraft");
const userDataDir = path.join(basePath, "playcraft-user-dir");

function createDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

createDir(basePath);
createDir(userDataDir);

export const config = Object.freeze({
  port: PORT,
  serverUrl: `http://localhost:${PORT}`,
  userDataDir,
});
