import { getPrisma } from '../config/db';
import { cache } from '../config/cache';
import { TTL } from '../config/redis';


export class TrajectoryService {
  static async generateRecommendations(studentId: string, targetSemester: number) {
    const cacheKey = `${studentId}:${targetSemester}`;
    const cached = await cache.get<any>(`recommendations:${cacheKey}`);
    if (cached) return cached;

    const result = await this.executeRecommendationLogic(studentId, targetSemester);
    await cache.set(`recommendations:${cacheKey}`, result, TTL.RECOMMENDATIONS);
    return result;
  }

  private static async executeRecommendationLogic(studentId: string, targetSemester: number) {

    const student = await getPrisma().student.findUnique({
      where: { id: studentId },
      include: { group: { include: { educationalProgram: true } } }
    });

    if (!student) throw new Error('Студента не знайдено');

    const eligibleCourses = await this.getEligibleCourses(studentId);
    const targetCourses = eligibleCourses.map(c => c.id);

    const records = await getPrisma().academicRecord.findMany({
      where: { studentId },
      select: { courseId: true, gradeValue: true, dateRecorded: true }
    });

    const formattedRecords = records.map(r => ({
      course_id: r.courseId,
      grade: r.gradeValue,
      date_recorded: r.dateRecorded.toISOString()
    }));

    const dependencies = await getPrisma().courseDependency.findMany({
      where: { childCourseId: { in: targetCourses } }
    });

    const formattedDependencies = dependencies.map(d => ({
      parent_course_id: d.parentCourseId,
      child_course_id: d.childCourseId,
      weight: d.weight
    }));

    const selectiveCourseIds = eligibleCourses.filter(c => c.isSelective).map(c => c.id);

    const existingParams = await getPrisma().studentModelParams.findMany({
      where: { studentId }
    });

    const paramsMap: Record<string, any> = {};
    existingParams.forEach(p => {
      paramsMap[p.courseId] = {
        pLearn: p.pLearn,
        pSlip: p.pSlip,
        pGuess: p.pGuess,
        currentPKnown: p.currentPKnown
      };
    });

    const ibktInput = {
      student_id: studentId,
      target_courses: selectiveCourseIds,
      previous_records: formattedRecords,
      course_dependencies: formattedDependencies,
      existing_params: paramsMap
    };

    let resultJson: any;
    try {
      const baseUrl = process.env.ANALYTICAL_CORE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${baseUrl}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ibktInput),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      resultJson = await response.json();
    } catch (err: any) {
      throw new Error(`Analytics Engine Server Error: ${err.message}. Make sure the Python server is running (npm run python:start).`);
    }

    if (resultJson.error) {
      throw new Error(`Analytics Engine Error: ${resultJson.error}`);
    }

    const { recommendations: recommendedCourses } = resultJson;

    const recommendedIds = recommendedCourses.map((c: any) => c.course_id);
    const dbCourses = await getPrisma().course.findMany({
      where: { id: { in: [...recommendedIds, ...targetCourses] } },
      include: { schedules: true, category: true }
    });


    const mandatoryCourses = dbCourses.filter(c => !c.isSelective && targetCourses.includes(c.id));

    const enrolledCounts = await getPrisma().trajectoryItem.groupBy({
      by: ['courseId'],
      _count: { id: true },
      where: {
        trajectory: { status: { in: ['PENDING', 'APPROVED'] } },
        courseId: { in: [...recommendedIds, ...targetCourses] }
      }
    });
    const countMap = new Map(enrolledCounts.map(ec => [ec.courseId, ec._count.id]));

    const recommendations = recommendedCourses.map((rc: any) => {
      const c: any = dbCourses.find((db: any) => db.id === rc.course_id);
      if (!c || !c.isSelective) return null;

      let categoryName = c?.category?.name || 'Загальні';

      const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
      const scheduleStr = c?.schedules && c.schedules.length > 0
        ? c.schedules.map((s: any) => `${days[s.dayOfWeek % 7]} ${s.startTime}-${s.endTime}`).join(', ')
        : 'Не призначено';

      return {
        course: {
          id: c?.id,
          name: c?.name,
          ectsCredits: c?.ectsCredits,
          isSelective: true,
          maxStudents: c?.maxStudents || null,
          enrolledCount: countMap.get(c?.id) || 0
        },
        probability: rc.probability,
        category: categoryName,
        schedule: scheduleStr
      };
    }).filter(Boolean);

    const mandatory = mandatoryCourses.map(c => {
      const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
      const scheduleStr = c.schedules && c.schedules.length > 0
        ? c.schedules.map((s: any) => `${days[s.dayOfWeek % 7]} ${s.startTime}-${s.endTime}`).join(', ')
        : 'Не призначено';

      return {
        course: {
          id: c.id,
          name: c.name,
          ectsCredits: c.ectsCredits,
          isSelective: false,
          maxStudents: c.maxStudents || null,
          enrolledCount: countMap.get(c.id) || 0
        },
        probability: 1.0,
        category: c.category?.name || 'Обовʼязкові',
        schedule: scheduleStr
      };
    });

