import { AnswerInclude } from "./answer";
import { CourseIncludeWithLecturer } from "./course";
import { ResponseData } from "./data";
import { LecturerIncludeWithUser } from "./lecturer";
import { Links } from "./links";
import { Meta } from "./meta";
import { QuestionInclude } from "./question";
import { UserInclude } from "./user";

export type Exam = {
  activity_id: number;
  type: string | "quiz";
  name: string;
  created_by: number;
  updated_by: number;
  deleted_by: number | null;
  deleted_at: string | null;
  created_at: string;
  start_at: string;
  end_at: string;
  passing_grade: number;
  package: number;
  course_id: number;
  is_published: number;
  is_finished: number;
  is_show_solution: number;
  is_show_score: number;
  retry: number;
  remaining_time: number;
  is_back: number;
  period_id: number;
  is_duration: number;
  duration: number;
  start_status: "soon" | "start" | "end";
  intro: string;
  is_assistant: boolean;
  is_publishing: number;
  is_shuffle: number;
  final_score_type: "HIGHEST" | "LATEST" | string;
  is_restricted_ip: boolean;
  ip_whitelists: unknown[];
  is_safe: boolean;
  is_token: boolean;
  is_mobile: boolean;
  use_autograder: boolean;
  auto_apply_scoregrader: boolean;
  is_airplane: boolean;
  is_network_change: boolean;
  is_minimize: boolean;
  is_incoming_call: boolean;
  is_sms: boolean;
  is_show_solution_directly: boolean;
};

type ExamListIncludedCourses = CourseIncludeWithLecturer | LecturerIncludeWithUser | UserInclude;

export type ExamList = {
  meta: Meta;
  data: Array<ResponseData<"exams", Exam>>;
  links: Links;
};

export type ExamListWithCourse = {
  meta: { count: number; total: number };
  data: {
    type: "exams";
    id: string;
    attributes: Exam;
    links: { first: string; last: string; next?: string | null; prev?: string | null };
    relationships: {
      course: { links: { self: string; related: string }; data: { type: "course"; id: string } };
    };
  }[];
  links: { first: string; last: string; next?: string | null; prev?: string | null };
  included: ExamListIncludedCourses[];
};

type ExamListIncludedQuestions = QuestionInclude | AnswerInclude;

export type ExamListWithQuestions = {
  meta: { count: number; total: number };
  data: {
    type: "exams";
    id: string;
    attributes: Exam;
    links: { first: string; last: string; next?: string | null; prev?: string | null };
    relationships: { questions: { links: { self: string; related: string }; data: { type: "questions"; id: string }[] } };
  }[];
  links: { first: string; last: string; next?: string | null; prev?: string | null };
  included: ExamListIncludedQuestions[];
};
