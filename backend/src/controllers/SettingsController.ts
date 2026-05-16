import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';

export class SettingsController {

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
      const { isSelectionOpen } = req.body;
      const updated = await SettingsService.updateGlobalSettings({ isSelectionOpen });
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      next(error);
    }
  }
}
