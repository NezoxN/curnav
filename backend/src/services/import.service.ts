import ExcelJS from 'exceljs';
import stream from 'stream';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getPrisma } from '../config/db';
import { getRedis, TTL } from '../config/redis';
import { EmailService } from './email.service';
import { cache } from '../config/cache';

export interface StudentImportData {
  email: string;
  fullName: string;
  group: string;
  educationalProgram: string;
  currentSemester: number;
  educationForm?: string;
}

export interface CourseImportData {
  name: string;
  ectsCredits: number;
  controlType: string;
  educationalProgramNames: string[];
  studyYear: number | null;
  semester: number | null;
  categoryName: string | null;
  description: string | null;
  isSelective?: boolean;
  prerequisiteNames?: string[];
}

export interface GradeImportData {
  email: string;
  course: string;
  gradeValue: number;
  semester: number;
  assessment?: string;
}

export interface GroupImportData {
  name: string;
  educationalProgram: string;
  description?: string;
}

export interface EducationalProgramImportData {
  name: string;
  totalCredits: number;
  maxCreditsPerSem?: number;
  description?: string;
}

export class ImportService {

  static async parseFile(buffer: Buffer, originalName: string): Promise<any[]> {
    const extension = originalName.split('.').pop()?.toLowerCase();

    if (extension === 'json') {
      try {
        const content = JSON.parse(buffer.toString('utf-8'));
        return Array.isArray(content) ? content : [content];
      } catch (err) {
        throw new Error('Помилка парсингу JSON файлу');
      }
    }


    try {
      const workbook = new ExcelJS.Workbook();

      if (extension === 'csv') {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        await workbook.csv.read(bufferStream);
      } else {
        await workbook.xlsx.load(buffer as any);
      }

      const worksheet = workbook.worksheets[0];
      const data: any[] = [];
      const headers: any[] = [];


      const firstRow = worksheet.getRow(1);
      firstRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim();
      });


      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData: any = {};

        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {

            let value = cell.value;
            if (value && typeof value === 'object' && 'result' in value) {
              value = (value as any).result;
            }
            rowData[header] = value;
          }
        });
        data.push(rowData);
      });

      return data;
    } catch (err) {
      console.error('[ImportService] Parse error:', err);
      throw new Error('Помилка парсингу Excel або CSV файлу');
    }
  }


  static async bulkImportStudents(students: StudentImportData[]) {
    const results = {
      total: students.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const studentData of students) {
      if (!studentData.email || !studentData.email.includes('@')) {
        results.failed++;
        results.errors.push(`${studentData.email || 'Невідомий'}: Некоректний формат email`);
        continue;
      }

      try {
        await getPrisma().$transaction(async (tx) => {
          const existingUser = await tx.user.findUnique({
            where: { email: studentData.email },
            include: { student: true }
          });


          if (!studentData.educationalProgram) {
            throw new Error('Освітня програма обовʼязкова для заповнення');
          }

          let educationalProgram = await tx.educationalProgram.findUnique({ where: { name: studentData.educationalProgram } });
          if (!educationalProgram) {
            educationalProgram = await tx.educationalProgram.create({ data: { name: studentData.educationalProgram } });
          }
          const educationalProgramId = educationalProgram.id;


          let group = await tx.group.findUnique({ where: { name: studentData.group } });
          if (!group) {
            group = await tx.group.create({
              data: {
                name: studentData.group,
                educationalProgramId: educationalProgramId
              }
            });
          }
          const groupId = group.id;

          if (existingUser) {

            await tx.student.update({
              where: { userId: existingUser.id },
              data: {
                fullName: studentData.fullName,
                groupId: groupId,
                educationalProgramId: educationalProgramId,
                currentSemester: studentData.currentSemester || 1,
                educationForm: studentData.educationForm || 'Денна',
              }
            });
          } else {

            const tempPassword = crypto.randomBytes(8).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(tempPassword, salt);

            const user = await tx.user.create({
              data: {
                email: studentData.email,
                passwordHash,
                role: 'STUDENT',
                student: {
                  create: {
                    fullName: studentData.fullName,
                    groupId: groupId,
                    educationalProgramId: educationalProgramId,
                    currentSemester: studentData.currentSemester || 1,
                    educationForm: studentData.educationForm || 'Денна',
                  }
                }
              }
            });


            const resetToken = crypto.randomBytes(32).toString('hex');
            const redis = getRedis();
            await redis.set(`password_reset:${resetToken}`, user.id, 'EX', TTL.PASSWORD_RESET);


            await EmailService.sendWelcomeEmail(user.email, resetToken);
          }
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${studentData.email}: ${error.message}`);
      }
    }

    return results;
  }


  static async bulkImportCourses(courses: CourseImportData[]) {
    const results = {
      total: courses.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const courseNameToId = new Map<string, string>();
    const dependencyTasks: { courseId: string; prerequisiteNames: string[] }[] = [];


    for (const courseData of courses) {
      try {
        await getPrisma().$transaction(async (tx) => {
          let categoryId = null;


          if (courseData.categoryName) {
            let category = await tx.courseCategory.findUnique({
              where: { name: courseData.categoryName }
            });

            if (!category) {
              category = await tx.courseCategory.create({
                data: { name: courseData.categoryName }
              });
            }
            categoryId = category.id;
          }


          const educationalProgramNames = courseData.educationalProgramNames || [];
          const educationalProgramIds: string[] = [];
          for (const sName of educationalProgramNames) {
            let educationalProgram = await tx.educationalProgram.findUnique({ where: { name: sName } });
            if (!educationalProgram) {
              educationalProgram = await tx.educationalProgram.create({ data: { name: sName } });
            }
            educationalProgramIds.push(educationalProgram.id);
          }


          let course;
          const existing = await tx.course.findFirst({
            where: {
              name: courseData.name,
              ...(educationalProgramIds.length > 0 && {
                educationalProgramLinks: {
                  some: { educationalProgramId: { in: educationalProgramIds } }
                }
              })
            }
          });

          if (existing) {
            course = await tx.course.update({
              where: { id: existing.id },
              data: {
                ectsCredits: Number(courseData.ectsCredits) || 3,
                controlType: courseData.controlType || 'Екзамен',
                description: courseData.description,
                semester: courseData.semester ? Number(courseData.semester) : null,
                isSelective: !!courseData.isSelective,
                categoryId,
                educationalProgramLinks: {
                  deleteMany: {},
                  create: educationalProgramIds.map(id => ({ educationalProgramId: id }))
                }
              }
            });
          } else {
            course = await tx.course.create({
              data: {
                name: courseData.name,
                ectsCredits: Number(courseData.ectsCredits) || 3,
                controlType: courseData.controlType || 'Екзамен',
                semester: courseData.semester ? Number(courseData.semester) : null,
                description: courseData.description,
                isSelective: !!courseData.isSelective,
                categoryId,
                educationalProgramLinks: {
                  create: educationalProgramIds.map(id => ({ educationalProgramId: id }))
                }
              }
            });
          }

          courseNameToId.set(course.name, course.id);
          if (courseData.prerequisiteNames && courseData.prerequisiteNames.length > 0) {
            dependencyTasks.push({ courseId: course.id, prerequisiteNames: courseData.prerequisiteNames });
          }
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${courseData.name || 'Невідомий курс'}: ${error.message}`);
      }
    }


    for (const task of dependencyTasks) {
      for (const pNameRaw of task.prerequisiteNames) {
        try {
          let pName = pNameRaw;
          let weight = 1.0;
          if (pNameRaw.includes(':')) {
            const parts = pNameRaw.split(':');
            pName = parts[0].trim();
            const parsedWeight = parseFloat(parts[1]);
            if (!isNaN(parsedWeight) && parsedWeight > 0 && parsedWeight <= 1.0) {
              weight = parsedWeight;
            }
          }

          let parentId = courseNameToId.get(pName);

          if (!parentId) {
            const parentCourse = await getPrisma().course.findFirst({
              where: { name: pName }
            });
            if (parentCourse) parentId = parentCourse.id;
          }

          if (parentId && parentId !== task.courseId) {
            await getPrisma().courseDependency.upsert({
              where: {
                parentCourseId_childCourseId: {
                  parentCourseId: parentId,
                  childCourseId: task.courseId
                }
              },
              update: {
                weight
              },
              create: {
                parentCourseId: parentId,
                childCourseId: task.courseId,
                weight
              }
            });
          }
        } catch (err) {
          console.error(`Failed to link dependency ${pNameRaw} -> ${task.courseId}:`, err);
        }
      }
    }

    await cache.delPattern('courses');
    await cache.delPattern('recommendations');

    return results;
  }


  static async bulkImportGrades(records: GradeImportData[]) {
    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const emails = [...new Set(records.map(r => r.email))];
    const users = await getPrisma().user.findMany({
      where: { email: { in: emails } },
      include: { student: true }
    });

    const emailToStudentId: Record<string, string> = {};
    for (const u of users) {
      if (u.student) emailToStudentId[u.email] = u.student.id;
    }

    const affectedStudentIds = Object.values(emailToStudentId);
    const allCourses = await getPrisma().course.findMany();

    // Завантажуємо всі існуючі оцінки для цих студентів одним запитом, щоб уникнути findFirst в циклі
    const existingRecords = await getPrisma().academicRecord.findMany({
      where: { studentId: { in: affectedStudentIds } }
    });

    // Використовуємо одну транзакцію для всіх операцій запису
    try {
      await getPrisma().$transaction(async (tx) => {
        for (const r of records) {
          try {
            const studentId = emailToStudentId[r.email];
            if (!studentId) throw new Error(`Студента з email ${r.email} не знайдено`);

            const course = allCourses.find(c => c.id === r.course || c.name === r.course);
            if (!course) throw new Error(`Дисципліну "${r.course}" не знайдено`);

            const existing = existingRecords.find(er => 
              er.studentId === studentId && 
              er.courseId === course.id && 
              er.assessmentName === (r.assessment || null)
            );

            if (existing) {
              await tx.academicRecord.update({
                where: { id: existing.id },
                data: {
                  gradeValue: r.gradeValue,
                  semesterCompleted: r.semester || existing.semesterCompleted,
                  dateRecorded: new Date()
                }
              });
            } else {
              await tx.academicRecord.create({
                data: {
                  studentId,
                  courseId: course.id,
                  gradeValue: r.gradeValue,
                  semesterCompleted: r.semester || 1,
                  assessmentName: r.assessment || null,
                }
              });
            }
            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push(`${r.email}: ${error.message}`);
          }
        }
      }, { timeout: 60000 }); // Збільшуємо таймаут для великих транзакцій
    } catch (transactionError: any) {
      console.error('[ImportService] Transaction failed:', transactionError);
      results.errors.push(`Помилка транзакції: ${transactionError.message}`);
    }

    // Очищуємо кеш та запускаємо перерахунок ПАРАЛЕЛЬНО
    const { AcademicRecordService } = require('./academic-record.service');
    const uniqueAffectedIds = [...new Set(affectedStudentIds)];
    
    await Promise.all(uniqueAffectedIds.flatMap(sid => [
      cache.del('dashboard', sid),
      cache.del('records', sid),
      AcademicRecordService.recalculateStudentParams(sid)
    ]));

    return results;
  }


  static async bulkImportGroups(groups: GroupImportData[]) {
    const results = {
      total: groups.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const gData of groups) {
      try {
        if (!gData.name) throw new Error('Назва групи обовʼязкова');

        await getPrisma().$transaction(async (tx) => {

          let educationalProgramId: string | undefined;
          if (gData.educationalProgram) {
            let spec = await tx.educationalProgram.findUnique({ where: { name: gData.educationalProgram } });
            if (!spec) {
              spec = await tx.educationalProgram.create({ data: { name: gData.educationalProgram } });
            }
            educationalProgramId = spec.id;
          }
          if (!educationalProgramId) throw new Error('Освітня програма обовʼязкова для групи');
          const existing = await tx.group.findUnique({ where: { name: gData.name } });
          if (existing) {
            await tx.group.update({
              where: { id: existing.id },
              data: {
                description: gData.description,
                educationalProgramId: educationalProgramId
              }
            });
          } else {
            await tx.group.create({
              data: {
                name: gData.name,
                description: gData.description,
                educationalProgramId: educationalProgramId
              }
            });
          }
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${gData.name || 'Невідома група'}: ${error.message}`);
      }
    }
    return results;
  }


  static async bulkImportEducationalPrograms(programs: EducationalProgramImportData[]) {
    const results = {
      total: programs.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const pData of programs) {
      try {
        if (!pData.name) throw new Error('Назва освітньої програми обовʼязкова');

        await getPrisma().$transaction(async (tx) => {
          const existing = await tx.educationalProgram.findUnique({ where: { name: pData.name } });
          if (existing) {
            await tx.educationalProgram.update({
              where: { id: existing.id },
              data: {
                totalCredits: pData.totalCredits || existing.totalCredits,
                maxCreditsPerSem: pData.maxCreditsPerSem || existing.maxCreditsPerSem,
                description: pData.description || existing.description
              }
            });
          } else {
            await tx.educationalProgram.create({
              data: {
                name: pData.name,
                totalCredits: pData.totalCredits || 240,
                maxCreditsPerSem: pData.maxCreditsPerSem || 30.0,
                description: pData.description
              }
            });
          }
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${pData.name || 'Невідома програма'}: ${error.message}`);
      }
    }
    return results;
  }
}
