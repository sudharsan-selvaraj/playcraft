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

class AbortError extends Error {
  constructor(message: string = "Execution aborted") {
    super(message);
    this.name = "AbortError";
  }
}

export class CodeExecutor {
  private fakeConsole: FakeConsole;
  private abortController?: AbortController;
  private executionPromise?: Promise<any>;
  private isExecuting: boolean = false;

  constructor(private options: CodeExecutorOptions) {
    this.fakeConsole = new FakeConsole(options.listeners);
  }

  async kill() {
    try {
      if (this.abortController && !this.abortController.signal.aborted) {
        this.abortController.abort();
      }
      this.abortController = undefined;

      // If execution is in progress, wait a bit for graceful termination
      if (this.isExecuting && this.executionPromise) {
        try {
          await Promise.race([
            this.executionPromise,
            new Promise((resolve) => setTimeout(resolve, 500)), // 500ms timeout
          ]);
        } catch (err) {
          // Ignore errors during forced termination
        }
      }
    } catch (err) {
      console.log("Error during abort:", err);
    }
  }

  async execute(code: string, isInternalCode: boolean = false): Promise<any> {
    this.isExecuting = true;
    this.abortController = new AbortController();

    const script = new Script(this.wrapCode(code, isInternalCode));
    const context = this.getExecutionContext(this.abortController);
    try {
      this.executionPromise = this.executeWithTimeout(script, context);
      const result = await this.executionPromise;
      return result;
    } catch (err) {
      if (err instanceof AbortError || (err as any)?.name === "AbortError") {
        console.log("Execution aborted");
        return { error: { message: "Execution aborted", type: "AbortError" } };
      }
      return { error: err };
    } finally {
      this.isExecuting = false;
      this.executionPromise = undefined;
    }
  }

  private async executeWithTimeout(script: Script, context: Context): Promise<any> {
    const executionPromise = (async () => {
      await script.runInContext(context);
      const result = await context.result;
      if (result?.error) {
        if (result.error instanceof AbortError || result.error.name === "AbortError") {
          console.log("Execution aborted");
          return { error: { message: "Execution aborted", type: "AbortError" } };
        }
        console.log(result);
      }
      return result;
    })();

    // Race between execution and abort signal
    const abortPromise = new Promise<never>((_, reject) => {
      if (!this.abortController) return;

      const checkAbort = () => {
        if (this.abortController?.signal.aborted) {
          reject(new AbortError("Execution aborted"));
        } else {
          setTimeout(checkAbort, 50);
        }
      };
      checkAbort();
    });

    return Promise.race([executionPromise, abortPromise]);
  }

  transformUserCode(code: string) {
    const transformed = babel.transformSync(code, {
      filename: "user-code.js",
      plugins: [transformer],
      parserOpts: { sourceType: "module", allowAwaitOutsideFunction: true },
      generatorOpts: { retainLines: true },
    })!;
    // writeFileSync(
    //   "/Users/sudharsan/Documents/git/oss/playcraft/test-transformer.js",
    //   transformed?.code ?? code
    // );
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

     // Store original Promise for abort handling
     const OriginalPromise = Promise;
     
     // Helper to make any promise abortable
     const makeAbortable = (promise) => {
       if (!abortSignal) return promise;
       
       return OriginalPromise.race([
         promise,
         new OriginalPromise((_, reject) => {
           if (abortSignal.aborted) {
             reject(new AbortError('Execution aborted'));
             return;
           }
           
           const abortHandler = () => {
             reject(new AbortError('Execution aborted'));
           };
           
           abortSignal.addEventListener('abort', abortHandler, { once: true });
         })
       ]);
     };

     // Override global Promise constructor
     Promise = function(executor) {
       return makeAbortable(new OriginalPromise(executor));
     };
     
     // Copy all static methods and properties
     Object.setPrototypeOf(Promise, OriginalPromise);
     Object.getOwnPropertyNames(OriginalPromise).forEach(name => {
       if (name !== 'length' && name !== 'name' && name !== 'prototype') {
         Promise[name] = OriginalPromise[name];
       }
     });

     const executeCode = async () => {
       try {
         if (abortSignal && abortSignal.aborted) {
           throw new AbortError('Execution aborted');
         }
         
         const codeResult = await ${this.transformUserCode(code)};
         return codeResult;
       } catch (err) {
         if (err instanceof AbortError || err.name === 'AbortError') {
           result.error = err;
           result.line = activeLine;
           return result;
         }
         throw err;
       }
     };

     // Make the entire execution abortable
     makeAbortable(executeCode()).catch(err => {
       if (!result.error) {
         result.error = err;
         result.line = activeLine;
       }
      console.error(err);
       return result;
     });
    `;
  }

  private getExecutionContext(abortController: AbortController) {
    const pageProxy = new PageProxy(this.options.session);
    return createContext({
      ...global,
      console: this.fakeConsole,
      setTimeout,
      require,
      expect: expect,
      page: pageProxy,
      p: this.options.session.getPage(),
      trackActiveLine: async (lineNumber: number) => {
        this.options.listeners?.onStepStarted(lineNumber);
      },
      abortSignal: abortController.signal,
      AbortError,
      wait: async (ms: number) => {
        const startTime = Date.now();
        while (Date.now() - startTime < ms) {
          if (this.abortController?.signal.aborted) {
            throw new AbortError("Execution aborted");
          }
          await new Promise((r) => setTimeout(r, Math.min(50, ms - (Date.now() - startTime))));
        }
      },
    });
  }
}
