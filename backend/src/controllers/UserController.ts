import { Request, Response, NextFunction } from 'express';
import { StudentService } from '../services/student.service';
import { ImportService } from '../services/import.service';

export class UserController {

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        return res.status(400).json({ status: 'error', message: 'Student ID missing from token' });
      }

      const profile = await StudentService.getStudentProfile(studentId);
      res.status(200).json({ status: 'success', data: profile });
    } catch (error) {
      next(error);
    }
  }

  static async getRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        return res.status(400).json({ status: 'error', message: 'Student ID missing from token' });
      }

      const records = await StudentService.getStudentRecords(studentId);
      res.status(200).json({ status: 'success', data: records });
    } catch (error) {
      next(error);
    }
  }



  static async listStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, groupId, year, educationalProgramId, isBlocked, page, limit } = req.query;
      const result = await StudentService.listStudents({
        search: search as string,
        groupId: groupId as string,
        year: year ? Number(year) : undefined,
        educationalProgramId: educationalProgramId as string,
        isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async listAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page, limit } = req.query;
      const result = await StudentService.listAdmins({
        search: search as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, role, fullName, groupId, educationalProgramId, currentSemester, educationForm } = req.body;
      const user = await StudentService.createUser({
        email,
        role,
        fullName,
        groupId,
        educationalProgramId,
        currentSemester,
        educationForm
      });
      res.status(201).json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { fullName, groupId, educationalProgramId, currentSemester, educationForm } = req.body;
      const updated = await StudentService.updateUserProfile(id, {
        fullName,
        groupId,
        educationalProgramId,
        currentSemester,
        educationForm
      });
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      const updated = await StudentService.toggleUserBlock(id, isBlocked);
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await StudentService.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async importStudents(req: Request, res: Response, next: NextFunction) {
    try {
      let students = [];
      
      if (req.file) {
        students = await ImportService.parseFile(req.file.buffer, req.file.originalname);
      } else if (req.body.students && Array.isArray(req.body.students)) {
        students = req.body.students;
      } else {
        return res.status(400).json({ status: 'error', message: 'No data provided (file or JSON)' });
      }

      if (students.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Файл порожній або має невірний формат' });
      }

      const result = await ImportService.bulkImportStudents(students);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }
}
