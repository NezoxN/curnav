import ExcelJS from 'exceljs';
import stream from 'stream';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../config/db';
import { getRedis, TTL } from '../config/redis';
import { EmailService } from './email.service';
import { cache } from '../config/cache';
import { mapImportData } from '../utils/mapping.utils';
import Joi from 'joi';

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

const studentImportSchema = Joi.object({
  email: Joi.string().required().email().messages({
    'string.empty': 'Email є обовʼязковим',
    'string.email': 'Некоректний формат email',
    'any.required': 'Email є обовʼязковим'
  }),
  fullName: Joi.string().required().min(2).messages({
    'string.empty': 'ПІБ є обовʼязковим',
    'string.min': 'ПІБ має містити принаймні 2 символи',
    'any.required': 'ПІБ є обовʼязковим'
  }),
  group: Joi.string().required().min(2).messages({
    'string.empty': 'Група є обовʼязковою',
    'string.min': 'Назва групи має містити принаймні 2 символи',
    'any.required': 'Група є обовʼязковою'
  }),
  educationalProgram: Joi.string().required().min(2).messages({
    'string.empty': 'Освітня програма є обовʼязковою',
    'string.min': 'Назва освітньої програми має містити принаймні 2 символи',
    'any.required': 'Освітня програма є обовʼязковою'
  }),
  currentSemester: Joi.number().required().integer().min(1).max(12).messages({
    'number.min': 'Семестр навчання має бути від 1 до 12',
    'number.max': 'Семестр навчання має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
    'any.required': 'Семестр є обовʼязковим'
  }),
  educationForm: Joi.string().allow('', null).optional()
});

const courseImportSchema = Joi.object({
  name: Joi.string().required().min(2).messages({
    'string.empty': 'Назва є обовʼязковою',
    'string.min': 'Назва має містити принаймні 2 символи',
    'any.required': 'Назва є обовʼязковою'
  }),
  ectsCredits: Joi.number().required().min(0.5).max(30).messages({
    'number.min': 'Кількість кредитів ECTS має бути від 0.5 до 30',
    'number.max': 'Кількість кредитів ECTS має бути від 0.5 до 30',
    'number.base': 'Кредити мають бути числом',
    'any.required': 'Кредити є обовʼязковими'
  }),
  controlType: Joi.string().allow('', null).optional(),
  semester: Joi.number().integer().min(1).max(12).allow(null).optional().messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом'
  }),
  educationalProgramNames: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'Необхідно вказати принаймні одну освітню програму',
    'any.required': 'Освітні програми є обовʼязковими'
  }),
  categoryName: Joi.string().allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  isSelective: Joi.boolean().optional(),
  prerequisiteNames: Joi.array().items(Joi.string()).optional()
});

const gradeImportSchema = Joi.object({
  email: Joi.string().required().email().messages({
    'string.empty': 'Email є обовʼязковим',
    'string.email': 'Некоректний формат email',
    'any.required': 'Email є обовʼязковим'
  }),
  course: Joi.string().required().min(2).messages({
    'string.empty': 'Назва дисципліни є обовʼязковою',
    'string.min': 'Назва дисципліни занадто коротка',
    'any.required': 'Назва дисципліни є обовʼязковою'
  }),
  gradeValue: Joi.number().required().min(0).max(100).messages({
    'number.min': 'Оцінка має бути від 0 до 100',
    'number.max': 'Оцінка має бути від 0 до 100',
    'number.base': 'Оцінка має бути числом',
    'any.required': 'Оцінка є обовʼязковою'
  }),
  semester: Joi.number().required().integer().min(1).max(12).messages({
    'number.min': 'Семестр має бути від 1 до 12',
    'number.max': 'Семестр має бути від 1 до 12',
    'number.base': 'Семестр має бути числом',
    'any.required': 'Семестр є обовʼязковим'
  }),
  assessment: Joi.string().allow('', null).optional()
});

