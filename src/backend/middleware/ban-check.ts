import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Unit } from "../utils/unit";
import { PlayerService } from "../services/player-service";

/**
 * Checks if a player is banned and sends a 403 response if they are.
 * Returns true if the player is banned (caller should return early).
 */
export async function checkPlayerBanned(
    unit: Unit,
    playerId: number,
    res: Response
): Promise<boolean> {
    const playerService = new PlayerService(unit);
    const banStatus = await playerService.checkBanned(playerId);
    if (banStatus.banned) {
        res.status(StatusCodes.FORBIDDEN).json({
            error: "Account banned",
            reason: banStatus.reason || "No reason provided"
        });
        return true;
    }
    return false;
}
