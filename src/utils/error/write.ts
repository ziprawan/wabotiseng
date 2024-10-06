import { writeFileSync } from "node:fs";

export function writeErrorToFile(err: unknown) {
  writeFileSync(`errors/${Date.now()}.log`, (err as Error).stack ?? (err as Error).message ?? "Unknown Error.");
}
