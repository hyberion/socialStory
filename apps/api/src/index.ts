import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { app, injectWebSocket } from "./app.js";

const server = serve({ fetch: app.fetch, port: config.API_PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`API listening on http://localhost:${info.port}/api/health`);
});
injectWebSocket(server);
