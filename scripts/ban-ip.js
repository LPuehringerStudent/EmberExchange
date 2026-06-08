/**
 * One-time script: manually ban an IP address.
 *
 * Usage: node scripts/ban-ip.js <ip> [days] [reason]
 * Example: node scripts/ban-ip.js 104.28.159.55 7 "Bot activity"
 */
require("dotenv").config();
const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("DATABASE_URL env var is required");
    process.exit(1);
}

const ip = process.argv[2];
const days = parseInt(process.argv[3] ?? "7", 10);
const reason = process.argv[4] ?? "Manual admin ban";

if (!ip) {
    console.error("Usage: node scripts/ban-ip.js <ip> [days] [reason]");
    process.exit(1);
}

async function main() {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await client.query(
        `INSERT INTO BannedIP (ip, reason, bannedAt, expiresAt)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (ip) DO UPDATE SET
             reason = EXCLUDED.reason,
             bannedAt = EXCLUDED.bannedAt,
             expiresAt = EXCLUDED.expiresAt`,
        [ip, reason, now, expiresAt]
    );

    await client.end();

    console.log(`✅ Banned ${ip} for ${days} day(s)`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Expires: ${expiresAt}`);
}

main().catch(err => {
    console.error("Failed to ban IP:", err);
    process.exit(1);
});
