import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "#bot/types/command/handler";

export const taggedHandler: CommandHandlerFunc = async ({ msg, parser, sock }) => {
  if (msg.chatType !== "group") return;

  const tagged = parser.tagged();

  if (tagged.length === 0) return;
  const addons: string[] = [];

  if (tagged.includes("all")) {
    const all = await postgresDb
      .selectFrom("participant as p")
      .select("p.participant_jid")
      .innerJoin("group as g", "g.id", "p.group_id")
      .where("g.creds_name", "=", projectConfig.SESSION_NAME)
      .where("g.remote_jid", "=", msg.chat)
      .execute();

    addons.push(...all.map((a) => a.participant_jid));
  }

  if (tagged.includes("admin")) {
    const admins = await postgresDb
      .selectFrom("participant as p")
      .select("p.participant_jid")
      .innerJoin("group as g", "g.id", "p.group_id")
      .where("g.creds_name", "=", projectConfig.SESSION_NAME)
      .where("g.remote_jid", "=", msg.chat)
      .where("p.role", "!=", "MEMBER")
      .execute();

    addons.push(...admins.map((a) => a.participant_jid));
  }

  if (tagged.includes("superadmin")) {
    const superadmins = await postgresDb
      .selectFrom("participant as p")
      .select("p.participant_jid")
      .innerJoin("group as g", "g.id", "p.group_id")
      .where("g.creds_name", "=", projectConfig.SESSION_NAME)
      .where("g.remote_jid", "=", msg.chat)
      .where("p.role", "=", "SUPERADMIN")
      .execute();

    addons.push(...superadmins.map((s) => s.participant_jid));
  }

  const foundTitles = await postgresDb
    .selectFrom("title as t")
    .innerJoin("group as g", (cb) => cb.onRef("g.id", "=", "t.group_id").on("g.creds_name", "=", projectConfig.SESSION_NAME))
    .select(["t.id", "t.title_name"])
    .where("g.remote_jid", "=", msg.chat)
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

  const mentions = [...new Set([...taggedParticipants.map((t) => t.participant_jid), ...addons])];

  return await sock.sendMessage(
    msg.chat,
    {
      text: foundTitles.map((f) => `@${f.title_name}`).join(" "),
      mentions,
    },
    { quoted: msg.raw }
  );
};
