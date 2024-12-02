import { projectConfig } from "@/config";
import { FileLogger } from "@/utils/logger/file";
import { Kysely, PostgresDialect } from "kysely";
import { DB } from "kysely-codegen";
import { Pool } from "pg";

const dbLogger = new FileLogger("database");

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: projectConfig.DATABASE_URL,
    max: 10,
  }),
});

export const postgresDb = new Kysely<DB>({
  dialect,
  // log(event) {
  //   if (event.level === "error")
  // },
});
