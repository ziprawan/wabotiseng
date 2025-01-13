import { BooleanLike } from "./boollike";

export type ActivityAttributes = {
  module_id: number;
  parent_id: number | null;
  index: number;
  name: string;
  is_active: BooleanLike;
  start_at: string;
  end_at: string;
  lptk_id: number;
  created_by: number;
  updated_by: number | null;
  deleted_by: number | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type ProcessedActivity = {
  id: string;
  attributes: ActivityAttributes;
};
