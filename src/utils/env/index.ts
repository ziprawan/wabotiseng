import * as process from "process";
import { config } from "dotenv";

// Process the .env file
config({ path: ".env" });

export const readEnvironmentVariables = <T>(vars: Array<keyof T>): T => {
  const envs = Object.create({}) as T;

  for (const key of vars) {
    if (key in process.env) {
      envs[key] = Reflect.get(process.env, key);
    } else {
      throw new Error(`Missing ${key.toString()} on .env`);
    }
  }

  return envs;
};
