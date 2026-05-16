import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";
import { getRedis } from "../src/config/redis";

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/curnav?schema=public";
const url = new URL(databaseUrl);
url.searchParams.set('schema', 'public');
process.env.DATABASE_URL = url.toString();
process.env.DIRECT_URL = url.toString();

const pool = new pg.Pool({ connectionString: url.toString() });
const adapter = new PrismaPg(pool, { schema: 'public' });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🚀 Початок сидування бази даних (без оцінок - для імпорту)...");

  console.log("🧹 Очищення бази...");
  try {
    await getRedis().flushall();
  } catch (err) { }
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

  // 1. Settings
  await prisma.globalSettings.create({ data: { isSelectionOpen: true } });

  // 2. Program & Group
  const ep = await prisma.educationalProgram.create({
    data: {
      name: "Комп'ютерні науки та інтелектуальні системи",
      totalCredits: 240,
      maxCreditsPerSem: 30.0
    }
  });

  const group = await prisma.group.create({
    data: { name: "КН-222", description: "3-й курс", educationalProgramId: ep.id }
  });

  // 3. Categories
  const catGen = await prisma.courseCategory.create({ data: { name: "Цикл загальної підготовки" } });
  const catProf = await prisma.courseCategory.create({ data: { name: "Цикл професійної підготовки" } });
  const catSel = await prisma.courseCategory.create({ data: { name: "Вибіркові дисципліни" } });

  // 4. Courses
  const courses = [
    // --- 1 семестр ---
    { idKey: "prog", name: "Основи програмування", credits: 5, sem: 1, catId: catProf.id, isSel: false },
    { idKey: "math", name: "Вища математика", credits: 6, sem: 1, catId: catGen.id, isSel: false },
    { idKey: "la", name: "Лінійна алгебра та аналітична геометрія", credits: 5, sem: 1, catId: catGen.id, isSel: false },
    { idKey: "eng1", name: "Англійська мова (1 семестр)", credits: 4, sem: 1, catId: catGen.id, isSel: false },
    { idKey: "phys", name: "Фізика", credits: 4, sem: 1, catId: catGen.id, isSel: false },
    { idKey: "intro", name: "Вступ до ІТ", credits: 3, sem: 1, catId: catProf.id, isSel: false },

    // --- 2 семестр ---
    { idKey: "dm", name: "Дискретна математика", credits: 5, sem: 2, catId: catGen.id, isSel: false },
    { idKey: "arch", name: "Архітектура комп'ютерів", credits: 4, sem: 2, catId: catProf.id, isSel: false },
    { idKey: "algo", name: "Алгоритми та структури даних", credits: 6, sem: 2, catId: catProf.id, isSel: false },
    { idKey: "eng2", name: "Англійська мова (2 семестр)", credits: 4, sem: 2, catId: catGen.id, isSel: false },

    // --- 3 семестр ---
    { idKey: "db", name: "Бази даних", credits: 5, sem: 3, catId: catProf.id, isSel: false },
    { idKey: "oop", name: "Об'єктно-орієнтоване програмування", credits: 5, sem: 3, catId: catProf.id, isSel: false },
    { idKey: "prob", name: "Теорія ймовірностей та математична статистика", credits: 4, sem: 3, catId: catGen.id, isSel: false },
    { idKey: "os", name: "Операційні системи", credits: 4, sem: 3, catId: catProf.id, isSel: false },

    // --- 4 семестр (Обов'язкові дисципліни) ---
    { idKey: "sw_eng", name: "Проектування програмного забезпечення", credits: 5, sem: 4, catId: catProf.id, isSel: false },
    { idKey: "networks", name: "Комп'ютерні мережі", credits: 5, sem: 4, catId: catProf.id, isSel: false },
    { idKey: "sys_prog", name: "Системне програмування", credits: 5, sem: 4, catId: catProf.id, isSel: false },
    { idKey: "mgmt", name: "Основи менеджменту та управління ІТ-проєктами", credits: 5, sem: 4, catId: catProf.id, isSel: false },

    // --- 5 семестр (Обов'язкові дисципліни) ---
    // Сумарно 20 кредитів. Студент зможе обрати ще дві вибіркові дисципліни по 5 кредитів
    { idKey: "web_tech", name: "Веб-технології та веб-дизайн", credits: 5, sem: 5, catId: catProf.id, isSel: false },
    { idKey: "parallel", name: "Паралельні та розподілені обчислення", credits: 5, sem: 5, catId: catProf.id, isSel: false },
    { idKey: "ai_intro", name: "Основи штучного інтелекту", credits: 5, sem: 5, catId: catProf.id, isSel: false },
    { idKey: "sys_admin", name: "Системне адміністрування", credits: 5, sem: 5, catId: catProf.id, isSel: false },

    // --- Вибіркові (для вибору на 5 семестр) ---
    { idKey: "nosql", name: "Розподілені бази даних та NoSQL системи", credits: 5, sem: 5, catId: catSel.id, isSel: true },
    { idKey: "cv", name: "Системи комп'ютерного зору", credits: 5, sem: 5, catId: catSel.id, isSel: true },
    { idKey: "gamedev", name: "Розробка ігор та графічних рушників", credits: 5, sem: 5, catId: catSel.id, isSel: true },
    { idKey: "secops", name: "Хмарна безпека та DevSecOps", credits: 5, sem: 5, catId: catSel.id, isSel: true },
    { idKey: "ethics", name: "Етика штучного інтелекту та надійні ШІ-системи", credits: 5, sem: 5, catId: catSel.id, isSel: true },
    { idKey: "web", name: "Розробка веб-застосунків (Frontend/Backend)", credits: 5, sem: 5, catId: catSel.id, isSel: true },
    { idKey: "ml", name: "Машинне навчання", credits: 5, sem: 5, catId: catSel.id, isSel: true },
  ];

  const cMap: Record<string, any> = {};
  for (const c of courses) {
    cMap[c.idKey] = await prisma.course.create({
      data: {
        name: c.name,
        ectsCredits: c.credits,
        controlType: "Екзамен",
        semester: c.sem,
        categoryId: c.catId,
        isSelective: c.isSel,
        maxStudents: c.isSel ? 100 : null,
        educationalProgramLinks: {
          create: [{ educationalProgramId: ep.id }]
        }
      }
    });
  }

  // 5. Dependencies (Більше пререквізитів)
  const deps = [
    { parent: "db", child: "nosql", weight: 0.9 },
    { parent: "prog", child: "algo", weight: 0.8 },
    { parent: "algo", child: "oop", weight: 0.7 },
    { parent: "prog", child: "oop", weight: 0.6 },
    { parent: "arch", child: "os", weight: 0.8 },
    { parent: "prog", child: "cv", weight: 0.7 },
    { parent: "la", child: "cv", weight: 0.6 },
    { parent: "prog", child: "gamedev", weight: 0.8 },
    { parent: "la", child: "gamedev", weight: 0.7 },
    { parent: "arch", child: "secops", weight: 0.85 },
    { parent: "os", child: "secops", weight: 0.75 },
    { parent: "dm", child: "ethics", weight: 0.5 },
    { parent: "math", child: "prob", weight: 0.8 },
    { parent: "prob", child: "ml", weight: 0.85 },
    { parent: "prog", child: "web", weight: 0.7 },
    { parent: "db", child: "web", weight: 0.6 },
    { parent: "oop", child: "sw_eng", weight: 0.8 },
    { parent: "os", child: "networks", weight: 0.7 },
    { parent: "arch", child: "sys_prog", weight: 0.85 },
    { parent: "sw_eng", child: "web_tech", weight: 0.8 },
    { parent: "algo", child: "parallel", weight: 0.8 },
    { parent: "dm", child: "ai_intro", weight: 0.7 },
    { parent: "os", child: "sys_admin", weight: 0.85 },
  ];

  for (const d of deps) {
    await prisma.courseDependency.create({
      data: {
        parentCourseId: cMap[d.parent].id,
        childCourseId: cMap[d.child].id,
        weight: d.weight
      }
    });
  }

  // 6. Users
  const salt = 10;
  const pwd = await bcrypt.hash("Student@123", salt);

  await prisma.user.create({
    data: {
      email: "admin@khpi.edu.ua",
      passwordHash: await bcrypt.hash("Admin@123", salt),
      role: "ADMIN"
    }
  });

  const studentUser = await prisma.user.create({
    data: {
      email: "o.kovalenko@khpi.edu.ua",
      passwordHash: pwd,
      role: "STUDENT",
      student: {
        create: {
          fullName: "Олександр Коваленко",
          groupId: group.id,
          educationalProgramId: ep.id,
          currentSemester: 4,
          educationForm: "Денна"
        }
      }
    },
    include: { student: true }
  });

  console.log("✅ Успішно створено тестову базу!");
  console.log("Оцінки не додано. Будь ласка, використайте імпорт через UI, щоб аналітичне ядро автоматично розрахувало параметри iBKT.");
  console.log("-------------------------------------");
  console.log("👤 Адмін: admin@khpi.edu.ua");
  console.log("🔑 Пароль: Admin@123");
  console.log("-------------------------------------");
  console.log("👤 Студент: o.kovalenko@khpi.edu.ua");
  console.log("🔑 Пароль: Student@123");
  console.log("-------------------------------------");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
    await getRedis().quit();
  })
  .catch(async (e) => {
    console.error("Помилка:", e);
    await prisma.$disconnect();
    await pool.end();
    await getRedis().quit();
    process.exit(1);
  });