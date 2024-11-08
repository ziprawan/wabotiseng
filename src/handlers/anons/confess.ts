import { CommandHandlerFunc } from "@/types/command/handler";

const CONFESS_TARGET = process.env.CONFESS_TARGET;

export const confessHandler: CommandHandlerFunc = async ({ msg, parser, sock }) => {
  if (!CONFESS_TARGET) return;

  if (!msg.from || msg.chatType !== "private") {
    return;
  }

  const cmd = parser.command as string;
  const pfx = parser.usedPrefix as string;
  const confessMsg = parser.text.replace(pfx + cmd, "").trim();

  return await sock.sendMessage(CONFESS_TARGET, { text: `Chat! Someone confessed that\n${confessMsg}` });
};