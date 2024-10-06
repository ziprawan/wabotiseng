import { WASocket } from "@/types/socket";
import { Messages } from "@/utils/classes/message";
import { Parser } from "@/utils/classes/parser";
import { stickerCommandHandler } from "./sticker/create";

export async function mainHandler(sock: WASocket, msg: Messages) {
  const parser = new Parser(["."], msg.text);
  console.log("==============================");
  console.log(parser.command, parser.args);
  // console.log("Received msg:", msg);
  console.log("==============================");

  if (parser.command === "ping") {
    await sock.sendMessage(msg.chat, { text: "Pong!" });
  }

  if (parser.command === "stk") {
    await stickerCommandHandler({ sock, msg, parser });
  }
}