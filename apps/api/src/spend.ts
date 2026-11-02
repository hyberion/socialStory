import { resolve } from "node:path";
import { createBudget } from "./budget.js";
import { config } from "./config.js";
import { DATA_DIR } from "./paths.js";

/** The server's one budget (see budget.ts). */
export const budget = createBudget({ cap: config.DAILY_BUDGET_USD, dir: resolve(DATA_DIR, "spend") });
