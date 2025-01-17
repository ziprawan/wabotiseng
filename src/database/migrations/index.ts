/// Reference: https://sqlocal.dallashoffman.com/kysely/migrations
import { Migration } from "kysely";
import { Migration20241202 } from "./2024-12-02";
import { Migration20250116 } from "./2025-01-16";
import { Migration20250117 } from "./2025-01-17";

export const migrations: Record<string, Migration> = {
  "2024-12-02": Migration20241202,
  "2025-01-16": Migration20250116,
  "2025-01-17": Migration20250117,
};
