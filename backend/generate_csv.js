const fs = require('fs');

function generateAssessments(targetAvg, count) {
  let grades = [];
  let sum = 0;
  for (let i = 0; i < count - 1; i++) {
    const variance = Math.floor(Math.random() * 15) - 7;
    let grade = targetAvg + variance;
    if (grade > 100) grade = 100;
    if (grade < 60) grade = 60;
    grades.push(grade);
    sum += grade;
  }
  let lastGrade = Math.round(targetAvg * count - sum);
  if (lastGrade > 100) {
    let excess = lastGrade - 100;
    lastGrade = 100;
    for (let i = 0; i < grades.length && excess > 0; i++) {
      let space = 100 - grades[i];
      let add = Math.min(space, excess);
      grades[i] += add;
      excess -= add;
    }
  } else if (lastGrade < 0) lastGrade = 0;
  grades.push(lastGrade);
  return grades;
}

const recordsInput = [
  { courseKey: "Основи програмування", targetGrade: 70, sem: 1 },
  { courseKey: "Вища математика", targetGrade: 85, sem: 1 },
  { courseKey: "Лінійна алгебра та аналітична геометрія", targetGrade: 60, sem: 1 },
  { courseKey: "Англійська мова (1 семестр)", targetGrade: 90, sem: 1 },
  { courseKey: "Фізика", targetGrade: 78, sem: 1 },
  { courseKey: "Вступ до ІТ", targetGrade: 95, sem: 1 },
  { courseKey: "Алгоритми та структури даних", targetGrade: 75, sem: 2 },
  { courseKey: "Англійська мова (2 семестр)", targetGrade: 88, sem: 2 },
  { courseKey: "Бази даних", targetGrade: 100, sem: 3 }, // Max -> NoSQL max
  { courseKey: "Об'єктно-орієнтоване програмування", targetGrade: 75, sem: 3 },
  { courseKey: "Теорія ймовірностей та математична статистика", targetGrade: 98, sem: 3 }, // High -> ML high
  { courseKey: "Операційні системи", targetGrade: 65, sem: 3 } // Very low -> SecOps very low
];

const assessmentNamesPool = ["Лабораторна робота 1", "Лабораторна робота 2", "Модульний контроль 1", "Лабораторна робота 3", "Лабораторна робота 4", "Модульний контроль 2"];

let csv = "\uFEFFemail,course,gradeValue,semester,assessment\n";
const email = "o.kovalenko@khpi.edu.ua";

for (const r of recordsInput) {
  const numAssessments = Math.floor(Math.random() * 3) + 4;
  const grades = generateAssessments(r.targetGrade, numAssessments);
  const shuffledNames = [...assessmentNamesPool].sort(() => 0.5 - Math.random());
  const assessmentNames = shuffledNames.slice(0, numAssessments - 1);
  assessmentNames.push("Підсумковий контроль");

  for (let i = 0; i < numAssessments; i++) {
    csv += `${email},"${r.courseKey}",${grades[i]},${r.sem},"${assessmentNames[i]}"\n`;
  }
}

fs.writeFileSync('student_grades_import.csv', csv, 'utf-8');
console.log("CSV created at student_grades_import.csv");
