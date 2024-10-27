import { CommandHandlerFunc } from "@/types/command/handler";
import { botDatabase } from "@/utils/database/client";
import { edunexLoginHandler } from "./login";

const EDUNEX_WELCOME_MSG = `
Welcome to the Edunex feature!

For further usage of this command, use .edunex <command> <argument>.

Here are some commands you can use:
- login
Log in to your Edunex account. Login instructions will be explained there.

- notif <on/off>
Enable or disable notifications from Edunex in this chat.
`;

export const edunexHandler: CommandHandlerFunc = async (ctx) => {
  const { msg, parser } = ctx;

  if (parser.args.length === 0) {
    return await msg.replyText(EDUNEX_WELCOME_MSG.trim());
  }

  const cmd = parser.args[0].toLowerCase();

  if (cmd === "login") {
    return await edunexLoginHandler(ctx);
  }
};
