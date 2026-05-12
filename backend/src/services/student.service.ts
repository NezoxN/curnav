import { getPrisma } from '../config/db';
import { cache } from '../config/cache';
import { TTL } from '../config/redis';
import bcrypt from 'bcryptjs';



const calculateECTSGrade = (score: number): string => {
  if (score >= 90) return 'A';
  if (score >= 82) return 'B';
  if (score >= 74) return 'C';
  if (score >= 64) return 'D';
  if (score >= 60) return 'E';
  if (score >= 35) return 'FX';
  return 'F';
};

const calculateNationalScale = (score: number, controlType: string): string => {
  const isExam = controlType === 'EXAM' || controlType === 'DIFFERENTIATED_CREDIT';

  if (score >= 90) return 'Відмінно';
  if (score >= 74) return 'Добре';
  if (score >= 60) return 'Задовільно';

  if (isExam) {
    return score >= 35 ? 'Незадовільно (з можливістю складання)' : 'Незадовільно (з обов’язковим курсом)';
  } else {
    return 'Незараховано';
  }
};

const calculateGPA = (courses: any[]): number => {
  if (courses.length === 0) return 0;
  const totalPoints = courses.reduce((sum, c) => sum + c.totalGrade, 0);
  return Number((totalPoints / courses.length).toFixed(2));
};

const groupRecordsBySemester = (records: any[]) => {
  const grouped: Record<string, any[]> = {};

  records.forEach(rec => {
    if (!grouped[rec.courseId]) {
      grouped[rec.courseId] = [];
    }
    grouped[rec.courseId].push(rec);
  });

  const courses = Object.entries(grouped).map(([courseId, recs]) => {
    const sum = recs.reduce((acc, r) => acc + r.gradeValue, 0);
    const totalGrade = recs.length > 0 ? Math.round(sum / recs.length) : 0;
    const firstRec = recs[0];

    return {
      courseId,
      courseName: firstRec.course.name,
      ectsCredits: firstRec.course.ectsCredits,
      controlType: firstRec.course.controlType,
      semester: firstRec.semesterCompleted,
      records: recs,
      totalGrade,
      ectsGrade: calculateECTSGrade(totalGrade),
      nationalScale: calculateNationalScale(totalGrade, firstRec.course.controlType),
    };
  });

  const bySemester: Record<number, any[]> = {};
  courses.forEach(c => {
    if (!bySemester[c.semester]) {
      bySemester[c.semester] = [];
    }
    bySemester[c.semester].push(c);
  });

  return bySemester;
};

