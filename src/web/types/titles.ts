export type CompleteID = { id: string; jid: string };

export type GroupRole = "MEMBER" | "ADMIN" | "SUPERADMIN";

export type ParticipantInfo = CompleteID & {
  role: GroupRole;
  name: string | null;
};

export type GroupInfo = {
  me: ParticipantInfo;
  group: CompleteID & { participants: ParticipantInfo[]; name: string | null };
};

export type Titles = {
  id: string;
  title_name: string;
  claimable: boolean;
  holding: boolean;
};

export type TitlesWithHolders = Titles & { holders: { jid: string; name: string | null }[] };
