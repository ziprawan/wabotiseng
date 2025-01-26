import { CommandHandlerFunc } from "#bot/types/command/handler";
import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";

export const titleListHandler: CommandHandlerFunc = async (ctx) => {
  const titles = await postgresDb
    .selectFrom("title as t")
    .select((eb) => [
      "t.title_name",
      "t.claimable",
      eb
        .exists(
          eb
            .selectFrom("title_holder as th")
            .innerJoin("participant as p", "p.id", "th.participant_id")
            .where("p.participant_jid", "=", ctx.msg.from)
            .whereRef("th.title_id", "=", "t.id")
        )
        .as("holding"),
    ])
    .innerJoin("group as g", "g.id", "t.group_id")
    .where("g.remote_jid", "=", ctx.msg.chat)
    .where("g.creds_name", "=", projectConfig.SESSION_NAME)
    .execute();

  let content = "List title yang ada di grup ini:\n\n";
  content += titles
    .map((t) => `- ${t.title_name}${t.claimable ? "" : " (not claimable)"}${t.holding ? " ✅" : ""}`)
    .join("\n");
  content += `\n\nClaim more titles here: ${projectConfig.WEB_BASE}/user/titles`;

  return await ctx.msg.replyText(content);
};
