import { Session } from "./session";

export class PageProxy {
  constructor(private session: Session) {
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        if (prop === "goto") {
          // Special handling for 'goto' method
          return this.pw_goto.bind(this);
        }
        return (session.getFrame() as any)?.[prop];
      },
    });
  }

  private async pw_goto(url: string, options?: any) {
    return await this.session.loadApplication(url);
  }
}
