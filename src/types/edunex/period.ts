import { BooleanLike } from "./boollike";

export type PeriodAttributes = {
  lptk_id: number;
  year: string;
  type: string;
  is_active: BooleanLike;
  deleted_at?: string | null;
  updated_at?: string | null;
  created_at: string;
  prs_end: unknown | null;
};
