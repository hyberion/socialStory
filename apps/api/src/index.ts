import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { app } from "./app.js";

serve({ fetch: app.fetch, port: config.API_PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`API listening on http://localhost:${info.port}/api/health`);
});
