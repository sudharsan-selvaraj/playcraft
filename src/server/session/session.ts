import { Page, Route, Request, Frame } from "playwright";
import { JSDOM } from "jsdom";
import { getRedirectUrl, isSameDomain, patchHeaders } from "../../utils";
import { CodeExecutor } from "./executor";
import fs from "fs";
import path, { join } from "path";
import { parseLocator } from "../../selector-utils";
import { eventBus } from "../../events/eventBus";
import { SessionEventTypes } from "@/events/eventTypes";

const IFRAME_NAME = "aut-frame";
const IFRAME_SELECTOR = `iframe[name='${IFRAME_NAME}']`;
const DEFAULT_APP_URL = "https://www.playwright.dev/";

export class Session {
  private _id: string;
  private code: string = "";
  private parentUrl: string = "";
  private codeExecutor: CodeExecutor;
  private eventHandlers: Record<string, any> = {};
  private routeHandlers: Record<string | symbol, any> = {};
  private logs: Array<{ message: string; level: string; timestamp: number }> = [];
  private status: "idle" | "execution" | "completed" | "error" = "idle";
  private lastError: { error: string; line: number } | null = null;
  private currentStepNumber: number | null = null;

  constructor(
    private page: Page,
    private injectedDOM: string,
    private serverUrl: string,
    private appUrl: string = DEFAULT_APP_URL
  ) {
    this._id = crypto.randomUUID();
    this.codeExecutor = new CodeExecutor({
      session: this,
      listeners: {
        onLog: (log: { message: string; level: string }) => {
          const logEntry = { message: log.message, level: log.level, timestamp: Date.now() };
          this.logs.push(logEntry);
          eventBus.emit("log", {
            sessionId: this._id,
            message: log.message,
            level: log.level,
            timestamp: logEntry.timestamp,
          });
        },
        onError: (error: { message: string; level: string }) => {
          const logEntry = { message: error.message, level: error.level, timestamp: Date.now() };
          this.logs.push(logEntry);
          eventBus.emit("log", {
            sessionId: this._id,
            message: error.message,
            level: error.level,
            timestamp: logEntry.timestamp,
          });
        },
        onStepStarted: (step: number) => {
          this.currentStepNumber = step;
          this.dispatchEvent("step-start", {
            sessionId: this._id,
            step,
          });
        },
      },
    });
  }

  public async init() {
    const rootDir = path.resolve(__dirname, "../../../");
    await this.page.addInitScript(
      fs.readFileSync(join(rootDir, "injected/injectedScriptSource.js"), "utf-8")
    );
    await this.page.addInitScript(fs.readFileSync(join(rootDir, "injected/iframe.js"), "utf-8"));

    this.page.route("**/*", this.onRequestMade.bind(this));
    this.page.on("framenavigated", async (frame) => {
      if (frame == this.frame) {
        await this.dispatchFrameNavigationEvent(frame.url());
      }
    });
    await this.loadApplication();
  }

  private setCode(code: string) {
    this.code = code;
  }

  getCode() {
    return this.code;
  }

  getStatus() {
    return this.status;
  }

