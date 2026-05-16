import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";
import { getRedis } from "../src/config/redis";

// Налаштування підключення через пул pg та адаптер PrismaPg
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/curnav?schema=public";
const url = new URL(databaseUrl);
url.searchParams.set('schema', 'public');
process.env.DATABASE_URL = url.toString();
process.env.DIRECT_URL = url.toString();

const pool = new pg.Pool({ connectionString: url.toString() });
const adapter = new PrismaPg(pool, { schema: 'public' });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🚀 Початок розширеного сидування бази даних (seed.ts)...");

  // --- 0. Очищення існуючих даних ---
  console.log("🧹 Очищення існуючих записів у базі даних та кеші Redis...");
  try {
    await getRedis().flushall();
    console.log("✅ Кеш Redis успішно очищено.");
  } catch (err) {
    console.warn("⚠️ Не вдалося очистити Redis (можливо, сервер не запущено):", err);
  }
  await prisma.academicRecord.deleteMany();
  await prisma.trajectoryItem.deleteMany();
  await prisma.trajectory.deleteMany();
  await prisma.studentModelParams.deleteMany();
  await prisma.courseSchedule.deleteMany();
  await prisma.courseDependency.deleteMany();
  await prisma.courseEducationalProgram.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();
  await prisma.educationalProgram.deleteMany();
  await prisma.course.deleteMany();
  await prisma.courseCategory.deleteMany();
  await prisma.globalSettings.deleteMany();
  console.log("✅ База даних успішно очищена.");

  // --- 1. GlobalSettings ---
  console.log("⚙️ Створення глобальних налаштувань...");
  await prisma.globalSettings.create({
    data: {
      isSelectionOpen: true,
    }
  });
  console.log("✅ Глобальні налаштування створено (isSelectionOpen = true).");

  // --- 2. Освітні програми (EducationalProgram) - 2 програми ---
  console.log("🎓 Створення 2 освітніх програм...");
  const epSE = await prisma.educationalProgram.create({
    data: {
      name: "Інженерія програмного забезпечення",
      description: "Освітньо-професійна програма підготовки фахівців з інженерії програмного забезпечення (Спеціальність 121)",
      totalCredits: 240,
      maxCreditsPerSem: 30.0
    }
  });

  const epCS = await prisma.educationalProgram.create({
    data: {
      name: "Комп'ютерні науки та інтелектуальні системи",
      description: "Освітньо-професійна програма підготовки фахівців з комп'ютерних наук та штучного інтелекту (Спеціальність 122)",
      totalCredits: 240,
      maxCreditsPerSem: 30.0
    }
  });
  console.log(`✅ Освітні програми створено: "${epSE.name}" та "${epCS.name}"`);

  // --- 3. Навчальні групи (Group) для різних семестрів ---
  console.log("👥 Створення навчальних груп для різних курсів та семестрів...");

  // Групи для ОП "Інженерія програмного забезпечення"
  const groupSE_1 = await prisma.group.create({
    data: { name: "ІПЗ-123", description: "1-й курс (1-й семестр)", educationalProgramId: epSE.id }
  });
  const groupSE_2 = await prisma.group.create({
    data: { name: "ІПЗ-221", description: "2-й курс (3-й семестр)", educationalProgramId: epSE.id }
  });
  const groupSE_3 = await prisma.group.create({
    data: { name: "ІПЗ-321", description: "3-й курс (5-й семестр)", educationalProgramId: epSE.id }
  });
  const groupSE_4 = await prisma.group.create({
    data: { name: "ІПЗ-421", description: "4-й курс (7-й семестр)", educationalProgramId: epSE.id }
  });

  // Групи для ОП "Комп'ютерні науки"
  const groupCS_1 = await prisma.group.create({
    data: { name: "КН-121", description: "1-й курс (2-й семестр)", educationalProgramId: epCS.id }
  });
  const groupCS_2 = await prisma.group.create({
    data: { name: "КН-222", description: "2-й курс (4-й семестр)", educationalProgramId: epCS.id }
  });
  const groupCS_3 = await prisma.group.create({
    data: { name: "КН-322", description: "3-й курс (6-й семестр)", educationalProgramId: epCS.id }
  });

  console.log("✅ Навчальні групи для семестрів 1, 2, 3, 4, 5, 6, 7 успішно створено.");

  // --- 4. Категорії дисциплін (CourseCategory) ---
  console.log("🗂️ Створення категорій дисциплін...");
  const catGeneral = await prisma.courseCategory.create({
    data: { name: "Цикл загальної підготовки", description: "Нормативні дисципліни загальної підготовки" }
  });

  const catProfessional = await prisma.courseCategory.create({
    data: { name: "Цикл професійної підготовки", description: "Нормативні дисципліни професійної підготовки" }
  });

  const catSelective = await prisma.courseCategory.create({
    data: { name: "Вибіркові дисципліни", description: "Дисципліни вільного вибору студентів" }
  });
  console.log("✅ Категорії створено.");

  // --- 5. Дисципліни (Course) ---
  console.log("📚 Створення розширеної бази навчальних курсів (36 дисциплін), доступних для обох ОП...");
  const coursesData = [
    // --- 1 семестр ---
    { idKey: "math1", name: "Вища математика", credits: 6, type: "Екзамен", sem: 1, catId: catGeneral.id, isSel: false },
    { idKey: "linearAlgebra", name: "Лінійна алгебра та аналітична геометрія", credits: 5, type: "Екзамен", sem: 1, catId: catGeneral.id, isSel: false },
    { idKey: "eng1", name: "Англійська мова професійного спрямування", credits: 4, type: "Залік", sem: 1, catId: catGeneral.id, isSel: false },
    { idKey: "progBase", name: "Основи програмування", credits: 5, type: "Екзамен", sem: 1, catId: catProfessional.id, isSel: false },
    { idKey: "introSE", name: "Вступ до інженерії програмного забезпечення", credits: 3, type: "Залік", sem: 1, catId: catProfessional.id, isSel: false },

    // --- 2 семестр ---
    { idKey: "dm", name: "Дискретна математика", credits: 5, type: "Екзамен", sem: 2, catId: catGeneral.id, isSel: false },
    { idKey: "philosophy", name: "Філософія та методологія науки", credits: 3, type: "Залік", sem: 2, catId: catGeneral.id, isSel: false },
    { idKey: "eng2", name: "Англійська мова для науково-технічного перекладу", credits: 4, type: "Залік", sem: 2, catId: catGeneral.id, isSel: false },
    { idKey: "algo", name: "Алгоритми та структури даних", credits: 6, type: "Екзамен", sem: 2, catId: catProfessional.id, isSel: false },
    { idKey: "computerArch", name: "Архітектура комп'ютерів та систем", credits: 4, type: "Екзамен", sem: 2, catId: catProfessional.id, isSel: false },

    // --- 3 семестр ---
    { idKey: "probTheory", name: "Теорія ймовірностей та математична статистика", credits: 5, type: "Екзамен", sem: 3, catId: catGeneral.id, isSel: false },
    { idKey: "oop", name: "Об'єктно-орієнтоване програмування", credits: 5, type: "Екзамен", sem: 3, catId: catProfessional.id, isSel: false },
    { idKey: "db", name: "Бази даних", credits: 5, type: "Екзамен", sem: 3, catId: catProfessional.id, isSel: false },
    { idKey: "graphics", name: "Комп'ютерна графіка та візуалізація", credits: 4, type: "Залік", sem: 3, catId: catProfessional.id, isSel: false },
    { idKey: "reqAnalysis", name: "Аналіз вимог та специфікація програмного забезпечення", credits: 4, type: "Залік", sem: 3, catId: catProfessional.id, isSel: false },

    // --- 4 семестр ---
    { idKey: "os", name: "Операційні системи", credits: 4, type: "Екзамен", sem: 4, catId: catProfessional.id, isSel: false },
    { idKey: "networks", name: "Комп'ютерні мережі", credits: 4, type: "Екзамен", sem: 4, catId: catProfessional.id, isSel: false },
    { idKey: "seConstruction", name: "Конструювання програмного забезпечення", credits: 5, type: "Екзамен", sem: 4, catId: catProfessional.id, isSel: false },
    { idKey: "uiux", name: "Проектування інтерфейсу користувача (UI/UX)", credits: 4, type: "Залік", sem: 4, catId: catProfessional.id, isSel: false },

    // --- 5 семестр ---
    { idKey: "entrepreneurship", name: "Основи підприємництва та стартапів в ІТ", credits: 4, type: "Залік", sem: 5, catId: catGeneral.id, isSel: false },
    { idKey: "parallelComputing", name: "Паралельні та розподілені обчислення", credits: 5, type: "Екзамен", sem: 5, catId: catProfessional.id, isSel: false },

    // --- 6 семестр ---
    { idKey: "safety", name: "Безпека життєдіяльності та основи охорони праці", credits: 3, type: "Залік", sem: 6, catId: catGeneral.id, isSel: false },
    { idKey: "projectMgmt", name: "Управління проектами програмного забезпечення", credits: 4, type: "Екзамен", sem: 6, catId: catProfessional.id, isSel: false },
    { idKey: "seEconomics", name: "Економіка програмної інженерії", credits: 3, type: "Залік", sem: 6, catId: catProfessional.id, isSel: false },

    // --- ВИБІРКОВІ ДИСЦИПЛІНИ (16 дисциплін) ---
    { idKey: "webDev", name: "Розробка веб-застосунків (Frontend/Backend)", credits: 5, type: "Залік", sem: 4, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "funcProg", name: "Функціональне програмування", credits: 4, type: "Залік", sem: 4, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "gameDev", name: "Розробка ігор (Game Development)", credits: 5, type: "Залік", sem: 4, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "dataPython", name: "Програмування мовою Python для аналізу даних", credits: 5, type: "Залік", sem: 3, catId: catSelective.id, isSel: true, maxStudents: 500 },

    { idKey: "ml", name: "Машинне навчання", credits: 5, type: "Екзамен", sem: 5, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "cloud", name: "Основи хмарних технологій", credits: 4, type: "Залік", sem: 5, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "qa", name: "Тестування та забезпечення якості ПЗ", credits: 4, type: "Залік", sem: 5, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "devops", name: "Технології DevOps та CI/CD", credits: 5, type: "Екзамен", sem: 5, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "iot", name: "Програмування вбудованих систем (IoT)", credits: 4, type: "Залік", sem: 5, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "crossMobile", name: "Кросплатформна розробка мобільних застосунків (Flutter/React Native)", credits: 4, type: "Залік", sem: 5, catId: catSelective.id, isSel: true, maxStudents: 500 },

    { idKey: "cybersec", name: "Кібербезпека програмних систем", credits: 4, type: "Залік", sem: 6, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "mobile", name: "Розробка мобільних застосунків", credits: 5, type: "Екзамен", sem: 6, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "aiSystems", name: "Системи штучного інтелекту", credits: 5, type: "Екзамен", sem: 6, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "highload", name: "Проектування високонавантажених систем (Highload)", credits: 5, type: "Екзамен", sem: 6, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "blockchain", name: "Технології блокчейн та смарт-контракти", credits: 4, type: "Залік", sem: 6, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "deepLearning", name: "Глибоке навчання (Deep Learning)", credits: 5, type: "Екзамен", sem: 6, catId: catSelective.id, isSel: true, maxStudents: 500 },

    // --- 7 семестр ---
    { idKey: "softwareArch", name: "Архітектура та проектування програмного забезпечення", credits: 5, type: "Екзамен", sem: 7, catId: catProfessional.id, isSel: false },
    { idKey: "dataScienceIntro", name: "Основи Data Science та аналітики великих даних", credits: 5, type: "Екзамен", sem: 7, catId: catProfessional.id, isSel: false },
    { idKey: "itLaw", name: "Правове регулювання ІТ та захист інтелектуальної власності", credits: 3, type: "Залік", sem: 7, catId: catGeneral.id, isSel: false },
    { idKey: "nlp", name: "Обробка природної мови (NLP)", credits: 5, type: "Залік", sem: 7, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "microservices", name: "Мікросервісна архітектура та контейнеризація", credits: 4, type: "Залік", sem: 7, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "cloudNative", name: "Розробка Cloud-Native застосунків", credits: 4, type: "Залік", sem: 7, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "quantumComputing", name: "Квантові обчислення та алгоритми", credits: 4, type: "Залік", sem: 7, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "bigDataSystems", name: "Інженерія великих даних (Big Data Engineering)", credits: 5, type: "Залік", sem: 7, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "vrAr", name: "Системи віртуальної та доповненої реальності (VR/AR)", credits: 4, type: "Залік", sem: 7, catId: catSelective.id, isSel: true, maxStudents: 500 },

    // --- 8 семестр ---
    { idKey: "diplomaPractice", name: "Переддипломна практика та підготовка кваліфікаційної роботи", credits: 12, type: "Залік", sem: 8, catId: catProfessional.id, isSel: false },
    { idKey: "researchMethods", name: "Методологія наукових досліджень в ІТ", credits: 3, type: "Залік", sem: 8, catId: catGeneral.id, isSel: false },
    { idKey: "aiEthics", name: "Етика штучного інтелекту та надійні ШІ-системи", credits: 5, type: "Залік", sem: 8, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "advancedCrypto", name: "Сучасна криптографія та постквантові алгоритми", credits: 5, type: "Залік", sem: 8, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "distributedDb", name: "Розподілені бази даних та NoSQL системи", credits: 5, type: "Залік", sem: 8, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "gameDev", name: "Розробка ігор та графічних рушників (GameDev)", credits: 5, type: "Залік", sem: 8, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "computerVision", name: "Системи комп'ютерного зору (Computer Vision)", credits: 5, type: "Залік", sem: 8, catId: catSelective.id, isSel: true, maxStudents: 500 },
    { idKey: "devSecOps", name: "Хмарна безпека та DevSecOps", credits: 5, type: "Залік", sem: 8, catId: catSelective.id, isSel: true, maxStudents: 500 }
  ];

  const createdCourses: Record<string, any> = {};
  for (const c of coursesData) {
    const courseObj = await prisma.course.create({
      data: {
        name: c.name,
        description: `Курс "${c.name}", обсяг ${c.credits} кредитів ЄКТС. Викладається в ${c.sem} семестрі.`,
        ectsCredits: c.credits,
        controlType: c.type,
        semester: c.sem,
        categoryId: c.catId,
        isSelective: c.isSel,
        maxStudents: c.maxStudents || null,
        // Прив'язуємо курси до ОБОХ освітніх програм для універсальності
        educationalProgramLinks: {
          create: [
            { educationalProgramId: epSE.id },
            { educationalProgramId: epCS.id }
          ]
        }
      }
    });
    createdCourses[c.idKey] = courseObj;
  }
  console.log(`✅ Створено ${Object.keys(createdCourses).length} навчальних дисциплін (прив'язані до 2 ОП).`);

  // --- 6. Пререквізити (CourseDependency) ---
  console.log("🔗 Створення пререквізитів (логічних зв'язків між курсами)...");
  const dependenciesData = [
    { parentKey: "progBase", childKey: "algo", weight: 0.8 },
    { parentKey: "math1", childKey: "probTheory", weight: 0.75 },
    { parentKey: "linearAlgebra", childKey: "graphics", weight: 0.65 },
    { parentKey: "algo", childKey: "oop", weight: 0.7 },
    { parentKey: "algo", childKey: "ml", weight: 0.85 },
    { parentKey: "probTheory", childKey: "ml", weight: 0.8 },
    { parentKey: "probTheory", childKey: "dataPython", weight: 0.75 },
    { parentKey: "computerArch", childKey: "os", weight: 0.7 },
    { parentKey: "computerArch", childKey: "networks", weight: 0.75 },
    { parentKey: "networks", childKey: "devops", weight: 0.8 },
    { parentKey: "reqAnalysis", childKey: "seConstruction", weight: 0.7 },
    { parentKey: "seConstruction", childKey: "projectMgmt", weight: 0.8 },
    { parentKey: "oop", childKey: "webDev", weight: 0.6 },
    { parentKey: "db", childKey: "webDev", weight: 0.65 },
    { parentKey: "oop", childKey: "mobile", weight: 0.75 },
    { parentKey: "seConstruction", childKey: "qa", weight: 0.7 },
    { parentKey: "ml", childKey: "deepLearning", weight: 0.85 },
    { parentKey: "ml", childKey: "aiSystems", weight: 0.8 },
    { parentKey: "seConstruction", childKey: "softwareArch", weight: 0.85 },
    { parentKey: "db", childKey: "dataScienceIntro", weight: 0.8 },
    { parentKey: "dataPython", childKey: "nlp", weight: 0.75 },
    { parentKey: "devops", childKey: "microservices", weight: 0.8 },
    { parentKey: "cloud", childKey: "cloudNative", weight: 0.75 },
    { parentKey: "aiSystems", childKey: "aiEthics", weight: 0.7 },
    { parentKey: "cybersec", childKey: "advancedCrypto", weight: 0.85 },
    { parentKey: "db", childKey: "distributedDb", weight: 0.8 }
  ];

  for (const dep of dependenciesData) {
    const parent = createdCourses[dep.parentKey];
    const child = createdCourses[dep.childKey];
    if (parent && child) {
      await prisma.courseDependency.create({
        data: {
          parentCourseId: parent.id,
          childCourseId: child.id,
          weight: dep.weight
        }
      });
    }
  }
  console.log(`✅ Налаштовано ${dependenciesData.length} пререквізитів.`);

  // --- 7. Розклад (CourseSchedule) ---
  console.log("📅 Додавання розкладу для дисциплін...");
  const schedulesData = [
    { courseKey: "algo", dayOfWeek: 1, startTime: "08:30", endTime: "10:05" },
    { courseKey: "math1", dayOfWeek: 1, startTime: "10:25", endTime: "12:00" },
    { courseKey: "oop", dayOfWeek: 2, startTime: "08:30", endTime: "10:05" },
    { courseKey: "probTheory", dayOfWeek: 2, startTime: "10:25", endTime: "12:00" },
    { courseKey: "db", dayOfWeek: 3, startTime: "10:25", endTime: "12:00" },
    { courseKey: "computerArch", dayOfWeek: 3, startTime: "12:20", endTime: "13:55" },
    { courseKey: "webDev", dayOfWeek: 4, startTime: "12:20", endTime: "13:55" },
    { courseKey: "networks", dayOfWeek: 4, startTime: "14:15", endTime: "15:50" },
    { courseKey: "ml", dayOfWeek: 5, startTime: "14:15", endTime: "15:50" },
    { courseKey: "devops", dayOfWeek: 5, startTime: "16:05", endTime: "17:40" }
  ];

  for (const sch of schedulesData) {
    const course = createdCourses[sch.courseKey];
    if (course) {
      await prisma.courseSchedule.create({
        data: {
          courseId: course.id,
          dayOfWeek: sch.dayOfWeek,
          startTime: sch.startTime,
          endTime: sch.endTime
        }
      });
    }
  }
  console.log("✅ Розклад занять розширено.");

  // --- 8. Користувачі (User): Адміністратори та 30 Студентів ---
  console.log("👤 Створення адміністраторів та 30 студентів (різні семестри та ОП)...");

  const salt = 10;
  const adminPasswordHash = await bcrypt.hash("Admin@123", salt);
  const studentPasswordHash = await bcrypt.hash("Student@123", salt);

  // Створення 2 адміністраторів
  await prisma.user.create({
    data: {
      email: "admin1@khpi.edu.ua",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isBlocked: false
    }
  });

  await prisma.user.create({
    data: {
      email: "admin2@khpi.edu.ua",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isBlocked: false
    }
  });
  console.log("✅ 2 адміністратори створено.");

  // Створення 1000 студентів (різні семестри та ОП)
  console.log("👤 Створення 1000 студентів...");
  const createdStudentsObjects: any[] = [];
  const groups = [groupSE_1, groupSE_2, groupSE_3, groupSE_4, groupCS_1, groupCS_2, groupCS_3];

  for (let i = 1; i <= 1000; i++) {
    const email = `student${i}@khpi.edu.ua`;
    const group = groups[i % groups.length];
    const epId = group.educationalProgramId;

    // Визначаємо семестр на основі опису групи
    let semester = 1;
    const semMatch = group.description?.match(/(\d+)-й семестр/);
    if (semMatch) semester = parseInt(semMatch[1]);

    const userWithStudent = await prisma.user.create({
      data: {
        email,
        passwordHash: studentPasswordHash,
        role: "STUDENT",
        isBlocked: false,
        student: {
          create: {
            fullName: `Тестовий Студент №${i}`,
            groupId: group.id,
            educationalProgramId: epId,
            currentSemester: semester,
            educationForm: "Денна"
          }
        }
      },
      include: { student: true }
    });
    if (userWithStudent.student) {
      createdStudentsObjects.push(userWithStudent.student);
    }
  }
  console.log(`✅ Створено ${createdStudentsObjects.length} студентів.`);

  // --- 8.5 Створення специфічних демо-студентів (для зручності тестування) ---
  console.log("👤 Створення демо-студентів для тестів...");
  const demoStudents = [
    { email: "o.kovalenko@khpi.edu.ua", fullName: "Олександр Коваленко", group: groupSE_1, semester: 1 },
    { email: "a.gavrylyuk@khpi.edu.ua", fullName: "Андрій Гаврилюк", group: groupSE_4, semester: 7 }
  ];

  for (const ds of demoStudents) {
    const demoUser = await prisma.user.create({
      data: {
        email: ds.email,
        passwordHash: studentPasswordHash,
        role: "STUDENT",
        isBlocked: false,
        student: {
          create: {
            fullName: ds.fullName,
            groupId: ds.group.id,
            educationalProgramId: ds.group.educationalProgramId,
            currentSemester: ds.semester,
            educationForm: "Денна"
          }
        }
      },
      include: { student: true }
    });
    if (demoUser.student) {
      createdStudentsObjects.push(demoUser.student);
    }
  }
  console.log("✅ Демо-студенти створені.");


  // --- 9. Історія успішності (AcademicRecord) та параметри iBKT (StudentModelParams) ---
  console.log("📊 Масова генерація історії успішності та аналітики iBKT...");
  let recordsCount = 0;

  for (const student of createdStudentsObjects) {
    const completedSemesters = student.currentSemester - 1;

    for (const cKey of Object.keys(createdCourses)) {
      const course = createdCourses[cKey];

      // Студент отримує оцінки за всі нормативні курси, які він вже завершив
      if (!course.isSelective && course.semester && course.semester <= completedSemesters) {
        // Визначаємо "профіль" студента для цієї дисципліни (сильний/середній/слабкий)
        const profile = Math.random();
        let minGrade = 60, maxGrade = 100;
        if (profile > 0.8) { minGrade = 85; maxGrade = 100; } // Відмінник
        else if (profile < 0.2) { minGrade = 50; maxGrade = 75; } // Слабкий

        // Рандомізуємо кількість та типи оцінок (від 2 до 5 оцінок на курс)
        const possibleAssessments = [
          "Модуль 1", "Модуль 2", "Лабораторна робота №1", "Лабораторна робота №2",
          "Тестування", "Розрахункова робота", "Практичне заняття", "Колоквіум"
        ];

        // Перемішуємо та вибираємо випадкову кількість
        const shuffled = possibleAssessments.sort(() => 0.5 - Math.random());
        const selectedAssessments = shuffled.slice(0, Math.floor(Math.random() * 3) + 1);

        // Завжди додаємо підсумковий контроль
        selectedAssessments.push(course.controlType);

        let totalGradeSum = 0;
        for (const name of selectedAssessments) {
          const aGrade = Math.floor(Math.random() * (maxGrade - minGrade + 1)) + minGrade;
          totalGradeSum += aGrade;

          await prisma.academicRecord.create({
            data: {
              studentId: student.id,
              courseId: course.id,
              assessmentName: name,
              gradeValue: aGrade,
              semesterCompleted: course.semester
            }
          });
          recordsCount++;
        }

        // Розраховуємо параметри iBKT на основі реальної успішності
        const avgGrade = Math.round(totalGradeSum / selectedAssessments.length);
        const pKnown = parseFloat((avgGrade / 100).toFixed(2));

        // pLearn: вищий у тих, хто краще вчиться
        const pLearn = parseFloat((0.1 + (avgGrade / 100) * 0.5).toFixed(2));
        // pSlip: нижчий у тих, хто краще вчиться
        const pSlip = parseFloat((0.2 - (avgGrade / 100) * 0.15).toFixed(2));
        // pGuess: випадковий в межах 0.1-0.3
        const pGuess = parseFloat((0.1 + Math.random() * 0.2).toFixed(2));

        await prisma.studentModelParams.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            pLearn: Math.min(Math.max(pLearn, 0.01), 0.99),
            pSlip: Math.min(Math.max(pSlip, 0.01), 0.99),
            pGuess: Math.min(Math.max(pGuess, 0.01), 0.99),
            currentPKnown: Math.min(Math.max(pKnown, 0.01), 0.99)
          }
        });
      }
    }
  }
  console.log(`✅ Згенеровано ${recordsCount} записів історії успішності та параметрів iBKT.`);

  // --- 10. Освітні траєкторії (Trajectory & TrajectoryItem) ---
  console.log("🗺️ Траєкторії не створюються (залишено порожніми для навантажувального тесту).");

  console.log("\n🎉 Розширене сидування бази даних успішно завершено!");
  console.log("==========================================================");
  console.log("Дані для входу в систему:");
  console.log("Адміністратор: admin1@khpi.edu.ua  | Пароль: Admin@123");
  console.log("Студент (1 сем): o.kovalenko@khpi.edu.ua | Пароль: Student@123");
  console.log("Студент (7 сем): a.gavrylyuk@khpi.edu.ua | Пароль: Student@123");
  console.log("==========================================================");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
    await getRedis().quit();
  })
  .catch(async (e) => {
    console.error("❌ Помилка під час сидування бази даних:", e);
    await prisma.$disconnect();
    await pool.end();
    await getRedis().quit();
    process.exit(1);
  });