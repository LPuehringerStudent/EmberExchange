require('dotenv').config();
const { Unit } = require('../dist/backend/utils/unit');

async function analyzePlayers() {
    const unit = await Unit.create(true);
    try {
        // First check how many are NOT verified
        const unverifiedCheck = await unit.prepare(`
            SELECT COUNT(*)::INTEGER as count FROM Player WHERE bannedAt IS NULL AND emailVerified = 0
        `).get();
        console.log(`Unbanned players with emailVerified=false: ${unverifiedCheck?.count ?? 0}\n`);

        const stmt = unit.prepare(`
            SELECT 
                p.playerId,
                p.username,
                p.email,
                p.emailVerified,
                p.coins,
                p.isAdmin,
                p.bannedAt,
                p.joinedAt,
                p.provider,
                COALESCE(ct.cnt, 0)::INTEGER as transactionCount,
                COALESCE(lh.cnt, 0)::INTEGER as loginCount,
                COALESCE(vl.cnt, 0)::INTEGER as violationCount,
                COALESCE(mg.cnt, 0)::INTEGER as gameSessionCount
            FROM Player p
            LEFT JOIN (SELECT playerId, COUNT(*) as cnt FROM CoinTransaction GROUP BY playerId) ct ON ct.playerId = p.playerId
            LEFT JOIN (SELECT playerId, COUNT(*) as cnt FROM LoginHistory GROUP BY playerId) lh ON lh.playerId = p.playerId
            LEFT JOIN (SELECT playerId, COUNT(*) as cnt FROM ViolationLog GROUP BY playerId) vl ON vl.playerId = p.playerId
            LEFT JOIN (SELECT playerId, COUNT(*) as cnt FROM MiniGameSession GROUP BY playerId) mg ON mg.playerId = p.playerId
            WHERE p.bannedAt IS NULL
            ORDER BY p.playerId
        `);
        const players = await stmt.all();

        const suspicious = [];
        const clean = [];
        const alreadyVerified = [];

        for (const player of players) {
            if (player.emailVerified) {
                alreadyVerified.push(player);
                continue;
            }

            let reasons = [];

            if (player.coins > 100000 && player.transactionCount === 0) {
                reasons.push(`High coins (${player.coins}) with 0 transactions`);
            }
            if (player.coins > 1000000) {
                reasons.push(`Extremely high coins (${player.coins})`);
            }
            if (player.violationCount > 0) {
                reasons.push(`${player.violationCount} violation(s) recorded`);
            }
            if (player.gameSessionCount === 0 && player.coins > 1000 && !player.provider) {
                reasons.push(`No game sessions but has ${player.coins} coins (local account)`);
            }
            if (player.loginCount === 1 && player.coins > 50000) {
                reasons.push(`Only 1 login but has ${player.coins} coins`);
            }
            if (player.email && player.email.match(/\+.*@gmail\.com$/i)) {
                reasons.push(`Gmail plus-alias: ${player.email}`);
            }
            const joined = new Date(player.joinedAt);
            const daysSinceJoin = (Date.now() - joined.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceJoin < 7 && player.coins > 50000) {
                reasons.push(`Joined ${Math.floor(daysSinceJoin)} days ago with ${player.coins} coins`);
            }

            if (reasons.length > 0) {
                suspicious.push({ ...player, reasons });
            } else {
                clean.push(player);
            }
        }

        console.log(`ALREADY VERIFIED: ${alreadyVerified.length} players`);
        console.log(`SUSPICIOUS (unverified): ${suspicious.length} players`);
        console.log(`CLEAN (unverified): ${clean.length} players\n`);

        if (suspicious.length > 0) {
            console.log(`=== SUSPICIOUS UNVERIFIED PLAYERS (${suspicious.length}) ===\n`);
            for (const p of suspicious) {
                console.log(`ID: ${p.playerId} | User: ${p.username} | Email: ${p.email}`);
                console.log(`  Coins: ${p.coins.toLocaleString()} | Transactions: ${p.transactionCount} | Games: ${p.gameSessionCount} | Logins: ${p.loginCount}`);
                console.log(`  Provider: ${p.provider || 'local'} | Joined: ${p.joinedAt}`);
                console.log(`  REASONS:`);
                for (const r of p.reasons) {
                    console.log(`    - ${r}`);
                }
                console.log();
            }
        }

        if (clean.length > 0) {
            console.log(`=== CLEAN UNVERIFIED PLAYERS (${clean.length}) ===`);
            console.log(`These will be marked emailVerified=true:\n`);
            for (const p of clean) {
                console.log(`  ID ${p.playerId}: ${p.username} | Email: ${p.email} | Coins: ${p.coins.toLocaleString()}`);
            }
        }

        return { suspicious, clean, alreadyVerified };
    } finally {
        await unit.complete();
    }
}

analyzePlayers().catch(err => {
    console.error(err);
    process.exit(1);
});
