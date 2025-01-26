import { CommandHandlerFunc } from "#bot/types/command/handler";
import { FormatterData } from "#bot/types/whatsapp/formatter";
import { formatReplacer } from "#bot/utils/whatsapp/formatter/replacer";
import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";

export const setWelcomeHandler: CommandHandlerFunc = async ({ msg, parser }) => {
  if (msg.chatType !== "group") return;

  const groupJid = msg.chat;
  const participantJid = msg.from;

  console.log(
    msg.chatType,
    msg.msgKey.participant,
    msg.raw.participant,
    participantJid,
    projectConfig.SESSION_NAME,
    groupJid
  );

  const groupData = await postgresDb
    .selectFrom("group as g")
    .innerJoin("participant as p", (cb) => cb.onRef("p.group_id", "=", "g.id").on("p.participant_jid", "=", participantJid))
    .select(["g.id", "p.role as pRole", "g.subject"])
    .where("g.creds_name", "=", projectConfig.SESSION_NAME)
    .where("g.remote_jid", "=", groupJid)
    .executeTakeFirst();

  if (!groupData) {
    msg.runtimeLogger.error(`Couldn't find id for group ${groupJid} but how can this bot interact with this group?`);
    return await msg.replyText("[SWH000] Internal server error", true);
  }

  if (groupData.pRole === "MEMBER") {
    return await msg.replyText("Kamu bukan admin", true);
  }

  const args = parser.args();

  if (args.length < 1) {
    return await msg.replyText("Kasih isinya dong..", true);
  }

  const greeting_message = parser.text.slice(args[0].start);

  const [_, errors, usedVars] = formatReplacer<FormatterData>(greeting_message, {
    groupid: msg.chat.split("@")[0],
    groupsubject: groupData.subject,
    mention: [],
    inviter: "",
  });

  const res = await postgresDb
    .insertInto("group_settings")
    .values({ group_id: groupData.id, greeting_message })
    .onConflict((oc) => oc.constraint("group_settings_pk").doUpdateSet({ greeting_message }))
    .executeTakeFirst();

  console.log(res);

  return msg.replyText(
    errors.length === 0
      ? "Pesan sambutan berhasil disimpan!"
      : `Pesan sambutan berhasil disimpam dengan beberapa error:\n${errors.map((e, i) => `${i + 1}. ${e}`)}`
  );
};
