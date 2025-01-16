import { AuthContextVariables } from "#web/types/authVariables";
import { verify } from "#web/utils/jwt";
import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { MiddlewareHandler } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";

const BLACKLIST_PATHS: Array<{ path: string; type: "exact" | "startsWith" }> = [
  { path: "/favicon.ico", type: "exact" },
  { path: "/docs/", type: "startsWith" },
  { path: "/assets/", type: "startsWith" },
];

export const authMiddleware: MiddlewareHandler<{ Variables: AuthContextVariables }> = async (c, next) => {
  const url = new URL(c.req.url);
  let blacklisted = false;

  for (let i = 0; i < BLACKLIST_PATHS.length; i++) {
    const data = BLACKLIST_PATHS[i];

    if (data.type === "exact") {
      if (data.path === url.pathname) {
        blacklisted = true;
        break;
      }
    } else if (data.type === "startsWith") {
      if (url.pathname.startsWith(data.path)) {
        blacklisted = true;
        break;
      }
    }
  }

  if (!blacklisted) {
    console.log("Check auth");
    const auth = getCookie(c, "auth");

    if (auth) {
      const verified = await verify(auth);

      if (verified && typeof verified.jid === "string") {
        const res = await postgresDb
          .selectFrom("contact as c")
          .where("c.creds_name", "=", projectConfig.SESSION_NAME)
          .where("c.remote_jid", "=", verified.jid)
          .select(["c.saved_name", "c.id", "c.remote_jid", "c.entity_id"])
          .executeTakeFirst();

        if (res) {
          c.set("loggedInAs", { contact_id: res.id, entity_id: res.entity_id, name: res.saved_name, jid: res.remote_jid });
        }
      } else {
        deleteCookie(c, "auth");
      }
    }
  }

  await next();
};
