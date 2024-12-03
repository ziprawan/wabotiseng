import { GroupParticipant } from "@whiskeysockets/baileys";
import { ParticipantRole } from "kysely-codegen";

export function participantRoleToEnum(inp: GroupParticipant["admin"]): ParticipantRole {
  if (!inp) return "MEMBER";
  if (inp === "admin") return "ADMIN";
  if (inp === "superadmin") return "SUPERADMIN";

  return "MEMBER";
}