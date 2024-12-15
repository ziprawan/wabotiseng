export function randomizeNumber(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function randomizeCode(): string {
  return randomizeNumber().toString().slice(0, 6).padStart(6, "0");
}