export class StudentService {
  static async getStudentProfile(studentId: string) {
    const cached = await cache.get<any>('profile', studentId);
    if (cached) return cached;

    const student = await getPrisma().student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { email: true, role: true } },
        educationalProgram: true,
        group: true,
        academicRecords: {
          include: { course: true }
        },
        modelParams: {
          include: {
            course: {
              include: { category: true }
            }
          }
        }
      }
    });

    if (!student) {
      const err: any = new Error('Student not found');
      err.status = 404;
      throw err;
    }

    const groupedCourses = Object.values(groupRecordsBySemester(student.academicRecords)).flat();
    let earnedCredits = 0;
    for (const c of groupedCourses) {
      if (c.totalGrade >= 60) {
        earnedCredits += c.ectsCredits;
      }
    }
    const gpa = calculateGPA(groupedCourses);

    const trajectory = await getPrisma().trajectory.findFirst({
      where: { studentId, semester: student.currentSemester },
      orderBy: { createdAt: 'desc' }
    });
    const trajectoryStatus = trajectory ? trajectory.status : 'NO_TRAJECTORY';

    const categoryScores: Record<string, { total: number, count: number }> = {};

    for (const mp of student.modelParams) {
      const catName = mp.course.category?.name || 'Інше';
      if (!categoryScores[catName]) {
        categoryScores[catName] = { total: 0, count: 0 };
      }
      categoryScores[catName].total += mp.currentPKnown;
      categoryScores[catName].count += 1;
    }

    const activeTrajectory = await getPrisma().trajectory.findFirst({
      where: { studentId, status: 'APPROVED', semester: student.currentSemester },
      include: { items: { include: { course: { include: { category: true } } } } }
    });

    if (activeTrajectory) {
      for (const item of activeTrajectory.items) {
        const catName = item.course.category?.name || 'Інше';
        if (!categoryScores[catName]) {
          categoryScores[catName] = { total: 0, count: 0 };
        }
      }
    }

    let skills = Object.entries(categoryScores).map(([subject, data]) => ({
      subject,
      score: data.count > 0 ? Math.round((data.total / data.count) * 100) : 0
    }));

    if (skills.length < 3) {
      const placeholders = ['Загальні компетенції', 'Спеціальні навички', 'Інженерна підготовка'];
      for (const ph of placeholders) {
        if (!skills.find(s => s.subject === ph) && skills.length < 3) {
          skills.push({ subject: ph, score: 0 });
        }
      }
    }

    const activeCoursesRaw = await this.getStudentSchedule(studentId);

    const activeCoursesMap = new Map();
    for (const ac of activeCoursesRaw) {
      if (!activeCoursesMap.has(ac.courseName)) {
        activeCoursesMap.set(ac.courseName, ac);
      }
    }
    const activeCourses = Array.from(activeCoursesMap.values());

    const result = {
      profile: {
        fullName: student.fullName,
        email: student.user.email,
        groupCode: student.group.name,
        educationalProgram: student.educationalProgram.name,
        currentSemester: student.currentSemester,
        educationForm: student.educationForm
      },
      kpi: {
        earnedCredits,
        targetCredits: 240,
        gpa,
        trajectoryStatus
      },
      skills,
      activeCourses
    };
    await cache.set('profile', result, TTL.DASHBOARD, studentId);
    return result;
  }

  static async getStudentRecords(studentId: string) {
    const cached = await cache.get<any>('records', studentId);
    if (cached) return cached;

    const records = await getPrisma().academicRecord.findMany({
      where: { studentId },
      include: {
        course: { select: { name: true, ectsCredits: true, controlType: true } }
      },
      orderBy: { dateRecorded: 'desc' }
    });

    const groupedBySemester = groupRecordsBySemester(records);
    const semesters = Object.keys(groupedBySemester).map(Number).sort((a, b) => b - a);
    const allCourses = Object.values(groupedBySemester).flat();
    const totalGPA = calculateGPA(allCourses);
    const totalECTS = allCourses.reduce((sum, c: any) => sum + (c.totalGrade >= 60 ? c.ectsCredits : 0), 0);
    const latestYear = semesters.length > 0 ? Math.ceil(semesters[0] / 2) : 1;

    const allRecords = records.map(r => {
      const courseGroup = allCourses.find((c: any) => c.courseId === r.courseId);
      const isPassed = courseGroup ? courseGroup.totalGrade >= 60 : false;
      return { ...r, isPassed };
    });

    const result = { allRecords, groupedBySemester, totalGPA, totalECTS, latestYear };
    await cache.set('records', result, TTL.RECORDS, studentId);
    return result;
  }

  static async getStudentSchedule(studentId: string) {
    const student = await getPrisma().student.findUnique({
      where: { id: studentId },
      select: { currentSemester: true }
    });
    const semester = student?.currentSemester;
    if (!semester) return [];

    const trajectory = await getPrisma().trajectory.findFirst({
      where: {
        studentId,
        status: 'APPROVED',
        semester: semester
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            course: {
              include: { schedules: true }
            }
          }
        }
      }
    });

    if (!trajectory) return [];

    const scheduleItems = trajectory.items.flatMap(item =>
      item.course.schedules.map(s => ({
        id: s.id,
        courseName: item.course.name,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime
      }))
    );

    return scheduleItems;
  }





  // --- Admin Methods ---

  static async listStudents(params: { search?: string; groupId?: string; year?: number; educationalProgramId?: string; isBlocked?: boolean; page?: number; limit?: number }) {
    const { search, groupId, year, educationalProgramId, isBlocked, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (groupId) where.groupId = groupId;
    if (year) where.currentSemester = year;
    if (educationalProgramId) {
      where.educationalProgramId = educationalProgramId;
    }
    if (isBlocked !== undefined) {
      where.user = { isBlocked };
    }

    const [students, total] = await Promise.all([
      getPrisma().student.findMany({
        where,
        include: {
          user: true,
          educationalProgram: true,
          group: true
        },
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      getPrisma().student.count({ where }),
    ]);

    return {
      students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createUser(data: any) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const role = data.role || 'STUDENT';

    const userData: any = {
      email: data.email,
      passwordHash,
      role
    };

    if (role === 'STUDENT') {
      userData.student = {
        create: {
          fullName: data.fullName,
          groupId: data.groupId,
          educationalProgramId: data.educationalProgramId,
          currentSemester: data.currentSemester,
          educationForm: data.educationForm,
        }
      };
    }

    return getPrisma().user.create({
      data: userData,
      include: { student: true }
    });
  }

  static async updateUserProfile(userId: string, data: any) {
    return getPrisma().student.update({
      where: { userId },
      data: {
        fullName: data.fullName,
        groupId: data.groupId,
        educationalProgramId: data.educationalProgramId,
        currentSemester: data.currentSemester,
        educationForm: data.educationForm,
      }
    });
  }

  static async toggleUserBlock(userId: string, isBlocked: boolean) {
    const updated = await getPrisma().user.update({
      where: { id: userId },
      data: { isBlocked }
    });
    if (isBlocked) {
      await cache.setFlag(`blacklist:${userId}`, TTL.JWT_BLACKLIST);
    } else {
      await cache.delFlag(`blacklist:${userId}`);
    }
    return updated;
  }

  static async listAdmins(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { role: 'ADMIN' };

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    const [admins, total] = await Promise.all([
      getPrisma().user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { email: 'asc' },
      }),
      getPrisma().user.count({ where }),
    ]);

    return {
      admins,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async deleteUser(userId: string) {
    return getPrisma().user.delete({
      where: { id: userId }
    });
  }
}
