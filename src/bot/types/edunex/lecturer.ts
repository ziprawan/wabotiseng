export type LecturerAttributes = {
  user_id: number;
  lptk_id: number;
  nidn: string;
  name: string;
  place_of_birth: string;
  date_of_birth: string;
  gender: "F" | "M";
  front_degree: string;
  back_degree: string;
  phone_number: string;
  deleted_at: string;
  created_at: string;
  updated_at: string;
  last_online: string;
};

export type LecturerIncludeWithUser = {
  type: "lecturer";
  id: string;
  attributes: LecturerAttributes;
  links: { self: string };
  relationships: { user: { links: { self: string; related: string }; data: { type: "user"; id: string } } };
};
