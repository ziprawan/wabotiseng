import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "@/types/command/handler";

export const loginCodeHandler: CommandHandlerFunc = async ({ msg }) => {
  if (msg.chatType !== "private") {
    return;
  }

  const foundCode = await postgresDb
    .selectFrom("entity as e")
    .innerJoin("contact as c", "c.id", "e.id")
    .select("c.signin_code as code")
    .where("e.creds_name", "=", projectConfig.SESSION_NAME)
    .where("e.type", "=", "Contact")
    .where("e.remote_jid", "=", msg.from)
    .executeTakeFirst();

  if (!foundCode) {
    const newCode = crypto.getRandomValues(new Uint32Array(1))[0].toString().slice(0, 6).padStart(6, "0");

    const insertedEntity = await postgresDb
      .insertInto("entity")
      .values({ creds_name: projectConfig.SESSION_NAME, remote_jid: msg.from, type: "Contact" })
      .onConflict((oc) => oc.columns(["remote_jid", "creds_name"]).doNothing())
      .returning(["id"])
      .executeTakeFirst();

    if (!insertedEntity) {
      await postgresDb
        .updateTable("contact as c")
        .innerJoin("entity as e", "e.id", "c.id")
        .where("e.creds_name", "=", projectConfig.SESSION_NAME)
        .where("e.type", "=", "Contact")
        .where("e.remote_jid", "=", msg.from)
        .set({ server_name: msg.from ?? "Unknown." })
        .execute();
    } else {
      await postgresDb
        .insertInto("contact")
        .values({
          id: insertedEntity.id,
          saved_name: msg.raw.pushName ?? "Unknown.",
          server_name: msg.raw.pushName ?? "Unknown.",
          signin_code: newCode,
        })
        .returning(["contact.signin_code"])
        .execute();
    }

    return await msg.replyText(newCode, true);
  } else {
    return await msg.replyText(foundCode.code, true);
  }
};
