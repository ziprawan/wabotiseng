import UserIndexPage from "#web/pages/user";
import { AuthContextVariables } from "#web/types/authVariables";
import { Hono } from "hono";
import indexTitleRouter from "./titles";
import { botClient } from "#bot/index";

const userRouter = new Hono<{ Variables: AuthContextVariables }>();

userRouter.use("*", async (c, next) => {
  const loginInfo = c.get("loggedInAs");
  if (!loginInfo) {
    const botNumber = botClient.session?.state.creds.me?.id;

    if (!botNumber) return c.text("500 Internal Server Error", 500);

    return c.redirect(`https://wa.me/+${botNumber.split("@")[0].split(":")[0]}?text=.login`);
  } else {
    await next();
  }
});
userRouter.all("/", (c) => c.html(<UserIndexPage />));

userRouter.route("/titles", indexTitleRouter);

export default userRouter;
