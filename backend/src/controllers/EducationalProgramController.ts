import { Request, Response, NextFunction } from 'express';
import { EducationalProgramService } from '../services/educationalProgram.service';
import { ImportService } from '../services/import.service';

export class EducationalProgramController {
  static async listEducationalPrograms(req: Request, res: Response, next: NextFunction) {
    try {
      const programs = await EducationalProgramService.listEducationalPrograms();
      res.status(200).json({ status: 'success', data: programs });
    } catch (error) {
      next(error);
    }
  }

  static async createEducationalProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, totalCredits, maxCreditsPerSem } = req.body;
      const program = await EducationalProgramService.createEducationalProgram({
        name,
        description,
        totalCredits,
        maxCreditsPerSem
      });
      res.status(201).json({ status: 'success', data: program });
    } catch (error) {
      next(error);
    }
  }

  static async updateEducationalProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, totalCredits, maxCreditsPerSem } = req.body;
      const program = await EducationalProgramService.updateEducationalProgram(id, {
        name,
        description,
        totalCredits,
        maxCreditsPerSem
      });
      res.status(200).json({ status: 'success', data: program });
    } catch (error) {
      next(error);
    }
  }

  static async deleteEducationalProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await EducationalProgramService.deleteEducationalProgram(id);
      res.status(200).json({ status: 'success', message: 'Educational program deleted' });
    } catch (error) {
      next(error);
    }
  }

  static async importEducationalPrograms(req: Request, res: Response, next: NextFunction) {
    try {
      let educationalPrograms = [];

      if (req.file) {
        educationalPrograms = await ImportService.parseFile(req.file.buffer, req.file.originalname);
      } else if (req.body.educationalPrograms && Array.isArray(req.body.educationalPrograms)) {
        educationalPrograms = req.body.educationalPrograms;
      } else {
        return res.status(400).json({ status: 'error', message: 'No data provided (file or JSON)' });
      }

      if (educationalPrograms.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Файл порожній або має невірний формат' });
      }

      const results = await ImportService.bulkImportEducationalPrograms(educationalPrograms);
      res.status(200).json({ status: 'success', data: results });
    } catch (error: any) {
      error.status = 400;
      next(error);
    }
  }
}
