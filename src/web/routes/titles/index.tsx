import TitlesIndexPage from "#web/pages/user/titles";
import { AuthContextVariables } from "#web/types/authVariables";
import { TitlesContextVariables } from "#web/types/titlesVariables";
import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { Hono } from "hono";
import { sql } from "kysely";
import titlesAdminRouter from "./admin";
import titleHoldersRouter from "./holders";
import titlesRouter from "./titles";

const indexTitleRouter = new Hono<{ Variables: AuthContextVariables & TitlesContextVariables }>();

indexTitleRouter.all("/", async (c) => {
  const loginInfo = c.get("loggedInAs")!;
  try {
    const groups = (
      await postgresDb
        .selectFrom("participant as p")
        .innerJoin("group as g", "g.id", "p.group_id")
        .select(["g.subject", "g.remote_jid"])
        .select(sql<string>`SUBSTRING("g"."desc" FROM 0 FOR 200)`.as("desc"))
        .where("p.participant_jid", "=", loginInfo.jid)
        .where("g.creds_name", "=", projectConfig.SESSION_NAME)
        .execute()
    ).map(({ remote_jid, ...others }) => ({ ...others, remote_jid: remote_jid.split("@")[0] }));

    return c.html(<TitlesIndexPage groups={groups} />);
  } catch (err) {
    return c.text("Internal server error.", 500);
  }
});

indexTitleRouter.route("/:group_id", titlesRouter);
indexTitleRouter.route("/:group_id/holders", titleHoldersRouter);
indexTitleRouter.route("/:group_id", titlesAdminRouter);

export default indexTitleRouter;
