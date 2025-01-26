// There are may any unexpected error!
export function formatReplacer<T extends Record<string, string | string[]>>(
  input: string,
  data: T
): [string, string[], Set<string>] {
  let res = "";

  /**
   * 0: RESET, ADD TO RES
   * 1: RECORDING FOR KEY NAME
   * 2: RECORDING FOR DELIMITER
   * 3: ERRORED CAUSED BY USES OF DELIMITER ON NON ARRAY VALUE
   */
  let bracketState: 0 | 1 | 2 | 3 = 0;
  let bracketContent = "";

  const errors: string[] = [];
  const usedVars: Set<string> = new Set();

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (bracketState === 0) {
      if (c === "{") {
        bracketState = 1;
        continue;
      }

      res += c;
    } else if (bracketState === 1) {
      if (c === "}") {
        usedVars.add(bracketContent);
        const content = data[bracketContent];
        bracketContent = "";
        bracketState = 0;

        if (Array.isArray(content)) {
          res += content.join(" "); // Space is a default delimiter
        } else {
          res += content;
        }
      } else if (c === ":") {
        const content = data[bracketContent];
        bracketContent += c;

        if (Array.isArray(content)) {
          bracketState = 2;
        } else {
          errors.push(`Variable ${bracketContent} is not an array, don't use delimiter!`);
          bracketState = 3;
        }
      } else bracketContent += c;
    } else if (bracketState === 2) {
      if (c === "}") {
        const split = bracketContent.split(":");
        const delimiter = split.slice(1).join(":");
        const content = data[split[0]];
        usedVars.add(split[0]);

        if (Array.isArray(content)) {
          res += content.join(delimiter);
          bracketState = 0;
          bracketContent = "";
        } else {
          errors.push(`Internal server error, state messed up!`);
          bracketState = 3;
        }
      }
    } else {
      if (c === "}") {
        const split = bracketContent.split(":");
        const content = data[split[0]];
        usedVars.add(split[0]);
        res += content;
        bracketState = 0;
        bracketContent = "";
        continue;
      }

      bracketContent += c;
    }
  }

  if (bracketContent) {
    res += bracketContent;
  }

  return [res, errors, usedVars];
}
