import { Router } from "express";
import { createSession } from "../controllers/sessionController";

const router = Router();

// Note: The full path will be /api/session since we mounted all routes under /api
router.post("/", createSession);

export default router;
