/**
 * Delete playerId=1 (the compromised admin account) using the service layer
 * which properly handles all cascade deletions.
 *
 * Usage: node scripts/delete-admin.js
 */
require("dotenv").config();
const { Unit } = require("../dist/backend/utils/unit");
const { PlayerService } = require("../dist/backend/services/player-service");

async function main() {
    const unit = await Unit.create(false);
    const playerService = new PlayerService(unit);

    try {
        const success = await playerService.deletePlayer(1);
        if (success) {
            await unit.complete(true);
            console.log("✅ Admin account (playerId=1) deleted successfully");
        } else {
            await unit.complete(false);
            console.error("❌ Player not found or already deleted");
            process.exit(1);
        }
    } catch (err) {
        await unit.complete(false);
        console.error("❌ Delete failed:", err.message);
        process.exit(1);
    }
}

main();
