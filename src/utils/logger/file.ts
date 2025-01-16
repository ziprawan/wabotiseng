import * as fs from "fs";

// Loglevel
// 0 for verbose
// 1 for info
// 2 for warning
// 3 for error
// 4 for none

type LogLevel = 0 | 1 | 2 | 3 | 4;

export class FileLogger {
  name: string;
  options: { folder?: string; loglevel?: LogLevel } = { folder: "logs", loglevel: 2 };
  stream: fs.WriteStream;
  logs: string[];
  loglevel: LogLevel;

  constructor(name: string, options: { folder?: string; loglevel?: 0 | 1 | 2 | 3 | 4 }) {
    this.name = name;
    this.options = options;
    this.stream = fs.createWriteStream(`${this.options?.folder ?? "logs"}/${Date.now()}-${this.name}.log`, { flags: "w" });
    this.logs = [];
    this.loglevel = this.options.loglevel ?? 2;
  }

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
    if (this.loglevel > 0) return this;
    this._writeFormattedLog("verbose", message);
    return this;
  }

  info(message: string) {
    if (this.loglevel > 1) return this;
    this._writeFormattedLog("info", message);
    return this;
  }

  warning(message: string) {
    if (this.loglevel > 2) return this;
    this._writeFormattedLog("warning", message);
    return this;
  }

  error(message: string) {
    if (this.loglevel > 3) return this;
    this._writeFormattedLog("error", message);
    return this;
  }

  get text() {
    return this.logs.join("\n");
  }

  close() {
    this.stream.close();
    return this.text;
  }
}
