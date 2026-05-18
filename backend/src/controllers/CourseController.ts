import { Request, Response, NextFunction } from 'express';
import { CourseService } from '../services/course.service';
import { ImportService } from '../services/import.service';

export class CourseController {
  static async getCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId, search, semester, controlType, educationalProgramId, page, limit } = req.query;
      const coursesData = await CourseService.listCourses({
        categoryId: categoryId as string,
        search: search as string,
        semester: semester ? Number(semester) : undefined,
        controlType: controlType as string,
        educationalProgramId: educationalProgramId as string,
        isSelective: req.query.isSelective === 'true' ? true : req.query.isSelective === 'false' ? false : undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 20
      });
      res.status(200).json({ status: 'success', data: coursesData });
    } catch (error) {
      next(error);
    }
  }

  static async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, ectsCredits, categoryId, semester, controlType, isSelective, maxStudents, educationalProgramIds } = req.body;
      const course = await CourseService.createCourse({
        name,
        description,
        ectsCredits,
        categoryId,
        semester,
        controlType,
        isSelective,
        maxStudents,
        educationalProgramIds
      });
      res.status(201).json({ status: 'success', data: course });
    } catch (error) {
      next(error);
    }
  }

  static async updateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, ectsCredits, categoryId, semester, controlType, isSelective, maxStudents, educationalProgramIds } = req.body;
      const course = await CourseService.updateCourse(id, {
        name,
        description,
        ectsCredits,
        categoryId,
        semester,
        controlType,
        isSelective,
        maxStudents,
        educationalProgramIds
      });
      res.status(200).json({ status: 'success', data: course });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await CourseService.deleteCourse(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async addDependency(req: Request, res: Response, next: NextFunction) {
    try {
      const { parentCourseId, childCourseId, weight } = req.body;
      const dep = await CourseService.addCourseDependency(parentCourseId, childCourseId, weight);
      res.status(201).json({ status: 'success', data: dep });
    } catch (error) {
      next(error);
    }
  }

  static async removeDependency(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await CourseService.removeCourseDependency(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async importCourses(req: Request, res: Response, next: NextFunction) {
    try {
      let data = [];
      
      if (req.file) {
        data = await ImportService.parseFile(req.file.buffer, req.file.originalname);
      } else if (req.body.courses && Array.isArray(req.body.courses)) {
        data = req.body.courses;
      } else {
        return res.status(400).json({ status: 'error', message: 'No data provided (file or JSON)' });
      }

      const results = await ImportService.bulkImportCourses(data);
      res.status(200).json({ status: 'success', data: results });
    } catch (error: any) {
      error.status = 400;
      next(error);
    }
  }
}
