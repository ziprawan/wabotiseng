// Fix alias import when compiled by tsc
import "module-alias/register";

import { BufferJSON } from "@whiskeysockets/baileys";
import { sql } from "kysely";
import { Client } from "./client";
import { projectConfig } from "./config";
import { postgresDb } from "./database/client";
import { migrator } from "./database/migrate";
import { values } from "./database/utils";
import { mainHandler } from "./handlers";
import { BaileysEventList } from "./types/events";
import { Messages } from "./utils/classes/message";
import { participantRoleToEnum } from "./utils/enum/participant_role";
import { writeErrorToFile } from "./utils/error/write";
import { randomizeCode } from "./utils/generics/randomizeNumber";
import { FileLogger } from "./utils/logger/file";

migrator.migrateToLatest();

const runtimeLogger = new FileLogger("runtime", { loglevel: process.env.IS_DEBUG === "true" ? 0 : 1 });

const client = new Client(projectConfig.SESSION_NAME ?? "wa", 10, runtimeLogger);

const whitelist: string[] | null = process.env.GROUPS ? process.env.GROUPS.split(",") : null;
if (whitelist)
  runtimeLogger.verbose(`GROUPS env is set! Only receive from these ${whitelist.length} group(s): ${whitelist.join(", ")}.`);
else runtimeLogger.verbose("No whitelist group specified.");

const unhanldedEvents: BaileysEventList[] = [
  "blocklist.set",
  "blocklist.update",
  "call",
  "chats.delete",
  "chats.phoneNumberShare",
  "chats.update",
  "chats.upsert",
  // "contacts.update",
  "contacts.upsert", // Maybe this will only triggers when I save a new contact on WhatsApp
  // "group-participants.update",
  "group.join-request",
  "groups.update",
  // "groups.upsert",
  "labels.association",
  "labels.edit",
  "message-receipt.update",
  "messages.delete",
  "messages.media-update",
  "messages.reaction",
  "messages.update",
  "messaging-history.set",
];

runtimeLogger.info("Adding messages.upsert event handler");
client.addEventHandler("messages.upsert", async (sock, event) => {
  try {
    const { messages } = event;
    runtimeLogger.info(`Got new ${messages.length} event(s)!`);

    for (let i = 0; i < messages.length; i++) {
      runtimeLogger.verbose(`Getting message at index ${i}`);
      const msgEv = messages[i];
      const message = new Messages(client, msgEv);

      runtimeLogger.info("Saving message with ID: " + message.id);
      await message.saveMessage();

      if (whitelist && !whitelist.includes(message.chat)) {
        runtimeLogger.verbose(`Chat with ID: ${message.chat} isn't included in the whitelist, ignoring.`);
        continue;
      }

      await message.handle(mainHandler);

      runtimeLogger.info(`Reading message`);
      await sock.readMessages([message.msgKey]);
    }
  } catch (err) {
    runtimeLogger.error("RUNTIME ERROR! Located at src > index > addEventHandler[0]");
    runtimeLogger.error((err as Error).stack ?? (err as Error).message);
  }
});

