import { Client } from "@/client";
import { Chat } from "@/types/chat";
import {
  Audio,
  ChatType,
  Document,
  EventMessage,
  Image,
  LocationMessage,
  Poll,
  Sticker,
  Video,
  VideoNote,
  Voice,
} from "@/types/whatsapp";
import { ContactMessage } from "@/types/whatsapp/contact";
import { MessageHandlerType, MessageType } from "@/types/whatsapp/message";
import { proto } from "@whiskeysockets/baileys";
import { EventEmitter } from "node-cache";
import { writeFileSync } from "node:fs";
import { botDatabase } from "../database/client";
import { writeErrorToFile } from "../error/write";

export class Messages {
  constructor(
    private client: Client,
    private message: proto.IWebMessageInfo
  ) {}

  get remoteJid(): string | null | undefined {
    return this.message.key.remoteJid;
  }

  get msgKey(): proto.IMessageKey {
    return this.message.key;
  }

  get id(): string | null | undefined {
    return this.message.key.id;
  }

  get chatType(): ChatType | null {
    if (!this.remoteJid) {
      return null;
    }

    if (this.remoteJid.endsWith("@g.us")) return "group";
    if (this.remoteJid.endsWith("@s.whatsapp.net")) return "private";
    if (this.remoteJid.endsWith("@broadcast")) return "broadcast";
    return null;
  }

  get chat(): string {
    return this.msgKey.remoteJid ?? "";
  }

  get date(): Date {
    const timestamp = parseInt(String(this.message.messageTimestamp ?? "0")) * 1000;

    return new Date(timestamp);
  }

  get from(): string {
    return this.chatType === "group"
      ? this.msgKey.participant ?? ""
      : this.chatType === "private"
        ? this.msgKey.remoteJid ?? ""
        : "";
  }

  get raw(): proto.IWebMessageInfo {
    return this.message;
  }

  // Message fields get class functions

  get conversation(): string | undefined {
    const msg = this.message.message;
    let text: string | undefined;
    if (msg) {
      if (msg.extendedTextMessage) {
        text = msg.extendedTextMessage.text ?? undefined;
      } else {
        text = msg.conversation ?? undefined;
      }

      if (text && text.trim() !== "") return text;
    }

    return undefined;
  }

  get reply_to_message(): Messages | undefined {
    const msg = this.message.message;
    if (!msg) return;

    const extMsg = msg.extendedTextMessage;
    if (!extMsg) return;

    const ctx = extMsg.contextInfo;
    if (!ctx) return;

    const quot = ctx.quotedMessage;
    if (!quot) return;

    return new Messages(this.client, {
      key: {
        remoteJid: this.remoteJid,
        fromMe: (() => {
          const me = this.client.socket?.user?.id;
          const id = this.remoteJid === this.message.key.participant ? this.remoteJid : this.message.key.participant;

          if (me && id) return me === id;
        })(),
        id: ctx.stanzaId,
        participant: this.message.key.participant,
      },
      message: quot,
    });
  }

  get audio(): Audio | undefined {
    const aud = this.message.message?.audioMessage;
    if (!aud || aud.ptt === false) return;

    return {
      url: aud.url ?? "",
      mediaKey: aud.mediaKey ?? "",
      mimeType: aud.mimetype ?? "",
      duration: aud.seconds ?? -1,
      fileSize: parseInt(String(aud.fileLength ?? -1)),
    };
  }

  get document(): Document | undefined {
    const doc = this.message.message?.documentMessage;
    if (!doc) return;

    return {
      url: doc.url ?? "",
      mediaKey: doc.mediaKey ?? "",
      mimeType: doc.mimetype ?? "",
      fileName: doc.title ?? "",
      fileSize: parseInt(String(doc.fileLength ?? -1)),
      contactVcard: doc.contactVcard ?? false,
      thumbnail: doc.jpegThumbnail
        ? { jpeg: doc.jpegThumbnail.toString(), width: doc.thumbnailWidth ?? 0, height: doc.thumbnailHeight ?? 0 }
        : undefined,
      pageCount: doc.pageCount ?? undefined,
    };
  }

  get image(): Image | undefined {
    const img = this.message.message?.imageMessage;
    if (!img) return;

    return {
      url: img.url ?? "",
      mediaKey: img.mediaKey ?? "",
      mimeType: img.mimetype ?? "",
      height: img.height ?? 0,
      width: img.width ?? 0,
      fileSize: parseInt(String(img.fileLength ?? -1)),
      thumbnail: img.jpegThumbnail?.toString() ?? undefined,
      isViewOnce: img.viewOnce ?? false,
    };
  }

