import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';

export class SettingsController {
  // Global Academic Settings
  static async getGlobalSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.getGlobalSettings();
      res.status(200).json({ status: 'success', data: settings });
    } catch (error) {
      next(error);
    }
  }

  static async updateGlobalSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await SettingsService.updateGlobalSettings(req.body);
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      next(error);
    }
  }
}
