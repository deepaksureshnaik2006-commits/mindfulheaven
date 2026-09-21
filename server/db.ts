import { Pool, PoolClient } from 'pg';

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString ? new Pool({
  connectionString,
}) : {
  query: async () => ({ rows: [], rowCount: 0 }),
  connect: async () => ({ query: async () => {}, release: () => {} }),
} as any;

export async function query<T = any>(
  text: string,
  params: any[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const result = await pool.query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
