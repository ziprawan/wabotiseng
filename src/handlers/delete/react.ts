import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "@/types/command/handler";
import { Messages } from "@/utils/classes/message";
import { MINIMUM_ACCEPTS } from "./request";

const AGREE = "✅";
const DISAGREE = "❌";
const EMPTY = "";

export const deleteReactionhandler: CommandHandlerFunc = async ({ sock, msg }) => {
  if (!msg.reaction) return;

  const reactor = msg.from;
  const react = msg.reaction.content;
  const resolvedReactMsg = await msg.reaction.resolveReactedMessage();

  if (!resolvedReactMsg) {
    return;
  }

  if (![AGREE, DISAGREE, EMPTY].includes(react)) return;

  if (!resolvedReactMsg.msgKey.fromMe) return;

  const conversation = resolvedReactMsg.conversation;

  if (!conversation) return;

  const request = await postgresDb
    .selectFrom("request_delete_message as rdm")
    .select(["rdm.done", "rdm.agrees", "rdm.disagrees", "rdm.message_id", "rdm.id"])
    .innerJoin("entity as e", "e.id", "rdm.entity_id")
    .where("rdm.confirm_id", "=", resolvedReactMsg.id ?? "")
    .where("e.remote_jid", "=", msg.chat)
    .where("e.creds_name", "=", msg.sessionName)
    .executeTakeFirst();

  if (!request) {
    return;
  }

  if (request.done) return;

  let agrees = request.agrees;
  let disagrees = request.disagrees;

  if (react === AGREE && disagrees.includes(reactor)) {
    agrees.push(reactor);
    disagrees = disagrees.filter((d) => d !== reactor);
  } else if (react === DISAGREE && agrees.includes(reactor)) {
    disagrees.push(reactor);
    agrees = agrees.filter((a) => a !== reactor);
  } else if (react === EMPTY) {
    agrees = agrees.filter((a) => a !== reactor);
    disagrees = disagrees.filter((d) => d !== reactor);
  } else {
    react === AGREE ? agrees.push(reactor) : disagrees.push(reactor);
  }

  const votes = agrees.length - disagrees.length;

  if (votes >= MINIMUM_ACCEPTS) {
    const deleteMessage = await Messages.getMessage(msg.client, msg.chat, request.message_id);

    if (!deleteMessage) {
      await postgresDb.updateTable("request_delete_message").set({ done: true }).where("id", "=", request.id).execute();
      return;
    }

    await deleteMessage.delete();
    await resolvedReactMsg.editText(`Message deleted!`);
    await (await resolvedReactMsg.resolveReplyToMessage())?.delete();
    await postgresDb
      .updateTable("request_delete_message")
      .set({ agrees, disagrees, done: true })
      .where("id", "=", request.id)
      .execute();
  } else if (votes <= -MINIMUM_ACCEPTS) {
    await resolvedReactMsg.editText(`${MINIMUM_ACCEPTS} people(s) disagreed to delete this message.`);

    await postgresDb
      .updateTable("request_delete_message")
      .set({ agrees, disagrees, done: true })
      .where("id", "=", request.id)
      .execute();
  } else {
    await postgresDb.updateTable("request_delete_message").set({ agrees, disagrees }).where("id", "=", request.id).execute();
  }
};
