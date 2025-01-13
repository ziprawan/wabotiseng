export type GroupSubject = {
  /** Subject or title string of the group */
  content: string;
  /** Who last changed the group subject */
  modifiedBy: string | null;
  /** Last modified time of the group subject */
  modifiedAt: Date | null;
};

export type GroupDescription = {
  /** Description content of the group */
  content: string;
  /** Who last modified the group description */
  modifiedBy: string | null;
};

export type GroupChat = {
  /** Group's ID */
  id: string;
  /** Object type is "group" */
  type: "group";
  /** Group's creation date */
  createdAt: Date | null;
  /** Owner of the group (maybe also the creator of group) */
  owner: string;
  /** Subject or title object of the group */
  subject: GroupSubject;
  /** Description object of the group */
  description?: GroupDescription;
  /** Members count of the group */
  membersCount: number;
  /** How long group messages will be deleted (in seconds) */
  disappearingMessageDuration: number | null;
  /** Linked channel id (if available) */
  linkedParent: string | null;
  /** Can members send messages? */
  canSendMessages: boolean;
  /** Can members edit group info? */
  canEditGroupInfo: boolean;
  /** Can members invite another members to group? */
  canAddMembers: boolean;
  /** Is member need admin approval to join the group? */
  needAdminApprovalToJoin: boolean;
};

export type PrivateChat = {
  /** Contact ID */
  id: string;
  /** Object type is "private" */
  type: "private";
  /** Saved contact name */
  savedName?: string | null;
  /** Registered name at WhatsApp */
  pushName?: string | null;
};
export type Contact = PrivateChat;

export type Chat = GroupChat | PrivateChat;
