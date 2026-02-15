
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };

const pool = new Pool(dbConfig);

async function runMigration() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected!');

        const migrationPath = path.join(__dirname, 'db', 'migrations', '005_create_events_table_local.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration: 005_create_events_table_local.sql...');
        await client.query(migrationSql);
        console.log('Migration completed successfully.');

        // console.log('Updating existing users to organizer...');
        // await client.query("UPDATE users SET role = 'organizer'");
        // console.log('Users updated successfully.');

        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
