const fs = require('fs');
const path = require('path');

// Ensure parent directory exists
const importDir = path.join(__dirname, '..', 'import_samples');
if (!fs.existsSync(importDir)) {
  fs.mkdirSync(importDir, { recursive: true });
}

// Arrays of Ukrainian names (matching seed.ts exactly)
const maleFirstNames = ["Дмитро", "Ярослав", "Андрій", "Микола", "Сергій", "Артем", "Максим", "Богдан", "Владислав", "Іван", "Роман", "Денис", "Михайло", "Олексій", "Павло", "Віктор", "Олег", "Юрій", "Василь", "Ігор", "Валерій", "Костянтин", "Анатолій", "Володимир", "Тарас"];
const femaleFirstNames = ["Марія", "Ольга", "Анна", "Тетяна", "Олена", "Наталія", "Ірина", "Юлія", "Анастасія", "Катерина", "Світлана", "Вікторія", "Людмила", "Галина", "Оксана", "Яна", "Софія", "Христина", "Дарія", "Аліна", "Єлизавета", "Надія", "Любов", "Маргарита", "Поліна"];
const lastNames = ["Шевченко", "Мельник", "Ковальчук", "Бондаренко", "Ткаченко", "Кравченко", "Коваль", "Олійник", "Шевчук", "Поліщук", "Лисенко", "Коломієць", "Савченко", "Петренко", "Руденко", "Харченко", "Мороз", "Козак", "Марченко", "Клименко", "Павленко", "Сидоренко", "Дяченко", "Бойко", "Пономаренко", "Гриценко", "Карпенко", "Павлюк", "Романюк", "Мазур", "Кравчук", "Василенко", "Швець", "Михайленко", "Лобода", "Войтенко", "Палій", "Орлов", "Косенко"];

