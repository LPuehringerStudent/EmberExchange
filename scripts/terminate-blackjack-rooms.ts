import 'dotenv/config';
import { Unit, DB } from '../src/backend/utils/unit';

async function main() {
    const client = await DB.createDBConnection();
    try {
        await DB.ensureTablesCreated(client);
    } finally {
        client.release();
    }

    const unit = await Unit.create(false);
    try {
        const listStmt = unit.prepare<{ roomId: string }, { gameType: string }>(
            `SELECT roomId FROM Room WHERE gameType = @gameType AND status IN ('waiting', 'active')`,
            { gameType: 'blackjack' }
        );
        const rooms = await listStmt.all();
        if (rooms.length === 0) {
            console.log('No active blackjack rooms found.');
            return;
        }

        console.log(`Terminating ${rooms.length} active blackjack room(s): ${rooms.map(r => r.roomId).join(', ')}`);

        const placeholders = rooms.map((_, i) => `@room${i}`).join(',');
        const params: Record<string, string> = {};
        rooms.forEach((r, i) => { params[`room${i}`] = r.roomId; });

        await unit.prepare(`DELETE FROM EventLog WHERE roomId IN (${placeholders})`, params).run();
        await unit.prepare(`DELETE FROM GameState WHERE roomId IN (${placeholders})`, params).run();
        await unit.prepare(`DELETE FROM RoomPlayer WHERE roomId IN (${placeholders})`, params).run();

        const updateStmt = unit.prepare<unknown, { gameType: string }>(
            `UPDATE Room SET status = 'finished', updatedAt = NOW() WHERE gameType = @gameType AND status IN ('waiting', 'active')`,
            { gameType: 'blackjack' }
        );
        await updateStmt.run();

        console.log(`Finished ${rooms.length} blackjack room(s).`);
    } finally {
        await unit.complete(true);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
