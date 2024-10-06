import makeWASocket, { BaileysEventMap } from "@whiskeysockets/baileys";

export type BaileysEventList = keyof BaileysEventMap;
export type EventHandlerFunc<T extends BaileysEventList> = (
  client: ReturnType<typeof makeWASocket>,
  arg: BaileysEventMap[T]
) => Promise<void>;
