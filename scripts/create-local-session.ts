import 'dotenv/config';
import { Unit, DB } from '../src/backend/utils/unit';
import crypto from 'crypto';

async function main() {
    const client = await DB.createDBConnection();
    try {
        await DB.ensureTablesCreated(client);
    } finally {
        client.release();
    }

    const unit = await Unit.create(false);
    try {
        const suffix = crypto.randomUUID();
        const playerStmt = unit.prepare<{ playerId: number }, { username: string; email: string }>(
            `INSERT INTO Player (username, password, email, coins, lootboxCount, isAdmin, joinedAt)
             VALUES (@username, 'password', @email, 10000, 10, 0, NOW())
             RETURNING playerId`,
            { username: `local_${suffix.slice(0, 8)}`, email: `local_${suffix.slice(0, 8)}@example.com` }
        );
        const playerRow = await playerStmt.get();
        if (!playerRow) throw new Error('Failed to create player');
        const playerId = playerRow.playerId;

        const sessionId = crypto.randomUUID();
        const sessionStmt = unit.prepare<unknown, { sessionId: string; playerId: number; expiresAt: string }>(
            `INSERT INTO Session (sessionId, playerId, createdAt, expiresAt, isActive)
             VALUES (@sessionId, @playerId, NOW(), @expiresAt, 1)`,
            {
                sessionId,
                playerId,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }
        );
        await sessionStmt.run();

        console.log(JSON.stringify({ sessionId, playerId, username: `local_${suffix.slice(0, 8)}` }));
    } finally {
        await unit.complete(true);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
