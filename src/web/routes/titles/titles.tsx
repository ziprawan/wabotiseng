import TitlesGroupPage from "#web/pages/user/titles/group";
import { AuthContextVariables } from "#web/types/authVariables";
import { GroupInfo, ParticipantInfo, Titles } from "#web/types/titles";
import { TitlesContextVariables } from "#web/types/titlesVariables";
import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { isLiterallyNumeric } from "@/utils/generics/isNumeric";
import { Hono } from "hono";
import { jsonArrayFrom } from "kysely/helpers/postgres";

const titlesRouter = new Hono<{ Variables: AuthContextVariables & TitlesContextVariables }, {}, "/:group_id">();

titlesRouter.use("*", async (c, next) => {
  const loginInfo = c.get("loggedInAs");
  if (!loginInfo) return c.text("403 Forbidden", 403);

  const participantJid = loginInfo.jid;
  const groupJid = c.req.param("group_id") + "@g.us";

  const foundAllParticipants = await postgresDb
    .selectFrom("group as g")
    .innerJoin("participant as p", "p.group_id", "g.id")
    .select((eb) => [
      "g.id as group_id",
      "g.remote_jid as group_jid",
      "g.subject as group_name",
      jsonArrayFrom(
        eb
          .selectFrom("participant as p")
          .leftJoin("contact as c", (cb) =>
            cb.onRef("c.remote_jid", "=", "p.participant_jid").on("c.creds_name", "=", projectConfig.SESSION_NAME)
          )
          .select(["c.saved_name as name", "p.role", "p.id", "p.participant_jid as jid"])
          .whereRef("p.group_id", "=", "g.id")
      ).as("participants"),
    ])
    .where("g.creds_name", "=", projectConfig.SESSION_NAME)
    .where("g.remote_jid", "=", groupJid)
    .where("p.participant_jid", "=", participantJid)
    .executeTakeFirst();

  if (!foundAllParticipants) return c.text("404 Not Found", 404);

  const groupInfo: GroupInfo = {
    me: foundAllParticipants.participants.find((p) => p.jid === participantJid) as ParticipantInfo,
    group: {
      id: foundAllParticipants.group_id,
      jid: foundAllParticipants.group_jid,
      participants: foundAllParticipants.participants,
      name: foundAllParticipants.group_name,
    },
  };

  const titlesQuery = postgresDb
    .selectFrom("title as t")
    .select((eb) => [
      "t.id",
      "t.title_name",
      "t.claimable",
      eb
        .exists(
          eb
            .selectFrom("title_holder as th")
            .whereRef("th.title_id", "=", "t.id")
            .where("th.participant_id", "=", groupInfo.me.id)
        )
        .as("holding"),
    ])
    .where("t.group_id", "=", groupInfo.group.id);

  const foundTitles: Titles[] = (await titlesQuery.execute()).map(({ holding, ...others }) => {
    return {
      ...others,
      holding: holding as boolean,
    };
  });

  c.set("groupInfo", groupInfo);
  c.set("titles", foundTitles);

  await next();
});

titlesRouter.get("/", (c) => {
  const groupInfo = c.get("groupInfo");
  const titles = c.get("titles");

  if (!groupInfo || !titles) return c.text("403 Forbidden", 403);

  const query = c.req.query();

  let result = "";

  if (query.success && query.failReason) result = "???";
  else if (typeof query.success === "string") {
    result = "success";
  } else if (typeof query.failReason === "string") result = query.failReason;

  return c.html(<TitlesGroupPage groupInfo={groupInfo} titles={titles} result={result} />);
});

titlesRouter.post("/assign", async (c) => {
  const groupInfo = c.get("groupInfo");
  const titles = c.get("titles");

  if (!groupInfo || !titles) return c.text("500 Internal server error", 500);

  if (!["multipart/form-data", "application/x-www-form-urlencoded"].includes(c.req.header("Content-Type") ?? "")) {
    return c.text("Request Content-Type is not multipart/form-data or application/x-www-form-urlencoded.", 400);
  }

  const body = await c.req.parseBody();

  const adds: string[] = []; // Array of title_id to add from participant
  const rems: string[] = []; // Array of title_id to remove from participant
  const filteredTitles = titles.filter((t) => t.claimable).map((t) => ({ id: t.id, holding: t.holding }));

  const entries = Object.entries(body);
  const validBodyIds = entries.filter(([k, v]) => isLiterallyNumeric(k) && v === "y").map((k) => k[0]);

  filteredTitles.forEach(({ id, holding }) => {
    if (holding && !validBodyIds.includes(id)) {
      rems.push(id);
    } else if (!holding && validBodyIds.includes(id)) {
      adds.push(id);
    }
  });

  const ignoredLength = entries.length - adds.length;
  c.header("X-Ignored-Length", String(ignoredLength));

  if (adds.length > 0) {
    // Insert all adds
    await postgresDb
      .insertInto("title_holder")
      .values(adds.map((add) => ({ participant_id: groupInfo.me.id, title_id: add })))
      .execute();
  }

  if (rems.length > 0) {
    // Delete all rems
    await postgresDb
      .deleteFrom("title_holder as th")
      .where("th.participant_id", "=", groupInfo.me.id)
      .where("th.title_id", "in", rems)
      .execute();
  }

  const modifiedLength = adds.length + rems.length;

  return c.redirect(
    `/user/titles/${groupInfo.group.jid.split("@")[0]}?` + (modifiedLength === 0 ? "failReason=notModified" : "success")
  );
});

export default titlesRouter;
