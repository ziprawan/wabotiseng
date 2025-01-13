import { BooleanLike } from "./boollike";
import { TaskAnswerFile } from "./file";
import { TaskAnswerRubric } from "./rubric";
import { TaskSchema } from "./task";
import { UserAttributes } from "./user";

export type AnswerInclude = {
  type: "answers";
  id: string;
  attributes: {
    question_id: number;
    index: number;
    point: number | null;
    created_by: number;
    updated_by: number | null;
    deleted_by: number | null;
    created_at: string;
    updated_at: string;
    answer: string;
    pair_answer: string | null;
    exact_answer: string;
    formula: unknown;
    decimal_place: unknown;
  };
  links: { self: string };
};

export type TaskAnswer = {
  id: number;
  task_id: number;
  student_id: number;
  answer: string;
  file: unknown; // ???
  score: number;
  is_sent: BooleanLike;
  sent_at: string;
  sent_by: number;
  verified_by: number;
  verified_at: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null | undefined;
  files: Array<TaskAnswerFile>;
  // Those fields below are just shown if I include answers
  // Dude, wtf?
  task: TaskSchema & { id: number }; // I'm crying dude
  verified: UserAttributes & { id: number };
  rubric: Array<TaskAnswerRubric>;
};
