import { readEnvironmentVariables } from "@/utils/env";

export const projectConfig = readEnvironmentVariables<{
  DATABASE_URL: string;
  SESSION_NAME: string;
  OWNER: string;
  CONFESS_TARGET: string;
}>(["CONFESS_TARGET", "DATABASE_URL", "OWNER", "SESSION_NAME"]);
