import { Page, Route, Request, Frame } from "playwright";
import { JSDOM } from "jsdom";
import { isSameDomain, patchHeaders } from "../../utils";
import { CodeExecutor } from "./executor";

const IFRAME_NAME = "aut-frame";
const DEFAULT_APP_URL = "https://www.playwright.dev/";

export class Session {
  private _id: string;
  private code: string = "";
  private appUrl: string = "";
  private codeExecutor: CodeExecutor;

  constructor(private page: Page, private injectedDOM: string, private serverUrl: string) {
    this._id = crypto.randomUUID();
    this.codeExecutor = new CodeExecutor({
      session: this,
    });
  }

  public async init() {
    this.page.addInitScript(``);
    this.page.route("**/*", this.onRequestMade.bind(this));

    await this.loadApplication();
  }

  setCode(code: string) {
    this.code = code;
  }

  getCode() {
    return this.code;
  }

  get id() {
    return this._id;
  }

  public getFrame() {
    return this.frame;
  }

  public getPage() {
    return this.page;
  }

  public async executeCode(code: string) {
    return await this.codeExecutor.execute(code);
  }

  private get frame() {
    return this.page.frame(IFRAME_NAME);
  }

  private async navigateTo(url: string) {
    await this.page.goto(new URL(url).origin, { waitUntil: "networkidle" });
    await this.page.waitForSelector(`iframe[name='${IFRAME_NAME}']`);
  }

  async loadApplication(appUrl?: string) {
    this.appUrl = appUrl || DEFAULT_APP_URL;
    /**
     * If the frame is already loaded, we can use it to load the application
     * else, this is the first time we are loading the application
     */
    if (appUrl && this.frame) {
      try {
        await this.frame.goto(appUrl);
      } catch (err) {
        await this.navigateTo(appUrl);
      }
    } else {
      await this.page.goto(this.serverUrl);
    }
  }

  private patchDOM(html: string, appUrl: string) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.innerHTML = `
      window.APP_URL = "${appUrl}";
      window.SESSION_ID = "${this._id}";
      window.SERVER_URL = "${this.serverUrl}";
    `;
    document.head.appendChild(script);
    return dom.serialize();
  }

  private async onRequestMade(route: Route, request: Request) {
    try {
      const isMainFrame = request.frame() === this.page.mainFrame();
      if (isMainFrame && request.resourceType() === "document") {
        await route.fulfill({
          body: this.patchDOM(this.injectedDOM, this.appUrl),
          headers: {
            "Content-Type": "text/html",
          },
          status: 200,
        });
      } else if (
        isMainFrame &&
        !isSameDomain(request.url(), this.serverUrl) &&
        request.url().includes("assets")
      ) {
        try {
          const originalUrl = new URL(request.url());
          const serverOrigin = new URL(this.serverUrl).origin;
          const newUrl =
            serverOrigin + originalUrl.pathname + originalUrl.search + originalUrl.hash;
          const response = await fetch(newUrl);
          const body = Buffer.from(await response.arrayBuffer());
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          await route.fulfill({
            status: response.status,
            headers,
            body,
          });
        } catch (err) {
          return await route.continue();
        }
      } else if (!isMainFrame && request.resourceType() === "document") {
        const response = await route.fetch();
        const headers = { ...response.headers() };
        const returnValue = { response } as any;
        if (patchHeaders(headers, this.serverUrl)) {
          returnValue["headers"] = headers;
        }
        /* For few websites like facebook, even after modifying the headers, the frame is still blocked.
         * In that case, we navigate to the app url again.
         */
        if (response.status() >= 400 && ![404, 429].includes(response.status())) {
          return await this.navigateTo(this.appUrl);
        }
        return await route.fulfill(returnValue);
      } else {
        return await route.continue();
      }
    } catch (err) {
      console.log(err);
      await route.abort();
    }
  }

  toJSON() {
    return {
      id: this._id,
      appUrl: this.appUrl,
      code: this.code,
      logs: [],
      isExecuting: false,
    };
  }
}