  getLastError() {
    return this.lastError;
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

  public async stopScriptExecution() {
    this.codeExecutor.kill();
  }

  public async executeCode(code: string, isInternalCode: boolean = false) {
    if (isInternalCode) {
      try {
        const result = await this.codeExecutor.execute(code, isInternalCode);
        return result;
      } catch (err: any) {
        return err;
      }
    }
    this.setCode(code);
    this.logs = [];
    this.status = "execution";
    this.lastError = null;
    try {
      this.dispatchEvent("execution-start", {
        timestamp: Date.now(),
        status: this.status,
      });
      const result = await this.codeExecutor.execute(code, false);
      this.status = result && result.error ? "error" : "completed";
      this.lastError =
        result && result.error
          ? {
              error: result.error.stack,
              line: result.line,
            }
          : null;
      return result;
    } catch (err: any) {
      this.status = "error";
      this.lastError = err || "Unknown error";
      throw err;
    } finally {
      this.currentStepNumber = null;
      this.removeEventHandlers();
      this.dispatchEvent("execution-complete", {
        timestamp: Date.now(),
        status: this.status,
        error: this.lastError,
      });
    }
  }

  public async testLocator(locator: string) {
    if (!locator) {
      return await this.executeCode(
        `
        await Promise.all(page.frames().map((frame) => {
          return frame.locator("invalid-xpath").highlight();
        }));
   `,
        true
      );
    }
    parseLocator(locator, "data-testid");
    return await this.executeCode(
      `
         await page.${locator}.highlight();
         result = await page.${locator}.count();
    `,
      true
    );
  }

  private get frame() {
    return this.page.frame(IFRAME_NAME);
  }

  private async navigateTo(url: string, options?: any) {
    const redirectUrl = await getRedirectUrl(url);
    if (!isSameDomain(redirectUrl, this.page.url())) {
      this.parentUrl = new URL(redirectUrl).origin;
      await this.page.goto(this.parentUrl, { waitUntil: "networkidle" });
    }
    await this.page.waitForSelector(IFRAME_SELECTOR);
    try {
      await this.frame?.goto(redirectUrl, options || { waitUntil: "networkidle" });
    } catch (err: unknown) {
      console.log("Error navigating to", redirectUrl, err);
      // if (err instanceof Error && err.name !== "TimeoutError") {
      //   await this.frame?.goto(redirectUrl, options || { waitUntil: "networkidle" });
      // }
    }
  }

  async loadApplication(
    appUrl?: string,
    options?: { waitUntil?: "networkidle" | "domcontentloaded"; referer?: string; timeout?: number }
  ) {
    this.appUrl = appUrl || this.appUrl;
    /**
     * If the frame is already loaded, we can use it to load the application
     * else, this is the first time we are loading the application
     */
    if (appUrl && this.frame) {
      await this.navigateTo(appUrl, options);
    } else {
      try {
        this.parentUrl = this.serverUrl;
        await this.page.goto(this.parentUrl, { waitUntil: "load" });
        await this.page.waitForSelector(IFRAME_SELECTOR);
        await this.frame?.goto(this.appUrl, options);
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
      window.IFRAME_LOADING = ${appUrl ? "true" : "false"};
      window.APP_URL = "${appUrl}";
      window.SESSION_ID = "${this._id}";
      window.SERVER_URL = "${this.serverUrl}";
    `;
    document.head.appendChild(script);
    return dom.serialize();
  }

  private async dispatchFrameNavigationEvent(url: string) {
    await this.frame?.evaluate(
      ({ url }) => {
        const isReady = document.readyState == "complete";
        window.parent.postMessage(
          { action: isReady ? "frame-loaded" : "frame-loading", url, from: "playcraft" },
          "*"
        );
      },
      { url }
    );
  }

  private async onRequestMade(route: Route, request: Request) {
    try {
      const isMainFrame = request.frame() === this.page.mainFrame();
      const isChildFrame = request.frame() === this.frame;
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
      } else if (isChildFrame && request.resourceType() === "document") {
        let response;
        try {
          response = await route.fetch({
            timeout: 60000,
            headers: {
              "sec-fetch-site": "none",
              "sec-fetch-user": "?1",
              "sec-fetch-dest": "document",
              "accept-language": "en-US,en;q=0.9",
              "cache-control": "no-cache",
              pragma: "no-cache",
              ...request.headers(),
            },
          });
        } catch (err) {
          return await route.continue();
        }
        const headers = response.headers();
        const returnValue = { response } as any;
        if (patchHeaders(headers)) {
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
      await route.continue();
    }
  }

  async onEventHandlerAdded(event: string, callback: any) {
    this.eventHandlers[event] = callback;
  }

  async onRouteHandlerAdded(route: string | symbol, callback: any) {
    this.routeHandlers[route] = callback;
  }

  async removeEventHandlers() {
    for (const event in this.eventHandlers) {
      this.page.off(event as any, this.eventHandlers[event]);
      delete this.eventHandlers[event];
    }

    for (const route in this.routeHandlers) {
      this.page.unroute(route as any, this.routeHandlers[route]);
      delete this.routeHandlers[route];
    }
  }

  toJSON() {
    return {
      id: this._id,
      appUrl: this.appUrl,
      code: this.code,
      logs: this.logs,
      status: this.status,
      error: this.lastError,
      currentStepNumber: this.currentStepNumber,
    };
  }

  public getLogs() {
    return this.logs;
  }

  private dispatchEvent(event: keyof SessionEventTypes, payload: any) {
    eventBus.emit(event, {
      sessionId: this._id,
      ...payload,
    });
  }
}
