export type QuestionInclude = {
  type: "questions";
  id: string;
  attributes: {
    exam_id: string;
    index: number;
    question: string;
    package: string;
    type: "multiple_choices" | string;
    group: string;
    created_by: number;
    updated_by: number | null;
    deleted_by: number | null;
    created_at: string;
    updated_at: string;
    weight: number;
    solution: string | null;
    tags: string[];
    data_set_id: unknown;
    files: unknown[];
  };
  links: { self: string };
  relationships: { answers: { links: { self: string; related: string }; data: { type: "answers"; id: string }[] } };
};
