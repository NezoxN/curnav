import { Request, Response, NextFunction } from 'express';
import { getPrisma } from '../config/db';

export class CategoryController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await getPrisma().courseCategory.findMany({
        orderBy: { name: 'asc' }
      });
      res.status(200).json({ status: 'success', data: categories });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ status: 'error', message: 'Name is required' });
      }
      const category = await getPrisma().courseCategory.create({
        data: { name }
      });
      res.status(201).json({ status: 'success', data: category });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const category = await getPrisma().courseCategory.update({
        where: { id },
        data: { name }
      });
      res.status(200).json({ status: 'success', data: category });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await getPrisma().courseCategory.delete({
        where: { id }
      });
      res.status(200).json({ status: 'success', message: 'Category deleted' });
    } catch (error) {
      next(error);
    }
  }
}
