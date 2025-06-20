import { Frame, Page, Request, Route } from "playwright";
import { isSameDomain } from "../../utils";
import { JSDOM } from "jsdom";

export class Session {
  private _id: string;
  private appUrl: string | null = null;
  private appFrame: Frame | null = null;
  private isPageRefreshed: boolean = true;

  constructor(private page: Page, private injectedDOM: string) {
    this._id = crypto.randomUUID();
    this.page.addInitScript(`
      if(window.self !== window.top) {
          window.sudharsan = "How are you?"
      }
    `);
    this.page.route("**/*", this.onRequestMade.bind(this));
    this.page.on("frameattached", this.onFrameAttached.bind(this));
  }

  get id() {
    return this._id;
  }

  private patchDOM(html: string, appUrl: string) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.innerHTML = `(function(){
      window.APP_URL = "${appUrl}";
    })()`;
    document.head.appendChild(script);
    return dom.serialize();
  }

  public async openApp(appUrl: string) {
    const url = new URL(appUrl);
    this.appUrl = appUrl.endsWith("/") ? appUrl : `${appUrl}/`;
    const currentUrl = this.page.url();
    if (new URL(currentUrl).origin !== url.origin) {
      this.isPageRefreshed = true;
      await this.page.goto(url.origin);
    } else if (this.appFrame) {
      this.isPageRefreshed = false;
      await this.appFrame.goto(appUrl);
    }
  }

  public async getFrame() {
    return this.appFrame;
  }

  private async onRequestMade(route: Route, request: Request) {
    if (
      this.appUrl &&
      request.frame() === this.page.mainFrame() &&
      isSameDomain(request.url(), this.appUrl) &&
      request.resourceType() === "document"
    ) {
      await route.fulfill({
        body: this.patchDOM(this.injectedDOM, this.appUrl),
        headers: {
          "Content-Type": "text/html",
        },
        status: 200,
      });
    } else if (request.frame() == this.appFrame && request.resourceType() === "document") {
      const response = await route.fetch();
      const responseHeaders = response.headers();
      delete responseHeaders["x-frame-options"];
      delete responseHeaders["X-Frame-Options"];
      delete responseHeaders["content-security-policy"];
      delete responseHeaders["Content-Security-Policy"];

      responseHeaders["access-control-allow-origin"] = "*";
      responseHeaders["access-control-allow-credentials"] = "true";
      responseHeaders["access-control-allow-methods"] = "GET, POST, OPTIONS";
      responseHeaders["access-control-allow-headers"] = "*";

      await route.fulfill({
        response: response,
        headers: responseHeaders,
      });
    } else {
      return await route.continue();
    }
    // if ( && isSameDomain(request.url(), this.appUrl)) {
    //   await route.fulfill({
    //     body: this.patchDOM(this.injectedDOM, this.appUrl),
    //     headers: {
    //       "Content-Type": "text/html",
    //     },
    //   });
    // } else if (frame == this.appFrame && request.url() == this.appUrl) {
    //   try {
    //     // Merge original request headers with additional required headers
    //     const res = await route.fetch()
    //     const headers = request.headers();
    //     Object.assign(headers, {
    //       Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    //       "Accept-Language": "en-US,en;q=0.5",
    //       "User-Agent":
    //         "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    //       "Upgrade-Insecure-Requests": "1",
    //       "Sec-Fetch-Dest": "document",
    //       "Sec-Fetch-Mode": "navigate",
    //       "Sec-Fetch-Site": "none",
    //       "Sec-Fetch-User": "?1",
    //     });
    //     const response = await fetch(request.url(), {
    //       headers,
    //       redirect: "follow",
    //     });
    //     // Handle different response status codes
    //     if (!response.ok) {
    //       throw new Error(`HTTP error! status: ${response.status}`);
    //     }
    //     const html = await response.text();
    //     const responseHeaders = new Map(response.headers);
    //     // Remove security headers that prevent framing
    //     responseHeaders.delete("x-frame-options");
    //     responseHeaders.delete("X-Frame-Options");
    //     responseHeaders.delete("content-security-policy");
    //     responseHeaders.delete("Content-Security-Policy");
    //     // Ensure content type is set
    //     if (!responseHeaders.has("content-type")) {
    //       responseHeaders.set("content-type", "text/html");
    //     }
    //     await route.fulfill({
    //       body: html,
    //       headers: Object.fromEntries(responseHeaders),
    //       status: response.status,
    //     });
    //   } catch (e) {
    //     console.error("Request failed:", e);
    //     // On error, try to continue the request normally
    //     await route.continue({
    //       headers: request.headers(),
    //     });
    //   }
    // } else {
    //   await route.continue();
    // }
  }

  private async onFrameAttached(frame: Frame) {
    if (this.page.mainFrame() === frame.parentFrame()) {
      this.appFrame = frame;
    }
    if (this.isPageRefreshed && this.appUrl) {
      this.isPageRefreshed = false;
      try {
        await this.appFrame?.goto(this.appUrl!);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
