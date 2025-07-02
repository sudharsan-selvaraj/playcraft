import { Context, Script, createContext } from "vm";
import { FakeConsole } from "./FakeConsole";
import { PageProxy } from "./PageProxy";
import { Session } from "./session";
import { expect } from "@playwright/test";
import { transformer } from "./transformer-sync";
import * as babel from "@babel/core";
import { writeFileSync } from "fs";

export type CodeExecutorOptions = {
  session: Session;
  listeners?: {
    onLog: (log: { message: string; level: string }) => void;
    onError: (error: { message: string; level: string }) => void;
    onStepStarted: (step: number) => void;
  };
};

class AbortError extends Error {}

export class CodeExecutor {
  private vmContext: Context;
  private fakeConsole: FakeConsole;
  private abortController?: AbortController;

  constructor(private options: CodeExecutorOptions) {
    this.fakeConsole = new FakeConsole(options.listeners);
    this.vmContext = createContext({
      ...global,
      console: this.fakeConsole,
      setTimeout,
      require,
      expect: expect,
      wait: async (ms: number) => {
        await new Promise((r) => setTimeout(r, ms));
      },
      AbortError,
    });
  }

  async kill() {
    try {
      if (this.abortController && !this.abortController.signal.aborted) {
        this.abortController.abort();
      }
      this.abortController = undefined;
    } catch (err) {
      // Log the error but don't throw it, as kill should be safe to call
      console.log("Error during abort:", err);
    }
  }

  async execute(code: string, isInternalCode: boolean = false): Promise<any> {
    this.abortController = new AbortController();
    (this.vmContext as any).page = new PageProxy(this.options.session);
    (this.vmContext as any).p = this.options.session.getPage();
    (this.vmContext as any).trackActiveLine = async (lineNumber: number) => {
      this.options.listeners?.onStepStarted(lineNumber);
    };
    (this.vmContext as any).abortSignal = this.abortController.signal;
    const script = new Script(this.wrapCode(code, isInternalCode));
    try {
      await script.runInContext(this.vmContext);
      const result = await this.vmContext.result;
      if (result.error) {
        if (result.error instanceof AbortError || result.error.name === "AbortError") {
          console.log("Execution aborted");
          return { error: { message: "Execution aborted", type: "AbortError" } };
        }
        console.log(result);
      }
      return result;
    } catch (err) {
      if (err instanceof AbortError || (err as any)?.name === "AbortError") {
        console.log("Execution aborted");
        return { error: { message: "Execution aborted", type: "AbortError" } };
      }
      console.log("Error thrown", err);
      return err;
    }
  }

  transformUserCode(code: string) {
    const transformed = babel.transformSync(code, {
      filename: "user-code.js",
      plugins: [transformer],
      parserOpts: { sourceType: "module", allowAwaitOutsideFunction: true },
      generatorOpts: { retainLines: true },
    })!;
    writeFileSync(
      "/Users/sudharsan/Documents/git/oss/playcraft/test-transformer.js",
      transformed?.code ?? code
    );
    return transformed?.code ?? code;
  }

  wrapCode(code: string, isInternalCode: boolean) {
    return `
     result = {};
     activeLine = 0;
     
     function reportLine(lineNumber) {
      activeLine=lineNumber;
      ${!isInternalCode ? "trackActiveLine(activeLine);" : ""}
      if (abortSignal && abortSignal.aborted) {
        throw new AbortError('Execution aborted');
      }
     }

     (async () => {
        try {
          if (abortSignal && abortSignal.aborted) {
            throw new AbortError('Execution aborted');
          }
          
          return await ${this.transformUserCode(code)}
        } catch (err) {
          if (err instanceof AbortError || err.name === 'AbortError') {
            result.error = err;
            result.line = activeLine;
            return result;
          }
          throw err;
        }
      })().catch(err => {
        if (!result.error) {
          result.error = err;
          result.line = activeLine;
        }
        return result;
      });
    `;
  }
}
