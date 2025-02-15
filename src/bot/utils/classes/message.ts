import { Client } from "#bot/client";
import { postgresDb } from "@/database/client";
import { Chat } from "#bot/types/chat";
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
} from "#bot/types/whatsapp";
import { ContactMessage } from "#bot/types/whatsapp/contact";
import { MessageHandlerType, MessageType } from "#bot/types/whatsapp/message";
import { getContentType, GroupMetadata, proto } from "@whiskeysockets/baileys";
import { participantRoleToEnum } from "../enum/participant_role";
import { randomizeCode } from "../../../utils/generics/randomizeNumber";
import { FileLogger } from "../../../utils/logger/file";
import { ReactionClass } from "./reaction";

export class Messages {
  constructor(client: Client, private message: proto.IWebMessageInfo) {
    client.runtimeLogger.verbose("src > utils > classes > message > Messages > constructor called!");
    this.runtimeLogger = client.runtimeLogger;
    this.client = client;
  }

  client: Client;
  runtimeLogger: FileLogger;

  get remoteJid(): string | null | undefined {
    return this.message.key.remoteJid;
  }

  get msgKey(): proto.IMessageKey {
    return this.message.key;
  }

  get id(): string | null | undefined {
    return this.message.key.id;
  }

  get sessionName(): string {
    return this.client.sessionName;
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
    if (!this.chatType) return "";

    switch (this.chatType) {
      case "private":
        return this.remoteJid ?? "";
      case "group":
        // To prevent empty string (smh, whatsapp shit)
        return this.msgKey.participant ? this.msgKey.participant : this.raw.participant ? this.raw.participant : "";
      case "broadcast":
        // To prevent empty string (smh, whatsapp shit)
        return this.msgKey.participant ? this.msgKey.participant : this.raw.participant ? this.raw.participant : "";
      default:
        return "";
    }
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

  get mentions(): string[] {
    const msg = this.message.message;
    if (!msg) return [];

    const contentType = getContentType(msg);
    const grabbedMsg = msg[contentType!];

    if (!grabbedMsg || typeof grabbedMsg !== "object" || !("contextInfo" in grabbedMsg)) {
      return [];
    }

    return grabbedMsg.contextInfo?.mentionedJid ?? [];
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
        participant: ctx.participant,
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
      isViewOnce: aud.viewOnce ?? false,
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

  get reaction(): ReactionClass | undefined {
    const rct = this.message.message?.reactionMessage;
    if (!rct) return;

    return new ReactionClass(rct, this.client);
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

  get viewOnceMessage(): Messages | undefined {
    const viewOnceMsg =
      this.message.message?.viewOnceMessage?.message ??
      this.message.message?.viewOnceMessageV2?.message ??
      this.message.message?.viewOnceMessageV2Extension?.message ??
      undefined;

    if (!viewOnceMsg) return;

    return new Messages(this.client, { key: this.msgKey, message: viewOnceMsg });
  }

  // Database utilities

  async getChatFromDatabase(): Promise<Chat | null> {
    this.runtimeLogger.verbose("src > utils > classes > message > Messages > getChatFromDatabase called!");

    if (!this.remoteJid) {
      this.runtimeLogger.warning("remoteJid is null or undefined, ignoring");
      return null;
    }
    this.runtimeLogger.verbose(`remoteJid is ${this.remoteJid}`);

    if (this.chatType === "group") {
      this.runtimeLogger.verbose('chatType is "group"');
      this.runtimeLogger.verbose("Gathering chat data from database");
      const groupData = await postgresDb
        .selectFrom("entity as e")
        .innerJoin("group as g", "g.entity_id", "e.id")
        .selectAll()
        .where("remote_jid", "=", this.remoteJid)
        .where("creds_name", "=", this.sessionName)
        .where("type", "=", "Group")
        .executeTakeFirst();

      if (!groupData) {
        this.runtimeLogger.info("Chat not found.");
        return null;
      }

      this.runtimeLogger.info(`Chat found with subject: ${groupData.subject}. Returning data`);

      const {
        remote_jid: id,
        creation: createdAt,
        owner,
        subject,
        subject_owner,
        subject_time,
        desc,
        desc_owner,
        size: membersCount,
        ephemeral_duration: disappearingMessageDuration,
        announce,
        restrict,
        member_add_mode,
        join_approval_mode: needAdminApprovalToJoin,
        linked_parent: linkedParent,
      } = groupData;

      return {
        type: "group",
        id,
        createdAt,
        owner,
        membersCount,
        disappearingMessageDuration,
        canAddMembers: !member_add_mode,
        canEditGroupInfo: !restrict,
        canSendMessages: !announce,
        needAdminApprovalToJoin,
        linkedParent,
        subject: {
          content: subject,
          modifiedBy: subject_owner,
          modifiedAt: subject_time,
        },
        description: {
          content: desc ?? "",
          modifiedBy: desc_owner,
        },
      };
    }

    if (this.chatType === "private") {
      this.runtimeLogger.verbose('chatType is "private"');
      this.runtimeLogger.verbose("Gathering contact data from database");
      const contact = await postgresDb
        .selectFrom("entity as e")
        .innerJoin("contact as c", "c.entity_id", "e.id")
        .selectAll()
        .where("remote_jid", "=", this.remoteJid)
        .where("creds_name", "=", this.sessionName)
        .where("type", "=", "Contact")
        .executeTakeFirst();

      if (!contact) {
        this.runtimeLogger.info("Contact not found.");
        return null;
      }

      this.runtimeLogger.info(`Contact found with name: ${contact.saved_name}. Returning contact name`);

      const { remote_jid: id, saved_name: savedName, server_name: pushName } = contact;

      return { type: "private", id, savedName, pushName };
    }

    this.runtimeLogger.verbose(`Unhandled chatType: ${this.chatType}`);

    return null;
  }

  async saveChatToDatabase(force_save: boolean = false): Promise<GroupMetadata | string | null> {
    this.runtimeLogger.verbose("src > utils > classes > message > Messages > saveChatFromDatabase called!");
    this.runtimeLogger.verbose("force_save: " + String(force_save));

    if (!this.remoteJid) {
      this.runtimeLogger.info("remoteJid is null or undefined, ignoring");
      return null;
    }
    this.runtimeLogger.info(`remoteJid is ${this.remoteJid}`);

    if (!this.client.socket) {
      this.runtimeLogger.error("Socket isn't initialized! Throwing error");
      throw new Error("Socket isn't initialized yet!");
    }

    if (!force_save && (await this.getChatFromDatabase())) {
      this.runtimeLogger.info("Chat or contact already stored in database! Ignoring");
      return null;
    }

    if (this.chatType === "group") {
      this.runtimeLogger.verbose('chatType is "group"');
      this.runtimeLogger.verbose("Gathering group metadata from server");

      const metadata = await this.client.socket.groupMetadata(this.remoteJid);
      const {
        id: remote_jid,
        owner,
        subject,
        subjectTime: subject_time,
        subjectOwner: subject_owner,
        desc,
        descOwner: desc_owner,
        creation,
        participants,
        announce,
        restrict,
        joinApprovalMode: join_approval_mode,
        linkedParent: linked_parent,
        memberAddMode: member_add_mode,
        size,
        isCommunity: is_community,
        isCommunityAnnounce: is_community_announce,
        ephemeralDuration: ephemeral_duration,
        inviteCode: invite_code,
        descId: _,
      } = metadata;

      await postgresDb.transaction().execute(async (trx) => {
        this.runtimeLogger.info("Inserting new entity into database");
        const insertedEntity = await trx
          .insertInto("entity")
          .values({ creds_name: this.sessionName, remote_jid, type: "Group" })
          .onConflict((oc) => oc.columns(["remote_jid", "creds_name"]).doNothing())
          .returning(["id"])
          .executeTakeFirstOrThrow();

        this.runtimeLogger.info("Inserting new group into database");
        const insertedGroup = await trx
          .insertInto("group")
          .values({
            entity_id: insertedEntity.id,
            remote_jid,
            creds_name: this.sessionName,
            owner: owner ?? "",
            subject,
            subject_time: subject_time ? new Date(subject_time) : null,
            subject_owner,
            desc,
            desc_owner,
            creation: creation ? new Date(creation) : null,
            announce,
            restrict,
            join_approval_mode,
            linked_parent,
            member_add_mode,
            size,
            is_community,
            is_community_announce,
            ephemeral_duration,
            invite_code,
          })
          .onConflict((oc) =>
            oc.columns(["entity_id"]).doUpdateSet({
              owner: owner ?? "",
              subject,
              subject_time: subject_time ? new Date(subject_time) : null,
              subject_owner,
              desc,
              desc_owner,
              creation: creation ? new Date(creation) : null,
              announce,
              restrict,
              join_approval_mode,
              linked_parent,
              member_add_mode,
              size,
              is_community,
              is_community_announce,
              ephemeral_duration,
              invite_code,
            })
          )
          .returning(["id"])
          .executeTakeFirstOrThrow();

        this.runtimeLogger.info(`Inserting all new ${participants.length} participants into database`);
        await trx
          .insertInto("participant")
          .values(
            participants.map((p) => ({
              group_id: insertedGroup.id,
              participant_jid: p.id,
              role: participantRoleToEnum(p.admin),
            }))
          )
          .onConflict((oc) =>
            oc.columns(["group_id", "participant_jid"]).doUpdateSet((cb) => ({ role: cb.ref("excluded.role") }))
          )
          .execute();
      });

      this.runtimeLogger.verbose("All done, returning metadata");

      return metadata;
    }

    if (this.chatType === "private" || this.remoteJid === "status@broadcast") {
      this.runtimeLogger.verbose(`chatType is ${this.chatType}`);
      if (this.remoteJid === "status@broadcast") {
        this.runtimeLogger.verbose("remoteJid is status@broadcast, saving contact instead");
      }

      await postgresDb.transaction().execute(async (trx) => {
        this.runtimeLogger.info("Inserting new entity into database");
        const insertedEntity = await trx
          .insertInto("entity")
          .values({
            creds_name: this.sessionName,
            remote_jid: this.from,
            type: "Contact",
          })
          .onConflict((oc) => oc.constraint("entity_remote_jid_and_creds_name").doNothing())
          .returning(["id"])
          .executeTakeFirstOrThrow();

        this.runtimeLogger.info("Inserting new contact into database");
        await trx
          .insertInto("contact")
          .values({
            entity_id: insertedEntity.id,
            remote_jid: this.from,
            creds_name: this.sessionName,
            server_name: this.message.pushName ?? "Unknown.",
            saved_name: this.message.pushName ?? "Unknown.",
            signin_code: randomizeCode(),
          })
          .onConflict((oc) => oc.columns(["id"]).doUpdateSet({ server_name: this.message.pushName ?? "" }))
          .execute();
      });

      this.runtimeLogger.verbose("All done, returning contact name");
      return this.message.pushName ?? "";
    }

    this.runtimeLogger.verbose(`Unhandled chatType ${this.chatType} with msgKey: ${JSON.stringify(this.msgKey)}`);

    return null;
  }

  /**
   * Get message from database based on reply_to_message's id
   * @param force_save What does this do actually?
   * @returns
   */
  async resolveReplyToMessage(force_save: boolean = false): Promise<Messages | null> {
    this.runtimeLogger.verbose("src > utils > classes > message > Messages > resolveReplyToMessage called!");
    this.runtimeLogger.verbose("force_save: " + String(force_save));

    if (!this.reply_to_message) {
      this.runtimeLogger.info("reply_to_message is undefined, retuning null");
      return null;
    }
    this.runtimeLogger.info("Found reply_to_message, processing");

    const { id, chat } = this.reply_to_message;

    if (!id) {
      this.runtimeLogger.warning("Couldn't get reply_to_message's id! Returning null");
      return null;
    }
    this.runtimeLogger.verbose(`Got message id: ${id} and chat: ${chat}`);

    this.runtimeLogger.info("Getting message from database");
    const message = await postgresDb
      .selectFrom("message as m")
      .select("message")
      .innerJoin("entity as e", "e.id", "m.entity_id")
      .where("m.message_id", "=", id)
      .where("e.remote_jid", "=", chat)
      .where("e.creds_name", "=", this.sessionName)
      .executeTakeFirst();

    if (message) {
      this.runtimeLogger.info("Message found from database! Returning new instance of Messages class");
      return new Messages(this.client, JSON.parse(message.message));
    } else {
      this.runtimeLogger.info("Message not found from database! Saving message");
      this.reply_to_message.saveMessage({ dismissChat: true });
      return this.reply_to_message;
    }
  }

  /**
   * Save message to database
   * @param opts save message options. dissmissChat, set true if you don't want to save chat info
   * @returns {boolean}
   */
  async saveMessage(opts: { dismissChat: boolean } = { dismissChat: true }): Promise<boolean> {
    this.runtimeLogger.verbose("src > utils > classes > message > Messages > saveMessage called!");
    this.runtimeLogger.verbose(`opts: ${JSON.stringify(opts)}`);

    if (!this.remoteJid || !this.id) {
      this.runtimeLogger.warning("remoteJid or id is null or undefined! Ignoring");
      return false;
    }

    if (!opts.dismissChat) {
      this.runtimeLogger.info("Saving chat to database");
      try {
        await this.saveChatToDatabase();
      } catch (err) {
        this.runtimeLogger.error(
          "RUNTIME ERROR! Located at src > utils > classes > message > Messages > saveMessage > save chat"
        );
        this.runtimeLogger.error((err as Error).stack ?? (err as Error).message);
      }
    }

    if (!this.raw.message) {
      this.runtimeLogger.warning(`${this.msgKey.id} has no member "message". Maybe the message is not resolved`);
      return false;
    }

    const msg = this.raw.message?.protocolMessage;

    if (this.raw.key?.remoteJid === this.client.socket?.user?.id) return true;

    if (msg && msg.type === proto.Message.ProtocolMessage.Type.REVOKE) {
      this.runtimeLogger.verbose("msg protocol type is REVOKE");
      this.client.caches[`delete-${this.remoteJid}-${msg.key?.id ?? ""}`] = true;

      try {
        this.runtimeLogger.verbose("Updating message deleted state into true");
        await postgresDb
          .updateTable("message as m")
          .set({ deleted: true })
          .from("entity as e")
          .where("m.message_id", "=", this.msgKey.id ?? "")
          .where("e.remote_jid", "=", this.remoteJid === "status@broadcast" ? this.from : this.remoteJid ?? "")
          .where("e.creds_name", "=", this.sessionName)
          .executeTakeFirstOrThrow();

        delete this.client.caches[`delete-${this.remoteJid}-${msg.key?.id ?? ""}`];
      } catch (err) {
        this.runtimeLogger.error(
          "RUNTIME ERROR! Located at src > utils > classes > message > Messages > saveMessage > update deleted state"
        );
        this.runtimeLogger.error((err as Error).stack ?? (err as Error).message);
        return false;
      }
    } else {
      try {
        if (!(["broadcast", "group", "private"] as ChatType[]).includes(this.chatType!)) {
          this.runtimeLogger.verbose(`Unhandled chatType: ${this.chatType}`);
          return false;
        }

        this.runtimeLogger.verbose("Inserting message to database");
        this.runtimeLogger.verbose(`Caches: ${JSON.stringify(this.client.caches)}`);
        const builder = postgresDb
          .insertInto("message")
          .values(({ selectFrom }) => ({
            entity_id: selectFrom("entity as e")
              .select("e.id")
              .where("e.remote_jid", "=", this.remoteJid === "status@broadcast" ? this.from : this.remoteJid ?? "")
              .where("e.creds_name", "=", this.sessionName),
            message: JSON.stringify(this.message),
            message_id: this.id ?? "",
            deleted: this.client.caches[`delete-${this.remoteJid}-${this.id}`] === true,
          }))
          .onConflict((oc) =>
            oc.columns(["message_id", "entity_id"]).doUpdateSet({
              message: JSON.stringify(this.message),
              deleted: this.client.caches[`delete-${this.remoteJid}-${this.id}`] === true,
            })
          );
        this.runtimeLogger.verbose(builder.compile().sql);
        await builder.execute();

        if (this.client.caches[`delete-${this.remoteJid}-${this.id}`] === true) {
          delete this.client.caches[`delete-${this.remoteJid}-${this.id}`];
        }
      } catch (err) {
        this.runtimeLogger.error(
          "RUNTIME ERROR! Located at src > utils > classes > message > Messages > saveMessage > save message"
        );
        this.runtimeLogger.error((err as Error).stack ?? (err as Error).message);
      }
    }

    return true;
  }

  static async getMessage(client: Client, remoteJid: string, messageId: string): Promise<Messages | null> {
    client.runtimeLogger.verbose("src > utils > classes > message > Messages > getMessage (static) called!");
    client.runtimeLogger.verbose(`remoteJid: ${remoteJid}`);
    client.runtimeLogger.verbose(`messageId: ${messageId}`);

    client.runtimeLogger.info(`Getting message from database`);
    const message = await postgresDb
      .selectFrom("message as m")
      .select("message")
      .innerJoin("entity as e", "e.id", "m.entity_id")
      .where("e.creds_name", "=", client.sessionName)
      .where("e.remote_jid", "=", remoteJid)
      .where("m.message_id", "=", messageId)
      .execute();

    if (message.length !== 1) {
      client.runtimeLogger.info(`Couldn't find that message from database. Returning null`);
      return null;
    }
    client.runtimeLogger.info(`Message found! Returning new instance of Messages class`);

    return new Messages(client, JSON.parse(message[0].message));
  }

  // Message utilities
  async replyText(text: string, quotedMessage?: boolean): Promise<proto.WebMessageInfo | undefined> {
    this.runtimeLogger.verbose("src > utils > classes > message > Messages > replyText called!");
    this.runtimeLogger.verbose(`text: ${text}`);
    this.runtimeLogger.verbose(`quotedMessage: ${quotedMessage}`);

    if (!this.client.socket) {
      this.runtimeLogger.error("Socket isn't initialized! Throwing error");
      throw new Error("Socket isn't initialized yet!");
    }

    this.runtimeLogger.verbose(`Calling socket.sendMessage`);
    return await this.client.socket.sendMessage(this.chat, { text }, { quoted: quotedMessage ? this.raw : undefined });
  }

  async delete(): Promise<void> {
    this.runtimeLogger.verbose("src > utils > classes > message > Messages > delete called!");

    if (!this.client.socket) {
      this.runtimeLogger.error("Socket isn't initialized! Throwing error");
      throw new Error("Socket isn't initialized yet!");
    }

    this.runtimeLogger.verbose("Calling socket.sendMessage with delete option");
    await this.client.socket.sendMessage(this.chat, { delete: this.msgKey });
  }

  async editText(newMessage: string): Promise<proto.WebMessageInfo | undefined> {
    this.runtimeLogger.verbose("src > utils > classes > message > Messages > editText called!");
    this.runtimeLogger.verbose(`newMessage: ${newMessage}`);

    if (!this.client.socket) {
      this.runtimeLogger.error("Socket isn't initialized! Throwing error");
      throw new Error("Socket isn't initialized yet!");
    }

    this.runtimeLogger.verbose("Calling socket.sendMessage with edit option");
    return await this.client.socket.sendMessage(this.chat, { text: newMessage, edit: this.msgKey }, { quoted: this.raw });
  }

  async handle(handler: MessageHandlerType) {
    this.runtimeLogger.verbose("src > utils > classes > message > Messages > handle called!");

    if (!this.client.socket) {
      this.runtimeLogger.error("Socket isn't initialized! Throwing error");
      throw new Error("Socket isn't initialized yet!");
    }

    this.runtimeLogger.verbose("Calling specified handler");
    return await handler(this.client.socket, this).catch((err) => {
      this.runtimeLogger.error("RUNTIME ERROR! Located at src > utils > classes > message > Messages > handle");
      this.runtimeLogger.error((err as Error).stack ?? (err as Error).message);
    });
  }
}
