import * as fs from "fs";

export class FileLogger {
  constructor(private name: string) {}

  private stream = fs.createWriteStream("logs/" + this.name + `-${Date.now()}.log`, { flags: "w" });
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
