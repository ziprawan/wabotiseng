export function isLiterallyNumeric(text: string | null | undefined): boolean {
  if (!text) return false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c < "0" || c > "9") {
      return false;
    }
  }

  return true;
}

export function isLiterallyDecimal(text: string | null | undefined): boolean {
  if (!text) return false;

  let inDecimal = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === ".") {
      if (inDecimal) return false;
      else inDecimal = true;
    }

    if (c < "0" || c > "9") {
      return false;
    }
  }

  return true;
}
