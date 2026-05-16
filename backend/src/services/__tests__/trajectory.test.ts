import { TrajectoryService } from '../trajectory.service';
import { getPrisma } from '../../config/db';

// Мокаємо Prisma
jest.mock('../../config/db', () => ({
  getPrisma: jest.fn()
}));

describe('TrajectoryService Complex Logic Tests', () => {
  // Визначаємо структуру мока
  const createPrismaMock = () => ({
    student: { findUnique: jest.fn() },
    course: { findMany: jest.fn() },
    academicRecord: { findMany: jest.fn() },
    courseDependency: { findMany: jest.fn() },
    trajectoryItem: { groupBy: jest.fn(), createMany: jest.fn() },
    trajectory: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    globalSettings: { findFirst: jest.fn() },
    $transaction: jest.fn((cb) => cb(prismaMock)) // Просто виконуємо колбек з тим же моком
  });

  let prismaMock: any;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    (getPrisma as jest.Mock).mockReturnValue(prismaMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Кредитні ліміти ---
  test('Should FAIL validation if credit limit is exceeded', async () => {
    prismaMock.student.findUnique.mockResolvedValue({
      id: 'student-1',
      educationalProgram: { maxCreditsPerSem: 30 }
    });

    prismaMock.course.findMany.mockResolvedValue([
      { id: 'c1', name: 'Course 1', ectsCredits: 20, schedules: [] },
      { id: 'c2', name: 'Course 2', ectsCredits: 15, schedules: [] }
    ]);

    const result = await TrajectoryService.validateTrajectory('student-1', ['c1', 'c2']);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((err: string) => err.includes('Credit limit exceeded'))).toBe(true);
  });

  // --- 2. Конфлікти розкладу ---
  test('Should FAIL if there are schedule collisions', async () => {
    prismaMock.student.findUnique.mockResolvedValue({
      id: 'student-1',
      educationalProgram: { maxCreditsPerSem: 30 }
    });

    prismaMock.course.findMany.mockResolvedValue([
      { 
        id: 'c1', name: 'Math', ectsCredits: 5, 
        schedules: [{ dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }] 
      },
      { 
        id: 'c2', name: 'Physics', ectsCredits: 5, 
        schedules: [{ dayOfWeek: 1, startTime: '11:00', endTime: '13:00' }] 
      }
    ]);

    const result = await TrajectoryService.validateTrajectory('student-1', ['c1', 'c2']);

    expect(result.isValid).toBe(false);
    expect(result.collisions).toHaveLength(1);
    expect(result.collisions[0]).toContain('Math and Physics');
  });

  test('Should handle complex multi-day schedules and detect only real collisions', async () => {
    prismaMock.student.findUnique.mockResolvedValue({
      id: 'student-1',
      educationalProgram: { maxCreditsPerSem: 30 }
    });

    prismaMock.course.findMany.mockResolvedValue([
      { 
        id: 'c1', name: 'Math', ectsCredits: 5, 
        schedules: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '12:00' },
          { dayOfWeek: 3, startTime: '10:00', endTime: '12:00' }
        ] 
      },
      { 
        id: 'c2', name: 'Physics', ectsCredits: 5, 
        schedules: [{ dayOfWeek: 3, startTime: '11:30', endTime: '13:00' }] 
      }
    ]);

    const result = await TrajectoryService.validateTrajectory('student-1', ['c1', 'c2']);
    expect(result.isValid).toBe(false);
    expect(result.collisions[0]).toContain('Math and Physics');
  });

  // --- 3. Комбіновані помилки ---
  test('Should report BOTH credit limit and collision errors', async () => {
    prismaMock.student.findUnique.mockResolvedValue({
      id: 'student-1',
      educationalProgram: { maxCreditsPerSem: 5 } // Дуже малий ліміт
    });

    prismaMock.course.findMany.mockResolvedValue([
      { 
        id: 'c1', name: 'C1', ectsCredits: 5, 
        schedules: [{ dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }] 
      },
      { 
        id: 'c2', name: 'C2', ectsCredits: 5, 
        schedules: [{ dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }] 
      }
    ]);

    const result = await TrajectoryService.validateTrajectory('student-1', ['c1', 'c2']);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    const errorString = result.errors.join(' ');
    expect(errorString).toContain('Credit limit exceeded');
    expect(errorString).toContain('Schedule conflict');
  });

  // --- 4. Ліміти кількості студентів (maxStudents) ---
  test('Should FAIL submitTrajectory if course capacity is reached', async () => {
    // 1. Мокаємо валідну траєкторію для проходження початкової перевірки
    prismaMock.student.findUnique.mockResolvedValue({
      id: 'student-1',
      educationalProgram: { maxCreditsPerSem: 30 }
    });
    prismaMock.globalSettings.findFirst.mockResolvedValue({ isSelectionOpen: true });
    prismaMock.trajectory.findFirst.mockResolvedValue(null); // Немає існуючих заявок

    // 2. Мокаємо курс з лімітом 50 людей
    prismaMock.course.findMany.mockResolvedValue([
      { id: 'c1', name: 'Full Course', ectsCredits: 5, isSelective: true, maxStudents: 50, schedules: [] }
    ]);

    // 3. Мокаємо groupBy так, ніби вже 50 людей записано
    prismaMock.trajectoryItem.groupBy.mockResolvedValue([
      { courseId: 'c1', _count: { id: 50 } }
    ]);

    // Виклик та очікування помилки 400
    try {
      await TrajectoryService.submitTrajectory('student-1', ['c1'], 2);
      fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.message).toContain('не має вільних місць');
    }
  });

  test('Should PASS validation if all conditions are met', async () => {
    prismaMock.student.findUnique.mockResolvedValue({
      id: 'student-1',
      educationalProgram: { maxCreditsPerSem: 30 }
    });

    prismaMock.course.findMany.mockResolvedValue([
      { 
        id: 'c1', name: 'Math', ectsCredits: 5, 
        schedules: [{ dayOfWeek: 1, startTime: '08:00', endTime: '10:00' }] 
      },
      { 
        id: 'c2', name: 'Physics', ectsCredits: 5, 
        schedules: [{ dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }] // Стикуються, але не перетинаються
      }
    ]);

    const result = await TrajectoryService.validateTrajectory('student-1', ['c1', 'c2']);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
