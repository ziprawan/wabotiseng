import { projectConfig } from "@/config";
import { iya_njir } from "#bot/stickers";
import { WASocket } from "#bot/types/socket";
import { Messages } from "#bot/utils/classes/message";
import { Parser } from "#bot/utils/classes/parser";
import { BufferJSON } from "@whiskeysockets/baileys";
import { broadcastHandler } from "./anons/broadcast";
import { confessHandler } from "./anons/confess";
import { loginCodeHandler } from "./auth/login_code";
import { deleteReactionhandler } from "./delete/react";
import { deleteHandler } from "./delete/request";
import { edunexHandler } from "./edunex";
import { snipeHandler } from "./snipe/snipe";
import { stickerCommandHandler } from "./sticker/create";
import { taggedHandler } from "./titles/tagged";
import { viewOnceCommandHandler } from "./viewonce/view";
import { viewOnceAcceptHandler } from "./viewonce/accepted";
import { titleListHandler } from "./titles/list";
import { loginHandler } from "./login/req";
import { formatReplacer } from "#bot/utils/whatsapp/formatter/replacer";
import { FormatterData } from "#bot/types/whatsapp/formatter";
import { postgresDb } from "@/database/client";
import { setWelcomeHandler } from "./groups/setwelcome";

export async function mainHandler(sock: WASocket, msg: Messages) {
  if (msg.msgKey.fromMe) return; // Don't process message if its from me

  const parser = new Parser([".", "/"], msg.text);
  const command = parser.command();
  const args = parser.args();
  const ctx = { sock, msg, parser };

  if (!msg.msgKey.fromMe) await taggedHandler(ctx);

  if (command === "formattester") {
    // if (msg.from === projectConfig.OWNER) {
    const groupData = await postgresDb
      .selectFrom("group as g")
      .where("g.creds_name", "=", projectConfig.SESSION_NAME)
      .where("g.remote_jid", "=", msg.chat)
      .select("subject")
      .executeTakeFirst();
    const [formatted, errors] = formatReplacer<FormatterData>(msg.text, {
      groupid: msg.chat.split("@")[0],
      groupsubject: groupData?.subject ?? "",
      mention: ["@" + msg.from.split("@")[0]],
      inviter: "@" + msg.from.split("@")[0],
    });

    return await sock.sendMessage(msg.chat, {
      text: `RESULT:\n${formatted}\n\nERRORS:\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`,
      mentions: [msg.from],
    });
    // }
  }

  if (command === "setwelcome") {
    await setWelcomeHandler(ctx);
  }

  if (command === "ping") {
    await sock.sendMessage(msg.chat, { text: "Pong!" });
  }

  if (command === "stk") {
    await stickerCommandHandler(ctx);
  }

  if (command === "vo") {
    await viewOnceCommandHandler(ctx);
  }

  if (command === "edunex" && msg.from === projectConfig.OWNER) {
    await edunexHandler(ctx);
  }

  if (command === "del") {
    await deleteHandler(ctx);
  }

  if (command === "debug") {
    await sock.sendMessage(msg.chat, { text: JSON.stringify(msg.raw, BufferJSON.replacer, 2).trim() });
  }

  if (command === "iya") {
    await sock.sendMessage(msg.chat, { sticker: iya_njir });
  }

  if (command === "confess" && msg.chatType === "private" && projectConfig.CONFESS_TARGET) {
    await confessHandler(ctx);
  }

  if (command === "args" && msg.from === projectConfig.OWNER) {
    return await msg.replyText(JSON.stringify(args, null, 2), true);
  }

  if (command === "broadcast" && msg.from === projectConfig.OWNER) {
    return await broadcastHandler(ctx);
  }

  if (command === "id") {
    return await msg.replyText(`Your ID: ${msg.from}\nChat ID: ${msg.chat}`, true);
  }

  if (command === "snipe") {
    await snipeHandler(ctx);
  }

  if (command === "code") {
    await loginCodeHandler(ctx);
  }

  if (command === "help") {
    await msg.replyText(`Get some help :3\n\n${projectConfig.WEB_BASE}/docs/`, true);
  }

  if (command === "titles") {
    await titleListHandler(ctx);
  }

  if (command === "login") {
    await loginHandler(ctx);
  }

  if (msg.reaction) {
    await viewOnceAcceptHandler(ctx);
    await deleteReactionhandler(ctx);
  }
}
