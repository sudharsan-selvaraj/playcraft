import { SessionManager } from "../session/session-manager";
import { RequestHandler } from "express";

export const listSessions: RequestHandler = async (req, res) => {
  const sessions = SessionManager.getAll();
  res.json({ sessions });
};

export const navigate: RequestHandler = async (req, res) => {
  // Return the current session id if exists
  const { url } = req.body;
  const { sessionId } = req.params;
  const session = SessionManager.get(sessionId);
  if (!session) {
    res.status(500).json({ error: "Session not initialized" });
    return;
  }
  await session.loadApplication(url);
  res.json({ sessionId: session.id });
};
