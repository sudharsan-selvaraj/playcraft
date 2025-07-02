import { SessionManager } from "../session/session-manager";
import { RequestHandler } from "express";

export const listSessions: RequestHandler = async (req, res) => {
  const sessions = SessionManager.getAll();
  res.json({ sessions });
};

export const getSession: RequestHandler = async (req, res) => {
  const { sessionId } = req.params;
  const session = SessionManager.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session.toJSON());
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

export const executeCode: RequestHandler = async (req, res) => {
  const { sessionId } = req.params;
  const { code } = req.body;
  const session = SessionManager.get(sessionId);
  if (!session) {
    res.status(500).json({ error: "Session not initialized" });
    return;
  }
  const result = await session.executeCode(code);
  res.json({ result });
};

export const stopCodeExecution: RequestHandler = async (req, res) => {
  const { sessionId } = req.params;
  const session = SessionManager.get(sessionId);
  if (!session) {
    res.status(500).json({ error: "Session not initialized" });
    return;
  }
  await session.stopScriptExecution();
  res.json({ success: true });
};

export const testLocator: RequestHandler = async (req, res) => {
  const { sessionId } = req.params;
  const { locator } = req.body;
  const session = SessionManager.get(sessionId);
  if (!session) {
    res.status(500).json({ error: "Session not initialized" });
    return;
  }
  const result = await session.testLocator(locator);
  res.json({ result });
};
