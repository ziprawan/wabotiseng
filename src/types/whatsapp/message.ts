import { Messages } from "@/utils/classes/message";
import { ReactionClass } from "@/utils/classes/reaction";
import { proto } from "@whiskeysockets/baileys";
import { WASocket } from "../socket";
import { Audio } from "./audio";
import { ContactMessage } from "./contact";
import { Document } from "./document";
import { EventMessage } from "./event";
import { Image } from "./image";
import { LocationMessage } from "./location";
import { Poll } from "./poll";
import { Sticker } from "./sticker";
import { Video } from "./video";
import { VideoNote } from "./videoNote";
import { Voice } from "./voice";

export type MessageType = {
  id: string;
  chat: string;
  from: string;
  date: Date;
  reply_to_message?: MessageType;
  conversation?: string;
  caption?: string;
  text: string;

  audio?: Audio;
  document?: Document;
  image?: Image;
  sticker?: Sticker;
  video?: Video;
  videoNote?: VideoNote;
  voice?: Voice;

  contacts?: ContactMessage[];
  location?: LocationMessage;
  event?: EventMessage;
  poll?: Poll;
  reaction?: ReactionClass;

  raw: proto.IWebMessageInfo;
};

export type MessageHandlerType = (sock: WASocket, message: Messages) => Promise<any>;
