import { Router, RequestHandler } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Map of commonly requested playwright type files
const TYPE_FILES_MAP: Record<string, string> = {
  "types.d.ts": "playwright-core/types/types.d.ts",
  "test.d.ts": "playwright/types/test.d.ts",
  "index.d.ts": "playwright-core/index.d.ts",
  "structs.d.ts": "playwright-core/types/structs.d.ts",
  "protocol.d.ts": "playwright-core/types/protocol.d.ts",
};

// Serve playwright type definitions
const getPlaywrightTypes: RequestHandler = (req, res) => {
  try {
    const { filename } = req.params;

    // Check if the requested file is in our allowed list
    if (!TYPE_FILES_MAP[filename]) {
      res.status(404).json({ error: "Type file not found" });
      return;
    }

    // Resolve the path to the type file in node_modules
    const typePath = path.resolve(process.cwd(), "node_modules", TYPE_FILES_MAP[filename]);

    // Check if file exists
    if (!fs.existsSync(typePath)) {
      res.status(404).json({ error: "Type file not found on disk" });
      return;
    }

    // Read and serve the file
    const typeContent = fs.readFileSync(typePath, "utf8");

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.send(typeContent);
  } catch (error) {
    console.error("Error serving playwright types:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/types/:filename", getPlaywrightTypes);

export default router;
