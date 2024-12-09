import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "@/types/command/handler";
import { EdunexAPI } from "@/utils/edunex/api";

const EDUNEX_NOT_LOGGED_IN_MSG = `
The current method to log in to Edunex requires using a token.
This method requires a desktop device such as a laptop or PC, as it will utilize the browser's inspect feature.

Here are the steps:
1. Open the Edunex site in your browser.
2. Log in using your account.
3. Open the inspect menu by right-clicking and selecting inspect, or by pressing the F12 key on your keyboard.
4. Open the Console tab.
5. Enter the following code:
\`console.log(JSON.parse(localStorage.auth).accessToken)\`
6. Copy the token that appears in the Console.
7. Return to this chat and type (without the <>):
.edunex login <token>

Good luck!
`;

export const edunexLoginHandler: CommandHandlerFunc = async ({ msg, parser, sock }) => {
  if (!msg.from || msg.chatType !== "private") {
    return await msg.replyText("Use this feature from private chat.");
  }

  const args = parser.args();

  const savedSettings = await postgresDb
    .selectFrom("edunex_account as ea")
    .select(["ea.token", "ea.id"])
    .innerJoin("contact as c", "c.id", "ea.user_id")
    .innerJoin("entity as e", "e.id", "c.id")
    .where("ea.creds_name", "=", msg.sessionName)
    .where("e.remote_jid", "=", msg.from)
    .executeTakeFirst();

  if (args.length === 1) {
    if (savedSettings) {
      const edunex = new EdunexAPI(savedSettings.token);
      const me = await edunex.getMe();

      if (typeof me === "string") {
        await postgresDb.deleteFrom("edunex_account as ea").where("ea.id", "=", savedSettings.id).execute();
        return await msg.replyText("Invalid token! Logging out...");
      }

      return await msg.replyText(`You are already logged in as ${me.name}!`);
    } else {
      return await msg.replyText(EDUNEX_NOT_LOGGED_IN_MSG.trim());
    }
  }

  const token = args[1];

  if (!token) {
    return await msg.replyText("That's weird, you should report this error to me! [EDX0001]");
  }

  const edunex = new EdunexAPI(token.content);
  const me = await edunex.getMe();

  console.log(me);

  if (typeof me === "string") {
    return await msg.replyText("Invalid token! Please try again.");
  }

  await postgresDb
    .insertInto("edunex_account")
    .values(({ selectFrom }) => ({
      token: token.content,
      creds_name: msg.sessionName,
      user_id: selectFrom("entity as e").select("e.id").where("e.creds_name", "=", msg.from).where("e.type", "=", "Contact"),
    }))
    .execute();

  return await msg.replyText("Berhasil login ke akun Edunex sebagai " + me.name);
};
