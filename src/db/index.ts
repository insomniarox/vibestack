import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (!databaseUrl && !isBuildPhase) {
  throw new Error("DATABASE_URL is required at runtime.");
}

const sql = neon(databaseUrl || 'postgresql://placeholder');

export const db = drizzle(sql, { schema });
