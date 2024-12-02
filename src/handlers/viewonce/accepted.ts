import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "@/types/command/handler";
import { Messages } from "@/utils/classes/message";
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

  const request = await postgresDb
    .selectFrom("request_view_once as rvo")
    .select(["rvo.message_id", "rvo.accepted", "rvo.id"])
    .innerJoin("entity as e", "e.id", "rvo.entity_id")
    .where("rvo.confirm_id", "=", resolvedReactMsg.id ?? "")
    .where("e.remote_jid", "=", msg.chat)
    .where("e.creds_name", "=", msg.sessionName)
    .executeTakeFirst();

  if (!request) {
    return;
  }

  const viewOnceMessage = (await Messages.getMessage(msg.client, msg.chat, request.message_id))?.viewOnceMessage;
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
      await postgresDb.updateTable("request_view_once as rvo").where("rvo.id", "=", request.id).set({ accepted: true });
    } catch (err) {
      console.log("Failed! Trying again...");
      writeErrorToFile(err);
      continue;
    }
  }
};
