import { Router } from "express";
import { navigate, listSessions, executeCode } from "../controllers/sessionController";

const router = Router();

router.get("/", listSessions);
router.post("/:sessionId/navigate", navigate);
router.post("/:sessionId/execute", executeCode);

export default router;
