// Fix alias import when compiled by tsc
import "module-alias/register";

import { BufferJSON, Contact } from "@whiskeysockets/baileys";
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
import { randomizeCode } from "./utils/generics/randomizeNumber";
import { FileLogger } from "./utils/logger/file";
import { sleep } from "./utils/sleep";

const runtimeLogger = new FileLogger("runtime", { loglevel: process.env.IS_DEBUG === "true" ? 0 : 1 });

migrator
  .migrateToLatest()
  .then(({ error, results }) => {
    results?.forEach((it) => {
      if (it.status === "Success") {
        runtimeLogger.info(`Migration ${it.migrationName} was executed successfully!`);
      } else if (it.status === "Error") {
        runtimeLogger.error(`Failed to execute migration ${it.migrationName}!`);
      } else {
        runtimeLogger.verbose(`Migration ${it.migrationName} is not executed!`);
      }
    });

    if (error) {
      runtimeLogger.error(`Failed to execute all migration(s)!`);
      runtimeLogger.error(error as any);
      runtimeLogger.error("Exiting...");
      console.error("Something went wrong when doing database migration!");
      console.error(error);
      throw new Error(`Process exited caused by failed migration`);
    }
  })
  .finally(() => runtimeLogger.verbose("migrator.migrateToLatest() successfully called!"));

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
  "contacts.update",
  "contacts.upsert", // Maybe this will only triggers when I save a new contact on WhatsApp
  "group-participants.update",
  "group.join-request",
  "groups.update",
  "groups.upsert",
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
  if (client.isEventSuspended) {
    runtimeLogger.verbose(`Currently event suspension state is true! Archiving event "messages.upsert"`);
    client.suspendedEvents.push(["messages.upsert", event]);
    return;
  }

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

  if (client.isEventSuspended) {
    runtimeLogger.verbose(`Currently event suspension state is true! Archiving event "contacts.update"`);
    client.suspendedEvents.push(["contacts.update", event]);
    return;
  }

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
  if (client.isEventSuspended) {
    runtimeLogger.verbose(`Currently event suspension state is true! Archiving event "group-participants.update"`);
    client.suspendedEvents.push(["group-participants.update", event]);
    return;
  }

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
  if (client.isEventSuspended) {
    runtimeLogger.verbose(`Currently event suspension state is true! Archiving event "groups.upsert"`);
    client.suspendedEvents.push(["groups.upsert", event]);
    return;
  }

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

