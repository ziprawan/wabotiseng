import * as fs from "fs";

export class FileLogger {
  constructor(private name: string) {}

  private stream = fs.createWriteStream("logs/" + this.name + `-${Date.now()}.log`, { flags: "w" });

  write(message: string) {
    this.stream.write(message + "\n");
  }
}
