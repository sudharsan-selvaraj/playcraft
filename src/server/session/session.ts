import { Page, Route, Request, Frame } from "playwright";
import { JSDOM } from "jsdom";
import { isSameDomain, patchHeaders } from "../../utils";
import { CodeExecutor } from "./executor";
import fs from "fs";
import { dirname, join, resolve } from "path";
import { parseLocator } from "../../selector-utils";

const IFRAME_NAME = "aut-frame";
const IFRAME_SELECTOR = `iframe[name='${IFRAME_NAME}']`;
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
    const rootDir = join(resolve(dirname("")));
    await this.page.addInitScript(
      fs.readFileSync(join(rootDir, "injected/injectedScriptSource.js"), "utf-8")
    );
    await this.page.addInitScript(fs.readFileSync(join(rootDir, "injected/iframe.js"), "utf-8"));
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

  public async testLocator(locator: string) {
    const parsedSelector = parseLocator(locator, "data-testid");
    return await this.frame?.evaluate((selector) => {
      // @ts-ignore
      const _script = window?.InjectedScript;
      const parsedSelector = _script?.parseSelector(selector);
      _script?.highlight(parsedSelector);
      const elements = _script?.querySelectorAll(parsedSelector, _script.document.documentElement);
      return elements.length;
    }, parsedSelector.selector);
  }

  private get frame() {
    return this.page.frame(IFRAME_NAME);
  }

  private async navigateTo(url: string) {
    await this.page.goto(new URL(url).origin);
    await this.page.waitForSelector(IFRAME_SELECTOR);
    await this.frame?.goto(url, { waitUntil: "networkidle" });
    // try {
    //   await this.page.waitForFunction(
    //     ({ iframeSelector }) => {
    //       const iframe = document.querySelector(iframeSelector) as HTMLIFrameElement;
    //       const isEditorLoaded = (window as any).IS_CODE_EDITOR_READY;
    //       if (iframe) {
    //         const iframeDocument = iframe.contentDocument || iframe?.contentWindow?.document;
    //         return iframeDocument?.readyState === "complete";
    //       }
    //       return false;
    //     },
    //     { iframeSelector },
    //     { timeout: 30000 }
    //   );
    // } catch (err) {
    //   console.log(err);
    // }
  }

  // async loadApplication(
  //   appUrl?: string,
  //   options?: { waitUntil?: "networkidle" | "domcontentloaded"; referer?: string; timeout?: number }
  // ) {
  //   this.appUrl = appUrl || DEFAULT_APP_URL;
  //   /**
  //    * If the frame is already loaded, we can use it to load the application
  //    * else, this is the first time we are loading the application
  //    */
  //   if (appUrl && this.frame) {
  //     try {
  //       await this.frame.goto(appUrl, options);
  //     } catch (err) {
  //       await this.navigateTo(appUrl);
  //     }
  //   } else {
  //     await this.page.goto(this.serverUrl, { waitUntil: "load" });
  //   }
  // }

  async loadApplication(
    appUrl?: string,
    options?: { waitUntil?: "networkidle" | "domcontentloaded"; referer?: string; timeout?: number }
  ) {
    this.appUrl = appUrl || DEFAULT_APP_URL;
    /**
     * If the frame is already loaded, we can use it to load the application
     * else, this is the first time we are loading the application
     */
    if (appUrl && this.frame) {
      await this.navigateTo(appUrl);
    } else {
      try {
        await this.page.goto(this.serverUrl, { waitUntil: "load" });
        await this.page.waitForSelector(IFRAME_SELECTOR);
        await this.frame?.goto("https://www.playwright.dev/", { waitUntil: "networkidle" });
      } catch (err) {
        console.log(err);
      }
    }
  }

  private patchDOM(html: string, appUrl: string) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.innerHTML = `
      // window.APP_URL = "${appUrl}";
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
        let response;
        try {
          response = await route.fetch({
            timeout: 5000,
            headers: {
              ...request.headers(),
              "sec-fetch-site": "none",
              "sec-fetch-user": "?1",
              "sec-fetch-dest": "document",
              "accept-language": "en-US,en;q=0.9",
              "cache-control": "no-cache",
              pragma: "no-cache",
            },
          });
        } catch (err) {
          return await route.continue();
        }
        const headers = { ...response.headers() };
        const returnValue = { response } as any;
        if (patchHeaders(headers, this.serverUrl)) {
          returnValue["headers"] = headers;
        }
        // /* For few websites like facebook, even after modifying the headers, the frame is still blocked.
        //  * In that case, we navigate to the app url again.
        //  */
        // if (response.status() >= 400 && ![404, 429].includes(response.status())) {
        //   if ((this.failedRouteMap.get(request.url()) ?? 0) > 5) {
        //     this.failedRouteMap.delete(request.url());
        //     return await route.fulfill(returnValue);
        //   }
        //   this.failedRouteMap.set(request.url(), (this.failedRouteMap.get(request.url()) ?? 0) + 1);
        //   return await this.navigateTo(this.appUrl);
        // }
        return await route.fulfill(returnValue);
      } else {
        return await route.continue();
      }
    } catch (err) {
      console.log(err);
      await route.continue();
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
