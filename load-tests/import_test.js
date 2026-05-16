import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

const BASE_URL = __ENV.BASE_URL || 'https://nginx';
const csvFile = open('./large_import.csv', 'b');

export const options = {
  scenarios: {
    import_stress: {
      executor: 'per-vu-iterations',
      vus: 1, // Для імпорту достатньо 1 VU, щоб перевірити час обробки великого файлу
      iterations: 1,
      maxDuration: '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<30000'],
  },
  insecureSkipTLSVerify: true,
};

export default function () {
  // 1. Логін як ADMIN (обов'язково для імпорту)
  const loginPayload = JSON.stringify({
    email: 'admin1@khpi.edu.ua',
    password: 'Admin@123',
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const token = loginRes.json().data?.accessToken || loginRes.json().accessToken;

  if (!token) {
    console.error('❌ Не вдалося отримати токен адміністратора');
    return;
  }

  // 2. Підготовка Multipart форми
  const fd = new FormData();
  fd.append('file', http.file(csvFile, 'large_import.csv', 'text/csv'));

  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data; boundary=' + fd.boundary,
    },
    timeout: '600s', // Збільшуємо таймаут для великих файлів
  };

  // 3. Відправка файлу
  console.log('🚀 Початок імпорту 5000 записів...');
  const res = http.post(`${BASE_URL}/api/admin/records/bulk`, fd.body(), params);

  check(res, {
    'Import status is 200/201': (r) => r.status === 200 || r.status === 201,
    'Import took less than 60s': (r) => r.timings.duration < 60000,
  });

  if (res.status !== 200 && res.status !== 201) {
    console.error(`❌ Помилка імпорту: ${res.status} ${res.body}`);
  } else {
    console.log(`✅ Імпорт завершено успішно за ${res.timings.duration / 1000}с`);
  }
}
