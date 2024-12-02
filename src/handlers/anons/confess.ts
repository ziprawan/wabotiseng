import { projectConfig } from "@/config";
import { CommandHandlerFunc } from "@/types/command/handler";

const CONFESS_TARGET = projectConfig.CONFESS_TARGET;

export const confessHandler: CommandHandlerFunc = async ({ msg, parser, sock }) => {
  if (!CONFESS_TARGET) return;

  if (!msg.from || msg.chatType !== "private") {
    return;
  }

  const cmd = parser.command as string;
  const pfx = parser.usedPrefix as string;
  const confessMsg = parser.text.replace(pfx + cmd, "").trim();

  if (confessMsg === "") {
    return await msg.replyText("Kasih pesannya dong kak (⁠ ⁠･ั⁠﹏⁠･ั⁠)");
  }

  return await sock.sendMessage(CONFESS_TARGET, { text: `Chat! Someone confessed that\n${confessMsg}` });
};
