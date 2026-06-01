/**
 * Reset admin password directly in the database.
 * Usage: node scripts/reset-admin-password.js <username> <newPassword>
 * Run without args to list admin accounts only.
 */

require("dotenv").config();
require("ts-node/register");
const { DB } = require("../src/backend/utils/unit");
const { hashPassword } = require("../src/backend/utils/password");

async function main() {
    const [,, targetUsername, newPassword] = process.argv;

    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        // Always list all admins first
        const adminRes = await client.query(
            `SELECT playerId, username, email, isAdmin FROM Player WHERE isAdmin = 1`
        );
        console.log(`\n👑 Found ${adminRes.rows.length} admin account(s):`);
        adminRes.rows.forEach(r => {
            console.log(`   - ${r.username} (ID: ${r.playerid}, email: ${r.email})`);
        });

        if (!targetUsername || !newPassword) {
            console.error("\nUsage: node scripts/reset-admin-password.js <username> <newPassword>");
            return;
        }

        if (newPassword.length < 8 || newPassword.length > 128) {
            console.error("\n❌ Password must be between 8 and 128 characters.");
            return;
        }

        // Find the target user
        const targetRes = await client.query(
            `SELECT playerId, username, isAdmin FROM Player WHERE username = $1`,
            [targetUsername]
        );

        if (targetRes.rows.length === 0) {
            console.error(`\n❌ Player "${targetUsername}" not found.`);
            return;
        }

        const target = targetRes.rows[0];

        if (!target.isadmin) {
            console.warn(`\n⚠️  "${targetUsername}" is NOT an admin. Proceeding anyway...`);
        }

        // Hash and update password
        const hashed = await hashPassword(newPassword);
        await client.query(
            `UPDATE Player SET password = $1 WHERE playerId = $2`,
            [hashed, target.playerid]
        );

        // Clear all existing sessions for this player to force re-login
        const sessionRes = await client.query(
            `DELETE FROM Session WHERE playerId = $1`,
            [target.playerid]
        );

        console.log(`\n✅ Password reset for "${targetUsername}".`);
        console.log(`   - Password hash updated.`);
        console.log(`   - ${sessionRes.rowCount} session(s) revoked.`);
        console.log(`\n🔐 You can now log in with the new password.`);

    } catch (err) {
        console.error("\n❌ Error:", err);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

main();
