import makeWASocket, { BaileysEventMap, BinaryNode } from "@whiskeysockets/baileys";
import { WASocket } from "./socket";

export type MaybePromise<T> = Promise<T> | T;
export type BaileysEventList = keyof BaileysEventMap;
export type EventHandlerFunc<T extends BaileysEventList> = (
  client: ReturnType<typeof makeWASocket>,
  arg: BaileysEventMap[T]
) => Promise<any>;
export type WSHandlerFunc = (client: WASocket, node: BinaryNode) => Promise<any>;
