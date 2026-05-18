import { config } from 'dotenv';
config();
config({ path: '../.env' });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
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

  const ep2 = await prisma.educationalProgram.create({
    data: {
      name: "Інженерія програмного забезпечення",
      totalCredits: 240,
      maxCreditsPerSem: 30.0
    }
  });

  const groupsList = [];
  
  // 1-й курс (Semester 2)
  groupsList.push(await prisma.group.create({
    data: { name: "КН-225", description: "1-й курс CS", educationalProgramId: ep.id, currentSemester: 2 }
  }));
  groupsList.push(await prisma.group.create({
    data: { name: "ІПЗ-225", description: "1-й курс SE", educationalProgramId: ep2.id, currentSemester: 2 }
  }));

  // 2-й курс (Semester 4)
  groupsList.push(await prisma.group.create({
    data: { name: "КН-222", description: "2-й курс CS (Олександр Коваленко)", educationalProgramId: ep.id, currentSemester: 4 }
  }));
  groupsList.push(await prisma.group.create({
    data: { name: "КН-224", description: "2-й курс CS", educationalProgramId: ep.id, currentSemester: 4 }
  }));
  groupsList.push(await prisma.group.create({
    data: { name: "ІПЗ-224", description: "2-й курс SE", educationalProgramId: ep2.id, currentSemester: 4 }
  }));

  // 3-й курс (Semester 6)
  groupsList.push(await prisma.group.create({
    data: { name: "КН-223", description: "3-й курс CS", educationalProgramId: ep.id, currentSemester: 6 }
  }));
  groupsList.push(await prisma.group.create({
    data: { name: "ІПЗ-223", description: "3-й курс SE", educationalProgramId: ep2.id, currentSemester: 6 }
  }));

  // 4-й курс (Semester 8)
  groupsList.push(await prisma.group.create({
    data: { name: "КН-221", description: "4-й курс CS", educationalProgramId: ep.id, currentSemester: 8 }
  }));
  groupsList.push(await prisma.group.create({
    data: { name: "ІПЗ-221", description: "4-й курс SE", educationalProgramId: ep2.id, currentSemester: 8 }
  }));

  const group = groupsList.find(g => g.name === "КН-222")!;

  // 3. Categories
  const catMath = await prisma.courseCategory.create({ data: { name: "Математичні дисципліни" } });
  const catProg = await prisma.courseCategory.create({ data: { name: "Програмування та алгоритми" } });
  const catEng = await prisma.courseCategory.create({ data: { name: "Інженерія ПЗ та менеджмент" } });
  const catSys = await prisma.courseCategory.create({ data: { name: "Комп'ютерні системи та мережі" } });
  const catDb = await prisma.courseCategory.create({ data: { name: "Бази даних та Big Data" } });
  const catAi = await prisma.courseCategory.create({ data: { name: "Штучний інтелект" } });
  const catWeb = await prisma.courseCategory.create({ data: { name: "Розробка веб та мобільних систем" } });
  const catSec = await prisma.courseCategory.create({ data: { name: "Кібербезпека та хмарні технології" } });
  const catGen = await prisma.courseCategory.create({ data: { name: "Загальноосвітні дисципліни" } });

  // 4. Courses
  const courses = [
    // --- 1 семестр ---
    { idKey: "prog", name: "Основи програмування", credits: 6, sem: 1, catId: catProg.id, isSel: false },
    { idKey: "math", name: "Вища математика", credits: 5, sem: 1, catId: catMath.id, isSel: false },
    { idKey: "la", name: "Лінійна алгебра та аналітична геометрія", credits: 4, sem: 1, catId: catMath.id, isSel: false },
    { idKey: "eng1", name: "Англійська мова (1 семестр)", credits: 3, sem: 1, catId: catGen.id, isSel: false },
    { idKey: "phys", name: "Фізика", credits: 4, sem: 1, catId: catGen.id, isSel: false },
    { idKey: "intro", name: "Вступ до ІТ", credits: 3, sem: 1, catId: catEng.id, isSel: false },

    // --- 2 семестр ---
    { idKey: "dm", name: "Дискретна математика", credits: 5, sem: 2, catId: catMath.id, isSel: false },
    { idKey: "arch", name: "Архітектура комп'ютерів", credits: 3, sem: 2, catId: catSys.id, isSel: false },
    { idKey: "algo", name: "Алгоритми та структури даних", credits: 6, sem: 2, catId: catProg.id, isSel: false },
    { idKey: "eng2", name: "Англійська мова (2 семестр)", credits: 3, sem: 2, catId: catGen.id, isSel: false },

    // --- 3 семестр ---
    { idKey: "db", name: "Бази даних", credits: 5, sem: 3, catId: catDb.id, isSel: false },
    { idKey: "oop", name: "Об'єктно-орієнтоване програмування", credits: 6, sem: 3, catId: catProg.id, isSel: false },
    { idKey: "prob", name: "Теорія ймовірностей та математична статистика", credits: 4, sem: 3, catId: catMath.id, isSel: false },
    { idKey: "os", name: "Операційні системи", credits: 5, sem: 3, catId: catSys.id, isSel: false },

    // --- 4 семестр (Обов'язкові дисципліни) ---
    { idKey: "sw_eng", name: "Проектування програмного забезпечення", credits: 6, sem: 4, catId: catEng.id, isSel: false },
    { idKey: "networks", name: "Комп'ютерні мережі", credits: 5, sem: 4, catId: catSys.id, isSel: false },
    { idKey: "sys_prog", name: "Системне програмування", credits: 4, sem: 4, catId: catProg.id, isSel: false },
    { idKey: "mgmt", name: "Основи менеджменту та управління ІТ-проєктами", credits: 3, sem: 4, catId: catEng.id, isSel: false },

    // --- 5 семестр (Обов'язкові дисципліни) ---
    { idKey: "web_tech", name: "Веб-технології та веб-дизайн", credits: 4, sem: 5, catId: catWeb.id, isSel: false },
    { idKey: "parallel", name: "Паралельні та розподілені обчислення", credits: 5, sem: 5, catId: catProg.id, isSel: false },
    { idKey: "ai_intro", name: "Основи штучного інтелекту", credits: 6, sem: 5, catId: catAi.id, isSel: false },
    { idKey: "sys_admin", name: "Системне адміністрування", credits: 3, sem: 5, catId: catSys.id, isSel: false },

    // --- Вибіркові (для вибору на 5 семестр) ---
    { idKey: "nosql", name: "Розподілені бази даних та NoSQL системи", credits: 4, sem: 5, catId: catDb.id, isSel: true },
    { idKey: "cv", name: "Системи комп'ютерного зору", credits: 6, sem: 5, catId: catAi.id, isSel: true },
    { idKey: "gamedev", name: "Розробка ігор та графічних рушіїв", credits: 5, sem: 5, catId: catWeb.id, isSel: true },
    { idKey: "secops", name: "Хмарна безпека та DevSecOps", credits: 4, sem: 5, catId: catSec.id, isSel: true },
    { idKey: "ethics", name: "Етика штучного інтелекту та надійні ШІ-системи", credits: 3, sem: 5, catId: catAi.id, isSel: true },
    { idKey: "web", name: "Розробка веб-застосунків (Frontend/Backend)", credits: 6, sem: 5, catId: catWeb.id, isSel: true },
    { idKey: "ml", name: "Машинне навчання", credits: 5, sem: 5, catId: catAi.id, isSel: true },
    { idKey: "mobile", name: "Розробка мобільних платформ (iOS/Android)", credits: 5, sem: 5, catId: catWeb.id, isSel: true },
    { idKey: "data_science", name: "Аналіз та візуалізація даних", credits: 4, sem: 5, catId: catDb.id, isSel: true },
    { idKey: "crypto", name: "Прикладна криптографія та блокчейн-технології", credits: 3, sem: 5, catId: catSec.id, isSel: true },
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
          create: [
            { educationalProgramId: ep.id },
            { educationalProgramId: ep2.id }
          ]
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
    { parent: "prog", child: "mobile", weight: 0.75 },
    { parent: "oop", child: "mobile", weight: 0.8 },
    { parent: "math", child: "data_science", weight: 0.7 },
    { parent: "db", child: "data_science", weight: 0.6 },
    { parent: "dm", child: "crypto", weight: 0.8 },
    { parent: "prog", child: "crypto", weight: 0.6 },
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

  // 6. Users & Students
  const salt = 10;
  const pwd = await bcrypt.hash("Student@123", salt);

  console.log("👤 Створення адміністратора...");
  await prisma.user.create({
    data: {
      email: "admin@khpi.edu.ua",
      passwordHash: await bcrypt.hash("Admin@123", salt),
      role: "ADMIN"
    }
  });

  console.log("👤 Створення головного студента Олександр Коваленко...");
  const mainStudent = await prisma.user.create({
    data: {
      email: "o.kovalenko@khpi.edu.ua",
      passwordHash: pwd,
      role: "STUDENT",
      student: {
        create: {
          fullName: "Олександр Коваленко",
          groupId: group.id,
          educationForm: "Денна"
        }
      }
    },
    include: { student: true }
  });

  // arrays of Ukrainian names for systematic generator
  const maleFirstNames = ["Дмитро", "Ярослав", "Андрій", "Микола", "Сергій", "Артем", "Максим", "Богдан", "Владислав", "Іван", "Роман", "Денис", "Михайло", "Олексій", "Павло", "Віктор", "Олег", "Юрій", "Василь", "Ігор", "Валерій", "Костянтин", "Анатолій", "Володимир", "Тарас"];
  const femaleFirstNames = ["Марія", "Ольга", "Анна", "Тетяна", "Олена", "Наталія", "Ірина", "Юлія", "Анастасія", "Катерина", "Світлана", "Вікторія", "Людмила", "Галина", "Оксана", "Яна", "Софія", "Христина", "Дарія", "Аліна", "Єлизавета", "Надія", "Любов", "Маргарита", "Поліна"];
  const lastNames = ["Шевченко", "Мельник", "Ковальчук", "Бондаренко", "Ткаченко", "Кравченко", "Коваль", "Олійник", "Шевчук", "Поліщук", "Лисенко", "Коломієць", "Савченко", "Петренко", "Руденко", "Харченко", "Мороз", "Козак", "Марченко", "Клименко", "Павленко", "Сидоренко", "Дяченко", "Бойко", "Пономаренко", "Гриценко", "Карпенко", "Павлюк", "Романюк", "Мазур", "Кравчук", "Василенко", "Швець", "Михайленко", "Лобода", "Войтенко", "Палій", "Орлов", "Косенко"];

  function translit(str: string): string {
    const map: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh',
      'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
      'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
      'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya',
      'А': 'a', 'Б': 'b', 'В': 'v', 'Г': 'h', 'Ґ': 'g', 'Д': 'd', 'Е': 'e', 'Є': 'ye', 'Ж': 'zh',
      'З': 'z', 'И': 'y', 'І': 'i', 'Ї': 'yi', 'Й': 'y', 'К': 'k', 'Л': 'l', 'М': 'm', 'Н': 'n',
      'О': 'o', 'П': 'p', 'Р': 'r', 'С': 's', 'Т': 't', 'У': 'u', 'Ф': 'f', 'Х': 'kh', 'Ц': 'ts',
      'Ч': 'ch', 'Ш': 'sh', 'Щ': 'shch', 'Ь': '', 'Ю': 'yu', 'Я': 'ya'
    };
    return str.split('').map(c => map[c] !== undefined ? map[c] : c).join('');
  }

  console.log("👤 Генерація 99 додаткових реалістичних студентів...");
  const usedEmails = new Set(["o.kovalenko@khpi.edu.ua", "admin@khpi.edu.ua"]);
  
  const createdStudents: any[] = [];
  for (let i = 0; i < 99; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale 
      ? maleFirstNames[Math.floor(i / 2) % maleFirstNames.length]
      : femaleFirstNames[Math.floor(i / 2) % femaleFirstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const fullName = `${firstName} ${lastName}`;
    
    let baseEmail = `${translit(firstName[0].toLowerCase())}.${translit(lastName.toLowerCase())}`;
    let email = `${baseEmail}@khpi.edu.ua`;
    let count = 1;
    while (usedEmails.has(email)) {
      email = `${baseEmail}${count}@khpi.edu.ua`;
      count++;
    }
    usedEmails.add(email);
    
    const studentGroup = groupsList[i % groupsList.length];
    
    // Dynamic semester based on academic year of the group
    let semester = 4;
    if (studentGroup.name.includes("225")) {
      semester = 2; // 1-й курс
    } else if (studentGroup.name.includes("222") || studentGroup.name.includes("224")) {
      semester = 4; // 2-й курс
    } else if (studentGroup.name.includes("223")) {
      semester = 6; // 3-й курс
    } else if (studentGroup.name.includes("221")) {
      semester = 8; // 4-й курс
    }

    const usr = await prisma.user.create({
      data: {
        email,
        passwordHash: pwd,
        role: "STUDENT",
        student: {
          create: {
            fullName,
            groupId: studentGroup.id,
            educationForm: "Денна"
          }
        }
      },
      include: { student: true }
    });
    if (usr.student) {
      createdStudents.push(usr.student);
    }
  }

  console.log("📝 Сидування тестової траєкторії для Олександра Коваленка (PENDING)...");
  const mainTrajectory = await prisma.trajectory.create({
    data: {
      studentId: mainStudent.student!.id,
      semester: 5,
      status: "PENDING"
    }
  });

  const sem5Mandatory = ["web_tech", "parallel", "ai_intro", "sys_admin"];
  const sem5Elective = ["web", "cv"]; // web (6 ECTS) + cv (6 ECTS)
  
  for (const cKey of [...sem5Mandatory, ...sem5Elective]) {
    if (cMap[cKey]) {
      await prisma.trajectoryItem.create({
        data: {
          trajectoryId: mainTrajectory.id,
          courseId: cMap[cKey].id
        }
      });
    }
  }

  const allDbStudents = await prisma.student.findMany({
    include: { group: true }
  });
  const cs4Students = allDbStudents.filter(s => s.group && s.group.currentSemester === 4);
  if (cs4Students.length >= 2) {
    console.log("📝 Сидування тестової траєкторії APPROVED...");
    const trajApproved = await prisma.trajectory.create({
      data: {
        studentId: cs4Students[0].id,
        semester: 5,
        status: "APPROVED"
      }
    });
    for (const cKey of [...sem5Mandatory, "ml", "nosql"]) { // ml (5) + nosql (4)
      if (cMap[cKey]) {
        await prisma.trajectoryItem.create({
          data: {
            trajectoryId: trajApproved.id,
            courseId: cMap[cKey].id
          }
        });
      }
    }

    console.log("📝 Сидування тестової траєкторії REJECTED...");
    const trajRejected = await prisma.trajectory.create({
      data: {
        studentId: cs4Students[1].id,
        semester: 5,
        status: "REJECTED"
      }
    });
    for (const cKey of [...sem5Mandatory, "mobile", "crypto", "ethics"]) { // mobile (5) + crypto (3) + ethics (3)
      if (cMap[cKey]) {
        await prisma.trajectoryItem.create({
          data: {
            trajectoryId: trajRejected.id,
            courseId: cMap[cKey].id
          }
        });
      }
    }
  }

  console.log("✅ Успішно створено тестову базу з 100 студентськими акаунтами та тестовими траєкторіями!");
  console.log("Оцінки не додано. Будь ласка, використайте імпорт через UI, щоб аналітичне ядро автоматично розрахувало параметри iBKT.");
  console.log("-------------------------------------");
  console.log("👤 Адмін: admin@khpi.edu.ua");
  console.log("🔑 Пароль: Admin@123");
  console.log("-------------------------------------");
  console.log("👤 Головний студент: o.kovalenko@khpi.edu.ua");
  console.log("🔑 Пароль: Student@123");
  console.log("-------------------------------------");
  console.log(`Інші 99 студентів розподілені по групах КН-225, ІПЗ-225 (1-й курс), КН-222, КН-224, ІПЗ-224 (2-й курс), КН-223, ІПЗ-223 (3-й курс), КН-221, ІПЗ-221 (4-й курс)`);
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