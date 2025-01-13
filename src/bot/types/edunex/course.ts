import { ActivityAttributes } from "./activity";
import { BooleanLike } from "./boollike";
import { ResponseData } from "./data";
import { Included } from "./included";
import { LecturerAttributes } from "./lecturer";
import { ModulesAttributes } from "./modules";
import { Relationships } from "./relationships";
import { UserAttributes } from "./user";

export type CourseFaculty = {
  id: number;
  lptk_id: string;
  name: string;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  thumbnail?: string | null;
  procedure?: unknown | null;
  code: string;
};

export type CourseCompletion = {
  completionable: number;
  completion: number;
  percentage: string;
};

export type CourseBasicAttributes = {
  code: string;
  name: string;
  period_id: number;
  lecturer_id: number;
  is_active: BooleanLike;
  start_at: string;
  end_at: string;
  lptk_id: number;
  created_by: number;
  updated_by?: number | null;
  deleted_by?: number | null;
  created_at: string;
  updated_at: string;
  status: "STUDENT" | string;
  thumbnail: string;
};

export type CourseAdditionalAttributes = {
  classes: number;
  is_enrolled: boolean;
  period_year: string;
  period_type: string;
  lecturer: string;
  total_student: number;
  is_open: BooleanLike;
  is_public: BooleanLike;
  view_count?: number | null;
  need_campus: unknown | null;
  major: string;
  faculty: CourseFaculty | null;
  is_from_six: BooleanLike;
  credit: string;
  uuid?: string | null;
  gradebook_publish: boolean;
  completion: CourseCompletion;
  enrollemnts?: unknown[] | null;
  total_modules: number;
  student_from_six: boolean;
  class_name?: string | null;
  tags?: string[] | null;
  certificates: unknown[];
  plan_count: number;
};

export type CourseListAttributes = CourseBasicAttributes & CourseAdditionalAttributes;

export type CourseIncludeWithLecturer = {
  type: "course";
  id: string;
  attributes: CourseBasicAttributes;
  links: { self: string };
  relationships: { lecturer: { links: { self: string; related: string }; data: { type: "lecturer"; id: string } } };
};

// export type SingleCourseWithLecturerModulesAssistant = {};

export type CourseDetailsIncludes =
  | Included<"user", UserAttributes>
  | Included<"activity", ActivityAttributes>
  | Included<"lecturer", LecturerAttributes, Relationships<["user"]>>
  | Included<"modules", ModulesAttributes, Relationships<["activities"], ["activity"]>>
  | Included<"assistant", LecturerAttributes>; // "assistant" type has same attributes with "lecturer" type

export type CourseDetails = {
  data: ResponseData<"courses", CourseListAttributes, ["lecturer", "modules", "assistant"]>;
  included: CourseDetailsIncludes[];
};
