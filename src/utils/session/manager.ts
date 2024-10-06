import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { botDatabase } from "../database/client";

type DataType = keyof SignalDataTypeMap | "creds";

export const useDatabaseAuthState = async (
  sessionName: string
): Promise<{
  state: AuthenticationState;
  sessionName: string;
  saveCreds: () => Promise<void>;
  removeCreds: () => Promise<void>;
}> => {
  const writeData = async (data: any, type: DataType, id: string) => {
    switch (type) {
      case "pre-key":
        await botDatabase.preKey.upsert({
          where: { name_credsName: { name: id, credsName: sessionName } },
          create: { credsName: sessionName, content: JSON.stringify(data, BufferJSON.replacer), name: id },
          update: { content: JSON.stringify(data, BufferJSON.replacer) },
        });
        break;
      case "session":
        await botDatabase.session.upsert({
          where: { name_credsName: { name: id, credsName: sessionName } },
          create: { credsName: sessionName, content: JSON.stringify(data, BufferJSON.replacer), name: id },
          update: { content: JSON.stringify(data, BufferJSON.replacer) },
        });
        break;
      case "sender-key":
        await botDatabase.senderKey.upsert({
          where: { name_credsName: { name: id, credsName: sessionName } },
          create: { credsName: sessionName, content: JSON.stringify(data, BufferJSON.replacer), name: id },
          update: { content: JSON.stringify(data, BufferJSON.replacer) },
        });
        break;
      case "sender-key-memory":
        await botDatabase.senderKeyMemory.upsert({
          where: { name_credsName: { name: id, credsName: sessionName } },
          create: { credsName: sessionName, content: JSON.stringify(data, BufferJSON.replacer), name: id },
          update: { content: JSON.stringify(data, BufferJSON.replacer) },
        });
        break;
      case "app-state-sync-key":
        await botDatabase.appStateSyncKey.upsert({
          where: { name_credsName: { name: id, credsName: sessionName } },
          create: { credsName: sessionName, content: JSON.stringify(data, BufferJSON.replacer), name: id },
          update: { content: JSON.stringify(data, BufferJSON.replacer) },
        });
        break;
      case "app-state-sync-version":
        await botDatabase.appStateSyncVersion.upsert({
          where: { name_credsName: { name: id, credsName: sessionName } },
          create: { credsName: sessionName, content: JSON.stringify(data, BufferJSON.replacer), name: id },
          update: { content: JSON.stringify(data, BufferJSON.replacer) },
        });
        break;
      case "creds":
        await botDatabase.creds.upsert({
          where: { sessionName },
          create: { sessionName, sessionString: JSON.stringify(data, BufferJSON.replacer) },
          update: { sessionString: JSON.stringify(data, BufferJSON.replacer) },
        });
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
          found = (await botDatabase.preKey.findUnique({ where: { name_credsName: { name: id, credsName: sessionName } } }))
            ?.content;
          break;
        case "session":
          found = (await botDatabase.session.findUnique({ where: { name_credsName: { name: id, credsName: sessionName } } }))
            ?.content;
          break;
        case "sender-key":
          found = (await botDatabase.senderKey.findUnique({ where: { name_credsName: { name: id, credsName: sessionName } } }))
            ?.content;
          break;
        case "sender-key-memory":
          found = (
            await botDatabase.senderKeyMemory.findUnique({ where: { name_credsName: { name: id, credsName: sessionName } } })
          )?.content;
          break;
        case "app-state-sync-key":
          found = (
            await botDatabase.appStateSyncKey.findUnique({ where: { name_credsName: { name: id, credsName: sessionName } } })
          )?.content;
          break;
        case "app-state-sync-version":
          found = (
            await botDatabase.appStateSyncVersion.findUnique({ where: { name_credsName: { name: id, credsName: sessionName } } })
          )?.content;
          break;
        case "creds":
          found = (await botDatabase.creds.findUnique({ where: { sessionName } }))?.sessionString;
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
        await botDatabase.preKey.deleteMany({ where: { name: id, credsName: sessionName } });
        break;
      case "session":
        await botDatabase.session.deleteMany({ where: { name: id, credsName: sessionName } });
        break;
      case "sender-key":
        await botDatabase.senderKey.deleteMany({ where: { name: id, credsName: sessionName } });
        break;
      case "sender-key-memory":
        await botDatabase.senderKeyMemory.deleteMany({ where: { name: id, credsName: sessionName } });
        break;
      case "app-state-sync-key":
        await botDatabase.appStateSyncKey.deleteMany({ where: { name: id, credsName: sessionName } });
        break;
      case "app-state-sync-version":
        await botDatabase.appStateSyncVersion.deleteMany({ where: { name: id, credsName: sessionName } });
        break;
      case "creds":
        await botDatabase.creds.update({
          where: { sessionName },
          data: {
            AppStateSyncKey: { deleteMany: {} },
            AppStateSyncVersion: { deleteMany: {} },
            PreKey: { deleteMany: {} },
            SenderKey: { deleteMany: {} },
            SenderKeyMemory: { deleteMany: {} },
            Session: { deleteMany: {} },
          },
        });
        await botDatabase.creds.deleteMany({ where: { sessionName } });
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
      return await removeData("creds", "'");
    },
  };
};
