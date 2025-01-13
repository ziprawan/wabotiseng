import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "#bot/types/command/handler";

export const taggedHandler: CommandHandlerFunc = async ({ msg, parser, sock }) => {
  if (msg.chatType !== "group") return;

  const tagged = parser.tagged();

  if (tagged.length === 0) return;

  const foundTitles = await postgresDb
    .selectFrom("title as t")
    .select(["t.id", "t.title_name"])
    .innerJoin("entity as e", (cb) =>
      cb.onRef("e.id", "=", "t.group_id").on("e.type", "=", "Group").on("e.creds_name", "=", projectConfig.SESSION_NAME)
    )
    .where("e.remote_jid", "=", msg.chat)
    .where("t.title_name", "in", tagged)
    .execute();

  const taggedParticipants = await postgresDb
    .selectFrom("title_holder as th")
    .innerJoin("participant as p", "p.id", "th.participant_id")
    .select(["p.participant_jid"])
    .where(
      "th.title_id",
      "in",
      foundTitles.map((f) => f.id)
    )
    .groupBy(["p.participant_jid"])
    .execute();

  return await sock.sendMessage(
    msg.chat,
    {
      text: foundTitles.map((f) => `@${f.title_name}`).join(" "),
      mentions: taggedParticipants.map((t) => t.participant_jid),
    },
    { quoted: msg.raw }
  );
};
