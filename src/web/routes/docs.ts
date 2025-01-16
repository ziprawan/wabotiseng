import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

const docsRouter = new Hono();

docsRouter.all("/", (c) => c.redirect("/docs/", 301));

docsRouter.use(
  "/*",
  serveStatic({
    root: "./",
    rewriteRequestPath: (path) => {
      return path.replace(/^\/docs/, "/docs/build/html/");
    },
  })
);

export default docsRouter;
