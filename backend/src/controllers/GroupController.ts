import { Request, Response, NextFunction } from 'express';
import { GroupService } from '../services/group.service';
import { ImportService } from '../services/import.service';

export class GroupController {
  static async listGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const { educationalProgramId, search } = req.query;
      const groups = await GroupService.listGroups({
        educationalProgramId: educationalProgramId as string,
        search: search as string
      });
      res.status(200).json({ status: 'success', data: groups });
    } catch (error) {
      next(error);
    }
  }


  static async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, educationalProgramId, description } = req.body;
      const group = await GroupService.createGroup({
        name,
        educationalProgramId,
        description
      });
      res.status(201).json({ status: 'success', data: group });
    } catch (error) {
      next(error);
    }
  }

  static async updateGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, educationalProgramId, description } = req.body;
      const group = await GroupService.updateGroup(id, {
        name,
        educationalProgramId,
        description
      });
      res.status(200).json({ status: 'success', data: group });
    } catch (error) {
      next(error);
    }
  }

  static async deleteGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await GroupService.deleteGroup(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async importGroups(req: Request, res: Response, next: NextFunction) {
    try {
      let groups = [];
      
      if (req.file) {
        groups = await ImportService.parseFile(req.file.buffer, req.file.originalname);
      } else if (req.body.groups && Array.isArray(req.body.groups)) {
        groups = req.body.groups;
      } else {
        return res.status(400).json({ status: 'error', message: 'No data provided (file or JSON)' });
      }

      if (groups.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Файл порожній або має невірний формат' });
      }

      const results = await ImportService.bulkImportGroups(groups);
      res.status(200).json({ status: 'success', data: results });
    } catch (error: any) {
      error.status = 400;
      next(error);
    }
  }
}
