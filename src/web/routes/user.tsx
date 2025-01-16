import UserIndexPage from "#web/pages/user";
import { AuthContextVariables } from "#web/types/authVariables";
import { Hono } from "hono";
import indexTitleRouter from "./titles";

const userRouter = new Hono<{ Variables: AuthContextVariables }>();

userRouter.use("*", async (c, next) => {
  const loginInfo = c.get("loggedInAs");
  if (!loginInfo) return c.text("Forbidden.", 403);
  else await next();
});
userRouter.all("/", (c) => c.html(<UserIndexPage />));

userRouter.route("/titles", indexTitleRouter);

export default userRouter;