  get sticker(): Sticker | undefined {
    const stk = this.message.message?.stickerMessage;
    if (!stk) return;

    return {
      url: stk.url ?? "",
      mediaKey: stk.mediaKey ?? "",
      mimeType: stk.mimetype ?? "",
      height: stk.height ?? 0,
      width: stk.width ?? 0,
      fileSize: parseInt(String(stk.fileLength ?? -1)),
      isAnimated: stk.isAnimated ?? false,
      isAvatar: stk.isAvatar ?? false,
      isAISticker: stk.isAiSticker ?? false,
      isLottie: stk.isLottie ?? false,
    };
  }

  get video(): Video | undefined {
    const vid = this.message.message?.videoMessage;
    if (!vid) return;

    return {
      url: vid.url ?? "",
      mediaKey: vid.mediaKey ?? "",
      mimeType: vid.mimetype ?? "",
      fileSize: parseInt(String(vid.fileLength ?? -1)),
      height: vid.height ?? 0,
      width: vid.width ?? 0,
      duration: vid.seconds ?? 0,
      isViewOnce: vid.viewOnce ?? false,
      thumbnail: vid.jpegThumbnail?.toString() ?? undefined,
    };
  }

  get videoNote(): VideoNote | undefined {
    const ptv = this.message.message?.ptvMessage;
    if (!ptv) return;

    return {
      url: ptv.url ?? "",
      mediaKey: ptv.mediaKey ?? "",
      mimeType: ptv.mimetype ?? "",
      fileSize: parseInt(String(ptv.fileLength ?? -1)),
      height: ptv.height ?? 0,
      width: ptv.width ?? 0,
      duration: ptv.seconds ?? 0,
      thumbnail: ptv.jpegThumbnail?.toString() ?? undefined,
    };
  }

  get voice(): Voice | undefined {
    const aud = this.message.message?.audioMessage;
    if (!aud || aud.ptt === true) return;

    return {
      url: aud.url ?? "",
      mediaKey: aud.mediaKey ?? "",
      mimeType: aud.mimetype ?? "",
      fileSize: parseInt(String(aud.fileLength ?? -1)),
      duration: aud.seconds ?? 0,
      isViewOnce: aud.viewOnce ?? false,
    };
  }

  get caption(): string | undefined {
    const msg = this.message.message;
    if (!msg) return;

    const keys = Object.keys(msg);
    for (const key of keys) {
      const k = key as keyof proto.IMessage;
      if (!msg[k]) continue;
      if (typeof msg[k] === "object" && "caption" in msg[k]) return msg[k]?.caption as string | undefined;
    }

    return;
  }

  get contacts(): ContactMessage[] | undefined {
    const ctc = this.message.message?.contactMessage ?? this.message.message?.contactsArrayMessage?.contacts;
    if (!ctc) return;

    const contacts: ContactMessage[] = [];

    if (Array.isArray(ctc)) {
      ctc.forEach((c) => contacts.push({ name: c.displayName ?? "", vcard: c.vcard ?? "" }));
    } else {
      contacts.push({ name: ctc.displayName ?? "", vcard: ctc.vcard ?? "" });
    }

    return contacts;
  }

  get location(): LocationMessage | undefined {
    const loc = this.message.message?.locationMessage;
    if (!loc) return;

    return {
      latitude: loc.degreesLatitude ?? 0,
      longitude: loc.degreesLongitude ?? 0,
      thumbnail: loc.jpegThumbnail?.toString() ?? undefined,
      liveDuration: null,
    };
  }

  get event(): EventMessage | undefined {
    const evt = this.message.message?.eventMessage;
    if (!evt) return;

    return {
      name: evt.name ?? "",
      description: evt.description ?? "",
      location: {
        name: evt.location?.name ?? "",
        latitude: evt.location?.degreesLatitude ?? 0,
        longitude: evt.location?.degreesLongitude ?? 0,
      },
      isCanceled: evt.isCanceled ?? false,
      startAt: new Date(parseInt(String(evt.startTime ?? "0")) * 1000),
      joinLink: evt.joinLink ?? undefined,
    };
  }

  get poll(): Poll | undefined {
    const pll =
      this.message.message?.pollCreationMessage ??
      this.message.message?.pollCreationMessageV2 ??
      this.message.message?.pollCreationMessageV3;
    if (!pll) return;

    return {
      question: pll.name ?? "",
      options: pll.options?.map((p) => p.optionName ?? "") ?? [],
      allowsMultipleAnswers: pll.selectableOptionsCount === 0,
    };
  }

  get reaction(): string | undefined {
    const rct = this.message.message?.reactionMessage;
    if (!rct) return;

    return rct.text ?? "";
  }

  get text(): string {
    return this.conversation ?? this.caption ?? "";
  }

