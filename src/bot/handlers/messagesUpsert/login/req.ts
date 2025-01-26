import { CommandHandlerFunc } from "#bot/types/command/handler";
import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { randomizeCode } from "@/utils/generics/randomizeNumber";
import crypto from "crypto";
import * as jwt from "hono/jwt";

export const loginHandler: CommandHandlerFunc = async ({ msg, sock }) => {
  try {
    if (msg.chatType !== "private") return;

    const userJid = msg.from;
    const userName = msg.raw.pushName ?? "Unknown.";
    const requestDate = Date.now();

    let found = await postgresDb
      .selectFrom("contact as c")
      .select("c.id")
      .where("c.creds_name", "=", projectConfig.SESSION_NAME)
      .where("c.remote_jid", "=", userJid)
      .executeTakeFirst();

    if (!found) {
      const contactId = await postgresDb.transaction().execute(async (trx) => {
        const insertedEntity = await trx
          .insertInto("entity")
          .values({ creds_name: projectConfig.SESSION_NAME, remote_jid: msg.from, type: "Contact" })
          .returning("entity.id")
          .executeTakeFirstOrThrow();

        const insertedContact = await trx
          .insertInto("contact")
          .values({
            creds_name: projectConfig.SESSION_NAME,
            entity_id: insertedEntity.id,
            remote_jid: msg.from,
            saved_name: userName,
            server_name: userName,
            signin_code: randomizeCode(),
          })
          .returning("contact.id")
          .executeTakeFirstOrThrow();

        return insertedContact.id;
      });

      found = { id: contactId };
    }

    const data = { contactId: found.id, requestDate };
    const signed = await jwt.sign(data, projectConfig.JWT_SECRET);
    const hasher = crypto.createHash("SHA256");
    hasher.write(signed);
    const hash = hasher.digest("hex");

    await postgresDb
      .updateTable("contact as c")
      .set({ login_request_date: new Date(requestDate), login_request_id: hash })
      .where("c.id", "=", found.id)
      .execute();

    await msg.replyText(`${projectConfig.WEB_BASE}/auth/onetaplogin?token=${hash}`);
  } catch (err) {
    msg.runtimeLogger.error((err as Error).message ?? "Unknwon error at .login");
    await msg.replyText("Internal server error");
  }
};