runtimeLogger.info("Adding contacts.update event handler");
client.addEventHandler("contacts.update", async (_sock, event) => {
  runtimeLogger.verbose("contacts.update event handler called!");
  runtimeLogger.verbose("Filtering events");
  const filteredEvents: { id: string; notify: string }[] = event.filter(
    (e) => typeof e.id === "string" && typeof e.notify === "string"
  ) as { id: string; notify: string }[]; // IDK HOW TO CAST THIS TYPE THO

  /** Take a note that this object has key with contact jid and value with contact notify (server_name) */
  const allContacts: Record<string, string> = {};

  filteredEvents.forEach((fe) => {
    allContacts[fe.id] = fe.notify;
  });

  /** For this one, will contains contact's jid only */
  const allContactKeys = Object.keys(allContacts);

  runtimeLogger.verbose(`Found contacts from events:`);
  runtimeLogger.verbose(JSON.stringify(allContacts, BufferJSON.replacer, 2));
  runtimeLogger.verbose("Fetching saved contacts from database");
  const savedContacts = await postgresDb
    .selectFrom("contact as c")
    .select(["c.id", "c.remote_jid"])
    .where("c.remote_jid", "in", allContactKeys)
    .where("c.creds_name", "=", projectConfig.SESSION_NAME)
    .execute();

  /** Maybe better fill key and value with jid and anything (atleast filled heheh) */
  const savedContactObjects: Record<string, string> = {};

  const updateContacts: { id: string; server_name: string }[] = [];
  savedContacts.forEach((sc) => {
    savedContactObjects[sc.remote_jid] = sc.id;
    const exists = allContacts[sc.remote_jid];
    if (exists) {
      updateContacts.push({ id: sc.id, server_name: exists });
    }
  });
  runtimeLogger.verbose(`updatedContacts content:`);
  runtimeLogger.verbose(JSON.stringify(updateContacts, null, 2));

  /** For this one, the key is the user's remoteJid and the value is the name of the contact */
  const addContacts: { remote_jid: string; server_name: string; signin_code: string }[] = [];
  allContactKeys.forEach((jid) => {
    const exists = savedContactObjects[jid] as string | undefined; // idk why typescript didn't make this type as undefined too
    if (!exists) {
      addContacts.push({ remote_jid: jid, server_name: allContacts[jid], signin_code: randomizeCode() });
    }
  });
  runtimeLogger.verbose(`addContacts content:`);
  runtimeLogger.verbose(JSON.stringify(addContacts, null, 2));

  // Time to save and/or update or maybe do nothing
  if (updateContacts.length > 0) {
    runtimeLogger.info(`updateContacts found with length ${updateContacts.length}`);
    await postgresDb
      .updateTable("contact as c")
      .from(
        values(
          updateContacts.map((u) => ({ id: sql`${u.id}::bigint`, server_name: u.server_name })),
          "u"
        )
      )
      .set((eb) => ({ saved_name: eb.ref("u.server_name") }))
      .whereRef("c.id", "=", "u.id")
      .execute();
    runtimeLogger.info(`updateContacts complete!`);
  }

  if (addContacts.length > 0) {
    runtimeLogger.info(`addContacts found with length ${addContacts.length}`);
    await postgresDb.transaction().execute(async (trx) => {
      runtimeLogger.verbose(`Inserting entities first`);
      const insertedEntities = await trx
        .insertInto("entity")
        .values(
          addContacts.map((ac) => ({ creds_name: projectConfig.SESSION_NAME, type: "Contact", remote_jid: ac.remote_jid }))
        )
        .returning(["entity.id", "entity.remote_jid"])
        .execute();
      runtimeLogger.verbose(`insertedEntities value:`);
      runtimeLogger.verbose(JSON.stringify(insertedEntities, null, 2));

      // Masih belum ada kejelasan apakah insertedEntities bakal ngurut sesuai dengan insert values atau ngga
      // Di sini biar aman, ku pake returning id sama remote_jid aja
      // Referensi: https://stackoverflow.com/questions/5439293/is-insert-returning-guaranteed-to-return-things-in-the-right-order

      // Di sini key nya pake remote_jid sama value nya pake id entity
      const insertedEntitiesObject: Record<string, string> = {};

      insertedEntities.forEach((ie) => (insertedEntitiesObject[ie.remote_jid] = ie.id));
      runtimeLogger.verbose(`insertedEntitiesObject value:`);
      runtimeLogger.verbose(JSON.stringify(insertedEntitiesObject, null, 2));

      runtimeLogger.verbose(`Inserting contact`);
      await trx
        .insertInto("contact")
        .values(
          addContacts.map((ac) => ({
            entity_id: insertedEntitiesObject[ac.remote_jid],
            remote_jid: ac.remote_jid,
            creds_name: projectConfig.SESSION_NAME,
            saved_name: ac.server_name,
            server_name: ac.server_name,
            signin_code: ac.signin_code,
          }))
        )
        .execute();
    });
    runtimeLogger.info(`addContacts complete!`);
  }
});

