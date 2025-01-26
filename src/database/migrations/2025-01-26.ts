import { type Migration } from "kysely";

/**
 * ### Summary
 *
 * Add new table "group_settings" to saved group's preferences
 *
 * ### Detail
 *
 * Currently my idea is only saves greeting and leaving message only.
 * I think soon will be used for more features! PLEASE NOTE (ACCURATELY
 * SELF NOTE) THAT ANY COLUMN AT THIS TABLE MUST BE NULLABLE BECAUSE
 * ANY DEFAULT VALUE WILL BE HANDLED IN THE CODE
 *
 * Added columns are "group_id" with type bigserial and not nullable
 * also "greeting_message" and "leaving_message"with type string and
 * nullable. Column "group_id" will be used for primary and foreign
 * key to the "group" table.
 */
export const Migration20250126: Migration = {
  async up(db) {
    await db.schema
      .createTable("group_settings")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("group_id", "bigserial", (col) => col.notNull())
          .addColumn("greeting_message", "text")
          .addColumn("leaving_message", "text")
          .addPrimaryKeyConstraint("group_settings_pk", ["group_id"])
          .addForeignKeyConstraint("group_settings_group_fk", ["group_id"], "group", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
      )
      .execute();
  },
  async down(db) {
    console.warn("WARNING: DOWNGRADING FROM THIS MIGRATION (2025-01-26) WILL BREAK YOUR APPLICATION!");
    await db.schema.dropTable("contact").execute();
  },
};
