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
      const { educationalPrograms } = req.body;
      const results = await ImportService.bulkImportEducationalPrograms(educationalPrograms);
      res.status(200).json({ status: 'success', data: results });
    } catch (error) {
      next(error);
    }
  }
}
