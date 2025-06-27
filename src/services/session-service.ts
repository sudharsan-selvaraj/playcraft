import { Session } from "../server/session/session";
import { SessionManager } from "../server/session/session-manager";
import { launchBrowser, updateResourcePaths } from "../utils";

class SessionService {
  async createSession(url: string, injectedDOM: string = "") {
    const page = await launchBrowser();
    if (injectedDOM) {
      injectedDOM = updateResourcePaths(injectedDOM, url);
    }

    const session = new Session(page, injectedDOM, url);
    await session.init();
    SessionManager.add(session.id, session);
    return session.id;
  }
}

export default new SessionService();
