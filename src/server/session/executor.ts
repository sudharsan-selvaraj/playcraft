import { Frame, Page } from "playwright";
import { Context, Script, createContext } from "vm";
import { FakeConsole } from "./FakeConsole";
import { PageProxy } from "./PageProxy";
import { Session } from "./session";
import { expect } from "@playwright/test";

export type CodeExecutorOptions = {
  session: Session;
  listeners?: {
    onLog: (log: string) => void;
    onError: (error: Error) => void;
    onExecutionStarted: () => void;
    onExecutionEnded: () => void;
    onStepStarted: (step: number) => void;
  };
};

export class CodeExecutor {
  private vmContext: Context;

  constructor(private options: CodeExecutorOptions) {
    this.vmContext = createContext({
      console: console, //new FakeConsole(options.listeners),
      expect: expect,
    });
  }

  async execute(code: string): Promise<any> {
    (this.vmContext as any).page = new PageProxy(this.options.session);
    const script = new Script(`
    (async () => {
        try {
            await ${code}
        } catch(err) {
            console.error(err);
        }
    })()
        `);
    return script.runInContext(this.vmContext);
  }
}
