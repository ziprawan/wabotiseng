import TitlesAdminCreate from "#web/pages/user/titles/create";
import { AuthContextVariables } from "#web/types/authVariables";
import { TitlesContextVariables } from "#web/types/titlesVariables";
import { postgresDb } from "@/database/client";
import { Hono } from "hono";
import { z } from "zod";

const createTitleSchema = z.object(
  {
    titleName: z
      .string()
      .min(3, "shortTitle")
      .max(100, "longTitle")
      .regex(/^[a-zA-Z0-9]*$/, "invalidTitle"),
  },
  { invalid_type_error: "invalidBody" }
);

const titlesAdminRouter = new Hono<{ Variables: AuthContextVariables & TitlesContextVariables }, {}, "/:group_id">();

titlesAdminRouter.use("*", async (c, n) => {
  console.log("Check participant role");
  const groupInfo = c.get("groupInfo");

  if (!groupInfo || groupInfo.me.role === "MEMBER") return c.text("404 Not Found", 404);
  await n();
});

titlesAdminRouter
  .get("/create", (c) => {
    const groupInfo = c.get("groupInfo");
    if (!groupInfo) return c.text("500 Internal Server Error", 500);

    return c.html(<TitlesAdminCreate groupInfo={groupInfo} failReason={c.req.query("failReason")} />);
  })
  .post(async (c) => {
    const groupInfo = c.get("groupInfo");
    if (!groupInfo) return c.text("500 Internal Server Error", 500);

    if (!["multipart/form-data", "application/x-www-form-urlencoded"].includes(c.req.header("Content-Type") ?? "")) {
      return c.text("Request Content-Type is not multipart/form-data or application/x-www-form-urlencoded.", 400);
    }

    const body = await c.req.parseBody();
    const url = new URL(c.req.url);
    const zodResult = createTitleSchema.safeParse(body);

    if (!zodResult.success) {
      try {
        const parsed = JSON.parse(zodResult.error.message);
        url.searchParams.set("failReason", parsed[0].message);
        return c.redirect(url.href);
      } catch (err) {
        console.error(err);
        url.searchParams.set("failReason", "invalidBody");
        return c.redirect(url.href);
      }
    }

    const { titleName } = zodResult.data;

    const executed = await postgresDb
      .insertInto("title")
      .values({ group_id: groupInfo.group.id, title_name: titleName.toLowerCase(), claimable: true })
      .returning("id")
      .onConflict((oc) => oc.columns(["group_id", "title_name"]).doNothing())
      .executeTakeFirst();

    if (!executed) {
      url.searchParams.set("failReason", "titleTaken");
      return c.redirect(url);
    }

    url.pathname = `/user/titles/${groupInfo.group.jid.split("@")[0]}`;
    url.searchParams.delete("failReason");

    return c.redirect(url);
  });

export default titlesAdminRouter;
