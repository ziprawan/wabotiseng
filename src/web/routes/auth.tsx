import MainAuthPage from "#web/pages/auth";
import AuthAlreadyLoggedIn from "#web/pages/auth/loggedIn";
import { AuthContextVariables } from "#web/types/authVariables";
import { sign } from "#web/utils/jwt";
import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { randomizeCode } from "@/utils/generics/randomizeNumber";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import * as z from "zod";

const loginSchema = z.object({
  remoteJid: z.string(),
  code: z.string().length(6),
});

const authRouter = new Hono<{ Variables: AuthContextVariables }>();

authRouter.use("*", async (c, next) => {
  const url = new URL(c.req.url);

  if (url.pathname.endsWith("/")) {
    let removedSlash = "";
    let isSlash = true;
    for (let i = url.pathname.length - 1; i >= 0; i--) {
      const char = url.pathname[i];

      if (char !== "/" || !isSlash) {
        isSlash = false;
        removedSlash = char + removedSlash;
      }
    }

    url.pathname = removedSlash;

    return c.redirect(url);
  } else await next();
});

authRouter.all("/", async (c) => {
  const loginInfo = c.get("loggedInAs");

  if (loginInfo) return c.html(<AuthAlreadyLoggedIn name={loginInfo.name} />);

  return c.html(<MainAuthPage failReason={c.req.query("failReason")} />);
});

authRouter.all("/signin", async (c) => {
  if (c.req.method.toLowerCase() !== "post") return c.text("Method not allowed.", 405);

  const loginInfo = c.get("loggedInAs");

  if (loginInfo) return c.redirect("/");

  if (!["multipart/form-data", "application/x-www-form-urlencoded"].includes(c.req.header("Content-Type") ?? "")) {
    return c.text("Request Content-Type is not multipart/form-data or application/x-www-form-urlencoded.", 400);
  }

  const parsedBody = await c.req.parseBody();
  const zodResult = loginSchema.safeParse(parsedBody);

  if (!zodResult.success) {
    try {
      const parsed = JSON.parse(zodResult.error.message)[0];
      const reason =
        parsed.code === "invalid_type" ? "invalidType" : parsed.code === "too_small" ? "invalidCodeLength" : "unknwonError";

      return c.redirect("/auth?failReason=" + reason);
    } catch (err) {
      console.log(err);
      return c.text("Internal server error.", 500);
    }
  }

  const remoteJid = zodResult.data.remoteJid + "@s.whatsapp.net";
  const code = zodResult.data.code;

  const serverCode = await postgresDb
    .selectFrom("contact as c")
    .select("c.signin_code as code")
    .where("c.remote_jid", "=", remoteJid)
    .where("c.creds_name", "=", projectConfig.SESSION_NAME)
    .executeTakeFirst();

  if (!serverCode) {
    return c.redirect("/auth?failReason=userNotFound");
  }

  if (serverCode.code !== code) {
    return c.redirect("/auth?failReason=invalidCode");
  }

  await postgresDb
    .updateTable("contact as c")
    .set({ signin_code: randomizeCode() })
    .where("c.remote_jid", "=", remoteJid)
    .where("c.creds_name", "=", projectConfig.SESSION_NAME)
    .execute();

  setCookie(c, "auth", await sign({ jid: remoteJid }), { expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

  return c.redirect("/");
});

authRouter.get("/signout", (c) => {
  deleteCookie(c, "auth");
  return c.redirect("/");
});

export default authRouter;
