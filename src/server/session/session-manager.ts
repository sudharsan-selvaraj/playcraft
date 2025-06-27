import { Session } from "./session";

export class SessionManager {
  private static sessions: Map<string, Session> = new Map();

  private constructor() {}

  static add(id: string, session: Session) {
    SessionManager.sessions.set(id, session);
  }

  static get(id: string) {
    return SessionManager.sessions.get(id);
  }

  static remove(id: string) {
    SessionManager.sessions.delete(id);
  }

  static getAll() {
    return Array.from(SessionManager.sessions.values());
  }
}
