const fs = require('fs');

const students = Array.from({ length: 100 }, (_, i) => `student${i + 1}@khpi.edu.ua`);

const courses = ['Вища математика', 'Основи програмування', 'Алгоритми та структури даних', 'Бази даних', 'Об\'єктно-орієнтоване програмування'];

const stream = fs.createWriteStream('large_import.csv');
stream.write('email,course,gradeValue,semester,assessment\n');

for (let i = 0; i < 5000; i++) {
  const student = students[i % students.length];
  const course = courses[i % courses.length];
  const grade = Math.floor(Math.random() * 41) + 60; // 60-100
  const semester = Math.floor(Math.random() * 4) + 1;
  stream.write(`${student},${course},${grade},${semester},Модуль ${i % 6 + 4}\n`);
}

stream.end();
console.log('✅ load-tests/large_import.csv згенеровано (5000 записів).');
