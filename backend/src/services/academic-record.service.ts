import { getPrisma } from '../config/db';
import { cache } from '../config/cache';

export class AcademicRecordService {
  static async listRecords(params: { studentId?: string; courseId?: string; groupId?: string; educationalProgramId?: string; semester?: number; search?: string; minGrade?: number; maxGrade?: number; page?: number; limit?: number }) {
    const { studentId, courseId, groupId, educationalProgramId, semester, search, minGrade, maxGrade, page = 1 } = params;
    const limit = Math.min(params.limit || 50, 1000);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (semester) where.semesterCompleted = semester;

    if (minGrade !== undefined || maxGrade !== undefined) {
      where.gradeValue = {};
      if (minGrade !== undefined) where.gradeValue.gte = minGrade;
      if (maxGrade !== undefined) where.gradeValue.lte = maxGrade;
    }

    if (groupId || educationalProgramId) {
      where.student = { ...(where.student || {}) };
      if (groupId) where.student.groupId = groupId;
      if (educationalProgramId) where.student.educationalProgramId = educationalProgramId;
    }
    if (search) {
      where.student = {
        ...(where.student || {}),
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const [records, total] = await Promise.all([
      getPrisma().academicRecord.findMany({
        where,
        include: {
          student: { include: { user: true, group: true } },
          course: { include: { category: true } },
        },
        orderBy: { dateRecorded: 'desc' },
        skip,
        take: limit,
      }),
      getPrisma().academicRecord.count({ where }),
    ]);

    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createAcademicRecord(data: { studentId: string, courseId: string, gradeValue: number, semesterCompleted?: number, assessmentName?: string }) {
    const student = await getPrisma().student.findUnique({ where: { userId: data.studentId } });
    const course = await getPrisma().course.findUnique({ where: { id: data.courseId } });
    if (!student || !course) {
      const err: any = new Error('Студента або дисципліну не знайдено');
      err.status = 404;
      throw err;
    }

    const resolvedSemester = course.semester || data.semesterCompleted || student.currentSemester || 1;

    const record = await getPrisma().academicRecord.create({
      data: {
        studentId: data.studentId,
        courseId: data.courseId,
        gradeValue: data.gradeValue,
        semesterCompleted: resolvedSemester,
        assessmentName: data.assessmentName,
      }
    });

    await Promise.all([
      cache.del('dashboard', data.studentId),
      cache.del('records', data.studentId),
      this.recalculateStudentParams(data.studentId)
    ]);

    return record;
  }

  static async updateAcademicRecord(recordId: string, data: { gradeValue?: number, semesterCompleted?: number, assessmentName?: string }) {
    const existing = await getPrisma().academicRecord.findUnique({ where: { id: recordId } });
    if (!existing) {
      const err: any = new Error('Оцінку не знайдено');
      err.status = 404;
      throw err;
    }

    const record = await getPrisma().academicRecord.update({
      where: { id: recordId },
      data
    });

    await Promise.all([
      cache.del('dashboard', record.studentId),
      cache.del('records', record.studentId),
      this.recalculateStudentParams(record.studentId)
    ]);

    return record;
  }

  static async deleteAcademicRecord(recordId: string) {
    const record = await getPrisma().academicRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new Error('Оцінку не знайдено');

    await getPrisma().academicRecord.delete({ where: { id: recordId } });

    await Promise.all([
      cache.del('dashboard', record.studentId),
      cache.del('records', record.studentId),
      this.recalculateStudentParams(record.studentId)
    ]);

    return true;
  }

  static async recalculateStudentParams(studentId: string) {
    const prisma = getPrisma();

    try {

      const records = await prisma.academicRecord.findMany({
        where: { studentId },
        select: { courseId: true, gradeValue: true, dateRecorded: true }
      });

      if (records.length === 0) return;

      const courseIds = [...new Set(records.map((r: any) => r.courseId))];

      const formattedRecords = records.map((r: any) => ({
        course_id: r.courseId,
        grade: r.gradeValue,
        date_recorded: r.dateRecorded.toISOString()
      }));


      const dependencies = await prisma.courseDependency.findMany({
        where: { childCourseId: { in: courseIds } }
      });

      const formattedDependencies = dependencies.map((d: any) => ({
        parent_course_id: d.parentCourseId,
        child_course_id: d.childCourseId,
        weight: d.weight
      }));


      const existingParams = await prisma.studentModelParams.findMany({
        where: { studentId }
      });

      const paramsMap: Record<string, any> = {};
      existingParams.forEach((p: any) => {
        paramsMap[p.courseId] = {
          pLearn: p.pLearn,
          pSlip: p.pSlip,
          pGuess: p.pGuess,
          currentPKnown: p.currentPKnown
        };
      });

      const ibktInput = {
        student_id: studentId,
        target_courses: courseIds,
        previous_records: formattedRecords,
        course_dependencies: formattedDependencies,
        existing_params: paramsMap
      };

      const baseUrl = process.env.ANALYTICAL_CORE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${baseUrl}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ibktInput),
      });

      if (!response.ok) return;

      const result = await response.json() as any;
      const resultsMap = result.results;


      // Оновлюємо всі параметри паралельно
      const upsertPromises = Object.entries(resultsMap).map(([courseId, p]: [string, any]) =>
        prisma.studentModelParams.upsert({
          where: { studentId_courseId: { studentId, courseId } },
          update: {
            pLearn: p.pLearn,
            pSlip: p.pSlip,
            pGuess: p.pGuess,
            currentPKnown: p.currentPKnown,
            lastUpdated: new Date()
          },
          create: {
            studentId,
            courseId,
            pLearn: p.pLearn,
            pSlip: p.pSlip,
            pGuess: p.pGuess,
            currentPKnown: p.currentPKnown
          }
        })
      );

      await Promise.all(upsertPromises);

      await cache.delPattern(`recommendations:${studentId}`);
    } catch (err) {
      console.error('[iBKT] Error recalculating student params:', err);
    }
  }
}
