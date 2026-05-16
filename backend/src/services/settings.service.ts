import { getPrisma } from '../config/db';
import { cache } from '../config/cache';

export class SettingsService {
  static async getGlobalSettings() {
    let settings = await getPrisma().globalSettings.findFirst();
    if (!settings) {
      settings = await getPrisma().globalSettings.create({
        data: {
          isSelectionOpen: false
        }
      });
    }
    return settings;
  }

  static async updateGlobalSettings(data: { isSelectionOpen?: boolean }) {
    const current = await this.getGlobalSettings();
    const updated = await getPrisma().globalSettings.update({
      where: { id: current.id },
      data: {
        isSelectionOpen: data.isSelectionOpen
      }
    });

    await cache.delPattern('recommendations');
    return updated;
  }
}
