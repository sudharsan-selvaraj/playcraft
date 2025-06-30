import { Context, Script, createContext } from "vm";
import { FakeConsole } from "./FakeConsole";
import { PageProxy } from "./PageProxy";
import { Session } from "./session";
import { expect } from "@playwright/test";

export type CodeExecutorOptions = {
  session: Session;
  listeners?: {
    onLog: (log: { message: string; level: string }) => void;
    onError: (error: { message: string; level: string }) => void;
    onExecutionStarted: () => void;
    onExecutionEnded: () => void;
    onStepStarted: (step: number) => void;
  };
};

export class CodeExecutor {
  private vmContext: Context;

  constructor(private options: CodeExecutorOptions) {
    this.vmContext = createContext({
      ...global,
      console: new FakeConsole(options.listeners),
      expect: expect,
      wait: async (ms: number) => {
        await new Promise((r) => setTimeout(r, ms));
      },
    });
  }

  async execute(code: string): Promise<any> {
    (this.vmContext as any).page = new PageProxy(this.options.session);
    (this.vmContext as any).p = this.options.session.getPage();
    const script = new Script(`
     (async () => {
          await (async () => {
            ${code}
          })();
      })().catch(err => console.log(err));
    `);
    await script.runInContext(this.vmContext);
    return this.vmContext.result;
  }
}
