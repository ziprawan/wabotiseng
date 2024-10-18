import { CommandHandlerFunc } from "@/types/command/handler";
import { Messages } from "@/utils/classes/message";
import { botDatabase } from "@/utils/database/client";

export const viewOnceCommandHandler: CommandHandlerFunc = async ({ sock, msg }) => {
  if (!msg.reply_to_message) {
    return await sock.sendMessage(
      msg.chat,
      { text: "Please reply to a message that you want to view a view once message!" },
      { quoted: msg.raw }
    );
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
      messageId_remoteJid_credsName: {
        messageId: resolvedReply.id ?? "",
        remoteJid: resolvedReply.remoteJid ?? "",
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

  const code = Buffer.from(`viewonce:${resolvedReply.from}:${resolvedReply.remoteJid}:${resolvedReply.id}`).toString("base64url");
  const fromNumber = resolvedReply.from.split("@")[0];

  await botDatabase.requestViewOnce.create({
    data: {
      messageId: resolvedReply.id,
      remoteJid: resolvedReply.remoteJid,
      credsName: msg.client.sessionName,
      requestedBy: msg.from,
    },
  });

  return await sock.sendMessage(
    msg.chat,
    {
      text: `Waiting for @${fromNumber} approval...\nReact this message with ✅ emoji to approve it\n\n${code}`,
      mentions: [resolvedReply.from],
    },
    { quoted: msg.raw }
  );
};