    const settings = await getPrisma().globalSettings.findFirst();

    const result = {
      trajectoryId: null,
      recommendations,
      mandatory,
      isSelectionOpen: settings?.isSelectionOpen || false,
      maxCreditsPerSem: student.group.educationalProgram.maxCreditsPerSem
    };
    return result;
  }

  static async validateTrajectory(studentId: string, courseIds: string[]) {
    const student = await getPrisma().student.findUnique({
      where: { id: studentId },
      include: { group: { include: { educationalProgram: true } } }
    });

    if (!student) throw new Error('Студента не знайдено');

    const maxEcts = student.group.educationalProgram.maxCreditsPerSem || 30.0;

    const courses = await getPrisma().course.findMany({
      where: { id: { in: courseIds } },
      include: { schedules: true }
    });

    const sumEcts = courses.reduce((acc: number, c: any) => acc + c.ectsCredits, 0);

    // 1. Check schedule collisions
    const collisions: string[] = [];
    const scheduleItems = courses.flatMap(c =>
      c.schedules.map((s: any) => ({ ...s, courseName: c.name }))
    );

    for (let i = 0; i < scheduleItems.length; i++) {
      for (let j = i + 1; j < scheduleItems.length; j++) {
        const s1 = scheduleItems[i];
        const s2 = scheduleItems[j];
        if (s1.dayOfWeek === s2.dayOfWeek) {
          if ((s1.startTime < s2.endTime) && (s2.startTime < s1.endTime)) {
            collisions.push(`Schedule conflict: ${s1.courseName} and ${s2.courseName}`);
          }
        }
      }
    }

    const errors: string[] = [...collisions];
    
    if (sumEcts > maxEcts) {
      errors.push(`Credit limit exceeded: ${sumEcts.toFixed(1)} / ${maxEcts}`);
    }

    return {
      isValid: errors.length === 0,
      totalCredits: sumEcts,
      maxEcts,
      collisions,
      errors
    };
  }

  static async submitTrajectory(studentId: string, courseIds: string[], semester: number) {
    const validation = await this.validateTrajectory(studentId, courseIds);
    if (!validation.isValid) {
      let errorMessage = 'Траєкторія не може бути подана: ';
      if (validation.collisions.length > 0) {
        errorMessage += `виявлено перетини в розкладі (${validation.collisions.join(', ')}). `;
      }
      if (validation.totalCredits > validation.maxEcts) {
        errorMessage += `перевищено ліміт кредитів (${validation.totalCredits.toFixed(1)} з ${validation.maxEcts}). `;
      }
      const err: any = new Error(errorMessage);
      err.status = 400;
      throw err;
    }

    const settings = await getPrisma().globalSettings.findFirst();
    if (settings && !settings.isSelectionOpen) {
      const err: any = new Error('Період вибору траєкторій наразі закритий. Будь ласка, зверніться до адміністратора.');
      err.status = 400;
      throw err;
    }

    const activeTrajectory = await getPrisma().trajectory.findFirst({
      where: {
        studentId,
        semester,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (activeTrajectory) {
      const err: any = new Error(
        activeTrajectory.status === 'APPROVED'
          ? 'У вас вже є затверджена траєкторія на цей семестр.'
          : 'У вас вже є подана траєкторія на розгляді. Дочекайтеся рішення адміністратора або скасуйте попередню заявку.'
      );
      err.status = 400;
      throw err;
    }

    return getPrisma().$transaction(async (tx) => {
      const selectedCourses = await tx.course.findMany({
        where: { id: { in: courseIds } }
      });

      const enrolledCounts = await tx.trajectoryItem.groupBy({
        by: ['courseId'],
        _count: { id: true },
        where: {
          trajectory: { status: { in: ['PENDING', 'APPROVED'] } },
          courseId: { in: courseIds }
        }
      });
      const countMap = new Map(enrolledCounts.map(ec => [ec.courseId, ec._count.id]));

      for (const course of selectedCourses) {
        if (course.isSelective && course.maxStudents) {
          const currentCount = countMap.get(course.id) || 0;
          if (currentCount >= course.maxStudents) {
            const err: any = new Error(`Дисципліна "${course.name}" вже не має вільних місць.`);
            err.status = 400;
            throw err;
          }
        }
      }

      const trajectory = await tx.trajectory.create({
        data: {
          studentId,
          status: 'PENDING',
          semester
        }
      });

      const itemsData = courseIds.map(cid => ({
        trajectoryId: trajectory.id,
        courseId: cid
      }));

      await tx.trajectoryItem.createMany({
        data: itemsData
      });

      await cache.del('recommendations', `${studentId}:${semester}`);

      return await tx.trajectory.findUnique({
        where: { id: trajectory.id },
        include: { items: { include: { course: true } } }
      });
    });
  }

  static async getEligibleCourses(studentId: string) {
    const student = await getPrisma().student.findUnique({
      where: { id: studentId },
      include: { group: { include: { educationalProgram: true } } }
    });
    if (!student) throw new Error('Student not found');


    let allCourses = await cache.get<any[]>('courses');
    if (!allCourses) {
      allCourses = await getPrisma().course.findMany({
        include: { educationalProgramLinks: true, category: true }
      });
      await cache.set('courses', allCourses, TTL.COURSES);
    }

    const eligible = allCourses.filter((c: any) =>
      (c.educationalProgramLinks?.some((sl: any) => sl.educationalProgramId === student.group.educationalProgramId) || (c.educationalProgramLinks || []).length === 0) &&
      (c.semester === student.group.currentSemester + 1 || c.semester === null)
    );

    const passedRecords = await getPrisma().academicRecord.findMany({
      where: {
        studentId,
        gradeValue: { gte: 60 }
      },
      select: { courseId: true }
    });
    const passedIds = new Set(passedRecords.map(r => r.courseId));

    const eligibleFiltered = eligible.filter((c: any) => !passedIds.has(c.id));

    const enrolledCounts = await getPrisma().trajectoryItem.groupBy({
      by: ['courseId'],
      _count: { id: true },
      where: {
        trajectory: { status: { in: ['PENDING', 'APPROVED'] } },
        courseId: { in: eligibleFiltered.map((c: any) => c.id) }
      }
    });
    const countMap = new Map(enrolledCounts.map(ec => [ec.courseId, ec._count.id]));

    return eligibleFiltered.map((c: any) => ({
      ...c,
      enrolledCount: countMap.get(c.id) || 0
    }));
  }


  static async listTrajectories(params: { status?: string; search?: string; educationalProgramId?: string; semester?: number; page?: number; limit?: number }) {
    const { status, search, educationalProgramId, semester, page = 1 } = params;
    const limit = Math.min(params.limit || 20, 1000);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      const normalizedStatus = status.toUpperCase();
      where.status = normalizedStatus === 'SUBMITTED' ? 'PENDING' : normalizedStatus;
    }
    if (semester) {
      where.semester = semester;
    }
    if (educationalProgramId || search) {
      where.student = { ...(where.student || {}) };
      if (educationalProgramId) {
        where.student.group = { educationalProgramId };
      }
      if (search) {
        where.student.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }
    }

    const [trajectories, total] = await Promise.all([
      getPrisma().trajectory.findMany({
        where,
        include: {
          student: { include: { user: true, group: true } },
          items: { include: { course: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      getPrisma().trajectory.count({ where }),
    ]);

    return {
      trajectories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async approveTrajectory(trajectoryId: string) {
    const trajectory_check = await getPrisma().trajectory.findUnique({ where: { id: trajectoryId } });
    if (!trajectory_check || trajectory_check.status === 'APPROVED') throw new Error('Траєкторію не знайдено або вже затверджено');

    const trajectory = await getPrisma().trajectory.update({
      where: { id: trajectoryId },
      data: { status: 'APPROVED' },
      include: { student: true },
    });


    await cache.del('dashboard', trajectory.student.id);

    return trajectory;
  }

  static async rejectTrajectory(trajectoryId: string, reason?: string) {
    const trajectory_check = await getPrisma().trajectory.findUnique({ where: { id: trajectoryId } });
    if (!trajectory_check || trajectory_check.status === 'REJECTED') throw new Error('Траєкторію не знайдено або вже відхилено');

    const trajectory = await getPrisma().trajectory.update({
      where: { id: trajectoryId },
      data: { status: 'REJECTED' },
      include: { student: true },
    });
    await cache.del('dashboard', trajectory.student.id);

    return trajectory;
  }

  static async forceSubmitTrajectory(studentId: string, semester: number, courseIds: string[]) {
    if (!courseIds || courseIds.length === 0) {
      throw new Error('Необхідно вказати хоча б один курс для примусового призначення траєкторії.');
    }

    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.trajectory.findMany({
        where: { studentId, semester }
      });
      for (const traj of existing) {
        await tx.trajectory.delete({ where: { id: traj.id } });
      }

      const trajectory = await tx.trajectory.create({
        data: {
          studentId,
          status: 'APPROVED',
          semester
        }
      });

      const items = courseIds.map(cid => ({
        trajectoryId: trajectory.id,
        courseId: cid
      }));
      await tx.trajectoryItem.createMany({ data: items });

      await cache.del('dashboard', studentId);
      await cache.delPattern('recommendations:' + studentId);

      return tx.trajectory.findUnique({
        where: { id: trajectory.id },
        include: { items: { include: { course: true } } }
      });
    });
  }

  static async deleteTrajectory(trajectoryId: string) {
    const trajectory = await getPrisma().trajectory.findUnique({ where: { id: trajectoryId } });
    if (!trajectory) throw new Error('Траєкторію не знайдено');

    await getPrisma().trajectory.delete({
      where: { id: trajectoryId }
    });

    await cache.del('dashboard', trajectory.studentId);
    return true;
  }

  static async getMyTrajectories(studentId: string) {
    return getPrisma().trajectory.findMany({
      where: { studentId },
      include: {
        items: { include: { course: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
