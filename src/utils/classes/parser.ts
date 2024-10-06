export class Parser {
  private prefixes: string[];
  private text: string;

  constructor(prefixes: string[], text: string) {
    this.prefixes = prefixes;
    this.text = text;
  }

  get command(): string | null {
    for (const prefix of this.prefixes) {
      if (this.text.startsWith(prefix)) {
        const commandMatch = this.text.slice(prefix.length).match(/^\w+/);
        return commandMatch ? commandMatch[0] : null;
      }
    }
    return null;
  }

  get args(): string[] {
    if (!this.command) return [];

    const argsText = this.text.replace(/^[^\s]+\s*/, ""); // Remove the command part
    const args: string[] = [];
    let currentArg = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < argsText.length; i++) {
      const char = argsText[i];

      if (inQuotes) {
        if (char === quoteChar) {
          inQuotes = false;
          args.push(currentArg);
          currentArg = "";
        } else {
          currentArg += char;
        }
      } else {
        if (char === '"' || char === "'") {
          inQuotes = true;
          quoteChar = char;
        } else if (char === " " || char === "\n") {
          if (currentArg) {
            args.push(currentArg);
            currentArg = "";
          }
        } else {
          currentArg += char;
        }
      }
    }

    if (currentArg) {
      args.push(currentArg);
    }

    return args;
  }
}
