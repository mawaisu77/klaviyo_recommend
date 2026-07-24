import { pino } from "pino";
import { env, isProd } from "../config/env.js";

export const logger = pino({
  level: isProd ? "info" : "debug",
  base: undefined,
  transport: isProd
    ? undefined
    : {
        target: "pino/file",
        options: { destination: 1 },
      },
});

export type Logger = typeof logger;
void env;
