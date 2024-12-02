import { postgresDb } from "@/database/client";
import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";

type DataType = keyof SignalDataTypeMap | "creds";

export const useDatabaseAuthState = async (
  sessionName: string
): Promise<{
  state: AuthenticationState;
  sessionName: string;
  saveCreds: () => Promise<void>;
  removeCreds: () => Promise<void>;
}> => {
  const writeData = async (data: any, type: DataType, name: string) => {
    const content = JSON.stringify(data, BufferJSON.replacer);
    switch (type) {
      case "pre-key":
        await postgresDb
          .insertInto("pre_key")
          .values({ content, name, creds_name: sessionName })
          .onConflict((oc) => oc.constraint("pre_key_pk").doUpdateSet({ content }))
          .onConflict((oc) => oc.constraint("pre_key_creds_and_name").doUpdateSet({ content }))
          .execute();
        break;
      case "session":
        await postgresDb
          .insertInto("session")
          .values({ content, name, creds_name: sessionName })
          .onConflict((oc) => oc.constraint("session_pk").doUpdateSet({ content }))
          .onConflict((oc) => oc.constraint("session_creds_and_name").doUpdateSet({ content }))
          .execute();
        break;
      case "sender-key":
        await postgresDb
          .insertInto("sender_key")
          .values({ content, name, creds_name: sessionName })
          .onConflict((oc) => oc.constraint("sender_key_pk").doUpdateSet({ content }))
          .onConflict((oc) => oc.constraint("sender_key_creds_and_name").doUpdateSet({ content }))
          .execute();
        break;
      case "sender-key-memory":
        await postgresDb
          .insertInto("sender_key_memory")
          .values({ content, name, creds_name: sessionName })
          .onConflict((oc) => oc.constraint("sender_key_memory_pk").doUpdateSet({ content }))
          .onConflict((oc) => oc.constraint("sender_key_memory_cred_and_name").doUpdateSet({ content }))
          .execute();
        break;
      case "app-state-sync-key":
        await postgresDb
          .insertInto("app_state_sync_key")
          .values({ content, name, creds_name: sessionName })
          .onConflict((oc) => oc.constraint("app_state_sync_key_pk").doUpdateSet({ content }))
          .onConflict((oc) => oc.constraint("app_state_sync_key_creds_and_name").doUpdateSet({ content }))
          .execute();
        break;
      case "app-state-sync-version":
        await postgresDb
          .insertInto("app_state_sync_version")
          .values({ content, name, creds_name: sessionName })
          .onConflict((oc) => oc.constraint("app_state_sync_version_pk").doUpdateSet({ content }))
          .onConflict((oc) => oc.constraint("app_state_sync_version_creds_and_name").doUpdateSet({ content }))
          .execute();
        break;
      case "creds":
        await postgresDb
          .insertInto("cred")
          .values({ session_name: sessionName, session_string: content })
          .onConflict((oc) => oc.constraint("cred_pk").doUpdateSet({ session_string: content }))
          .execute();
        break;
      default:
        throw new TypeError(`Invalid data type "${type}"`);
    }

    return;
  };

  const readData = async (type: DataType, id: string) => {
    try {
      let found: string | null | undefined;
      switch (type) {
        case "pre-key":
          found = (
            await postgresDb
              .selectFrom("pre_key")
              .select(["content"])
              .where("creds_name", "=", sessionName)
              .where("name", "=", id)
              .executeTakeFirst()
          )?.content;
          break;
        case "session":
          found = (
            await postgresDb
              .selectFrom("session")
              .select(["content"])
              .where("creds_name", "=", sessionName)
              .where("name", "=", id)
              .executeTakeFirst()
          )?.content;
          break;
        case "sender-key":
          found = (
            await postgresDb
              .selectFrom("sender_key")
              .select(["content"])
              .where("creds_name", "=", sessionName)
              .where("name", "=", id)
              .executeTakeFirst()
          )?.content;
          break;
        case "sender-key-memory":
          found = (
            await postgresDb
              .selectFrom("sender_key_memory")
              .select(["content"])
              .where("creds_name", "=", sessionName)
              .where("name", "=", id)
              .executeTakeFirst()
          )?.content;
          break;
        case "app-state-sync-key":
          found = (
            await postgresDb
              .selectFrom("app_state_sync_key")
              .select(["content"])
              .where("creds_name", "=", sessionName)
              .where("name", "=", id)
              .executeTakeFirst()
          )?.content;
          break;
        case "app-state-sync-version":
          found = (
            await postgresDb
              .selectFrom("app_state_sync_version")
              .select(["content"])
              .where("creds_name", "=", sessionName)
              .where("name", "=", id)
              .executeTakeFirst()
          )?.content;
          break;
        case "creds":
          found = (
            await postgresDb
              .selectFrom("cred")
              .select(["session_string"])
              .where("session_name", "=", sessionName)
              .executeTakeFirst()
          )?.session_string;
          break;
        default:
          throw new TypeError(`Invalid data type "${type}"`);
      }

      if (!found) return null;

      return JSON.parse(found, BufferJSON.reviver);
    } catch (err) {
      return null;
    }
  };

  const removeData = async (type: DataType, id: string) => {
    switch (type) {
      case "pre-key":
        await postgresDb.deleteFrom("pre_key").where("name", "=", id).where("creds_name", "=", sessionName).execute();
        break;
      case "session":
        await postgresDb.deleteFrom("session").where("name", "=", id).where("creds_name", "=", sessionName).execute();
        break;
      case "sender-key":
        await postgresDb.deleteFrom("sender_key").where("name", "=", id).where("creds_name", "=", sessionName).execute();
        break;
      case "sender-key-memory":
        await postgresDb
          .deleteFrom("sender_key_memory")
          .where("name", "=", id)
          .where("creds_name", "=", sessionName)
          .execute();
        break;
      case "app-state-sync-key":
        await postgresDb
          .deleteFrom("app_state_sync_key")
          .where("name", "=", id)
          .where("creds_name", "=", sessionName)
          .execute();
        break;
      case "app-state-sync-version":
        await postgresDb
          .deleteFrom("app_state_sync_version")
          .where("name", "=", id)
          .where("creds_name", "=", sessionName)
          .execute();
        break;
      case "creds":
        await postgresDb.deleteFrom("cred").where("session_name", "=", sessionName).execute();
        break;
      default:
        throw new TypeError(`Invalid data type "${type}"`);
    }
  };

  const creds: AuthenticationCreds = (await readData("creds", "")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: Record<string, SignalDataTypeMap[typeof type]> = {};

          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(type, id);

              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }

              data[id] = value;
            })
          );

          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          Object.entries(data).forEach(([category, categoryValue]) => {
            Object.entries(categoryValue).forEach(([id, value]) => {
              tasks.push(value ? writeData(value, category as DataType, id) : removeData(category as DataType, id));
            });
          });

          await Promise.all(tasks);
        },
      },
    },
    sessionName,
    saveCreds: async () => {
      return await writeData(creds, "creds", "");
    },
    removeCreds: async () => {
      return await removeData("creds", "");
    },
  };
};
