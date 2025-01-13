import { TaskAnswer } from "./answer";
import { BooleanLike } from "./boollike";
import { ResponseData } from "./data";
import { TaskFile } from "./file";
import { Meta } from "./meta";
import { TaskRubric } from "./rubric";

export type TaskSchema = {
  taskable_type: "modules"; // Add this later
  taskable_id: number;
  name: string;
  description: string;
  type: "PERSONAL" | "GROUP"; // Add this later
  is_active: BooleanLike;
  start_at: string;
  end_at: string;
  lptk_id: number;
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null | undefined;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null | undefined;
  status: "assigned"; // Add this later
  course_id: number;
  course_name: string;
  course_code: string;
  download_url: string;
  lecturer_percentage: number;
  student_percentage: number;
  all_class: BooleanLike;
  is_assesment_open: BooleanLike;
  assesment_method: "weight" | "rubric" | "within" | "point"; // Add this later
  open_status: "overdue" | "open"; // Add this later
  file_required: BooleanLike;
  is_lateable: BooleanLike;
  domain: "task"; // Add this later
  show_score: BooleanLike;
};

export type TaskAttributes = TaskSchema & {
  files: Array<TaskFile>;
  period_id: number;
  rubrics: Array<TaskRubric>;
  answers: Array<TaskAnswer>;
};

export type TaskListIncludeAnswer = {
  meta: Meta;
  data: ResponseData<"tasks", TaskAttributes>;
};
