import { Hono } from "hono";
import { authMiddleware } from "./middlewares/authMiddleware";
import { slashMiddleware } from "./middlewares/slashMiddleware";
import { routes } from "./routes";

const app = new Hono();

app.use("*", authMiddleware);
app.use("*", slashMiddleware);

routes(app);

export { app as webServer };
