import { ParticipantRole } from "@/database/db";
import { GroupParticipant } from "@whiskeysockets/baileys";

export function participantRoleToEnum(inp: GroupParticipant["admin"]): ParticipantRole {
  if (!inp) return "MEMBER";
  if (inp === "admin") return "ADMIN";
  if (inp === "superadmin") return "SUPERADMIN";

  return "MEMBER";
}
