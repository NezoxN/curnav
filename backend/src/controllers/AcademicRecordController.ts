import { Request, Response, NextFunction } from 'express';
import { AcademicRecordService } from '../services/academic-record.service';
import { ImportService } from '../services/import.service';
import { getPrisma } from '../config/db';

export class AcademicRecordController {
  static async getAcademicRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, search, educationalProgramId, groupId, courseId, semester, minGrade, maxGrade, page, limit } = req.query;
      const result = await AcademicRecordService.listRecords({
        studentId: studentId as string,
        search: search as string,
        educationalProgramId: educationalProgramId as string,
        groupId: groupId as string,
        courseId: courseId as string,
        semester: semester ? Number(semester) : undefined,
        minGrade: minGrade ? Number(minGrade) : undefined,
        maxGrade: maxGrade ? Number(maxGrade) : undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const { educationalProgramId } = req.query;
      const groups = await getPrisma().group.findMany({
        where: educationalProgramId ? { educationalProgramId: educationalProgramId as string } : {},
        orderBy: { name: 'asc' }
      });
      res.status(200).json({ status: 'success', data: groups.map(g => g.name) });
    } catch (error) {
      next(error);
    }
  }

  static async addAcademicRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, courseId, gradeValue, semesterCompleted, assessmentName } = req.body;
      const record = await AcademicRecordService.createAcademicRecord({
        studentId,
        courseId,
        gradeValue: Number(gradeValue),
        semesterCompleted: (semesterCompleted !== undefined && semesterCompleted !== null) ? Number(semesterCompleted) : undefined,
        assessmentName
      });
      res.status(201).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async bulkUploadRecords(req: Request, res: Response, next: NextFunction) {
    try {
      let records = [];

      if (req.file) {
        records = await ImportService.parseFile(req.file.buffer, req.file.originalname);
      } else if (req.body.records && Array.isArray(req.body.records)) {
        records = req.body.records;
      } else {
        return res.status(400).json({ status: 'error', message: 'No data provided (file or JSON)' });
      }

      if (records.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Дані порожні або мають невірний формат' });
      }

      const result = await ImportService.bulkImportGrades(records);
      res.status(200).json({ status: 'success', data: result });
    } catch (error: any) {
      error.status = 400;
      next(error);
    }
  }

  static async updateAcademicRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { gradeValue, semesterCompleted, assessmentName } = req.body;
      const record = await AcademicRecordService.updateAcademicRecord(id, {
        gradeValue: gradeValue ? Number(gradeValue) : undefined,
        semesterCompleted: semesterCompleted ? Number(semesterCompleted) : undefined,
        assessmentName
      });
      res.status(200).json({ status: 'success', data: record });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAcademicRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AcademicRecordService.deleteAcademicRecord(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
