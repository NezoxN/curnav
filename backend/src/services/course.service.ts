import { getPrisma } from '../config/db';
import { cache } from '../config/cache';

export class CourseService {
  static async createCourse(data: { name: string; description?: string; ectsCredits: number; categoryId?: string; semester?: number; controlType: string; isSelective?: boolean; maxStudents?: number; educationalProgramIds?: string[] }) {
    if (data.categoryId) {
      const cat = await getPrisma().courseCategory.findUnique({ where: { id: data.categoryId } });
      if (!cat) {
        const err: any = new Error('Категорію не знайдено');
        err.status = 404;
        throw err;
      }
    }

    if (data.educationalProgramIds && Array.isArray(data.educationalProgramIds)) {
      for (const id of data.educationalProgramIds) {
        const prog = await getPrisma().educationalProgram.findUnique({ where: { id } });
        if (!prog) {
          const err: any = new Error(`Освітню програму з ID ${id} не знайдено`);
          err.status = 404;
          throw err;
        }
      }
    }

    const { educationalProgramIds, ...courseData } = data;
    const course = await getPrisma().course.create({
      data: {
        ...courseData,
        semester: data.semester ? Number(data.semester) : null,
        isSelective: !!data.isSelective,
        maxStudents: data.maxStudents ? Number(data.maxStudents) : null,
        educationalProgramLinks: {
          create: educationalProgramIds?.map((id: string) => ({ educationalProgramId: id }))
        }
      }
    });
    await cache.delPattern('courses');
    return course;
  }

  static async updateCourse(courseId: string, data: { name?: string; description?: string; ectsCredits?: number; categoryId?: string; semester?: number; controlType?: string; isSelective?: boolean; maxStudents?: number; educationalProgramIds?: string[] }) {
    const existing = await getPrisma().course.findUnique({ where: { id: courseId } });
    if (!existing) {
      const err: any = new Error('Курс не знайдено');
      err.status = 404;
      throw err;
    }

    if (data.categoryId) {
      const cat = await getPrisma().courseCategory.findUnique({ where: { id: data.categoryId } });
      if (!cat) {
        const err: any = new Error('Категорію не знайдено');
        err.status = 404;
        throw err;
      }
    }

    if (data.educationalProgramIds && Array.isArray(data.educationalProgramIds)) {
      for (const id of data.educationalProgramIds) {
        const prog = await getPrisma().educationalProgram.findUnique({ where: { id } });
        if (!prog) {
          const err: any = new Error(`Освітню програму з ID ${id} не знайдено`);
          err.status = 404;
          throw err;
        }
      }
    }

    const { educationalProgramIds, ...courseData } = data;
    const updateData: any = { ...courseData };

    if (data.semester !== undefined) {
      updateData.semester = data.semester ? Number(data.semester) : null;
    }

    if (educationalProgramIds !== undefined) {
      updateData.educationalProgramLinks = {
        deleteMany: {},
        create: educationalProgramIds.map((id: string) => ({ educationalProgramId: id }))
      };
    }

    if (data.isSelective !== undefined) {
      updateData.isSelective = !!data.isSelective;
    }

    if (data.maxStudents !== undefined) {
      updateData.maxStudents = data.maxStudents ? Number(data.maxStudents) : null;
    }

    const course = await getPrisma().course.update({
      where: { id: courseId },
      data: updateData
    });
    await cache.delPattern('courses');
    return course;
  }

  static async deleteCourse(courseId: string) {
    const existing = await getPrisma().course.findUnique({ where: { id: courseId } });
    if (!existing) {
      const err: any = new Error('Курс не знайдено');
      err.status = 404;
      throw err;
    }

    await getPrisma().course.delete({ where: { id: courseId } });
    await cache.delPattern('courses');
  }

  static async listCourses(params: { categoryId?: string; search?: string; semester?: number; controlType?: string; educationalProgramId?: string; isSelective?: boolean; page?: number; limit?: number }) {
    const { categoryId, search, semester, controlType, educationalProgramId, isSelective, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (semester) where.semester = semester;
    if (controlType) where.controlType = controlType;
    if (educationalProgramId) {
      where.educationalProgramLinks = {
        some: { educationalProgramId: educationalProgramId }
      };
    }
    if (isSelective !== undefined) where.isSelective = isSelective;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      getPrisma().course.findMany({
        where,
        include: {
          category: true,
          educationalProgramLinks: {
            include: { educationalProgram: true }
          },
          parentDependencies: {
            include: { childCourse: true }
          },
          childDependencies: {
            include: { parentCourse: true }
          },
          trajectoryItems: {
            where: {
              trajectory: {
                status: { in: ['PENDING', 'APPROVED'] }
              }
            },
            select: { id: true }
          }
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      getPrisma().course.count({ where })
    ]);

    const formattedCourses = courses.map((c: any) => {
      const { trajectoryItems, ...rest } = c;
      return {
        ...rest,
        enrolledCount: trajectoryItems?.length || 0
      };
    });

    return {
      courses: formattedCourses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async addCourseDependency(parentCourseId: string, childCourseId: string, weight: number) {
    if (parentCourseId === childCourseId) {
      throw new Error('Курс не може залежати від самого себе');
    }

    const parent = await getPrisma().course.findUnique({ where: { id: parentCourseId } });
    const child = await getPrisma().course.findUnique({ where: { id: childCourseId } });
    if (!parent || !child) {
      const err: any = new Error('Батьківський або дочірній курс не знайдено');
      err.status = 404;
      throw err;
    }

    const existingDep = await getPrisma().courseDependency.findFirst({
      where: { parentCourseId, childCourseId }
    });
    if (existingDep) {
      const err: any = new Error('Така залежність вже існує');
      err.status = 400;
      throw err;
    }

    const hasPath = await this.checkPathExists(childCourseId, parentCourseId);
    if (hasPath) {
      throw new Error('Неможливо додати звʼязок: це призведе до циклічної залежності');
    }

    return getPrisma().courseDependency.create({
      data: { parentCourseId, childCourseId, weight }
    });
  }

  static async removeCourseDependency(dependencyId: string) {
    const existing = await getPrisma().courseDependency.findUnique({ where: { id: dependencyId } });
    if (!existing) {
      const err: any = new Error('Залежність не знайдено');
      err.status = 404;
      throw err;
    }

    return getPrisma().courseDependency.delete({
      where: { id: dependencyId }
    });
  }

  private static async checkPathExists(startId: string, targetId: string, visited: Set<string> = new Set()): Promise<boolean> {
    if (startId === targetId) return true;
    if (visited.has(startId)) return false;

    visited.add(startId);

    const dependencies = await getPrisma().courseDependency.findMany({
      where: { parentCourseId: startId }
    });

    for (const dep of dependencies) {
      if (await this.checkPathExists(dep.childCourseId, targetId, visited)) {
        return true;
      }
    }

    return false;
  }
}
