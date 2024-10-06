export type ChatType = "private" | "group" | "channel" | "broadcast" | "newsletter";

export type Chat = {
  id: string;
  type: ChatType;
};
