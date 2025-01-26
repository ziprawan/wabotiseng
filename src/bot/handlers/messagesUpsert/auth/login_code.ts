import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "#bot/types/command/handler";
import { randomizeCode } from "@/utils/generics/randomizeNumber";

export const loginCodeHandler: CommandHandlerFunc = async ({ msg }) => {
  if (msg.chatType !== "private") {
    return;
  }

  const foundCode = await postgresDb
    .selectFrom("contact as c")
    .select("c.signin_code as code")
    .where("c.creds_name", "=", projectConfig.SESSION_NAME)
    .where("c.remote_jid", "=", msg.from)
    .executeTakeFirst();

  if (!foundCode) {
    const newCode = randomizeCode();

    await postgresDb.transaction().execute(async (trx) => {
      const insertedEntity = await trx
        .insertInto("entity")
        .values({ creds_name: projectConfig.SESSION_NAME, remote_jid: msg.from, type: "Contact" })
        .onConflict((oc) => oc.columns(["remote_jid", "creds_name"]).doNothing())
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await postgresDb
        .insertInto("contact")
        .values({
          entity_id: insertedEntity.id,
          remote_jid: msg.from,
          creds_name: msg.sessionName,
          saved_name: msg.raw.pushName ?? "Unknown.",
          server_name: msg.raw.pushName ?? "Unknown.",
          signin_code: newCode,
        })
        .returning(["contact.signin_code"])
        .execute();
    });

    return await msg.replyText(newCode, true);
  } else {
    return await msg.replyText(foundCode.code, true);
  }
};
