import { Hono } from "hono";
import assetsRouter from "./assets";
import authRouter from "./auth";
import docsRouter from "./docs";
import homeRouter from "./home";
import userRouter from "./user";

export const routes = (app: Hono) => {
  app.route("/", homeRouter);
  app.route("/assets", assetsRouter);
  app.route("/docs", docsRouter);
  app.route("/auth", authRouter);
  app.route("/user", userRouter);
};
