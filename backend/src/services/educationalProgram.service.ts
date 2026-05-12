import { getPrisma } from '../config/db';

export class EducationalProgramService {
  static async listEducationalPrograms() {
    return getPrisma().educationalProgram.findMany({
      orderBy: { name: 'asc' }
    });
  }

  static async createEducationalProgram(data: { name: string; description?: string; totalCredits?: number; maxCreditsPerSem?: number }) {
    return getPrisma().educationalProgram.create({
      data: {
        name: data.name,
        description: data.description,
        totalCredits: data.totalCredits,
        maxCreditsPerSem: data.maxCreditsPerSem || 30.0
      }
    });
  }

  static async updateEducationalProgram(id: string, data: { name?: string; description?: string; totalCredits?: number; maxCreditsPerSem?: number }) {
    return getPrisma().educationalProgram.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        totalCredits: data.totalCredits,
        maxCreditsPerSem: data.maxCreditsPerSem
      }
    });
  }

  static async deleteEducationalProgram(id: string) {
    return getPrisma().educationalProgram.delete({
      where: { id }
    });
  }
}
