import { getSession } from "../session/currentSession";
import { RequestHandler } from "express";

export const createSession: RequestHandler = async (req, res) => {
  // Return the current session id if exists
  const { url } = req.body;
  const session = getSession();
  if (!session) {
    res.status(500).json({ error: "Session not initialized" });
    return;
  }
  await session.openApp(url);
  res.json({ sessionId: session.id });
};