runtimeLogger.info("Adding group-participants.update event handler");
client.addEventHandler("group-participants.update", async (sock, event) => {
  if (event.participants.length === 0) {
    return runtimeLogger.warning(`event.participants length is 0! Ignoring`);
  }

  const groupJid = event.id;
  const groupData = await postgresDb
    .selectFrom("group as g")
    .select(["id"])
    .where("g.creds_name", "=", projectConfig.SESSION_NAME)
    .where("g.remote_jid", "=", groupJid)
    .executeTakeFirst();

  if (!groupData) {
    // groupData shouldn't be undefined
    // Something is wrong with groups.upsert event handler
    runtimeLogger.error(`Couldn't find group with jid ${groupJid}! Please check for groups.upsert related logs`);
    return;
  }

  switch (event.action) {
    case "add": {
      // Participant(s) added/invited to group
      await postgresDb
        .insertInto("participant")
        .values(event.participants.map((participant_jid) => ({ group_id: groupData.id, participant_jid, role: "MEMBER" })))
        .execute();

      return;
    }
    case "remove": {
      // Participant(s) removed from group
      await postgresDb
        .deleteFrom("participant as p")
        .where("group_id", "=", groupData.id)
        .where("participant_jid", "in", event.participants)
        .execute();

      return;
    }
    case "promote": {
      // Participant(s) promoted into admin
      await postgresDb
        .updateTable("participant as p")
        .where("group_id", "=", groupJid)
        .where("participant_jid", "in", event.participants)
        .set({ role: "ADMIN" }) // Please note that promoting will NEVER make participant as SUPERADMIN
        .execute();

      return;
    }
    case "demote": {
      // Participant(s) demoted into very very ordinary member :D
      await postgresDb
        .updateTable("participant as p")
        .where("group_id", "=", groupJid)
        .where("participant_jid", "in", event.participants)
        .set({ role: "MEMBER" }) // Please note that promoting will NEVER make participant as SUPERADMIN
        .execute();

      return;
    }
    default: {
      await sock.sendMessage(projectConfig.OWNER, {
        text: `Unhandled group-participants.update action type: "${event.action}". JSON Event:\n\n${JSON.stringify(
          event,
          BufferJSON.replacer,
          2
        )}`,
      });
      return;
    }
  }
});

runtimeLogger.info("Adding groups.upsert event handler");
client.addEventHandler("groups.upsert", async (_sock, event) => {
  for (let i = 0; i < event.length; i++) {
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
      author: _, // According to groups.update, this filled with determination (jk) This is who edited the group
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
      descId: __, // Nah, not that important i guess
    } = event[i];

    runtimeLogger.verbose("Starting transaction");
    await postgresDb.transaction().execute(async (trx) => {
      runtimeLogger.info("Inserting new entity into database");
      const insertedEntity = await trx
        .insertInto("entity")
        .values({ creds_name: projectConfig.SESSION_NAME, remote_jid, type: "Group" })
        .onConflict((oc) => oc.columns(["remote_jid", "creds_name"]).doNothing())
        .returning(["id"])
        .executeTakeFirstOrThrow();

      runtimeLogger.info("Inserting new group into database");
      const insertedGroup = await trx
        .insertInto("group")
        .values({
          entity_id: insertedEntity.id,
          remote_jid,
          creds_name: projectConfig.SESSION_NAME,
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
        .onConflict((oc) => oc.constraint("group_pk").doNothing())
        .returning(["id"])
        .executeTakeFirstOrThrow();

      runtimeLogger.info(`Inserting all new ${participants.length} participants into database`);
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
    runtimeLogger.verbose("Transaction completed!");
    runtimeLogger.verbose("All done, returning metadata");
  }
});

if (process.env.IS_DEBUG === "true") {
  runtimeLogger.verbose("IS_DEBUG is true! Capturing all unhandled events to logs/events!");
  unhanldedEvents.forEach((ev) => {
    runtimeLogger.verbose(`Adding capture for event: ${ev}`);
    client.addEventHandler(ev, async (_sock, event) => {
      runtimeLogger.verbose(`Capturing event: ${ev}`);
      const logger = new FileLogger(ev, { folder: "logs/events" });
      logger._write(`Event: ${ev}`);
      logger._write(`Data: ${JSON.stringify(event, BufferJSON.replacer, 2)}`);
      logger.close();
      runtimeLogger.verbose(`Capture done`);
    });
  });
}

// client.addCron("edunex", "* */10 * * * *", edunexCourseListCronJob);

// Test
client.on("close", () => {
  runtimeLogger.verbose("App closed!");
});

runtimeLogger.info("Launching client");
client.launch().catch((err) => {
  writeErrorToFile(err);
});
