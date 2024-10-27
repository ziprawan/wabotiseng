import { RubricLevel } from "./level";

export type TaskRubric = {
  id: number;
  task_id: number;
  criteria: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null | undefined;
  percentage: number;
  levels: Array<RubricLevel>;
};

export type TaskAnswerRubric = {
  id: number;
  task_id: number;
  task_answer_id: number;
  task_rubric_criteria_id: number;
  task_rubric_level_id: number;
  task_group_assesment_id: number | null;
  file_id: number; // Unknown
  point: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  type: "personal"; // Add this later
  created_by: number;
};
