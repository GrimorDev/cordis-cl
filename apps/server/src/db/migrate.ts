import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from '../config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MIGRATIONS = ['001_initial.sql']

async function migrate() {
  const client = new pg.Client({ connectionString: config.DATABASE_URL })
  await client.connect()

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id      SERIAL PRIMARY KEY,
        name    VARCHAR(255) NOT NULL UNIQUE,
        ran_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    for (const migration of MIGRATIONS) {
      const { rows } = await client.query('SELECT id FROM _migrations WHERE name = $1', [migration])

      if (rows.length > 0) {
        console.log(`⏭  Skipping ${migration} (already ran)`)
        continue
      }

      console.log(`▶  Running ${migration}...`)
      const sql = readFileSync(join(__dirname, 'migrations', migration), 'utf-8')
      await client.query(sql)
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration])
      console.log(`✅ ${migration} done`)
    }

    console.log('🎉 All migrations complete')
  } finally {
    await client.end()
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
