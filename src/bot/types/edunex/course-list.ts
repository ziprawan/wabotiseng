import { CourseListAttributes } from "./course";
import { ResponseData } from "./data";
import { Included } from "./included";
import { LecturerAttributes } from "./lecturer";
import { Links } from "./links";
import { Meta } from "./meta";
import { PeriodAttributes } from "./period";
import { Relationships } from "./relationships";
import { UserAttributes } from "./user";

export type CourseListIncludes =
  | Included<"lecturer", LecturerAttributes, Relationships<["user"]>>
  | Included<"period", PeriodAttributes>
  | Included<"user", UserAttributes>;

export type CoursesList = {
  meta: Meta;
  data: Array<ResponseData<"courses", CourseListAttributes, ["lecturer", "period"]>>;
  included: Array<CourseListIncludes>;
  links: Links;
};
