/// Reference: https://sqlocal.dallashoffman.com/kysely/migrations
import { Migrator } from "kysely";
import { postgresDb } from "./client";
import { migrations } from "./migrations";

export const migrator = new Migrator({
  db: postgresDb,
  provider: {
    async getMigrations() {
      return migrations;
    },
  },
});
