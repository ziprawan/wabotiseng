import { type Migration } from "kysely";

/**
 * ### Summary
 *
 * Add login_request_id and login_request_date column at contact table
 *
 * ### Detail
 *
 * Adding a new column named "login_request_id" to Contact table with
 * type text and nullable (so there is no default value for this
 * column). This column used for saving SHA256 hash of data which
 * contains user id and last request date.
 *
 * Adding a new column named "login_request_date" to Contact table with
 * type timestamptz and nullable (so there is no default value for this
 * column). This column used for saving when is the latest login request
 * from the user, which will be used for validating if the request id is
 * still valid or not
 */
export const Migration20250117: Migration = {
  async up(db) {
    await db.schema.alterTable("contact").addColumn("login_request_id", "text").execute();

    await db.schema.alterTable("contact").addColumn("login_request_date", "timestamptz").execute();
  },
  async down(db) {
    console.warn("WARNING: DOWNGRADING FROM THIS MIGRATION (2025-01-17) WILL BREAK YOUR APPLICATION!");
    await db.schema.alterTable("contact").dropColumn("login_request_id").execute();
    await db.schema.alterTable("contact").dropColumn("login_request_date").execute();
  },
};
