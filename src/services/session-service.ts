import { Session } from "../server/session/session";
import { SessionManager } from "../server/session/session-manager";
import { launchBrowser, updateResourcePaths } from "../utils";

class SessionService {
  async createSession(
    serverUrl: string,
    appUrl: string | undefined,
    injectedDOM: string = "",
    browserType: "chromium" | "msedge" | "firefox" | "webkit" = "chromium"
  ) {
    const page = await launchBrowser(browserType);
    if (injectedDOM) {
      injectedDOM = updateResourcePaths(injectedDOM, serverUrl);
    }

    const session = new Session(page, injectedDOM, serverUrl, appUrl);
    await session.init();
    SessionManager.add(session.id, session);
    return session.id;
  }
}

export default new SessionService();
