import { readEnvironmentVariables } from "@/utils/env";

export const BLACKLISTED_TITLES = ["all", "admin", "superadmin"];

export const projectConfig = readEnvironmentVariables<{
  DATABASE_URL: string;
  SESSION_NAME: string;
  OWNER: string;
  CONFESS_TARGET: string;
  JWT_SECRET: string;
}>(["CONFESS_TARGET", "DATABASE_URL", "OWNER", "SESSION_NAME", "JWT_SECRET"]);
