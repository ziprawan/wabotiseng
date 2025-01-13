export type RubricLevel = {
  id: number;
  task_id: number;
  task_criteria_id: number;
  level: "weight";
  description: string;
  point: number;
  point_min: number;
  point_max: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null | undefined;
};
