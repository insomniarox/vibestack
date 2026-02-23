import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});

async function test() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const res = await sql`SELECT count(*) FROM subscribers WHERE author_id = 'test'`;
    console.log("Success:", res);
  } catch (err) {
    console.error("DB Error:", err);
  }
}
test();