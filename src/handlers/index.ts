import { projectConfig } from "@/config";
import { iya_njir } from "@/stickers";
import { WASocket } from "@/types/socket";
import { Messages } from "@/utils/classes/message";
import { Parser } from "@/utils/classes/parser";
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
import { viewOnceAcceptHandler } from "./viewonce/accepted";
import { viewOnceCommandHandler } from "./viewonce/view";

export async function mainHandler(sock: WASocket, msg: Messages) {
  if (msg.msgKey.fromMe) return; // Don't process message if its from me

  const parser = new Parser([".", "/"], msg.text);
  const command = parser.command();
  const args = parser.args();
  console.log("==============================");
  console.log(command, JSON.stringify(args, null, 2));
  // console.log("Received msg:", msg);
  console.log("==============================");

  const ctx = { sock, msg, parser };

  await taggedHandler(ctx);

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

  if (msg.reaction) {
    await viewOnceAcceptHandler(ctx);
    await deleteReactionhandler(ctx);
  }

  // if (command === "asdfghjkl" && msg.from === projectConfig.OWNER) {
  //   const res = await edunexCourseListCronJob(new FileLogger("edunex-test"), msg.sessionName, sock);
  //   await msg.replyText(res, true);
  // }
}
