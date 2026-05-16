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
      const { groups } = req.body;
      const results = await ImportService.bulkImportGroups(groups);
      res.status(200).json({ status: 'success', data: results });
    } catch (error) {
      next(error);
    }
  }
}
