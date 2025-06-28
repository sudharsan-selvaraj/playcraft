import { Router } from "express";
import { navigate, listSessions, executeCode, testLocator } from "../controllers/sessionController";

const router = Router();

router.get("/", listSessions);
router.post("/:sessionId/navigate", navigate);
router.post("/:sessionId/execute", executeCode);
router.post("/:sessionId/locator-test", testLocator);

export default router;
