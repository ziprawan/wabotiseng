import { ProcessedActivity } from "./activity";

export type ModulesAttributes = {
  course_id: number;
  index: number;
  name: string;
  is_active: boolean;
  start_at: string;
  end_at: string;
  lptk_id: number;
  stages: unknown[];
  created_by: number;
  updated_by: number | null;
  deleted_by: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ProcessedModule = {
  id: string;
  attributes: ModulesAttributes;
  activities: Array<ProcessedActivity>;
};
