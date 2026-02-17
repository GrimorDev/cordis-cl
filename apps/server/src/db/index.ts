import pg from 'pg'
import { config } from '../config.js'

const { Pool } = pg

export const db = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

db.on('error', err => {
  console.error('Unexpected DB pool error', err)
})

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  values?: unknown[]
): Promise<pg.QueryResult<T>> {
  const client = await db.connect()
  try {
    return await client.query<T>(sql, values)
  } finally {
    client.release()
  }
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  values?: unknown[]
): Promise<T | null> {
  const result = await query<T>(sql, values)
  return result.rows[0] ?? null
}

export async function queryMany<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await query<T>(sql, values)
  return result.rows
}
