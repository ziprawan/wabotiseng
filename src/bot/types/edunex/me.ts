export type Me = {
  id: number;
  username: string;
  name: string;
  password_status: string;
  email: string;
  is_active: number;
  level: string;
  lptk_id: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  thumbnail: string;
  last_online: string;
  faculty_id: number | string | null;
  major_id: number;
  period_id: number;
  code: string;
  user_id: number;
  place_of_birth: string;
  date_of_birth: string;
  gender: "M" | "F";
  front_degree: string;
  back_degree: string;
  religion: string;
  address: string;
  phone_number: string;
  is_from_six: number;
  year: string;
  type: string;
  prs_end: string;
  student_id: number;
  student_ids: number[];
  ms_account: unknown;
  zoom_email: unknown;
  remember_token: unknown;
  notification_email: unknown;
};
