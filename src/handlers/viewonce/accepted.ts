import { CommandHandlerFunc } from "@/types/command/handler";
import { Messages } from "@/utils/classes/message";
import { botDatabase } from "@/utils/database/client";
import { writeErrorToFile } from "@/utils/error/write";
import { streamToBuffer } from "@/utils/stream/toBuffer";
import { downloadEncryptedContent, getMediaKeys } from "@whiskeysockets/baileys";

export const viewOnceAcceptHandler: CommandHandlerFunc = async ({ sock, msg }) => {
  if (!msg.reaction) return;

  const resolvedReactMsg = await msg.reaction.resolveReactedMessage();

  if (!resolvedReactMsg) {
    return;
  }

  if (msg.reaction.content !== "✅") return;

  if (!resolvedReactMsg.msgKey.fromMe) return;

  const conversation = resolvedReactMsg.conversation;

  if (!conversation) return;

  const request = await botDatabase.requestViewOnce.findUnique({
    where: {
      confirmId_chatId_credsName: {
        confirmId: resolvedReactMsg.id ?? "",
        chatId: msg.chat,
        credsName: msg.sessionName,
      },
    },
  });

  if (!request) {
    return;
  }

  const viewOnceMessage = (await Messages.getMessage(msg.client, msg.chat, request.messageId))?.viewOnceMessage;
  if (!viewOnceMessage) {
    writeErrorToFile(new Error("Requested message is not a view once message!"));
    return;
  }

  if (msg.from !== viewOnceMessage.from) return;

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

      await sock.sendMessage(
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
      await botDatabase.requestViewOnce.update({ where: { id: request.id }, data: { accepted: true } });
    } catch (err) {
      console.log("Failed! Trying again...");
      writeErrorToFile(err);
      continue;
    }
  }
};
