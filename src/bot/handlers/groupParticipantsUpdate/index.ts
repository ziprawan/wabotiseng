import { runtimeLogger } from "#bot/index";
import { EventHandlerFunc } from "#bot/types/events";
import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { BufferJSON } from "@whiskeysockets/baileys";

export const groupParticipantsUpdateHandler: EventHandlerFunc<"group-participants.update"> = async (sock, event) => {
  if (event.participants.length === 0) {
    return runtimeLogger.warning(`event.participants length is 0! Ignoring`);
  }

  const me = sock.user?.id ?? "";
  const groupJid = event.id;
  const groupData = await postgresDb
    .selectFrom("group as g")
    .select(["id", "subject"])
    .where("g.creds_name", "=", projectConfig.SESSION_NAME)
    .where("g.remote_jid", "=", groupJid)
    .executeTakeFirst();

  if (!groupData) {
    // groupData shouldn't be undefined
    // Something is wrong with groups.upsert event handler
    runtimeLogger.error(`Couldn't find group with jid ${groupJid}! Please check for groups.upsert related logs`);
    return;
  }

  if (process.env.IS_DEBUG === "true") {
    await sock.sendMessage(groupJid, { text: JSON.stringify(event, BufferJSON.replacer, 2) });
  }

  switch (event.action) {
    case "add": {
      // Participant(s) added/invited to group
      await postgresDb
        .insertInto("participant")
        .values(event.participants.map((participant_jid) => ({ group_id: groupData.id, participant_jid, role: "MEMBER" })))
        .execute();

      if (!new Set(event.participants).has(me)) {
        const peserta = event.participants.map((p) => "@" + p.split("@")[0]).join(" ");
        const invitedBy = new Set(...event.participants).has(event.author)
          ? ""
          : `\nKamu sudah diundang oleh @${event.author.split("@")[0]}`;

        await sock.sendMessage(groupJid, {
          text: `Halo halo! Selamat datang di grup "${groupData.subject}", ${peserta}${invitedBy}`,
          mentions: [...new Set([...event.participants, event.author])],
        });
      }

      return;
    }
    case "remove": {
      // Participant(s) removed from group
      await postgresDb
        .deleteFrom("participant as p")
        .where("group_id", "=", groupData.id)
        .where("participant_jid", "in", event.participants)
        .execute();

      if (!new Set(event.participants).has(me)) {
        const peserta = event.participants.map((p) => "@" + p.split("@")[0]).join(" ");
        const kickedBy = new Set(...event.participants).has(event.author)
          ? ""
          : `\n${event.participants.length > 1 ? "Mereka" : "Dia"} dikeluarkan oleh @${event.author.split("@")[0]}`;

        await sock.sendMessage(groupJid, {
          text: `Bye ${peserta}, jangan lupa balik lagi ya kalau kangen ~${kickedBy}`,
          mentions: [...new Set([...event.participants, event.author])],
        });
      }

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
};
