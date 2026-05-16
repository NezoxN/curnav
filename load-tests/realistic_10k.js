import http from 'k6/http';
import { check, sleep } from 'k6';
import { scenario } from 'k6/execution';

/**
 * РЕАЛІСТИЧНИЙ ТЕСТ: 5 000 користувачів за 30 хвилин (Скорочена версія для верифікації)
 * 
 * Цей скрипт перевіряє, чи витримає система інтенсивність у 2.77 нових користувачів на секунду.
 * Замість 30 хвилин ми запускаємо тест на 5 хвилин, щоб швидко підтвердити стабільність.
 * 
 * Запуск:
 * k6 run -e BASE_URL=https://ваша_адреса load-tests/realistic_10k.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://nginx';

export const options = {
  insecureSkipTLSVerify: true,
  scenarios: {
    realistic_load: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1m',       // Змінюємо одиницю часу на хвилину, щоб використовувати цілі числа
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '1m', target: 167 }, // Розгін до 167 користувачів на хвилину (~2.78/сек = 5к за 30хв)
        { duration: '3m', target: 167 }, // Утримання піку
        { duration: '1m', target: 0 },   // Спад
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% запитів < 3с
    http_req_failed: ['rate<0.01'],    // Менше 1% помилок
  },
};

// Список тестових студентів (має співпадати з тими, що є в БД)
const TEST_STUDENTS = Array.from({ length: 1000 }, (_, i) => `student${i + 1}@khpi.edu.ua`);

export default function () {
  const studentIndex = scenario.iterationInTest % TEST_STUDENTS.length;
  const email = TEST_STUDENTS[studentIndex];
  const password = 'Student@123';

  // 1. Авторизація
  const loginPayload = JSON.stringify({ email, password });
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200, 201, 400),
  });

  const checkLogin = check(loginRes, {
    'Login success': (r) => r.status === 200 || r.status === 201,
  });

  if (!checkLogin) return;

  const token = loginRes.json().data?.accessToken;
  const authParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: '30s',
  };

  // Симуляція "think time" - користувач дивиться на головну сторінку
  sleep(Math.random() * 5 + 2);

  // 2. Генерація рекомендацій (найважчий запит - Python core)
  // Вибираємо випадковий семестр (1-8) для урізноманітнення запитів
  const randomSemester = Math.floor(Math.random() * 8) + 1;
  const genRes = http.post(`${BASE_URL}/api/trajectory/generate`, JSON.stringify({ targetSemester: randomSemester }), {
    ...authParams,
    responseCallback: http.expectedStatuses(200, 400),
  });

  const checkGen = check(genRes, {
    'Trajectory generated': (r) => r.status === 200,
  });

  if (!checkGen) {
    console.error(`❌ Generate failed: ${genRes.status} ${genRes.body}`);
    return;
  }

  // Симуляція вибору курсів (користувач читає опис)
  sleep(Math.random() * 30 + 5);

  // 3. Збереження вибору (запис у БД)
  const genData = genRes.json().data;
  const recommendations = genData?.recommendations || [];
  const mandatory = genData?.mandatory || [];
  const maxCredits = genData?.maxCreditsPerSem || 30.0;

  let selectedIds = [];
  let currentCredits = 0;
  let occupiedSlots = new Set(); // Формат: "day-startTime-endTime"

  // Допоміжна функція для перевірки накладок
  const hasConflict = (scheduleStr) => {
    if (!scheduleStr || scheduleStr === 'Не призначено') return false;
    const slots = scheduleStr.split(', ');
    for (const slot of slots) {
      if (occupiedSlots.has(slot)) return true;
    }
    return false;
  };

  const addCourse = (item) => {
    if (currentCredits + item.course.ectsCredits <= maxCredits && !hasConflict(item.schedule)) {
      selectedIds.push(item.course.id);
      currentCredits += item.course.ectsCredits;
      if (item.schedule && item.schedule !== 'Не призначено') {
        item.schedule.split(', ').forEach(slot => occupiedSlots.add(slot));
      }
      return true;
    }
    return false;
  };

  // Спочатку беремо всі обов'язкові
  mandatory.forEach(m => addCourse(m));

  // Потім додаємо вибіркові по черзі (вони вже відсортовані за ймовірністю)
  recommendations.forEach(r => addCourse(r));

  if (selectedIds.length === 0) {
    console.warn(`⚠️ No valid courses for ${email} (Credits: ${currentCredits})`);
    return;
  }

  const selectPayload = JSON.stringify({
    courseIds: selectedIds,
    semester: randomSemester
  });
  const selectRes = http.post(`${BASE_URL}/api/trajectory/submit`, selectPayload, {
    ...authParams,
    responseCallback: http.expectedStatuses(200, 201, 400),
  });

  check(selectRes, {
    'Selection saved (Success or Business Logic 400)': (r) => r.status === 200 || r.status === 201 || r.status === 400,
  });

  if (selectRes.status !== 200 && selectRes.status !== 201) {
    // Якщо помилка 400 - це бізнес-логіка (вже подано), не вважаємо це за технічний збій у логах k6
    if (selectRes.status !== 400) {
      console.error(`❌ Submit failed for ${email}: ${selectRes.status} ${selectRes.body}`);
    }
  }
}
