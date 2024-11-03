import { CronFunc } from "@/types/cron";
import { botDatabase } from "@/utils/database/client";
import { EdunexAPI } from "@/utils/edunex/api";

export const edunexAssignmentCronFunc: CronFunc = async (logger) => {
  const courses = await botDatabase.edunexCourses.findMany({
    select: { members: { select: { account: { select: { token: true } } }, take: 1 } },
  });

  courses.forEach(async (course) => {
    logger.write(course.members[0].account.token);
  });
};
