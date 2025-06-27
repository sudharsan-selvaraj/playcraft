import { Router } from "express";
import { navigate, listSessions } from "../controllers/sessionController";

const router = Router();

router.get("/", listSessions);
router.post("/:sessionId/navigate", navigate);

export default router;
