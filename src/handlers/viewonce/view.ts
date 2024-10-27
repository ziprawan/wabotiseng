import { CommandHandlerFunc } from "@/types/command/handler";
import { botDatabase } from "@/utils/database/client";

export const viewOnceCommandHandler: CommandHandlerFunc = async ({ sock, msg }) => {
  if (!msg.reply_to_message) {
    return await msg.replyText("Please reply to a message that you want to view a view once message!", true);
  }

  const resolvedReply = await msg.resolveReplyToMessage();

  if (!resolvedReply) {
    return await sock.sendMessage(msg.chat, { text: "Message not found." }, { quoted: msg.raw });
  }

  const viewOnceMessage = resolvedReply.viewOnceMessage;
  if (!viewOnceMessage) {
    return await sock.sendMessage(msg.chat, { text: "The replied message is not a view once message!" }, { quoted: msg.raw });
  }

  const mediaMessage = viewOnceMessage.audio ?? viewOnceMessage.video ?? viewOnceMessage.image ?? undefined;
  if (!mediaMessage) {
    return await sock.sendMessage(msg.chat, { text: "Unable to determine media type!" }, { quoted: msg.raw });
  }

  const request = await botDatabase.requestViewOnce.findUnique({
    where: {
      messageId_chatId_credsName: {
        messageId: resolvedReply.id ?? "",
        chatId: resolvedReply.remoteJid ?? "",
        credsName: msg.client.sessionName,
      },
    },
  });

  if (request) {
    const requestedBy = request.requestedBy;
    const requestedNumber = requestedBy.split("@")[0];

    return await sock.sendMessage(
      msg.chat,
      {
        text: request.accepted ? `That message already viewed` : `That message already requested by @${requestedNumber}`,
        mentions: [requestedBy],
      },
      { quoted: msg.raw }
    );
  }

  if (!resolvedReply.id || !resolvedReply.remoteJid) {
    return await sock.sendMessage(msg.chat, { text: "Failed to get message ID or chat ID!" }, { quoted: msg.raw });
  }

  const fromNumber = resolvedReply.from.split("@")[0];

  const sent = await sock.sendMessage(
    msg.chat,
    {
      text: `Waiting for @${fromNumber} to react this message with ✅`,
      mentions: [resolvedReply.from],
    },
    { quoted: msg.raw }
  );

  await botDatabase.requestViewOnce.create({
    data: {
      messageId: resolvedReply.id,
      confirmId: sent?.key.id ?? "",
      chatId: resolvedReply.remoteJid,
      credsName: msg.client.sessionName,
      requestedBy: msg.from,
    },
  });
};