function translit(str) {
  const map = {
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

// 1. Generate list of the 100 seeded students (Main student + 99 generated)
const students = [];
students.push({
  email: "o.kovalenko@khpi.edu.ua",
  fullName: "Олександр Коваленко",
  group: "КН-222",
  profile: 'average_high' // math and coding are good
});

const usedEmails = new Set(["o.kovalenko@khpi.edu.ua", "admin@khpi.edu.ua"]);
const groupNames = ["КН-221", "КН-222", "КН-223", "КН-224"];

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
  
  const group = groupNames[i % groupNames.length];
  
  // Assign a distinct cognitive profile for realistic grade distribution
  let profile = 'average';
  const rand = Math.random();
  if (rand > 0.85) {
    profile = 'excellent'; // A students
  } else if (rand > 0.70) {
    profile = 'coder'; // excels in programming, weak in math
  } else if (rand > 0.55) {
    profile = 'analyst'; // excels in math, average in coding
  } else if (rand < 0.12) {
    profile = 'struggling'; // barely passing
  }
  
  students.push({ email, fullName, group, profile });
}

console.log(`Generated mock metadata for ${students.length} students.`);

// 2. Generate grades_import.csv
const courses = [
  // Semester 1
  { name: "Основи програмування", sem: 1, type: "coding" },
  { name: "Вища математика", sem: 1, type: "math" },
  { name: "Лінійна алгебра та аналітична геометрія", sem: 1, type: "math" },
  { name: "Англійська мова (1 семестр)", sem: 1, type: "general" },
  { name: "Фізика", sem: 1, type: "general" },
  { name: "Вступ до ІТ", sem: 1, type: "general" },
  // Semester 2
  { name: "Дискретна математика", sem: 2, type: "math" },
  { name: "Архітектура комп'ютерів", sem: 2, type: "coding" },
  { name: "Алгоритми та структури даних", sem: 2, type: "coding" },
  { name: "Англійська мова (2 семестр)", sem: 2, type: "general" },
  // Semester 3
  { name: "Бази даних", sem: 3, type: "coding" },
  { name: "Об'єктно-орієнтоване програмування", sem: 3, type: "coding" },
  { name: "Теорія ймовірностей та математична статистика", sem: 3, type: "math" },
  { name: "Операційні системи", sem: 3, type: "coding" }
];

const gradeRows = ["Email,Дисципліна,Оцінка,Семестр,Вид контролю"];

for (const s of students) {
  // Determine baseline performance according to their profile
  let baseCoding = 75;
  let baseMath = 75;
  let baseGeneral = 75;
  
  switch (s.profile) {
    case 'excellent':
      baseCoding = 93; baseMath = 94; baseGeneral = 92;
      break;
    case 'coder':
      baseCoding = 90; baseMath = 62; baseGeneral = 74;
      break;
    case 'analyst':
      baseCoding = 70; baseMath = 91; baseGeneral = 78;
      break;
    case 'struggling':
      baseCoding = 61; baseMath = 58; baseGeneral = 62;
      break;
    case 'average_high':
      baseCoding = 84; baseMath = 82; baseGeneral = 85;
      break;
    case 'average':
    default:
      baseCoding = 76; baseMath = 74; baseGeneral = 78;
      break;
  }

  for (const c of courses) {
    let base = baseGeneral;
    if (c.type === 'coding') base = baseCoding;
    if (c.type === 'math') base = baseMath;
    
    // Add small random noise (-4 to +6)
    let grade = Math.round(base + (Math.random() * 10 - 4));
    if (grade > 100) grade = 100;
    if (grade < 50) grade = 50;
    
    const controlType = (c.name.includes("Англійська") || c.name.includes("Вступ до ІТ")) ? "Залік" : "Екзамен";
    gradeRows.push(`"${s.email}","${c.name}",${grade},${c.sem},"${controlType}"`);
  }
}

fs.writeFileSync(path.join(importDir, 'grades_import.csv'), gradeRows.join('\n'), 'utf-8');
console.log(`Successfully generated grades_import.csv with ${gradeRows.length - 1} records.`);

// 3. Generate students_import.csv (20 additional students not in DB for welcome-emails demonstration)
const studentRows = ["Email,ПІБ,Група,Освітня програма,Семестр,Форма навчання"];
const additionalMaleNames = ["Назар", "Данило", "Гліб", "Микита", "Тимофій", "Захар", "Всеволод", "Назарій", "Любомир", "Святослав"];
const additionalFemaleNames = ["Поліна", "Кароліна", "Марта", "Соломія", "Злата", "Мілана", "Уляна", "Меланія", "Емілія", "Віра"];

for (let i = 0; i < 20; i++) {
  const isMale = i % 2 === 0;
  const firstName = isMale ? additionalMaleNames[i/2] : additionalFemaleNames[(i-1)/2];
  const lastName = lastNames[(i + 15) % lastNames.length];
  const fullName = `${firstName} ${lastName}`;
  const email = `${translit(firstName[0].toLowerCase())}.${translit(lastName.toLowerCase())}.new@khpi.edu.ua`;
  const group = groupNames[i % groupNames.length];
  studentRows.push(`"${email}","${fullName}","${group}","Комп'ютерні науки та інтелектуальні системи",4,"Денна"`);
}
fs.writeFileSync(path.join(importDir, 'students_import.csv'), studentRows.join('\n'), 'utf-8');
console.log("Successfully generated students_import.csv.");

// 4. Generate courses_import.csv (4 new specialized selective courses for semester 6 and 7)
const courseRows = [
  "Назва,Кредити,Семестр,Категорія,Вибіркова,Освітні програми,Пререквізити,Опис",
  `"Глибоке навчання",5,6,"Вибіркові дисципліни","Вибіркова","Комп'ютерні науки та інтелектуальні системи","Машинне навчання:0.85","Сучасні нейромережеві архітектури, згорткові та рекурентні мережі, трансформери та генеративні моделі."`,
  `"Блокчейн та криптографічні протоколи",5,6,"Вибіркові дисципліни","Вибіркова","Комп'ютерні науки та інтелектуальні системи","Основи програмування:0.7,Дискретна математика:0.6","Розробка децентралізованих рішень, технології смарт-контрактів та алгоритми консенсусу."`,
  `"Інтернет речей (IoT)",5,6,"Вибіркові дисципліни","Вибіркова","Комп'ютерні науки та інтелектуальні системи","Комп'ютерні мережі:0.8,Архітектура комп'ютерів:0.7","Проєктування розумних вбудованих систем, збір даних з сенсорів та протоколи зв'язку."`,
  `"Розробка мобільних застосунків на Swift",5,7,"Вибіркові дисципліни","Вибіркова","Комп'ютерні науки та інтелектуальні системи","Об'єктно-орієнтоване програмування:0.9","Створення сучасних нативних мобільних додатків для екосистеми iOS з використанням SwiftUI."`
];
fs.writeFileSync(path.join(importDir, 'courses_import.csv'), courseRows.join('\n'), 'utf-8');
console.log("Successfully generated courses_import.csv.");

// 5. Generate groups_import.csv (demonstrating adding new academic groups with semester information)
const groupRows = [
  "Назва групи,Освітня програма,Семестр,Опис",
  `"КН-321","Комп'ютерні науки та інтелектуальні системи",3,"3-й семестр навчання (2-й курс)"`,
  `"КН-322","Комп'ютерні науки та інтелектуальні системи",3,"3-й семестр навчання (2-й курс)"`,
  `"КН-121","Комп'ютерні науки та інтелектуальні системи",7,"7-й семестр навчання (4-й курс)"`
];
fs.writeFileSync(path.join(importDir, 'groups_import.csv'), groupRows.join('\n'), 'utf-8');
console.log("Successfully generated groups_import.csv.");

// 6. Generate educational_programs_import.csv (demonstrating adding a new major/program)
const programRows = [
  "Назва,Кредити,Опис",
  `"Програмна інженерія",240,"Підготовка фахівців з проєктування, розробки та супроводження складного програмного забезпечення."`,
  `"Кібербезпека та захист інформації",240,"Спеціальність з адміністрування безпеки мереж, криптографічного захисту та реагування на кіберінциденти."`
];
fs.writeFileSync(path.join(importDir, 'educational_programs_import.csv'), programRows.join('\n'), 'utf-8');
console.log("Successfully generated educational_programs_import.csv.");

console.log("🌟 Усі демонстраційні CSV-файли успішно створені в папці backend/import_samples/!");
