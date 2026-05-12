import { Request, Response, NextFunction } from 'express';
import { getPrisma } from '../config/db';
import { ImportService } from '../services/import.service';

export class EducationalProgramController {
  static async listEducationalPrograms(req: Request, res: Response, next: NextFunction) {
    try {
      const programs = await getPrisma().educationalProgram.findMany({
        orderBy: { name: 'asc' }
      });
      res.status(200).json({ status: 'success', data: programs });
    } catch (error) {
      next(error);
    }
  }

  static async createEducationalProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const program = await getPrisma().educationalProgram.create({
        data: req.body
      });
      res.status(201).json({ status: 'success', data: program });
    } catch (error) {
      next(error);
    }
  }

  static async updateEducationalProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const program = await getPrisma().educationalProgram.update({
        where: { id },
        data: req.body
      });
      res.status(200).json({ status: 'success', data: program });
    } catch (error) {
      next(error);
    }
  }

  static async deleteEducationalProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await getPrisma().educationalProgram.delete({
        where: { id }
      });
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
