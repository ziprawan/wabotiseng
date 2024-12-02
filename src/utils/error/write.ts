import { writeFileSync } from "node:fs";

export function writeErrorToFile(err: unknown, file_prefix?: string) {
  writeFileSync(
    `errors/${file_prefix}-${Date.now()}.log`,
    (err as Error).stack ?? (err as Error).message ?? "Unknown Error."
  );
}
