import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let prisma: PrismaClient | null = null;

export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    const urlString = process.env.DATABASE_URL || "postgresql://postgres:secret@localhost:5432/ibkt_db?schema=public";
    const url = new URL(urlString);
    url.searchParams.set('schema', 'public');
    
    const pool = new pg.Pool({ connectionString: url.toString() });
    const adapter = new PrismaPg(pool, { schema: 'public' });
    
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    } as any);
  }
  return prisma;
};