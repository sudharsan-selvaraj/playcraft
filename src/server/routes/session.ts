import { Router } from "express";
import {
  navigate,
  listSessions,
  executeCode,
  testLocator,
  getSession,
  stopCodeExecution,
} from "../controllers/sessionController";

const router = Router();

router.get("/", listSessions);
router.get("/:sessionId", getSession);
router.post("/:sessionId/navigate", navigate);
router.post("/:sessionId/execute", executeCode);
router.post("/:sessionId/stop", stopCodeExecution);
router.post("/:sessionId/locator-test", testLocator);

export default router;
