import * as fs from "fs";

// Loglevel
// 0 for verbose
// 1 for info
// 2 for warning
// 3 for error
// 4 for none

export class FileLogger {
  constructor(
    private name: string,
    private options: { folder?: string; loglevel?: 0 | 1 | 2 | 3 | 4 } = { folder: "logs", loglevel: 2 }
  ) {}

  private stream = fs.createWriteStream(`${this.options?.folder ?? "logs"}/${Date.now()}-${this.name}.log`, { flags: "w" });
  private logs: string[] = [];
  private loglevel = this.options.loglevel ?? 2;

  _write(message: string) {
    this.stream.write(message + "\n");
    this.logs.push(message);
  }

  _getFormattedNow(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}-${String(now.getDate()).padStart(
      2,
      "0"
    )} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
      now.getSeconds()
    ).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
  }

  _writeFormattedLog(level: "verbose" | "info" | "warning" | "error", message: string) {
    return this._write(`${this._getFormattedNow()} [${level}]: ${message}`);
  }

  verbose(message: string) {
    if (this.loglevel > 0) return;
    this._writeFormattedLog("verbose", message);
  }

  info(message: string) {
    if (this.loglevel > 1) return;
    this._writeFormattedLog("info", message);
  }

  warning(message: string) {
    if (this.loglevel > 2) return;
    this._writeFormattedLog("warning", message);
  }

  error(message: string) {
    if (this.loglevel > 3) return;
    this._writeFormattedLog("error", message);
  }

  get text() {
    return this.logs.join("\n");
  }

  close() {
    this.stream.close();
    return this.text;
  }
}
