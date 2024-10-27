export type TaskFile = {
  name: string;
  file: string;
};

export type TaskAnswerFile = {
  id: number;
  fileable_type: "task_answers";
  fileable_id: string;
  name: string;
  file: string;
  lptk_id: number;
  course_id: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null | undefined;
};
