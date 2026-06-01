/**
 * One-time migration: Mark all existing local (non-OAuth) players as email-verified.
 * 
 * Run this script once against your production database. It updates all players
 * who have provider=null (local accounts) and emailVerified is NULL or 0.
 * 
 * Usage: node scripts/verify-existing-players.js
 */
require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("DATABASE_URL env var is required");
    process.exit(1);
}

async function main() {
    const sql = neon(DATABASE_URL);

    // Count affected players before updating
    const countResult = await sql`
        SELECT COUNT(*) as count FROM Player
        WHERE provider IS NULL AND (emailVerified IS NULL OR emailVerified = 0)
    `;
    const affectedCount = parseInt(countResult[0].count, 10);
    console.log(`Found ${affectedCount} local players without email verification`);

    if (affectedCount === 0) {
        console.log("Nothing to update. Exiting.");
        return;
    }

    // Update all existing local players to be verified
    const updateResult = await sql`
        UPDATE Player
        SET emailVerified = 1, verifiedAt = NOW()
        WHERE provider IS NULL AND (emailVerified IS NULL OR emailVerified = 0)
        RETURNING playerId, username, email
    `;

    console.log(`Updated ${updateResult.length} players:`);
    for (const row of updateResult) {
        console.log(`  - ${row.username} (${row.email}) [playerId=${row.playerId}]`);
    }

    console.log("\nDone! All existing local accounts can now log in.");
    console.log("New registrations will still require email verification as usual.");
}

main().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
