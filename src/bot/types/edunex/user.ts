import { BooleanLike } from "./boollike";

export type UserAttributes = {
  username: string;
  name: string;
  password?: string;
  password_status: "CHANGED" | string;
  email: string;
  is_active: BooleanLike;
  level: "LECTURER" | string;
  lptk_id: number;
  created_at: string;
  updated_at: string | null;
  deleted_at?: string | null;
  created_by?: string;
  updated_by?: string | null;
  deleted_by?: string | null;
  remember_token?: unknown | null;
  thumbnail?: string;
  last_online?: string;
  faculty_id?: unknown;
  major_id?: unknown;
  notification_email?: unknown;
  zoom_email?: unknown;
};

export type UserInclude = {
  type: "user";
  id: string;
  attributes: UserAttributes;
  links: { self: string };
};
