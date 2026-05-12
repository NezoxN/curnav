import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set('schema', 'public');
process.env.DATABASE_URL = url.toString();
process.env.DIRECT_URL = url.toString();

const pool = new pg.Pool({ connectionString: url.toString() });
const adapter = new PrismaPg(pool, { schema: 'public' });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🚀 Starting FINAL database seeding...");

  // --- 0. Cleanup ---
  console.log("🧹 Cleaning up database...");
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

  // --- 1. Global Settings ---
  await prisma.globalSettings.create({
    data: {
      isSelectionOpen: true,
    }
  });
  console.log("✅ Global settings initialized");

  // --- 2. Categories ---
  const categories = [
    { name: "Цикл загальної підготовки", description: "Фундаментальні дисципліни" },
    { name: "Цикл професійної підготовки", description: "Професійно-орієнтовані дисципліни" },
    { name: "Дисципліни за вибором", description: "Вибіркові курси для формування траєкторії" },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.courseCategory.create({ data: cat });
    categoryMap[cat.name] = created.id;
  }
  console.log("✅ Course categories created");

  // --- 3. Educational Programs & Groups ---
  const epCS = await prisma.educationalProgram.create({
    data: {
      name: "122 Комп'ютерні науки",
      description: "Інформаційні технології та комп'ютерні науки",
      totalCredits: 240,
      maxCreditsPerSem: 30.0
    }
  });
  
  const epSE = await prisma.educationalProgram.create({
    data: {
      name: "121 Інженерія програмного забезпечення",
      description: "Проектування та розробка програмних систем",
      totalCredits: 240,
      maxCreditsPerSem: 30.0
    }
  });

  const groups = [
    { name: "КН-41", educationalProgramId: epCS.id, description: "4 курс, КН" },
    { name: "КН-31", educationalProgramId: epCS.id, description: "3 курс, КН" },
    { name: "КН-21", educationalProgramId: epCS.id, description: "2 курс, КН" },
    { name: "ІПЗ-21", educationalProgramId: epSE.id, description: "2 курс, ІПЗ" },
    { name: "ІПЗ-11", educationalProgramId: epSE.id, description: "1 курс, ІПЗ" },
  ];

  const groupMap: Record<string, string> = {};
  for (const g of groups) {
    const created = await prisma.group.create({ data: g });
    groupMap[g.name] = created.id;
  }
  console.log("✅ Educational programs and groups created");

  // --- 4. Courses ---
  const coursesData = [
    // Semester 1
    { id: "c-math1", name: "Вища математика 1", credits: 6, type: "EXAM", sem: 1, cat: "Цикл загальної підготовки", selective: false },
    { id: "c-prog1", name: "Основи програмування", credits: 5, type: "DIFFERENTIATED_CREDIT", sem: 1, cat: "Цикл професійної підготовки", selective: false },
    { id: "c-hist", name: "Історія України", credits: 3, type: "CREDIT", sem: 1, cat: "Цикл загальної підготовки", selective: false },

    // Semester 2
    { id: "c-math2", name: "Вища математика 2", credits: 6, type: "EXAM", sem: 2, cat: "Цикл загальної підготовки", selective: false },
    { id: "c-dm", name: "Дискретна математика", credits: 4, type: "EXAM", sem: 2, cat: "Цикл професійної підготовки", selective: false },
    { id: "c-eng1", name: "Іноземна мова 1", credits: 3, type: "CREDIT", sem: 2, cat: "Цикл загальної підготовки", selective: false },

    // Semester 3
    { id: "c-oop", name: "Об'єктно-орієнтоване програмування", credits: 5, type: "EXAM", sem: 3, cat: "Цикл професійної підготовки", selective: false },
    { id: "c-db", name: "Бази даних", credits: 4, type: "EXAM", sem: 3, cat: "Цикл професійної підготовки", selective: false },
    { id: "c-arch", name: "Архітектура комп'ютера", credits: 4, type: "CREDIT", sem: 3, cat: "Цикл професійної підготовки", selective: false },

    // Semester 4
    { id: "c-os", name: "Операційні системи", credits: 5, type: "EXAM", sem: 4, cat: "Цикл професійної підготовки", selective: false },
    { id: "c-web", name: "Веб-технології", credits: 4, type: "DIFFERENTIATED_CREDIT", sem: 4, cat: "Цикл професійної підготовки", selective: false },
    { id: "c-net", name: "Комп'ютерні мережі", credits: 4, type: "CREDIT", sem: 4, cat: "Цикл професійної підготовки", selective: false },

    // Selective Courses (Pool)
    { id: "s-py", name: "Програмування на Python", credits: 4, type: "CREDIT", sem: 3, cat: "Дисципліни за вибором", selective: true },
    { id: "s-js", name: "Advanced JavaScript", credits: 4, type: "CREDIT", sem: 3, cat: "Дисципліни за вибором", selective: true },
    { id: "s-ml", name: "Основи Machine Learning", credits: 5, type: "EXAM", sem: 5, cat: "Дисципліни за вибором", selective: true },
    { id: "s-cloud", name: "Хмарні обчислення", credits: 4, type: "CREDIT", sem: 5, cat: "Дисципліни за вибором", selective: true },
    { id: "s-sec", name: "Кібербезпека", credits: 4, type: "EXAM", sem: 5, cat: "Дисципліни за вибором", selective: true },
    { id: "s-mobile", name: "Мобільна розробка", credits: 5, type: "EXAM", sem: 6, cat: "Дисципліни за вибором", selective: true },
    { id: "s-qa", name: "Тестування ПЗ", credits: 3, type: "CREDIT", sem: 6, cat: "Дисципліни за вибором", selective: true },
    { id: "s-game", name: "Розробка ігор", credits: 5, type: "EXAM", sem: 6, cat: "Дисципліни за вибором", selective: true },
  ];

  for (const c of coursesData) {
    await prisma.course.create({
      data: {
        id: c.id,
        name: c.name,
        ectsCredits: c.credits,
        controlType: c.type,
        semester: c.sem,
        isSelective: c.selective,
        categoryId: categoryMap[c.cat],
        educationalProgramLinks: {
          create: [
            { educationalProgramId: epCS.id },
            { educationalProgramId: epSE.id }
          ]
        }
      }
    });
  }
  console.log(`✅ Created ${coursesData.length} courses`);

  // --- 5. Course Schedules ---
  const schedules = [
    { courseId: "c-prog1", dayOfWeek: 1, startTime: "08:30", endTime: "10:05" },
    { courseId: "c-math1", dayOfWeek: 1, startTime: "10:25", endTime: "12:00" },
    { courseId: "c-prog1", dayOfWeek: 2, startTime: "08:30", endTime: "10:05" },
    { courseId: "c-db", dayOfWeek: 3, startTime: "12:20", endTime: "13:55" },
    { courseId: "c-web", dayOfWeek: 4, startTime: "10:25", endTime: "12:00" },
    { courseId: "s-py", dayOfWeek: 5, startTime: "14:15", endTime: "15:50" },
  ];

  for (const s of schedules) {
    await prisma.courseSchedule.create({ data: s });
  }
  console.log("✅ Course schedules created");

  // --- 6. Course Dependencies ---
  const dependencies = [
    { parent: "c-math1", child: "c-math2", weight: 0.9 },
    { parent: "c-prog1", child: "c-oop", weight: 0.85 },
    { parent: "c-oop", child: "c-web", weight: 0.7 },
    { parent: "c-db", child: "c-web", weight: 0.6 },
    { parent: "c-prog1", child: "s-py", weight: 0.8 },
    { parent: "c-math2", child: "s-ml", weight: 0.75 },
    { parent: "c-oop", child: "s-ml", weight: 0.65 },
    { parent: "c-web", child: "s-mobile", weight: 0.8 },
  ];

  for (const dep of dependencies) {
    await prisma.courseDependency.create({
      data: {
        parentCourseId: dep.parent,
        childCourseId: dep.child,
        weight: dep.weight
      }
    });
  }
  console.log("✅ Course dependencies established");

  // --- 7. Users (Admin & Blocked) ---
  const salt = 10;
  const adminPassword = await bcrypt.hash("Admin@123", salt);
  const studentPassword = await bcrypt.hash("Student@123", salt);

  await prisma.user.create({
    data: {
      email: "admin@test.com",
      passwordHash: adminPassword,
      role: "ADMIN"
    }
  });

  await prisma.user.create({
    data: {
      email: "blocked@test.com",
      passwordHash: studentPassword,
      role: "STUDENT",
      isBlocked: true,
      student: {
        create: {
          fullName: "Заблокований Користувач",
          groupId: groupMap["КН-41"],
          educationalProgramId: epCS.id,
          currentYear: 4,
          educationForm: "FULL_TIME"
        }
      }
    }
  });
  console.log("✅ Admin (admin@test.com / admin) and Blocked user (blocked@test.com / student) created");

  // --- 8. Students with various profiles ---
  const studentProfiles = [
    { name: "Відмінник Тестовий", email: "top@test.com", group: "КН-41", performance: "EXCELLENT" },
    { name: "Середнячок Тестовий", email: "mid@test.com", group: "КН-31", performance: "AVERAGE" },
    { name: "Двоєчник Тестовий", email: "low@test.com", group: "КН-21", performance: "POOR" },
    { name: "Новачок Тестовий", email: "new@test.com", group: "ІПЗ-11", performance: "NONE" },
  ];

  const students: any[] = [];
  for (const p of studentProfiles) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash: studentPassword,
        role: "STUDENT",
        student: {
          create: {
            fullName: p.name,
            groupId: groupMap[p.group],
            educationalProgramId: p.group.startsWith("КН") ? epCS.id : epSE.id,
            currentYear: p.group.includes("4") ? 4 : (p.group.includes("3") ? 3 : (p.group.includes("2") ? 2 : 1)),
            educationForm: "FULL_TIME"
          }
        }
      },
      include: { student: true }
    });
    students.push({ id: user.student!.id, performance: p.performance, currentYear: user.student!.currentYear });
  }

  // --- 9. Academic Records based on performance ---
  console.log("📊 Generating varied academic records...");
  for (const student of students) {
    if (student.performance === "NONE") continue;

    const completedSemesters = (student.currentYear - 1) * 2;
    for (const course of coursesData) {
      if (!course.selective && course.sem <= completedSemesters) {
        let grade = 0;
        if (student.performance === "EXCELLENT") grade = 90 + Math.floor(Math.random() * 11);
        else if (student.performance === "AVERAGE") grade = 70 + Math.floor(Math.random() * 21);
        else if (student.performance === "POOR") grade = 50 + Math.floor(Math.random() * 20);

        await prisma.academicRecord.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            gradeValue: grade,
            semesterCompleted: course.sem,
            assessmentName: "Фінальна оцінка"
          }
        });

        // Seed analytical params
        await prisma.studentModelParams.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            pLearn: 0.2,
            pSlip: 0.1,
            pGuess: 0.2,
            currentPKnown: grade / 100
          }
        });
      }
    }
  }

  // --- 10. Trajectories for testing Admin Dashboard ---
  const trajectoryStudent = students.find(s => s.performance === "AVERAGE");
  if (trajectoryStudent) {
    // Approved
    await prisma.trajectory.create({
      data: {
        studentId: trajectoryStudent.id,
        semester: 3,
        status: "APPROVED",
        items: { create: [{ courseId: "s-py" }, { courseId: "s-js" }] }
      }
    });

    // Pending (Submitted)
    await prisma.trajectory.create({
      data: {
        studentId: trajectoryStudent.id,
        semester: 5,
        status: "SUBMITTED",
        items: { create: [{ courseId: "s-ml" }, { courseId: "s-cloud" }] }
      }
    });
  }

  const failingStudent = students.find(s => s.performance === "POOR");
  if (failingStudent) {
    // Rejected
    await prisma.trajectory.create({
      data: {
        studentId: failingStudent.id,
        semester: 3,
        status: "REJECTED",
        items: { create: [{ courseId: "s-qa" }] }
      }
    });
  }

  console.log("✨ Seeding complete! All features ready for testing.");
  console.log("-----------------------------------------------");
  console.log("Credentials:");
  console.log("Admin: admin@test.com / admin");
  console.log("Student (Top): top@test.com / student");
  console.log("Student (Mid): mid@test.com / student");
  console.log("Student (Low): low@test.com / student");
  console.log("Student (New): new@test.com / student");
  console.log("Blocked: blocked@test.com / student");
  console.log("-----------------------------------------------");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });