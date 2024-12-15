import { projectConfig } from "@/config";
import { FileLogger } from "@/utils/logger/file";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { DB } from "./db";

const dbLogger = new FileLogger("database", { loglevel: process.env.IS_DEBUG === "true" ? 0 : 1 });

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: projectConfig.DATABASE_URL,
    max: 10,
  }),
});

export const postgresDb = new Kysely<DB>({
  dialect,
  log: (event) => {
    dbLogger.verbose("New query!");
    dbLogger.info(event.query.sql);
    dbLogger.verbose("Parameters: " + JSON.stringify(event.query.parameters ?? []));

    if (event.level === "error") {
      dbLogger.error(
        "QUERY EXECUTED in " + String(event.queryDurationMillis) + " ms with ERROR(s)!\n" + String(event.error)
      );
    } else {
      dbLogger.info("QUERY EXECUTED in " + String(event.queryDurationMillis) + " ms!");
    }
  },
});
