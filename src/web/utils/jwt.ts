import { projectConfig } from "@/config";
import * as jwt from "hono/jwt";
import { JWTPayload } from "hono/utils/jwt/types";

const JWT_SECRET = projectConfig.JWT_SECRET;

export async function verify(token: string): Promise<JWTPayload | null> {
  try {
    return await jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
export async function sign(payload: any): Promise<string> {
  return await jwt.sign(payload, JWT_SECRET);
}
