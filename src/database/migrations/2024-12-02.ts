/// Reference: https://sqlocal.dallashoffman.com/kysely/migrations
import { sql, type Migration } from "kysely";
import { values } from "../utils";

/**
 * ### Summary
 *
 * Initial database creation :3
 *
 * ### Detail
 *
 * All details will be explained at up() function
 */
export const Migration20241202: Migration = {
  async up(db) {
    /**
     * TYPE
     *
     * chat_type as enum, used for determining chat type.
     * Currently holds value: "Group" and "Contact"
     *
     * participant_role as enum, used for determining the role of participant.
     * Currently holds value: "MEMBER", "ADMIN", and "SUPERADMIN"
     * "MEMBER" means just ordinary group member
     * "ADMIN" who has a privilege to edit the group settings
     * "SUPERADMIN" who created the group
     */
    await db.schema.createType("chat_type").asEnum(["Group", "Contact"]).execute();
    await db.schema.createType("participant_role").asEnum(["MEMBER", "ADMIN", "SUPERADMIN"]).execute();

    /**
     * TABLE
     *
     * ### Account stuffs
     *
     * cred: to save session name and session string. Also useful for multi account.
     * app_state_sync_key: Bailey's things to keep the app working
     * app_state_sync_version: Bailey's things to keep the app working
     * pre_key: Bailey's things to keep the app working
     * sender_key: Bailey's things to keep the app working
     * sender_key_memory: Bailey's things to keep the app working
     * session: Bailey's things to keep the app working
     *
     * ### Entities
     *
     * Entities are a collection of chat entities that include groups and
     * contacts (in the future we will try to add other types, but it's not
     * too important yet)
     *
     * entity: This is where all basic entities info saved
     * contact: Ordinary contact, with contact's name
     * group: Group with many info like subject, descriptions, etc.
     * participant: List of group's participants
     *
     * ### Message
     *
     * message: Message from supported entities, referencing to entity.id
     * request_view_once: Request collection to view a viewonce message
     * request_delete_message: Collection of requested message deletion
     *
     * ### Title
     *
     * title: Group mentioning, has exactly same feature like role in discord
     * title_holder: Holder of the title, referencing to title.id
     *
     * ### Other
     *
     * edunex_account: Save edunex account, referencing to contact.id
     */
    await db.schema
      .createTable("cred")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("session_name", "varchar(255)", (col) => col.notNull())
          .addColumn("session_string", "text", (col) => col.notNull())
      )
      .execute();
    await db.schema
      .createTable("app_state_sync_key")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("name", "varchar(255)", (col) => col.notNull())
          .addColumn("content", "text", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addPrimaryKeyConstraint("app_state_sync_key_id_pk", ["id"])
          .addUniqueConstraint("app_state_sync_key_creds_and_name", ["name", "creds_name"])
          .addForeignKeyConstraint("app_state_sync_key_cred_fk", ["creds_name"], "cred", ["session_name"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
      )
      .execute();
    await db.schema
      .createTable("app_state_sync_version")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("name", "varchar(255)", (col) => col.notNull())
          .addColumn("content", "text", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addPrimaryKeyConstraint("app_state_sync_version_id_pk", ["id"])
          .addUniqueConstraint("app_state_sync_version_creds_and_name", ["name", "creds_name"])
          .addForeignKeyConstraint("app_state_sync_version_cred_fk", ["creds_name"], "cred", ["session_name"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
      )
      .execute();
    await db.schema
      .createTable("pre_key")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("name", "varchar(255)", (col) => col.notNull())
          .addColumn("content", "text", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addPrimaryKeyConstraint("pre_key_id_pk", ["id"])
          .addUniqueConstraint("pre_key_creds_and_name", ["name", "creds_name"])
          .addForeignKeyConstraint("pre_key_cred_fk", ["creds_name"], "cred", ["session_name"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
      )
      .execute();
    await db.schema
      .createTable("sender_key")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("name", "varchar(255)", (col) => col.notNull())
          .addColumn("content", "text", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addPrimaryKeyConstraint("sender_key_id_pk", ["id"])
          .addUniqueConstraint("sender_key_creds_and_name", ["name", "creds_name"])
          .addForeignKeyConstraint("sender_key_cred_fk", ["creds_name"], "cred", ["session_name"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
      )
      .execute();
    await db.schema
      .createTable("sender_key_memory")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("name", "varchar(255)", (col) => col.notNull())
          .addColumn("content", "text", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addPrimaryKeyConstraint("sender_key_memory_id_pk", ["id"])
          .addUniqueConstraint("sender_key_memory_creds_and_name", ["name", "creds_name"])
          .addForeignKeyConstraint("sender_key_memory_cred_fk", ["creds_name"], "cred", ["session_name"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
      )
      .execute();
    await db.schema
      .createTable("session")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("name", "varchar(255)", (col) => col.notNull())
          .addColumn("content", "text", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addPrimaryKeyConstraint("session_id_pk", ["id"])
          .addUniqueConstraint("session_creds_and_name", ["name", "creds_name"])
          .addForeignKeyConstraint("session_cred_fk", ["creds_name"], "cred", ["session_name"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
      )
      .execute();

    await db.schema
      .createTable("entity")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("type", sql`chat_type`, (col) => col.notNull())
          .addColumn("remote_jid", "varchar(50)", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addPrimaryKeyConstraint("entity_pk", ["id"])
          .addForeignKeyConstraint("entity_cred_fk", ["creds_name"], "cred", ["session_name"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("entity_jid_creds", ["remote_jid", "creds_name"])
      )
      .execute();
    await db.schema
      .createTable("contact")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("entity_id", "bigint", (col) => col.notNull())
          .addColumn("remote_jid", "varchar(50)", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
          .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
          .addColumn("saved_name", "varchar(100)", (col) => col.notNull())
          .addColumn("server_name", "varchar(100)", (col) => col.notNull())
          .addColumn("signin_code", "varchar(6)", (col) => col.notNull())
          .addPrimaryKeyConstraint("contact_pk", ["id"])
          .addForeignKeyConstraint("contact_entity_fk", ["entity_id"], "entity", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("contact_entity_id", ["entity_id"])
      )
      .execute();
    await db.schema
      .createTable("group")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("entity_id", "bigint", (col) => col.notNull())
          .addColumn("remote_jid", "varchar(50)", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
          .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
          .addColumn("owner", "varchar(100)", (col) => col.notNull())
          .addColumn("subject", "varchar(255)", (col) => col.notNull())
          .addColumn("subject_owner", "varchar(100)")
          .addColumn("subject_time", "timestamptz")
          .addColumn("desc", "text")
          .addColumn("desc_owner", "varchar(100)")
          .addColumn("size", "integer", (col) => col.notNull().defaultTo(1))
          .addColumn("creation", "timestamptz")
          .addColumn("announce", "boolean", (col) => col.notNull().defaultTo(false))
          .addColumn("restrict", "boolean", (col) => col.notNull().defaultTo(false))
          .addColumn("join_approval_mode", "boolean", (col) => col.notNull().defaultTo(false))
          .addColumn("member_add_mode", "boolean", (col) => col.notNull().defaultTo(false))
          .addColumn("ephemeral_duration", "integer", (col) => col.notNull().defaultTo(0))
          .addColumn("is_community", "boolean", (col) => col.notNull().defaultTo(false))
          .addColumn("is_community_announce", "boolean", (col) => col.notNull().defaultTo(false))
          .addColumn("linked_parent", "varchar(100)")
          .addColumn("invite_code", "varchar(100)")
          .addPrimaryKeyConstraint("group_pk", ["id"])
          .addForeignKeyConstraint("group_entity_fk", ["entity_id"], "entity", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("group_entity_id", ["entity_id"])
      )
      .execute();
    await db.schema
      .createTable("participant")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("group_id", "bigint", (col) => col.notNull())
          .addColumn("participant_jid", "varchar(100)", (col) => col.notNull())
          .addColumn("role", sql`participant_role`, (col) => col.notNull())
          .addPrimaryKeyConstraint("participant_pk", ["id"])
          .addForeignKeyConstraint("participant_group_fk", ["group_id"], "group", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("participant_group_jid", ["group_id", "participant_jid"])
      )
      .execute();

    await db.schema
      .createTable("message")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
          .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
          .addColumn("message_id", "varchar(100)", (col) => col.notNull())
          .addColumn("entity_id", "bigint", (col) => col.notNull())
          .addColumn("message", "text", (col) => col.notNull())
          .addColumn("deleted", "boolean", (col) => col.defaultTo(false))
          .addPrimaryKeyConstraint("message_pk", ["id"])
          .addForeignKeyConstraint("message_entity_fk", ["entity_id"], "entity", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("message_entity_id", ["message_id", "entity_id"])
      )
      .execute();
    await db.schema
      .createTable("request_view_once")
      .ifNotExists()
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
          .addColumn("confirm_id", "varchar(100)", (col) => col.notNull())
          .addColumn("message_id", "varchar(100)", (col) => col.notNull())
          .addColumn("entity_id", "bigint", (col) => col.notNull())
          .addColumn("requested_by", "varchar(100)", (col) => col.notNull())
          .addColumn("accepted", "boolean", (col) => col.notNull())
          .addPrimaryKeyConstraint("request_view_once_pk", ["id"])
          .addForeignKeyConstraint("request_view_once_entity_fk", ["entity_id"], "entity", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("request_view_once_confirm_entity_id", ["confirm_id", "entity_id"])
          .addUniqueConstraint("request_view_once_message_entity_id", ["message_id", "entity_id"])
      )
      .execute();
    await db.schema
      .createTable("request_delete_message")
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
          .addColumn("confirm_id", "varchar(100)", (col) => col.notNull())
          .addColumn("message_id", "varchar(100)", (col) => col.notNull())
          .addColumn("entity_id", "bigint", (col) => col.notNull())
          .addColumn("requested_by", "varchar(100)", (col) => col.notNull())
          .addColumn("agrees", sql`character varying(100)[]`, (col) =>
            col.notNull().defaultTo(sql`'{}'::character varying[]`)
          )
          .addColumn("disagrees", sql`character varying(100)[]`, (col) =>
            col.notNull().defaultTo(sql`'{}'::character varying[]`)
          )
          .addColumn("done", "boolean", (col) => col.notNull().defaultTo(false))
          .addPrimaryKeyConstraint("request_delete_message_pk", ["id"])
          .addForeignKeyConstraint("request_delete_message_entity_fk", ["entity_id"], "entity", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("request_delete_message_confirm_entity_id", ["confirm_id", "entity_id"])
          .addUniqueConstraint("request_delete_message_message_entity_id", ["message_id", "entity_id"])
      )
      .execute();

    await db.schema
      .createTable("title")
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("group_id", "bigint", (col) => col.notNull())
          .addColumn("title_name", "varchar(100)", (col) => col.notNull())
          .addColumn("claimable", "boolean", (col) => col.notNull())
          .addPrimaryKeyConstraint("title_pk", ["id"])
          .addForeignKeyConstraint("title_group_fk", ["group_id"], "group", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("title_name_group", ["title_name", "group_id"])
      )
      .execute();
    await db.schema
      .createTable("title_holder")
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("title_id", "bigint", (col) => col.notNull())
          .addColumn("participant_id", "bigint", (col) => col.notNull())
          .addColumn("holding", "boolean", (col) => col.notNull().defaultTo(true))
          .addPrimaryKeyConstraint("title_holder_pk", ["id"])
          .addForeignKeyConstraint("title_holder_title_fk", ["title_id"], "title", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addForeignKeyConstraint("title_holder_participant_fk", ["participant_id"], "participant", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("title_holder_title_participant_id", ["title_id", "participant_id"])
      )
      .execute();

    await db.schema
      .createTable("edunex_account")
      .$call((builder) =>
        builder
          .addColumn("id", "bigserial", (col) => col.notNull())
          .addColumn("creds_name", "varchar(255)", (col) => col.notNull())
          .addColumn("created_at", "timestamptz", (col) => col.notNull())
          .addColumn("updated_at", "timestamptz", (col) => col.notNull())
          .addColumn("contact_id", "bigint", (col) => col.notNull())
          .addColumn("token", "text", (col) => col.notNull())
          .addPrimaryKeyConstraint("edunex_account_pk", ["id"])
          .addForeignKeyConstraint("edunex_account_cred_fk", ["creds_name"], "cred", ["session_name"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addForeignKeyConstraint("edunex_account_contact_fk", ["contact_id"], "contact", ["id"], (fk) =>
            fk.onUpdate("cascade").onDelete("cascade")
          )
          .addUniqueConstraint("edunex_account_cred_contact", ["creds_name", "contact_id"])
      )
      .execute();
  },
  async down(db) {
    db.schema.dropTable("cred").ifExists().execute();
    db.schema.dropTable("app_state_sync_key").ifExists().execute();
    db.schema.dropTable("app_state_sync_version").ifExists().execute();
    db.schema.dropTable("pre_key").ifExists().execute();
    db.schema.dropTable("sender_key").ifExists().execute();
    db.schema.dropTable("sender_key_memory").ifExists().execute();
    db.schema.dropTable("session").ifExists().execute();
    db.schema.dropTable("entity").ifExists().execute();
    db.schema.dropTable("contact").ifExists().execute();
    db.schema.dropTable("group").ifExists().execute();
    db.schema.dropTable("participant").ifExists().execute();
    db.schema.dropTable("message").ifExists().execute();
    db.schema.dropTable("request_view_once").ifExists().execute();
    db.schema.dropTable("request_delete_message").ifExists().execute();
    db.schema.dropTable("title").ifExists().execute();
    db.schema.dropTable("title_holder").ifExists().execute();
    db.schema.dropTable("edunex_account").ifExists().execute();

    db.schema.dropType("chat_type").ifExists().execute();
    db.schema.dropType("participant_role").ifExists().execute();
  },
};
