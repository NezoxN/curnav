import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Завантажуємо змінні з кореневого .env файлу
config();
config({ path: "../.env" });

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "npx ts-node -P prisma/tsconfig.json prisma/seed.ts",
    },
    datasource: {
        url: env("DATABASE_URL")
    },
});