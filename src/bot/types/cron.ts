import { FileLogger } from "@/utils/logger/file";
import makeWASocket from "@whiskeysockets/baileys";

export type CronFunc = (logger: FileLogger, credsName: string, client: ReturnType<typeof makeWASocket>) => Promise<any>;