runtimeLogger.info("Adding messaging-history.set event handler");
client.addEventHandler("messaging-history.set", async (sock, event) => {
  runtimeLogger.verbose("messaging-history.set handler called");

  if (client.isEventSuspended) {
    runtimeLogger.verbose(`Currently event suspension state is true! Archiving event "messaging-history.set"`);
    client.suspendedEvents.push(["messaging-history.set", event]);
    return;
  }

  client.setEventSuspendedState(true);
  const contacts = event.contacts;
  sock.user && contacts.push(sock.user);

  // { jid: notify }
  const insertContacts: Record<string, string> = {};
  const insertContactJids: Set<string> = new Set();

  // jids[]
  const insertGroupJids: Set<string> = new Set();

  // Unhandled entities
  const unhandledEntities: Contact[] = [];

  for (let i = 0; i < contacts.length; i++) {
    const entity = contacts[i];

    if (entity.id.endsWith("@g.us")) {
      // This is a group
      insertGroupJids.add(entity.id);
    } else if (entity.id.endsWith("@s.whatsapp.net")) {
      // This is a contact
      insertContactJids.add(entity.id);
      insertContacts[entity.id] = entity.notify ?? "Unknown.";
    } else {
      unhandledEntities.push(entity);
    }
  }

  if (insertContactJids.size > 0) {
    runtimeLogger.verbose(`insertContacJids size is greater than 0 (${insertContactJids.size})`);

    const existingContacts = await postgresDb
      .selectFrom("contact as c")
      .select(["remote_jid"])
      .where("c.creds_name", "=", projectConfig.SESSION_NAME)
      .where("c.remote_jid", "in", [...insertContactJids])
      .execute();

    existingContacts.forEach((c) => insertContactJids.delete(c.remote_jid));
    runtimeLogger.verbose(`insertContactJids: ${[...insertContactJids]}`);

    if (insertContactJids.size > 0) {
      try {
        await postgresDb.transaction().execute(async (trx) => {
          const insertedEntities = await trx
            .insertInto("entity")
            .values(
              [...insertContactJids].map((remote_jid) => ({
                creds_name: projectConfig.SESSION_NAME,
                remote_jid,
                type: "Contact",
              }))
            )
            .returning(["id", "remote_jid"])
            .onConflict((oc) => oc.columns(["remote_jid", "creds_name"]).doNothing())
            .execute();

          if (insertedEntities.length === 0) {
            throw new Error("Nothing to do huh?");
          }

          await trx
            .insertInto("contact")
            .values(
              insertedEntities.map(({ remote_jid, id: entity_id }) => ({
                creds_name: projectConfig.SESSION_NAME,
                remote_jid,
                entity_id,
                saved_name: insertContacts[remote_jid],
                server_name: insertContacts[remote_jid],
                signin_code: randomizeCode(),
              }))
            )
            .onConflict((oc) => oc.columns(["entity_id"]).doNothing())
            .execute();
        });
      } catch {
        client.setEventSuspendedState(false);
        runtimeLogger.verbose("Insert error, maybe entity already inserted?");
      }
    }

    runtimeLogger.verbose(`All contact inserted!`);
  }

  if (insertGroupJids.size > 0) {
    let insertGroupJidsArr = [...insertGroupJids];
    const groupIsExists = await postgresDb
      .selectFrom("group as g")
      .select(["remote_jid"])
      .where("g.creds_name", "=", projectConfig.SESSION_NAME)
      .where("g.remote_jid", "in", insertGroupJidsArr)
      .execute();

    // Filter it, just insert group when it doesn't exists on database
    groupIsExists.forEach(({ remote_jid }) => insertGroupJids.delete(remote_jid));
    runtimeLogger.verbose(`insertGroupJids: ${insertGroupJidsArr}`);

    insertGroupJidsArr = [...insertGroupJids];

    for (let i = 0; i < insertGroupJidsArr.length; i++) {
      const jid = insertGroupJidsArr[i];
      runtimeLogger.verbose("Sleeping for 0.5 seconds");
      await sleep(500);
      runtimeLogger.verbose("Querying metadata...");
      const metadata = await sock.groupMetadata(jid);
      runtimeLogger.verbose("Query complete! Inserting to database");

      try {
        await postgresDb.transaction().execute(async (trx) => {
          const insertedEntities = await trx
            .insertInto("entity")
            .values({ creds_name: projectConfig.SESSION_NAME, remote_jid: jid, type: "Group" })
            .returning(["id", "remote_jid"])
            .onConflict((oc) => oc.columns(["remote_jid", "creds_name"]).doNothing())
            .executeTakeFirstOrThrow();

          const insertedGroup = await trx
            .insertInto("group")
            .values({
              entity_id: insertedEntities.id,
              remote_jid: insertedEntities.remote_jid,
              creds_name: projectConfig.SESSION_NAME,
              owner: metadata.owner ?? "",
              subject: metadata.subject,
              subject_time: metadata.subjectTime ? new Date(metadata.subjectTime) : null,
              subject_owner: metadata.subjectOwner,
              desc: metadata.desc,
              desc_owner: metadata.descOwner,
              creation: metadata.creation ? new Date(metadata.creation) : null,
              announce: metadata.announce,
              restrict: metadata.restrict,
              join_approval_mode: metadata.joinApprovalMode,
              linked_parent: metadata.linkedParent,
              member_add_mode: metadata.memberAddMode,
              size: metadata.size,
              is_community: metadata.isCommunity,
              is_community_announce: metadata.isCommunityAnnounce,
              ephemeral_duration: metadata.ephemeralDuration,
              invite_code: metadata.inviteCode,
            })
            .onConflict((oc) =>
              oc.columns(["entity_id"]).doUpdateSet({
                owner: metadata.owner ?? "",
                subject: metadata.subject,
                subject_time: metadata.subjectTime ? new Date(metadata.subjectTime) : null,
                subject_owner: metadata.subjectOwner,
                desc: metadata.desc,
                desc_owner: metadata.descOwner,
                creation: metadata.creation ? new Date(metadata.creation) : null,
                announce: metadata.announce,
                restrict: metadata.restrict,
                join_approval_mode: metadata.joinApprovalMode,
                linked_parent: metadata.linkedParent,
                member_add_mode: metadata.memberAddMode,
                size: metadata.size,
                is_community: metadata.isCommunity,
                is_community_announce: metadata.isCommunityAnnounce,
                ephemeral_duration: metadata.ephemeralDuration,
                invite_code: metadata.inviteCode,
              })
            )
            .returning(["id"])
            .executeTakeFirstOrThrow();

          await trx
            .insertInto("participant")
            .values(
              metadata.participants.map((p) => ({
                group_id: insertedGroup.id,
                participant_jid: p.id,
                role: participantRoleToEnum(p.admin),
              }))
            )
            .onConflict((oc) => oc.columns(["group_id", "participant_jid"]).doNothing())
            .execute();
        });
      } catch {
        client.setEventSuspendedState(false);
        runtimeLogger.verbose("Insert error, maybe entity already inserted?");
      }

      runtimeLogger.verbose(`Group ${jid} inserted!`);
    }
  }

  if (unhandledEntities.length > 0) {
    runtimeLogger.verbose(`Unhandled entities total: ${unhandledEntities.length}`);
    runtimeLogger.verbose(`Additional unhandled entities info: ${JSON.stringify(unhandledEntities)}`);
  }

  client.setEventSuspendedState(false);
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

// Test
client.on("close", () => {
  runtimeLogger.verbose("App closed!");
});

runtimeLogger.info("Launching client");
client.launch().catch((err) => {
  runtimeLogger.error("Client launcher errored! Additional info:");
  runtimeLogger.error((err as Error).stack ?? "Unknown.");
});
