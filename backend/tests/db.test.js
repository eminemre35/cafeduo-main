const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Load env from root

describe('Database Connection', () => {
    let pool;

    beforeAll(() => {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
                ? { rejectUnauthorized: false }
                : false
        });
    });

    afterAll(async () => {
        await pool.end();
    });

    test('should connect to the database', async () => {
        try {
            const client = await pool.connect();
            const res = await client.query('SELECT NOW()');
            client.release();
            expect(res.rows[0]).toHaveProperty('now');
        } catch (error) {
            console.error('Test DB Connection Failed:', error.message);
            throw error;
        }
    });

    test('should have essential tables', async () => {
        const client = await pool.connect();
        try {
            const res = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            const tables = res.rows.map(r => r.table_name);
            expect(tables).toContain('users');
            expect(tables).toContain('cafes');
            expect(tables).toContain('games');
        } finally {
            client.release();
        }
    });
});