const groupImportSchema = Joi.object({
  name: Joi.string().required().min(2).messages({
    'string.empty': 'Назва групи є обовʼязковою',
    'string.min': 'Назва групи має містити принаймні 2 символи',
    'any.required': 'Назва групи є обовʼязковою'
  }),
  educationalProgram: Joi.string().required().min(2).messages({
    'string.empty': 'Освітня програма є обовʼязковою',
    'string.min': 'Назва програми має містити принаймні 2 символи',
    'any.required': 'Освітня програма є обовʼязковою'
  }),
  description: Joi.string().allow('', null).optional()
});

const programImportSchema = Joi.object({
  name: Joi.string().required().min(2).messages({
    'string.empty': 'Назва є обовʼязковою',
    'string.min': 'Назва має містити принаймні 2 символи',
    'any.required': 'Назва є обовʼязковою'
  }),
  totalCredits: Joi.number().required().integer().min(1).max(500).messages({
    'number.min': 'Кількість кредитів має бути від 1 до 500',
    'number.max': 'Кількість кредитів має бути від 1 до 500',
    'number.base': 'Кредити мають бути числом',
    'any.required': 'Кредити є обовʼязковими'
  }),
  maxCreditsPerSem: Joi.number().integer().min(1).max(60).allow(null).optional().messages({
    'number.min': 'Кредитів на семестр має бути від 1 до 60',
    'number.max': 'Кредитів на семестр має бути від 1 до 60',
    'number.base': 'Кредити мають бути числом'
  }),
  description: Joi.string().allow('', null).optional()
});

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

  static validateImportHeaders(rawData: any[], type: 'students' | 'courses' | 'grades' | 'groups' | 'programs') {
    if (!rawData || rawData.length === 0) {
      throw new Error('Файл не містить жодних даних');
    }

    const headers = Object.keys(rawData[0]).map(h => h.trim().toLowerCase());

    const hasHeader = (possibleNames: string[]) => {
      return headers.some(h => possibleNames.some(p => h.includes(p.toLowerCase())));
    };

    if (type === 'programs') {
      const courseIndicators = ['контроль', 'control', 'семестр', 'semester', 'вибірк', 'selective', 'пререквізит', 'prerequisite'];
      const isCourseFile = courseIndicators.some(ind => headers.some(h => h.includes(ind)));
      if (isCourseFile) {
        throw new Error('Ви намагаєтеся завантажити файл дисциплін (курси) в освітні програми. Перевірте обраний файл.');
      }

      const studentIndicators = ['email', 'пошта', 'піб', 'група', 'group', 'оцінка', 'grade'];
      const isStudentFile = studentIndicators.some(ind => headers.some(h => h.includes(ind)));
      if (isStudentFile) {
        throw new Error('Ви намагаєтеся завантажити файл студентів або оцінок в освітні програми. Перевірте обраний файл.');
      }

      const nameNames = ['name', 'назва', 'освітня програма', 'оп'];
      const creditNames = ['credits', 'ects', 'кредити'];
      if (!hasHeader(nameNames) || !hasHeader(creditNames)) {
        throw new Error('Недійсний формат файлу освітніх програм. Файл повинен містити колонки: Назва, Кредити');
      }
    }

    if (type === 'courses') {
      const nameNames = ['name', 'назва', 'дисципліна', 'предмет'];
      const creditNames = ['credits', 'ects', 'кредити'];
      
      if (!hasHeader(nameNames) || !hasHeader(creditNames)) {
        throw new Error('Недійсний формат файлу дисциплін. Файл повинен містити обовʼязкові колонки: Назва, Кредити');
      }

      const studentIndicators = ['email', 'пошта', 'піб', 'оцінка', 'grade', 'бал'];
      const isStudentFile = studentIndicators.some(ind => headers.some(h => h.includes(ind)));
      if (isStudentFile) {
        throw new Error('Ви намагаєтеся завантажити файл студентів або оцінок в дисципліни. Перевірте обраний файл.');
      }
    }

    if (type === 'students') {
      const emailNames = ['email', 'пошта'];
      const nameNames = ['name', 'піб', 'імʼя'];
      const groupNames = ['group', 'група'];
      
      if (!hasHeader(emailNames) || !hasHeader(nameNames) || !hasHeader(groupNames)) {
        throw new Error('Недійсний формат файлу студентів. Файл повинен містити колонки: Email, ПІБ, Група');
      }

      if (hasHeader(['ects', 'кредити']) && hasHeader(['control', 'контроль'])) {
        throw new Error('Ви намагаєтеся завантажити файл дисциплін в студентів. Перевірте обраний файл.');
      }
    }

    if (type === 'grades') {
      const emailNames = ['email', 'пошта'];
      const courseNames = ['course', 'дисципліна', 'предмет'];
      const gradeNames = ['grade', 'оцінка', 'бал'];
      
      if (!hasHeader(emailNames) || !hasHeader(courseNames) || !hasHeader(gradeNames)) {
        throw new Error('Недійсний формат файлу оцінок. Файл повинен містити колонки: Email, Дисципліна, Оцінка');
      }
    }

    if (type === 'groups') {
      const nameNames = ['name', 'група', 'назва'];
      const programNames = ['program', 'програма', 'спеціальність'];
      
      if (!hasHeader(nameNames) || !hasHeader(programNames)) {
        throw new Error('Недійсний формат файлу груп. Файл повинен містити колонки: Назва групи, Освітня програма');
      }
    }
  }

  static async bulkImportStudents(rawData: any[]) {
    this.validateImportHeaders(rawData, 'students');
    const studentMapping = {
      email: ['email', 'Email', 'Електронна пошта', 'Пошта'],
      fullName: ['fullName', 'full_name', 'Name', 'ПІБ', 'Прізвище імʼя'],
      group: ['groupId', 'group_id', 'group', 'Група', 'Код групи'],
      educationalProgram: ['educationalProgramId', 'specialty', 'Specialty', 'Освітня програма', 'Програма', 'Спеціальність', 'Фах'],
      currentSemester: ['currentSemester', 'semester', 'current_semester', 'Семестр', 'Рік навчання']
    };

    const students = mapImportData(rawData, studentMapping)
      .filter(s => s.email && s.fullName)
      .map(s => ({
        ...s,
        currentSemester: Number(s.currentSemester || 1)
      }));

    if (students.length === 0) {
      throw new Error('У файлі не знайдено коректних даних для імпорту');
    }

    const results = {
      total: students.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const studentData of students) {
      const { error } = studentImportSchema.validate(studentData, { abortEarly: false });
      if (error) {
        results.failed++;
        const messages = error.details.map(d => d.message).join(', ');
        results.errors.push(`${studentData.email || 'Невідомий'}: ${messages}`);
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


  static async bulkImportCourses(rawData: any[]) {
    this.validateImportHeaders(rawData, 'courses');
    const courseMapping = {
      name: ['name', 'Name', 'Назва', 'Дисципліна', 'Предмет'],
      description: ['description', 'Description', 'Опис', 'Примітка'],
      ectsCredits: ['ectsCredits', 'credits', 'ECTS', 'Кредити', 'Кількість кредитів'],
      semester: ['semester', 'Semester', 'Семестр', 'Півріччя'],
      categoryName: ['category', 'Category', 'Категорія', 'Група дисциплін'],
      isSelective: ['isSelective', 'selective', 'type', 'Type', 'Тип', 'Вибіркова', 'Статус'],
      educationalProgramNames: ['programs', 'Educational Programs', 'Освітні програми', 'Програми', 'ОП'],
      prerequisiteNames: ['prerequisites', 'Prerequisites', 'Пререквізити', 'Звʼязки', 'Залежить від']
    };

    const courses = mapImportData(rawData, courseMapping)
      .filter(c => c.name)
      .map(c => ({
        ...c,
        ectsCredits: Number(c.ectsCredits || 0),
        semester: Number(c.semester || 1),
        isSelective: typeof c.isSelective === 'string'
          ? c.isSelective.toLowerCase().includes('вибірк') || c.isSelective.toLowerCase() === 'true'
          : !!c.isSelective,
        educationalProgramNames: typeof c.educationalProgramNames === 'string'
          ? c.educationalProgramNames.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
          : Array.isArray(c.educationalProgramNames) ? c.educationalProgramNames : [],
        prerequisiteNames: typeof c.prerequisiteNames === 'string'
          ? c.prerequisiteNames.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
          : Array.isArray(c.prerequisiteNames) ? c.prerequisiteNames : []
      }));

    if (courses.length === 0) {
      throw new Error('У файлі не знайдено коректних даних для імпорту');
    }

    const results = {
      total: courses.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const courseNameToId = new Map<string, string>();
    const dependencyTasks: { courseId: string; prerequisiteNames: string[] }[] = [];


    for (const courseData of courses) {
      const { error } = courseImportSchema.validate(courseData, { abortEarly: false });
      if (error) {
        results.failed++;
        const messages = error.details.map(d => d.message).join(', ');
        results.errors.push(`Дисципліна "${courseData.name || 'Невідома'}": ${messages}`);
        continue;
      }

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


  static async bulkImportGrades(rawData: any[]) {
    this.validateImportHeaders(rawData, 'grades');
    const gradeMapping = {
      email: ['email', 'Email', 'Електронна пошта', 'Пошта'],
      course: ['course', 'Course', 'course_id', 'CourseID', 'Дисципліна', 'Предмет'],
      gradeValue: ['grade', 'Grade', 'gradeValue', 'Оцінка', 'Бал'],
      semester: ['semester', 'Semester', 'Семестр'],
      assessment: ['assessment', 'Assessment', 'Атестація', 'Вид контролю']
    };

    const records = mapImportData(rawData, gradeMapping)
      .filter(r => r.email || r.course);

    if (records.length === 0) {
      throw new Error('У файлі не знайдено коректних даних для імпорту');
    }

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
            const { error } = gradeImportSchema.validate(r, { abortEarly: false });
            if (error) {
              const messages = error.details.map(d => d.message).join(', ');
              throw new Error(messages);
            }

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


  static async bulkImportGroups(rawData: any[]) {
    this.validateImportHeaders(rawData, 'groups');
    const groupMapping = {
      name: ['name', 'Group', 'Група', 'Назва', 'Назва групи'],
      educationalProgram: ['educationalProgramId', 'specialty', 'Specialty', 'Освітня програма', 'Програма', 'Спеціальність'],
      description: ['description', 'Description', 'Опис', 'Примітка']
    };

    const groups = mapImportData(rawData, groupMapping).filter(g => g.name && g.educationalProgram);

    if (groups.length === 0) {
      throw new Error('У файлі не знайдено коректних даних для імпорту груп');
    }

    const results = {
      total: groups.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const gData of groups) {
      try {
        const { error } = groupImportSchema.validate(gData, { abortEarly: false });
        if (error) {
          const messages = error.details.map(d => d.message).join(', ');
          throw new Error(messages);
        }

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


  static async bulkImportEducationalPrograms(rawData: any[]) {
    this.validateImportHeaders(rawData, 'programs');
    const specMapping = {
      name: ['name', 'Name', 'Назва', 'Освітня програма', 'ОП'],
      totalCredits: ['credits', 'totalCredits', 'ECTS', 'Кредити'],
      description: ['description', 'Description', 'Опис']
    };

    const programs = mapImportData(rawData, specMapping).filter(s => s.name);

    if (programs.length === 0) {
      throw new Error('У файлі не знайдено коректних даних для імпорту програм');
    }

    const results = {
      total: programs.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const pData of programs) {
      try {
        const { error } = programImportSchema.validate(pData, { abortEarly: false });
        if (error) {
          const messages = error.details.map(d => d.message).join(', ');
          throw new Error(messages);
        }

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
