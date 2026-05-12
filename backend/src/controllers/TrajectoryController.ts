import { Request, Response, NextFunction } from 'express';
import { TrajectoryService } from '../services/trajectory.service';
import { getPrisma } from '../config/db';

export class TrajectoryController {
  // Student-facing methods
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        return res.status(400).json({ status: 'error', message: 'Student ID missing' });
      }

      const { targetSemester } = req.body;
      const recommendations = await TrajectoryService.generateRecommendations(studentId, Number(targetSemester) || 1);
      
      res.status(200).json({
        status: 'success',
        data: recommendations
      });
    } catch (error) {
      next(error);
    }
  }

  static async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseIds } = req.body;
      const studentId = (req.user as any).studentId;
      const result = await TrajectoryService.validateTrajectory(studentId, courseIds);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        return res.status(400).json({ status: 'error', message: 'Student ID missing' });
      }

      const { courseIds, semester } = req.body;
      if (!courseIds || !Array.isArray(courseIds) || !semester) {
        return res.status(400).json({ status: 'error', message: 'courseIds and semester are required' });
      }

      const trajectory = await TrajectoryService.submitTrajectory(studentId, courseIds, semester);
      res.status(201).json({ status: 'success', data: trajectory });
    } catch (error) {
      next(error);
    }
  }

  static async getMyTrajectories(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        return res.status(400).json({ status: 'error', message: 'Student ID missing' });
      }

      const trajectories = await TrajectoryService.getMyTrajectories(studentId);
      res.status(200).json({ status: 'success', data: trajectories });
    } catch (error) {
      next(error);
    }
  }

  static async cancelTrajectory(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      const { id } = req.params;

      if (!studentId) {
        return res.status(400).json({ status: 'error', message: 'Student ID missing' });
      }

      const trajectory = await getPrisma().trajectory.findUnique({ where: { id } });
      if (!trajectory) {
        return res.status(404).json({ status: 'error', message: 'Trajectory not found' });
      }
      if (trajectory.studentId !== studentId) {
        return res.status(403).json({ status: 'error', message: 'Forbidden' });
      }
      if (trajectory.status !== 'PENDING') {
        return res.status(400).json({ status: 'error', message: 'Only PENDING trajectories can be cancelled' });
      }

      await TrajectoryService.deleteTrajectory(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Admin-facing methods
  static async listTrajectories(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search, educationalProgramId, semester, page, limit } = req.query;
      const result = await TrajectoryService.listTrajectories({
        status: status as string,
        search: search as string,
        educationalProgramId: educationalProgramId as string,
        semester: semester ? Number(semester) : undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async approveTrajectory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const approved = await TrajectoryService.approveTrajectory(id);
      res.status(200).json({ status: 'success', data: approved });
    } catch (error) {
      next(error);
    }
  }

  static async rejectTrajectory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const rejected = await TrajectoryService.rejectTrajectory(id, reason);
      res.status(200).json({ status: 'success', data: rejected });
    } catch (error) {
      next(error);
    }
  }

  static async bulkUpdateTrajectories(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids, status } = req.body;
      if (!ids || !Array.isArray(ids) || !status) {
        return res.status(400).json({ status: 'error', message: 'ids array and status are required' });
      }
      const result = await TrajectoryService.bulkUpdateTrajectories(ids, status);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async forceSubmitTrajectory(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, courseIds, semester } = req.body;
      const trajectory = await TrajectoryService.forceSubmitTrajectory(studentId, semester, courseIds);
      res.status(201).json({ status: 'success', data: trajectory });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTrajectory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await TrajectoryService.deleteTrajectory(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
