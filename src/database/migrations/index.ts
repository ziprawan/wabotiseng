/// Reference: https://sqlocal.dallashoffman.com/kysely/migrations
import { Migration } from "kysely";
import { Migration20241202 } from "./2024-12-02";

export const migrations: Record<string, Migration> = {
  "2024-12-02": Migration20241202,
};
