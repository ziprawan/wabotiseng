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

  const split = conversation.split("\n");
  const viewCode = split[split.length - 1];
  const decoded = Buffer.from(viewCode, "base64url").toString("utf-8");
  const decodeSplit = decoded.split(":");

  // View code format should be look like this
  // viewonce:<user_id>:<chat_id>:<message_id>
  if (decodeSplit.length !== 4) return;
  if (decodeSplit[0] !== "viewonce") return;
  if (msg.from !== decodeSplit[1]) return;
  if (msg.chat !== decodeSplit[2]) return;

  const viewOnceMessage = (await Messages.getMessage(msg.client, decodeSplit[2], decodeSplit[3]))?.viewOnceMessage;
  if (!viewOnceMessage) {
    console.error(`Requested message is not a view once message!`);
    return;
  }

  const mediaMessage = viewOnceMessage.audio ?? viewOnceMessage.video ?? viewOnceMessage.image ?? undefined;
  if (!mediaMessage) {
    return await sock.sendMessage(msg.chat, { text: "Unable to determine media type!" }, { quoted: msg.raw });
  }

  const mediaType = viewOnceMessage.audio ? "audio" : viewOnceMessage.video ? "video" : "image";

  const request = await botDatabase.requestViewOnce.findUnique({
    where: {
      messageId_remoteJid_credsName: {
        messageId: decodeSplit[3],
        remoteJid: decodeSplit[2],
        credsName: msg.client.sessionName,
      },
    },
    select: { id: true, accepted: true },
  });

  if (!request) {
    console.error(`Request not found!`);
    return;
  }

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