  get parsedMessage(): MessageType {
    return {
      id: this.id as string,
      chat: this.chat,
      date: this.date,
      from: this.from,
      text: this.text,
      conversation: this.conversation,
      reply_to_message: this.reply_to_message?.parsedMessage,
      // Media fields
      audio: this.audio,
      document: this.document,
      image: this.image,
      sticker: this.sticker,
      video: this.video,
      videoNote: this.videoNote,
      voice: this.voice,
      caption: this.caption,
      contacts: this.contacts,
      location: this.location,
      event: this.event,
      poll: this.poll,
      reaction: this.reaction,
      // Maybe usefull for another things :D
      raw: this.raw,
    };
  }

  // Async utilities

  async getChatFromDatabase(): Promise<Chat | null> {
    if (!this.remoteJid) return null;

    if (this.chatType === "group") {
      const groupData = await botDatabase.group.findUnique({
        where: { credsName_remoteJid: { credsName: this.client.sessionName, remoteJid: this.remoteJid } },
      });

      if (!groupData) return null;

      const {
        remoteJid: id,
        creation: createdAt,
        owner,
        subject,
        subjectOwner,
        subjectTime,
        desc,
        descOwner,
        size: membersCount,
        ephemeralDuration: disappearingMessageDuration,
        announce,
        restrict,
        memberAddMode,
        joinApprovalMode: needAdminApprovalToJoin,
        linkedParent,
      } = groupData;

      return {
        type: "group",
        id,
        createdAt,
        owner,
        membersCount,
        disappearingMessageDuration,
        canAddMembers: !memberAddMode,
        canEditGroupInfo: !restrict,
        canSendMessages: !announce,
        needAdminApprovalToJoin,
        linkedParent,
        subject: {
          content: subject,
          modifiedBy: subjectOwner,
          modifiedAt: subjectTime,
        },
        description: {
          content: desc ?? "",
          modifiedBy: descOwner,
        },
      };
    }

    if (this.chatType === "private") {
      const contact = await botDatabase.contact.findUnique({
        where: { credsName_remoteJid: { credsName: this.client.sessionName, remoteJid: this.remoteJid } },
      });

      if (!contact) return null;

      const { remoteJid: id, name: savedName, pushName } = contact;

      return { type: "private", id, savedName, pushName };
    }

    return null;
  }

  async saveChatToDatabase(): Promise<boolean> {
    if (!this.remoteJid) return false;

    if (!this.client.socket) throw new Error("Socket isn't initialized yet!");

    if (await this.getChatFromDatabase()) return false;

    if (this.chatType === "group") {
      const {
        id: remoteJid,
        owner,
        subjectTime,
        creation,
        participants,
        descId: _,
        ...groupMetadata
      } = await this.client.socket.groupMetadata(this.remoteJid);

      await botDatabase.group.upsert({
        create: {
          ...groupMetadata,
          owner: owner ?? "",
          remoteJid,
          credsName: this.client.sessionName,
          subjectTime: subjectTime ? new Date(subjectTime * 1000) : new Date(),
          creation: creation ? new Date(creation * 1000) : new Date(),
          participants: {
            createMany: {
              data: participants.map((part) => {
                return {
                  credsName: this.client.sessionName,
                  groupJid: this.remoteJid as string,
                  participantJid: part.id,
                  role: part.admin === "admin" ? "ADMIN" : part.admin === "superadmin" ? "SUPERADMIN" : "MEMBER",
                };
              }),
            },
          },
        },
        where: { credsName_remoteJid: { credsName: this.client.sessionName, remoteJid: this.remoteJid } },
        update: { ...groupMetadata },
      });

      return true;
    }

    if (this.chatType === "private") {
      await botDatabase.contact.upsert({
        create: { credsName: this.client.sessionName, remoteJid: this.remoteJid, pushName: this.message.pushName },
        where: { credsName_remoteJid: { credsName: this.client.sessionName, remoteJid: this.remoteJid } },
        update: { pushName: this.message.pushName },
      });

      return true;
    }

    writeFileSync(`json/chat_${this.remoteJid}.json`, `Unhandled chatType ${this.chatType} for remoteJid ${this.remoteJid}`);

    return false;
  }

  async saveMessage(opts: { dismissChat: boolean } = { dismissChat: false }): Promise<boolean> {
    if (!this.remoteJid || !this.id) {
      return false;
    }

    if (!opts.dismissChat) {
      await this.saveChatToDatabase();
    }

    await botDatabase.message.upsert({
      create: {
        credsName: this.remoteJid,
        messageId: this.id,
        remoteJid: this.remoteJid,
        message: JSON.stringify(this.message),
      },
      where: {
        messageId_remoteJid_credsName: { credsName: this.remoteJid, messageId: this.id, remoteJid: this.remoteJid },
      },
      update: { message: JSON.stringify(this.message) },
    });

    return true;
  }

  async handle(handler: MessageHandlerType) {
    if (!this.client.socket) {
      throw new Error("Socket isn't initialized yet!");
    }
    return await handler(this.client.socket, this).catch((err) => {
      writeErrorToFile(err);
    });
  }
}
