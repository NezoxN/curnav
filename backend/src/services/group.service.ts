import { getPrisma } from '../config/db';

export class GroupService {
  static async listGroups(params: { educationalProgramId?: string; search?: string }) {
    const { educationalProgramId, search } = params;

    const where: any = {};
    if (educationalProgramId) where.educationalProgramId = educationalProgramId;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    return getPrisma().group.findMany({
      where,
      include: {
        educationalProgram: { select: { name: true } },
        _count: { select: { students: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async getGroup(id: string) {
    return getPrisma().group.findUnique({
      where: { id },
      include: {
        educationalProgram: true,
        students: {
          include: { user: { select: { email: true } } }
        }
      }
    });
  }

  static async createGroup(data: { name: string; educationalProgramId: string; description?: string }) {
    return getPrisma().group.create({
      data: {
        name: data.name,
        educationalProgramId: data.educationalProgramId,
        description: data.description
      }
    });
  }

  static async updateGroup(id: string, data: { name?: string; educationalProgramId?: string; description?: string }) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.educationalProgramId) updateData.educationalProgramId = data.educationalProgramId;
    if (data.description !== undefined) updateData.description = data.description;

    return getPrisma().group.update({
      where: { id },
      data: updateData
    });
  }

  static async deleteGroup(id: string) {
    const studentsCount = await getPrisma().student.count({ where: { groupId: id } });
    if (studentsCount > 0) {
      throw new Error('Неможливо видалити групу, в якій є студенти');
    }

    return getPrisma().group.delete({
      where: { id }
    });
  }
}
