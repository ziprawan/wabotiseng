export type ArgType = { content: string; start: number; end: number };

export class Parser {
  private prefixes: string[];
  text: string;

  constructor(prefixes: string[], text: string) {
    this.prefixes = prefixes;
    this.text = text;
  }

  get usedPrefix(): string | null {
    if (this.prefixes.includes(this.text[0])) {
      return this.text[0];
    } else return null;
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

  get args(): ArgType[] {
    if (!this.command) return [];

    return this.forceArgs;
  }

  get forceArgs(): ArgType[] {
    const argsText = this.text.replace(/^[^\s]+\s*/, ""); // Remove the command part
    const args: ArgType[] = [];
    let currentArg = "";
    let inQuotes = false;
    let quoteChar = "";
    let argStart = this.text.indexOf(argsText);
    let start = argStart;

    for (let i = 0; i < argsText.length; i++) {
      const char = argsText[i];

      if (inQuotes) {
        if (char === quoteChar) {
          const end = argStart + i - 1;
          inQuotes = false;
          args.push({ content: currentArg, start, end });
          currentArg = "";
        } else {
          if (!currentArg) start = argStart + i;
          currentArg += char;
        }
      } else {
        if (char === '"' || char === "'") {
          inQuotes = true;
          quoteChar = char;
        } else if (char === " " || char === "\n") {
          if (currentArg) {
            const end = argStart + i - 1;
            args.push({ content: currentArg, start, end });
            currentArg = "";
          }
        } else {
          if (!currentArg) start = argStart + i;
          currentArg += char;
        }
      }
    }

    if (currentArg) {
      const end = argsText.length + argStart - 1;
      args.push({ content: currentArg, start, end });
    }

    return args;
  }

  tagged(): string[] {
    const tags: string[] = [];

    let currentTag = "";
    let inTag = false;

    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i];

      if (inTag) {
        if (char === " " || char === "\n") {
          if (currentTag) tags.push(currentTag);
        } else {
          currentTag += char;
        }
      } else {
        if (char === "@") inTag = true;
      }
    }

    return tags;
  }
}
