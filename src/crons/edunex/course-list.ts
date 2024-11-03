import { CronFunc } from "@/types/cron";
import { CoursesList } from "@/types/edunex/course-list";
import { botDatabase } from "@/utils/database/client";
import { EdunexAPI } from "@/utils/edunex/api";

export const edunexCourseListCronJob: CronFunc = async (logger, credsName) => {
  logger.write("Gathering all accounts...");
  const accounts = await botDatabase.edunexAccount.findMany({
    select: {
      token: true,
      userId: true,
      courseMembers: { select: { course: { select: { id: true, courseId: true, updatedAt: true } } } },
    },
    where: { credsName },
  });

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    logger.write(`Account ${i + 1} of ${accounts.length}`);
    logger.write(`User: ${acc.userId}`);
    const token = acc.token;
    const edunex = new EdunexAPI(token);

    logger.write("Fetching courses...");
    const resp = await edunex.fetch({ pathname: "/course/courses", params: { page: { limit: 0 } } });

    logger.write(`Response status is ${resp.status}`);
    if (resp.status !== 200) {
      logger.write(await resp.text());
      continue;
    }

    logger.write("Parsing courses...");
    const courses = (await resp.json()) as CoursesList;
    const parsedCourses = courses.data.map((course) => {
      return {
        id: parseInt(course.id),
        updatedAt: new Date(course.attributes.updated_at),
      };
    });
    let parsedCoursesSet: Record<string, Date> = {};
    parsedCourses.forEach((c) => (parsedCoursesSet[c.id] = c.updatedAt));

    logger.write("Getting existing courses...");
    const existingCourses = acc.courseMembers.map((cm) => cm.course);
    let courseSet: Record<number, { id: string; updatedAt: Date }> = {};
    existingCourses.forEach((c) => (courseSet[c.courseId] = { id: c.id, updatedAt: c.updatedAt }));

    logger.write("Filtering added courses...");
    const newCourses = parsedCourses.filter((c) => {
      return !courseSet[c.id];
    });
    newCourses.forEach((n) => logger.write(`Found added courseId: ${n.id}`));

    logger.write("Filtering edited courses...");
    const updatedCourses = parsedCourses
      .map((c) => {
        const existingCourse = courseSet[c.id];
        return existingCourse ? { id: existingCourse.id, courseId: c.id, updatedAt: c.updatedAt } : null;
      })
      .filter((c) => c !== null);
    updatedCourses.forEach((u) => logger.write(`Found updated courseId: ${u.courseId}`));

    logger.write("Filtering deleted courses...");
    const deletedCourses = existingCourses.filter((c) => {
      return !parsedCoursesSet[c.id];
    });
    deletedCourses.forEach((d) => logger.write(`Found deleted courseId: ${d.courseId}`));

    logger.write("Inserting new courses...");
    await botDatabase.edunexCourses.createMany({
      data: newCourses.map((c) => {
        return {
          courseId: c.id,
          updatedAt: c.updatedAt,
        };
      }),
    });

    logger.write("Registering this user into course members...");
    await botDatabase.edunexCourseMember.createMany({
      data: updatedCourses.map((c) => {
        return {
          accountId: acc.userId,
          courseId: c.id,
          updatedAt: c.updatedAt,
        };
      }),
    });

    logger.write("Updating existing courses...");
    await botDatabase.$transaction(
      updatedCourses.map((c) => {
        return botDatabase.edunexCourses.updateMany({
          where: { id: c.id },
          data: {
            updatedAt: c.updatedAt,
          },
        });
      })
    );

    logger.write("Deleting old courses...");
    await botDatabase.$transaction(
      deletedCourses.map((c) => {
        return botDatabase.edunexCourses.delete({ where: { id: c.id } });
      })
    );

    logger.write(`Done for user ${acc.userId}!`);
  }

  logger.write("All done!");
};
