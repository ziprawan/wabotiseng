import { Client } from "@/client";
import { postgresDb } from "@/database/client";
import { proto } from "@whiskeysockets/baileys";
import { Messages } from "./message";

export class ReactionClass {
  constructor(private reactionMessage: proto.IReaction, private client: Client) {}

  get content(): string {
    return this.reactionMessage.text ?? "";
  }

  get key(): proto.IMessageKey | undefined {
    return this.reactionMessage.key ?? undefined;
  }

  get msgId(): string | undefined {
    return this.key?.id ?? undefined;
  }

  get remoteJid(): string | undefined {
    return this.key?.remoteJid ?? undefined;
  }

  get fromMe(): boolean {
    return this.key?.fromMe ?? false;
  }

  // Will return null if message not found on database
  async resolveReactedMessage(): Promise<Messages | null> {
    const foundMessage = await postgresDb
      .selectFrom("message as m")
      .select("message")
      .innerJoin("entity as e", "e.id", "m.entity_id")
      .where("e.creds_name", "=", this.client.sessionName)
      .where("e.remote_jid", "=", this.remoteJid ?? "")
      .where("m.message_id", "=", this.msgId ?? "")
      .execute();

    if (foundMessage.length !== 1) return null;

    return new Messages(this.client, JSON.parse(foundMessage[0].message));
  }
}
