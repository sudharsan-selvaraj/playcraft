import { Session } from "./session";

export class PageProxy {
  constructor(private session: Session) {
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        const frame = session.getFrame();
        const value = (frame as any)?.[prop];
        if (typeof value === 'function') {
          return value.bind(frame);
        }
        return value;
      },
    });
  }

  public async goto(url: string, options?: any) {
    return await this.session.loadApplication(url, options);
  }

  public on(event: string, callback: any) {
    this.session.onEventHandlerAdded(event, callback);
    return this.session.getPage().on(event as any, callback);
  }

  public route(url: string, callback: any) {
    this.session.onRouteHandlerAdded(url, callback);
    return this.session.getPage().route(url, callback);
  }

  public frames() {
    const page = this.session.getPage();
    return page.frames().filter((frame) => frame !== page.mainFrame());
  }
}
