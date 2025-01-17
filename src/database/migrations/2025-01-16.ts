import { type Migration } from "kysely";

/**
 * ### Summary
 *
 * Add logged_out column at cred table
 *
 * ### Detail
 *
 * Adding column "logged_out" to cred table that indicates
 * that the client logged out or nah. The reason behind this
 * is the relationship between cred and entity. If I keep
 * using delete cred row, it will delete the related entities
 * too, which is could cause deletion of unwated data too such
 * as titles request_view_once, etc. The Session class will
 * be implemented using this migration.
 *
 * This column has type boolean with default value "false",
 * so every session that still exists on database will be set
 * false
 */
export const Migration20250116: Migration = {
  async up(db) {
    await db.schema
      .alterTable("cred")
      .addColumn("logged_out", "boolean", (ac) => ac.defaultTo(false).notNull())
      .execute();
  },
  async down(db) {
    console.warn("WARNING: DOWNGRADING FROM THIS MIGRATION (2025-01-16) WILL BREAK YOUR APPLICATION!");
    await db.schema.alterTable("cred").dropColumn("logged_out").execute();
  },
};
