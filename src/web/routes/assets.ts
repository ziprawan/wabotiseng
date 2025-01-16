import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

const assetsRouter = new Hono();

assetsRouter.all("/", async (c, n) => {
  return c.redirect("/assets/", 301);
});

assetsRouter.use(
  "/*",
  serveStatic({
    root: "./",
    rewriteRequestPath: (path) => path.replace(/^\/assets/, "/src/web/assets"),
  })
);

export default assetsRouter;
