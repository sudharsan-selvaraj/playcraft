import util from "util";
import { CodeExecutorOptions } from "./executor";

export class FakeConsole {
  private listeners: CodeExecutorOptions["listeners"];
  private counts: Record<string, number> = {};
  private timers: Record<string, number> = {};
  private groupIndent: number = 0;

  constructor(listeners?: CodeExecutorOptions["listeners"]) {
    this.listeners = listeners;
  }

  private emitLog(type: "log" | "error" | "warn" | "info" | "debug", ...args: any[]) {
    const msg = util.format(...args);
    this.listeners?.onLog?.({ message: msg, level: type });
  }

  assert(value: any, ...args: any[]) {
    if (!value) {
      this.emitLog("error", "Assertion failed:", ...args);
    }
  }

  clear() {
    // No-op for now
  }

  count(label = "default") {
    this.counts[label] = (this.counts[label] || 0) + 1;
    this.emitLog("log", `${label}: ${this.counts[label]}`);
  }

  countReset(label = "default") {
    this.counts[label] = 0;
  }

  debug(...args: any[]) {
    this.emitLog("debug", ...args);
  }
  dir(obj: any, options?: any) {
    this.emitLog("log", util.inspect(obj, options));
  }
  dirxml(...data: any[]) {
    this.emitLog("log", ...data);
  }
  error(...args: any[]) {
    this.emitLog("error", ...args);
  }
  group(...label: any[]) {
    this.groupIndent += 2;
    this.emitLog("log", ...label);
  }
  groupCollapsed(...label: any[]) {
    this.group(...label);
  }
  groupEnd() {
    this.groupIndent = Math.max(0, this.groupIndent - 2);
  }
  info(...args: any[]) {
    this.emitLog("info", ...args);
  }
  log(...args: any[]) {
    this.emitLog("log", ...args);
  }
  table(tabularData: any, properties?: string[]) {
    // Simple table implementation
    if (Array.isArray(tabularData)) {
      const keys = properties || Object.keys(tabularData[0] || {});
      const header = keys.join("\t");
      const rows = tabularData.map((row) => keys.map((k) => row[k]).join("\t")).join("\n");
      this.emitLog("log", header + "\n" + rows);
    } else {
      this.emitLog("log", util.inspect(tabularData));
    }
  }
  time(label = "default") {
    this.timers[label] = Date.now();
  }
  timeEnd(label = "default") {
    if (this.timers[label]) {
      const duration = Date.now() - this.timers[label];
      this.emitLog("log", `${label}: ${duration}ms`);
      delete this.timers[label];
    }
  }
  timeLog(label = "default", ...data: any[]) {
    if (this.timers[label]) {
      const duration = Date.now() - this.timers[label];
      this.emitLog("log", `${label}: ${duration}ms`, ...data);
    }
  }
  trace(...args: any[]) {
    const err = new Error(util.format(...args));
    this.emitLog("error", err.stack);
  }
  warn(...args: any[]) {
    this.emitLog("warn", ...args);
  }
  // Inspector only methods (no-op)
  profile(label?: string) {}
  profileEnd(label?: string) {}
  timeStamp(label?: string) {}
}
