# Система управління навчальним процесом та формування ІОТ 🎓

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

Сучасна повнофункціональна веб-платформа для автоматизації вибору вибіркових дисциплін студентами (Індивідуальних Освітніх Траєкторій — ІОТ), ведення електронної заліковки, адміністрування навчальних планів та глибокої аналітики засвоєння знань на базі алгоритмів **BKT (Bayesian Knowledge Tracing)**.

---

## 🌟 Ключові можливості

### 🧑‍🎓 Портал Студента
* **Формування індивідуальної освітньої траєкторії (ІОТ):** Перегляд каталогу вибіркових дисциплін, контроль наповненості груп та подача заявки на затвердження.
* **Автоматична валідація обмежень:** Система на льоту перевіряє ліміти місць на курсі та сумарну кількість кредитів ECTS (не дозволяючи перевищити семестровий максимум ОП).
* **Електронна заліковка:** Перегляд оцінок, середнього балу (GPA), здобутих кредитів та розкладу в розрізі семестрів.

### 🛡️ Адміністративна панель
* **Управління контингентом та структурою:** Повний CRUD для студентів, навчальних груп та Освітніх програм (ОП).
* **Каталог дисциплін та Пререквізити:** Налаштування дисциплін, їх кредитів, типів контролю та встановлення залежностей (пререквізитів) із зазначенням ваги зв'язку.
* **Масовий імпорт та експорт:** Підтримка завантаження файлів `.csv` та `.xlsx` для автоматичного створення студентів, розширеного імпорту курсів зі зв'язками та відомостей успішності.
* **Рецензування траєкторій:** Зручний інтерфейс для перевірки, затвердження або відхилення студентських заявок на ІОТ.

### 🧠 Аналітичне ядро (BKT)
* **Математичне моделювання:** Відстеження ймовірнісних характеристик знань студента з кожної дисципліни (`pLearn`, `pSlip`, `pGuess`, `currentPKnown`).
* **Алгоритмічні рекомендації:** Аналіз прогалин у знаннях пререквізитів для точного прогнозування успішності та надання персоналізованих рекомендацій.

---

## 🏗️ Технологічний стек

* **Frontend:** React 18, TypeScript, Vite, Mantine UI v7, Redux Toolkit.
* **Backend:** Node.js, Express, TypeScript, Prisma ORM.
* **Аналітичний модуль:** Python (iBKT Engine).
* **База даних:** PostgreSQL 15+.
* **Безпека:** Хешування паролів (bcrypt), сесії на базі короткострокових Access та довгострокових Refresh JWT-токенів у захищених `httpOnly` cookies.
* **Інфраструктура:** Docker та Docker Compose для середовищ розробки та продакшену.

---

## 📁 Структура проєкту

```text
Code/
├── frontend/                 # Клієнтська частина (React + Vite)
├── backend/                  # Серверна частина (Node.js API + Prisma)
│   ├── src/                  # Вихідний код бекенду (контролери, сервіси, роути)
│   └── analytical_core/      # Модуль аналітики та розрахунків BKT на Python
├── docker-compose.yml        # Головний конфігураційний файл Docker
├── docker-compose.dev.yml    # Конфігурація для локального середовища розробки
└── docker-compose.prod.yml   # Конфігурація для продакшену
```

---

## 🚀 Запуск проєкту

### За допомогою Docker (Рекомендовано)

Переконайтеся, що у вас встановлено [Docker](https://www.docker.com/) та Docker Compose.

1. **Клонуйте репозиторій:**
   ```bash
   git clone <URL_репозиторію>
   cd Code
   ```

2. **Запустіть середовище розробки:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```

Після успішного запуску контейнерів сервіси будуть доступні за такими адресами:
* **Клієнтський інтерфейс (Frontend):** `http://localhost:3000` (або порт, вказаний у конфігурації)
* **Серверне API (Backend):** `http://localhost:5000`

---

## 📄 Документація
Детальний опис архітектурних рішень та вимог знаходиться у файлах:
* [Функціональні вимоги](functional_requirements.md)
* [Нефункціональні вимоги](non_functional_requirements.md)
