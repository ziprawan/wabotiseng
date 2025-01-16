require("module-alias/register");

import { serve } from "@hono/node-server";
import { showRoutes } from "hono/dev";
import { botClient, runtimeLogger } from "./bot";
import { isLiterallyNumeric } from "./utils/generics/isNumeric";
import { webServer } from "./web";

botClient.launch().catch((err) => {
  runtimeLogger.error("Client launcher errored! Additional info:");
  runtimeLogger.error((err as Error).stack ?? "Unknown.");
});

showRoutes(webServer, { verbose: true });

serve({
  fetch: webServer.fetch,
  port: isLiterallyNumeric(process.env.PORT) ? parseInt(process.env.PORT ?? "3000") : 3000,
});
