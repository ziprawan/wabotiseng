import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "@/types/command/handler";
import { Messages } from "@/utils/classes/message";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

export const MINIMUM_ACCEPTS = 5;

export const deleteHandler: CommandHandlerFunc = async (ctx) => {
  const { sock, msg } = ctx;

  const metadata = await msg.saveChatToDatabase(true);

  if (!metadata || typeof metadata === "string") {
    return await sock.sendMessage(msg.chat, { text: "Please use it only in group!" });
  }

  const meId = jidNormalizedUser(msg.client.socket?.user?.id ?? "");

  if (metadata.participants.filter((p) => p.id === meId && p.admin !== null).length === 0) {
    return await sock.sendMessage(msg.chat, { text: "I am not an admin in this group!" });
  }

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
    .executeTakeFirst();

  if (request) {
    const requestedBy = request.requested_by;
    const requestedNumber = requestedBy.split("@")[0];

    return await sock.sendMessage(
      msg.chat,
      {
        text: request.done
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
};
