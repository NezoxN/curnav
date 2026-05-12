import { getPrisma } from '../config/db';
import { cache } from '../config/cache';

export class AcademicRecordService {
  static async listRecords(params: { studentId?: string; courseId?: string; groupId?: string; educationalProgramId?: string; semester?: number; search?: string; minGrade?: number; maxGrade?: number; page?: number; limit?: number }) {
    const { studentId, courseId, groupId, educationalProgramId, semester, search, minGrade, maxGrade, page = 1, limit = 50 } = params;
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

  static async createAcademicRecord(data: { studentId: string, courseId: string, gradeValue: number, semesterCompleted: number, assessmentName?: string }) {
    const record = await getPrisma().academicRecord.create({
      data: {
        studentId: data.studentId,
        courseId: data.courseId,
        gradeValue: data.gradeValue,
        semesterCompleted: data.semesterCompleted,
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

  static async bulkUploadRecordsByEmail(records: { email: string, courseId: string, gradeValue: number, semesterCompleted: number, assessmentName?: string }[]) {
    const emails = records.map(r => r.email);
    const users = await getPrisma().user.findMany({
      where: { email: { in: emails } },
      include: { student: true }
    });

    const emailToStudentId: Record<string, string> = {};
    for (const u of users) {
      if (u.student) {
        emailToStudentId[u.email] = u.student.id;
      }
    }

    const toInsert = [];
    for (const r of records) {
      const studentId = emailToStudentId[r.email];
      if (studentId) {
        toInsert.push({
          studentId,
          courseId: r.courseId,
          gradeValue: r.gradeValue,
          semesterCompleted: r.semesterCompleted,
          assessmentName: r.assessmentName || null,
        });
      }
    }

    const result = await getPrisma().academicRecord.createMany({
      data: toInsert,
      skipDuplicates: false
    });

    const affectedStudentIds = [...new Set(toInsert.map(r => r.studentId))];
    await Promise.all(affectedStudentIds.flatMap(sid => [
      cache.del('dashboard', sid),
      cache.del('records', sid),
      this.recalculateStudentParams(sid)
    ]));

    return { totalProcessed: records.length, successfulInserted: result.count };
  }

  static async updateAcademicRecord(recordId: string, data: { gradeValue?: number, semesterCompleted?: number, assessmentName?: string }) {
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
      // 1. Отримуємо всі записи студента
      const records = await prisma.academicRecord.findMany({
        where: { studentId },
        select: { courseId: true, gradeValue: true, dateRecorded: true }
      });

      if (records.length === 0) return;

      const courseIds = [...new Set(records.map(r => r.courseId))];

      const formattedRecords = records.map(r => ({
        course_id: r.courseId,
        grade: r.gradeValue,
        date_recorded: r.dateRecorded.toISOString()
      }));

      // 2. Отримуємо залежності для цих курсів
      const dependencies = await prisma.courseDependency.findMany({
        where: { childCourseId: { in: courseIds } }
      });

      const formattedDependencies = dependencies.map(d => ({
        parent_course_id: d.parentCourseId,
        child_course_id: d.childCourseId,
        weight: d.weight
      }));

      // 3. Отримуємо існуючі параметри
      const existingParams = await prisma.studentModelParams.findMany({
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
      
      // 4. Оновлюємо параметри в базі даних
      for (const [courseId, p] of Object.entries(resultsMap) as any) {
        await prisma.studentModelParams.upsert({
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
        });
      }
    } catch (err) {
      console.error('[iBKT] Error recalculating student params:', err);
    }
  }
}
