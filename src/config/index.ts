import { readEnvironmentVariables } from "@/utils/env";

export const BLACKLISTED_TITLES = ["all", "admin", "superadmin"];
export const MAX_LOGIN_HOURS = 1;

export const projectConfig = readEnvironmentVariables<{
  DATABASE_URL: string;
  SESSION_NAME: string;
  OWNER: string;
  CONFESS_TARGET: string;
  JWT_SECRET: string;
  WEB_BASE: string;
}>(["CONFESS_TARGET", "DATABASE_URL", "OWNER", "SESSION_NAME", "JWT_SECRET", "WEB_BASE"]);
