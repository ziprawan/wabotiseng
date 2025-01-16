import TitleHoldersPage from "#web/pages/user/titles/holders";
import { AuthContextVariables } from "#web/types/authVariables";
import { Titles, TitlesWithHolders } from "#web/types/titles";
import { TitlesContextVariables } from "#web/types/titlesVariables";
import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { Hono } from "hono";

const titleHoldersRouter = new Hono<
  { Variables: AuthContextVariables & TitlesContextVariables },
  {},
  "/:group_id/holders"
>();

titleHoldersRouter.all("/", (c) => c.text("200 Ok", 200));

titleHoldersRouter.use("/:title_id/*", async (c, next) => {
  const title_id = c.req.param("title_id");
  const titles = c.get("titles");

  if (!titles) return c.text("500 Internal Server Error", 500);

  const holders = await postgresDb
    .selectFrom("title_holder as th")
    .innerJoin("participant as p", "p.id", "th.participant_id")
    .leftJoin("contact as c", (cb) =>
      cb.onRef("c.remote_jid", "=", "p.participant_jid").on("c.creds_name", "=", projectConfig.SESSION_NAME)
    )
    .select(["p.participant_jid as jid", "c.saved_name as name"])
    .where("th.title_id", "=", title_id)
    .execute();

  const filteredTitle = titles?.filter((t) => t.id === title_id)[0] as Titles;
  const titleInfo: TitlesWithHolders = {
    ...filteredTitle,
    holders,
  };

  c.set("titleInfo", titleInfo);

  await next();
});

titleHoldersRouter.all("/:title_id", async (c) => {
  const groupInfo = c.get("groupInfo");
  const titleInfo = c.get("titleInfo");

  if (!groupInfo || !titleInfo) return c.text("500 Internal Server Error", 500);

  const query = c.req.query();
  let result = "";

  if (query.success && query.failReason) result = "???";
  else if (typeof query.success === "string") {
    result = "success";
  } else if (typeof query.failReason === "string") result = query.failReason;

  return c.html(<TitleHoldersPage groupInfo={groupInfo} titleInfo={titleInfo} result={result} />);
});

titleHoldersRouter.post("/:title_id/assign", async (c) => {
  const groupInfo = c.get("groupInfo");
  const titleInfo = c.get("titleInfo");
  if (!groupInfo || !titleInfo) return c.text("500 Internal Server Error", 500);

  if (groupInfo.me.role === "MEMBER") return c.text("404 Not Found", 404);

  if (!["multipart/form-data", "application/x-www-form-urlencoded"].includes(c.req.header("Content-Type") ?? "")) {
    return c.text("Request Content-Type is not multipart/form-data or application/x-www-form-urlencoded.", 400);
  }

  const body = await c.req.parseBody();
  const { title_id } = c.req.param();
  const entries = Object.entries(body);
  const { participants, jid } = groupInfo.group;
  const { holders } = titleInfo;

  const participantIds: Record<string, string> = {};
  const holdingStates: Record<string, boolean> = {};
  const validBodies: Record<string, true> = {};

  const adds: string[] = []; // Array of participant_jid to add to title holders
  const rems: string[] = []; // Array of participant_jid to remove to title holders

  // Well, O(h + 2 * p + e) time complexity? IDK tho
  // h for holders length
  // p for participants length
  // e for entries length

  holders.forEach(({ jid }) => {
    holdingStates[jid] = true;
  });

  participants.forEach(({ jid, id }) => {
    participantIds[jid] = id;
    if (holdingStates[jid] !== true) holdingStates[jid] = false;
  });

  entries.forEach(([jid, value]) => {
    const holdingState = holdingStates[jid];
    if (value !== "y" || holdingState === undefined) return;
    validBodies[jid] = true;
    if (holdingState === false) adds.push(participantIds[jid]);
  });

  participants.forEach(({ jid }) => {
    if (holdingStates[jid] === true && validBodies[jid] === undefined) rems.push(participantIds[jid]);
  });

  const ignoredLength = entries.length - adds.length;
  c.header("X-Ignored-Length", String(ignoredLength));

  if (adds.length > 0) {
    // Insert all adds
    await postgresDb
      .insertInto("title_holder")
      .values(adds.map((add) => ({ participant_id: add, title_id })))
      .execute();
  }

  if (rems.length > 0) {
    // Delete all rems
    await postgresDb
      .deleteFrom("title_holder as th")
      .where("th.participant_id", "in", rems)
      .where("th.title_id", "=", title_id)
      .execute();
  }

  const modifiedLength = adds.length + rems.length;

  return c.redirect(
    `/user/titles/${jid.split("@")[0]}/holders/${title_id}?` + (modifiedLength === 0 ? "failReason=notModified" : "success")
  );
});

export default titleHoldersRouter;
