const { Pool } = require("pg");
require("dotenv").config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function del() {
    const pid = 327;
    
    const fk = await pool.query(`
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_schema = 'public'
        AND EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage ccu
            WHERE ccu.constraint_name = tc.constraint_name
            AND ccu.table_name = 'player'
        )
        ORDER BY tc.table_name
    `);
    
    for (const r of fk.rows) {
        try {
            await pool.query('DELETE FROM "' + r.table_name + '" WHERE "' + r.column_name + '" = ' + pid);
            console.log('OK: ' + r.table_name);
        } catch (e) {
            console.log('Error ' + r.table_name + ':', e.message);
        }
    }
    
    const result = await pool.query('DELETE FROM player WHERE playerId = ' + pid);
    console.log('Deleted player ' + pid + ':', result.rowCount);
    
    await pool.end();
}
del();
