import { proto } from "@whiskeysockets/baileys";
import { Messages } from "./message";
import { botDatabase } from "../database/client";
import { Client } from "@/client";

export class ReactionClass {
  constructor(
    private reactionMessage: proto.IReaction,
    private client: Client
  ) {}

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
    const foundMessage = await botDatabase.message.findUnique({
      where: {
        messageId_remoteJid_credsName: {
          messageId: this.msgId ?? "",
          remoteJid: this.remoteJid ?? "",
          credsName: this.client.sessionName,
        },
      },
    });

    if (!foundMessage) return null;

    return new Messages(this.client, JSON.parse(foundMessage.message));
  }
}
