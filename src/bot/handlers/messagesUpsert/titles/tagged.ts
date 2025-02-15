import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "#bot/types/command/handler";

export const taggedHandler: CommandHandlerFunc = async ({ msg, parser, sock }) => {
  if (msg.chatType !== "group") return;

  const tagged = parser.tagged().map((t) => t.toLowerCase());

  if (tagged.length === 0) return;
  const mentionsAddons: string[] = [];
  const taggedAddons: string[] = [];

  if (tagged.includes("all")) {
    const all = await postgresDb
      .selectFrom("participant as p")
      .select("p.participant_jid")
      .innerJoin("group as g", "g.id", "p.group_id")
      .where("g.creds_name", "=", projectConfig.SESSION_NAME)
      .where("g.remote_jid", "=", msg.chat)
      .execute();

    mentionsAddons.push(...all.map((a) => a.participant_jid));
    taggedAddons.push("all");
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

    mentionsAddons.push(...admins.map((a) => a.participant_jid));
    taggedAddons.push("admin");
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

    mentionsAddons.push(...superadmins.map((s) => s.participant_jid));
    taggedAddons.push("superadmin");
  }

  const foundTitles = await postgresDb
    .selectFrom("title as t")
    .innerJoin("group as g", (cb) => cb.onRef("g.id", "=", "t.group_id").on("g.creds_name", "=", projectConfig.SESSION_NAME))
    .select(["t.id", "t.title_name"])
    .where("g.remote_jid", "=", msg.chat)
    .where("t.title_name", "in", tagged)
    .execute();

  if (foundTitles.length > 0) {
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
    mentionsAddons.push(...taggedParticipants.map((tp) => tp.participant_jid));
  }

  const mentions = [...new Set([...mentionsAddons])];
  foundTitles.push(...taggedAddons.map((ta) => ({ id: "-1", title_name: ta })));

  if (foundTitles.length === 0 || mentions.length === 0) return;

  return await sock.sendMessage(
    msg.chat,
    {
      text: foundTitles.map((f) => `@${f.title_name}`).join(" "),
      mentions,
    },
    { quoted: msg.raw }
  );
};
