import { ResponseData } from "./data";
import { Links } from "./links";
import { Meta } from "./meta";

export type ContentAttributes = {
  contentable_type: "App\\Models\\Courses" | "App\\Models\\Modules" | "App\\Models\\Activities"; // Add this later
  contentable_id: number;
  index: number;
  name: string;
  type: "zoom" | "video" | "text" | "pdf" | "doc" | "docx" | "xlsx" | "ppt"; // Add this later (pptx? xls?)
  content: string;
  lptk_id: number;
  size: string | null; // This string is actually integer
  created_by: string;
  updated_by: string;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  course_id: number;
  completion_at: unknown;
  course_code: string;
  course_name: string;
};

export type CourseContents = {
  meta: Meta;
  data: Array<ResponseData<"contents", ContentAttributes>>;
  links: Links;
};
