import IndexPage from "#web/pages";
import { AuthContextVariables } from "#web/types/authVariables";
import { Hono } from "hono";

const homeRouter = new Hono<{ Variables: AuthContextVariables }>();

homeRouter.all("/", (c) => {
  const user = c.get("loggedInAs");
  return c.html(<IndexPage loggedInAs={user ? user.name : null} />);
});

export default homeRouter;
