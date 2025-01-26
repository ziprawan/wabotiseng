import { runtimeLogger } from "#bot/index";
import { EventHandlerFunc } from "#bot/types/events";
import { FormatterData } from "#bot/types/whatsapp/formatter";
import { formatReplacer } from "#bot/utils/whatsapp/formatter/replacer";
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
    .leftJoin("group_settings as gs", "gs.group_id", "g.id")
    .select(["g.id", "g.subject", "gs.greeting_message", "gs.leaving_message"])
    .where("g.creds_name", "=", projectConfig.SESSION_NAME)
    .where("g.remote_jid", "=", groupJid)
    .executeTakeFirst();

  console.log(groupData);

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
        if (!groupData.greeting_message) {
          const invitedBy = new Set(...event.participants).has(event.author)
            ? ""
            : `\nYou are invited by @${event.author.split("@")[0]}`;

          return await sock.sendMessage(groupJid, {
            text: `Hello! Welcome to group "${groupData.subject}", ${peserta}${invitedBy}`,
            mentions: [...new Set([...event.participants, event.author])],
          });
        }

        const data: FormatterData = {
          groupid: groupJid.split("@")[0],
          groupsubject: groupData.subject,
          mention: peserta.split(" "),
          inviter: event.author,
        };

        const formatted = formatReplacer(groupData.greeting_message, data);
        const tmpMention: string[] = [];

        if (formatted[2].has("mention")) {
          tmpMention.push(...event.participants);
        }
        if (formatted[2].has("inviter")) {
          tmpMention.push(event.author);
        }

        const mentions = [...new Set(tmpMention)];

        return await sock.sendMessage(groupJid, { text: formatted[0], mentions });
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
          : `\n${event.participants.length > 1 ? "They are" : "He is"} removed by @${event.author.split("@")[0]}`;

        await sock.sendMessage(groupJid, {
          text: `Bye ${peserta}, don't forget to come back ~${kickedBy}`,
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
