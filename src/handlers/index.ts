import { edunexCourseListCronJob } from "@/crons/edunex/course-list";
import { iya_njir } from "@/stickers";
import { WASocket } from "@/types/socket";
import { Messages } from "@/utils/classes/message";
import { Parser } from "@/utils/classes/parser";
import { FileLogger } from "@/utils/logger/file";
import { BufferJSON } from "@whiskeysockets/baileys";
import { deleteReactionhandler } from "./delete/react";
import { deleteHandler } from "./delete/request";
import { edunexHandler } from "./edunex";
import { stickerCommandHandler } from "./sticker/create";
import { viewOnceAcceptHandler } from "./viewonce/accepted";
import { viewOnceCommandHandler } from "./viewonce/view";
import { confessHandler } from "./anons/confess";
import { broadcastHandler } from "./anons/broadcast";

export async function mainHandler(sock: WASocket, msg: Messages) {
  const parser = new Parser([".", "/"], msg.text);
  console.log("==============================");
  console.log(parser.command, JSON.stringify(parser.args, null, 2));
  // console.log("Received msg:", msg);
  console.log("==============================");

  const ctx = { sock, msg, parser };

  if (parser.command === "ping") {
    await sock.sendMessage(msg.chat, { text: "Pong!" });
  }

  if (parser.command === "stk") {
    await stickerCommandHandler(ctx);
  }

  if (parser.command === "vo") {
    await viewOnceCommandHandler(ctx);
  }

  if (parser.command === "edunex" && msg.from === process.env.OWNER) {
    await edunexHandler(ctx);
  }

  if (parser.command === "del") {
    await deleteHandler(ctx);
  }

  if (parser.command === "debug") {
    await sock.sendMessage(msg.chat, { text: JSON.stringify(msg.raw, BufferJSON.replacer, 2).trim() });
  }

  if (parser.command === "iya") {
    await sock.sendMessage(msg.chat, { sticker: iya_njir });
  }

  if (parser.command === "confess" && msg.chatType === "private" && process.env.CONFESS_TARGET) {
    await confessHandler(ctx);
  }

  if (parser.command === "args" && msg.from === process.env.OWNER) {
    return await msg.replyText(JSON.stringify(parser.args, null, 2), true);
  }

  if (parser.command === "broadcast" && msg.from === process.env.OWNER) {
    return await broadcastHandler(ctx);
  }

  if (parser.command === "id") {
    return await msg.replyText(`Your ID: ${msg.from}\nChat ID: ${msg.chat}`, true);
  }

  if (msg.reaction) {
    await viewOnceAcceptHandler(ctx);
    await deleteReactionhandler(ctx);
  }

  if (parser.command === "asdfghjkl" && msg.from === process.env.OWNER) {
    const res = await edunexCourseListCronJob(new FileLogger("edunex-test"), msg.sessionName, sock);
    await msg.replyText(res, true);
  }
}
