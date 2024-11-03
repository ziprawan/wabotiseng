import { WASocket } from "@/types/socket";
import { Messages } from "@/utils/classes/message";
import { Parser } from "@/utils/classes/parser";
import { stickerCommandHandler } from "./sticker/create";
import { viewOnceCommandHandler } from "./viewonce/view";
import { viewOnceAcceptHandler } from "./viewonce/accepted";
import { edunexHandler } from "./edunex";
import { edunexCourseListCronJob } from "@/crons/edunex/course-list";
import { FileLogger } from "@/utils/logger/file";
import { deleteHandler } from "./delete/request";
import { deleteReactionhandler } from "./delete/react";
import { BufferJSON } from "@whiskeysockets/baileys";
import { readFileSync } from "node:fs";
import { iya_njir } from "@/stickers";

export async function mainHandler(sock: WASocket, msg: Messages) {
  const parser = new Parser([".", "/"], msg.text);
  console.log("==============================");
  console.log(parser.command, parser.args);
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

  if (parser.command === "edunex") {
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

  if (msg.reaction) {
    await viewOnceAcceptHandler(ctx);
    await deleteReactionhandler(ctx);
  }

  if (parser.command === "asdfghjkl") {
    await edunexCourseListCronJob(new FileLogger("edunex-test"), msg.sessionName, sock);
  }
}
