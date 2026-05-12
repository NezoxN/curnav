import { getPrisma } from '../config/db';

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

  static async updateGlobalSettings(data: { maxCreditsPerSem?: number, isSelectionOpen?: boolean }) {
    const current = await this.getGlobalSettings();
    return getPrisma().globalSettings.update({
      where: { id: current.id },
      data: {
        isSelectionOpen: data.isSelectionOpen
      }
    });
  }
}
