import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "#bot/types/command/handler";
import { Messages } from "#bot/utils/classes/message";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

export const MINIMUM_ACCEPTS = 5;

export const deleteHandler: CommandHandlerFunc = async (ctx) => {
  try {
    const { sock, msg } = ctx;

    if (!msg.reply_to_message) {
      return await msg.replyText("Please reply to a message that you want to delete!", true);
    }

    const resolvedReply = await msg.resolveReplyToMessage();

    if (!resolvedReply) {
      return await msg.replyText("Message not found.");
    }

    const request = await postgresDb
      .selectFrom("request_delete_message as rdm")
      .select(["rdm.requested_by", "rdm.done"])
      .innerJoin("group as g", "g.id", "rdm.entity_id")
      .where("rdm.message_id", "=", resolvedReply.id ?? "")
      .where("g.remote_jid", "=", resolvedReply.chat)
      .where("g.creds_name", "=", msg.sessionName)
      .execute();

    if (request.length > 0) {
      const requestedBy = request[0].requested_by;
      const requestedNumber = requestedBy.split("@")[0];

      return await sock.sendMessage(
        msg.chat,
        {
          text: request[0].done
            ? `That message already deleted`
            : `That message deletion already requested by @${requestedNumber}`,
          mentions: [requestedBy],
        },
        { quoted: msg.raw }
      );
    }

    const rawConfirmMsg = await msg.replyText(
      `Need atleast ${MINIMUM_ACCEPTS} peoples to react this message with ✅ to delete this message. (Or react with ❌ to cancel.)`,
      true
    );

    if (!rawConfirmMsg) {
      console.error("Unable to send confirmation message!");
      return;
    }

    const confirmMsg = new Messages(msg.client, rawConfirmMsg);

    await postgresDb
      .insertInto("request_delete_message")
      .values(({ selectFrom }) => ({
        message_id: resolvedReply.id ?? "",
        entity_id: selectFrom("group as g")
          .select("g.id")
          .where("g.remote_jid", "=", resolvedReply.remoteJid ?? "")
          .where("g.creds_name", "=", msg.sessionName),
        requested_by: msg.from,
        confirm_id: confirmMsg.id ?? "",
      }))
      .execute();
  } catch (err) {
    await ctx.msg.replyText((err as Error).stack ?? "Unknown error.");
  }
};
