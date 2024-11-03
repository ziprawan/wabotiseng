import { CommandHandlerFunc } from "@/types/command/handler";
import { Messages } from "@/utils/classes/message";
import { botDatabase } from "@/utils/database/client";
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

  const request = await botDatabase.requestDeleteMessage.findUnique({
    where: {
      confirmId_chatId_credsName: {
        confirmId: resolvedReactMsg.id ?? "",
        chatId: msg.chat,
        credsName: msg.sessionName,
      },
    },
  });

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
    const deleteMessage = await Messages.getMessage(msg.client, msg.chat, request.messageId);

    if (!deleteMessage) {
      await botDatabase.requestDeleteMessage.update({
        where: { id: request.id },
        data: { done: true },
      });
      return;
    }

    await deleteMessage.delete();
    await resolvedReactMsg.editText(`Message deleted!`);
    await (await resolvedReactMsg.resolveReplyToMessage())?.delete();
    await botDatabase.requestDeleteMessage.update({
      where: { id: request.id },
      data: { agrees, disagrees, done: true },
    });
  } else if (votes <= -MINIMUM_ACCEPTS) {
    await resolvedReactMsg.editText(`${MINIMUM_ACCEPTS} people(s) disagreed to delete this message.`);

    await botDatabase.requestDeleteMessage.update({
      where: { id: request.id },
      data: { agrees, disagrees, done: true },
    });
  } else {
    await botDatabase.requestDeleteMessage.update({
      where: { id: request.id },
      data: { agrees, disagrees },
    });
  }
};
