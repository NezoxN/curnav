import { getPrisma } from '../config/db';
import { cache } from '../config/cache';
import { getRedis, TTL } from '../config/redis';
import { EmailService } from './email.service';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';


const normalizeEducationForm = (form?: string): string => {
  if (!form) return 'Денна';
  const mapping: Record<string, string> = {
    'FULL_TIME': 'Денна',
    'DISTANCE': 'Заочна',
    'EXTERN': 'Екстернат',
    'Денна': 'Денна',
    'Заочна': 'Заочна',
    'Екстернат': 'Екстернат'
  };
  return mapping[form] || form;
};

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
        group: { include: { educationalProgram: true } }
      }
    });

    if (!student) {
      const err: any = new Error('Student not found');
      err.status = 404;
      throw err;
    }

    const result = {
      profile: {
        fullName: student.fullName,
        email: student.user.email,
        groupCode: student.group.name,
        educationalProgram: student.group.educationalProgram.name,
        currentSemester: student.group.currentSemester,
        educationForm: student.educationForm
      }
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
    const latestYear = semesters.length > 0 ? Math.ceil(semesters[0] / 2) : 1;

    const result = { groupedBySemester, totalGPA, latestYear };
    await cache.set('records', result, TTL.RECORDS, studentId);
    return result;
  }


  static async listStudents(params: { search?: string; groupId?: string; year?: number; educationalProgramId?: string; isBlocked?: boolean; page?: number; limit?: number }) {
    const { search, groupId, year, educationalProgramId, isBlocked, page = 1 } = params;
    const limit = Math.min(params.limit || 20, 1000);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (groupId) where.groupId = groupId;
    if (year) {
      where.group = { ...(where.group || {}), currentSemester: year };
    }
    if (educationalProgramId) {
      where.group = { ...(where.group || {}), educationalProgramId };
    }
    if (isBlocked !== undefined) {
      where.user = { isBlocked };
    }

    const [students, total] = await Promise.all([
      getPrisma().student.findMany({
        where,
        include: {
          user: true,
          group: { include: { educationalProgram: true } }
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

  static async createUser(data: { email: string; role?: string; fullName?: string; groupId?: string; educationalProgramId?: string; currentSemester?: number; educationForm?: string }) {
    const role = data.role || 'STUDENT';
    const passwordToHash = crypto.randomBytes(8).toString('hex');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordToHash, salt);

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
          educationForm: normalizeEducationForm(data.educationForm),
        }
      };
    }

    const existingUser = await getPrisma().user.findUnique({
      where: { email: data.email }
    });
    if (existingUser) {
      const err: any = new Error('Користувач з таким email вже існує');
      err.status = 409;
      throw err;
    }

    const user = await getPrisma().user.create({
      data: userData,
      include: { student: true }
    });


    try {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const redis = getRedis();
      await redis.set(`password_reset:${resetToken}`, user.id, 'EX', TTL.PASSWORD_RESET);
      await EmailService.sendWelcomeEmail(user.email, resetToken);
    } catch (err) {
      console.error('Не вдалося надіслати email-запрошення:', err);
    }

    return user;
  }

  static async updateUserProfile(userId: string, data: { fullName?: string; groupId?: string; educationForm?: string }) {
    const student = await getPrisma().student.findUnique({ where: { userId } });
    if (!student) {
      const err: any = new Error('Студента не знайдено');
      err.status = 404;
      throw err;
    }

    if (data.groupId) {
      const group = await getPrisma().group.findUnique({ where: { id: data.groupId } });
      if (!group) {
        const err: any = new Error('Обрану групу не знайдено');
        err.status = 404;
        throw err;
      }
    }

    return getPrisma().student.update({
      where: { userId },
      data: {
        fullName: data.fullName,
        groupId: data.groupId,
        educationForm: data.educationForm ? normalizeEducationForm(data.educationForm) : undefined,
      }
    });
  }

  static async toggleUserBlock(userId: string, isBlocked: boolean) {
    const user = await getPrisma().user.findUnique({ where: { id: userId } });
    if (!user) {
      const err: any = new Error('Користувача не знайдено');
      err.status = 404;
      throw err;
    }

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
    const { search, page = 1 } = params;
    const limit = Math.min(params.limit || 20, 1000);
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
    const user = await getPrisma().user.findUnique({ where: { id: userId } });
    if (!user) {
      const err: any = new Error('Користувача не знайдено');
      err.status = 404;
      throw err;
    }

    return getPrisma().user.delete({
      where: { id: userId }
    });
  }
}
