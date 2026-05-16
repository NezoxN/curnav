import http from 'k6/http';
import { check, sleep } from 'k6';
import { scenario } from 'k6/execution';

/**
 * СТРЕС-ТЕСТ: Перевірка максимальної витривалості generate та submit
 * 
 * Запуск:
 * docker-compose -f docker-compose.prod.yml run --rm k6 run /load-tests/stress_test.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://nginx';

export const options = {
  insecureSkipTLSVerify: true,
  scenarios: {
    heavy_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 }, // Підйом до 100 паралельних користувачів
        { duration: '2m', target: 100 }, // Утримання
        { duration: '30s', target: 0 },  // Завершення
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<10000'], // Допускаємо до 10с під екстремальним навантаженням
    http_req_failed: ['rate<0.05'],     // Менше 5% помилок
  },
};

const TEST_STUDENTS = Array.from({ length: 1000 }, (_, i) => `student${i + 1}@khpi.edu.ua`);

export default function () {
  // Вибираємо студента на основі VU та ітерації
  const studentIndex = (scenario.iterationInTest) % TEST_STUDENTS.length;
  const email = TEST_STUDENTS[studentIndex];
  const password = 'Student@123';

  // 1. Авторизація (необхідна для отримання токена)
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200, 201, 400),
  });

  const token = loginRes.json().data?.accessToken;
  if (!token) return;

  const authParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: '60s', // Збільшуємо таймаут для стрес-тесту
  };

  // --- FOCUS: GENERATE ---
  const randomSemester = Math.floor(Math.random() * 8) + 1;
  const genRes = http.post(`${BASE_URL}/api/trajectory/generate`, JSON.stringify({ targetSemester: randomSemester }), {
    ...authParams,
    responseCallback: http.expectedStatuses(200, 400),
  });

  check(genRes, {
    'Generate success': (r) => r.status === 200,
  });

  // Маленька пауза (емуляція вибору)
  sleep(Math.random() * 10);

  // --- FOCUS: SUBMIT ---
  const genData = genRes.json().data;
  const recommendations = genData?.recommendations || [];
  const mandatory = genData?.mandatory || [];

  // Беремо перші 5 доступних курсів (спрощена логіка для швидкості стрес-тесту)
  let selectedIds = [...mandatory, ...recommendations]
    .slice(0, 5)
    .map(item => item.course.id);

  if (selectedIds.length > 0) {
    const submitRes = http.post(`${BASE_URL}/api/trajectory/submit`, JSON.stringify({
      courseIds: selectedIds,
      semester: randomSemester
    }), {
      ...authParams,
      responseCallback: http.expectedStatuses(200, 201, 400),
    });

    check(submitRes, {
      'Submit success (2xx or 400)': (r) => r.status === 200 || r.status === 201 || r.status === 400,
    });
  }

  sleep(0.5);
}
