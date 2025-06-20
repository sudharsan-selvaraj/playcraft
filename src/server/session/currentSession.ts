import { Session } from "./session";

let currentSession: Session | null = null;

export function setSession(session: Session) {
  currentSession = session;
}

export function getSession(): Session | null {
  return currentSession;
}
