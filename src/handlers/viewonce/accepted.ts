import { CommandHandlerFunc } from "@/types/command/handler";
import { Messages } from "@/utils/classes/message";
import { botDatabase } from "@/utils/database/client";
import { writeErrorToFile } from "@/utils/error/write";
import { streamToBuffer } from "@/utils/stream/toBuffer";
import { downloadEncryptedContent, getMediaKeys } from "@whiskeysockets/baileys";

export const viewOnceAcceptHandler: CommandHandlerFunc = async ({ sock, msg }) => {
  if (!msg.reaction) return;

  const resolvedMsg = await msg.reaction.resolveReactedMessage();

  if (!resolvedMsg) {
    return;
  }

  if (msg.reaction.content !== "✅") return;

  if (!resolvedMsg.msgKey.fromMe) return;

  const conversation = resolvedMsg.conversation;

  if (!conversation) return;

  const request = await botDatabase.requestViewOnce.findUnique({
    where: {
      confirmId_chatId_credsName: {
        confirmId: resolvedMsg.id ?? "",
        chatId: msg.chat,
        credsName: msg.sessionName,
      },
    },
  });

  if (!request) {
    return await sock.sendMessage(msg.chat, { text: "Request not found!" }, { quoted: msg.raw });
  }

  const viewOnceMessage = (await Messages.getMessage(msg.client, msg.chat, request.messageId))?.viewOnceMessage;
  if (!viewOnceMessage) {
    console.error(`Requested message is not a view once message!`);
    return;
  }

  const mediaMessage = viewOnceMessage.audio ?? viewOnceMessage.video ?? viewOnceMessage.image ?? undefined;
  if (!mediaMessage) {
    return await sock.sendMessage(msg.chat, { text: "Unable to determine media type!" }, { quoted: msg.raw });
  }

  const mediaType = viewOnceMessage.audio ? "audio" : viewOnceMessage.video ? "video" : "image";

  if (request.accepted) return;

  let doAgain = true;

  while (doAgain) {
    try {
      const mediaUrl = mediaMessage.url;
      const mediaKey = getMediaKeys(mediaMessage.mediaKey, mediaType);
      const mediaBinary = await downloadEncryptedContent(mediaUrl, mediaKey);
      const mediaBuffer = await streamToBuffer(mediaBinary);

      doAgain = false;

      await botDatabase.requestViewOnce.update({ where: { id: request.id }, data: { accepted: true } });

      return await sock.sendMessage(
        msg.chat,
        {
          caption: viewOnceMessage.text ?? undefined,
          ...(mediaType === "image"
            ? { image: mediaBuffer }
            : mediaType === "video"
              ? { video: mediaBuffer }
              : { audio: mediaBuffer }),
        },
        { quoted: msg.raw }
      );
    } catch (err) {
      console.log("Failed! Trying again...");
      writeErrorToFile(err);
      continue;
    }
  }
};
