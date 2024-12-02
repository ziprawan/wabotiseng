import * as fs from "fs";

export class FileLogger {
  constructor(private name: string, private folder?: string) {}

  private stream = fs.createWriteStream(`${this.folder ?? "logs"}/${Date.now()}-${this.name}.log`, { flags: "w" });
  private logs: string[] = [];

  write(message: string) {
    this.stream.write(message + "\n");
    this.logs.push(message);
  }

  get text() {
    return this.logs.join("\n");
  }

  close() {
    this.stream.close();
    return this.text;
  }
}
