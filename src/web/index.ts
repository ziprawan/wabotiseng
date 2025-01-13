import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

const app = new Hono();
app.use("/docs", async (c) => {
  return c.redirect("/docs/", 301);
});
app.use(
  "/docs/*",
  serveStatic({
    root: "./",
    rewriteRequestPath: (path) => path.replace(/^\/docs/, "/docs/build/html/"),
  })
);

export { app as webServer };
