import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { FriendRow } from "../../shared/model";

export interface FriendWithUser {
    friendId: number;
    requesterId: number;
    addresseeId: number;
    status: 'pending' | 'accepted' | 'blocked';
    createdAt: Date;
    username: string;
}

export class FriendService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Sends a friend request.
     * @returns Tuple [success, friendId]. Fails on self-request, duplicate, or block.
     */
    async sendRequest(requesterId: number, addresseeId: number): Promise<[boolean, number]> {
        if (requesterId === addresseeId) {
            return [false, 0];
        }

        // Check for existing relationship in either direction
        const existing = await this.findRelationship(requesterId, addresseeId);
        if (existing) {
            return [false, 0];
        }

        const stmt = this.unit.prepare<FriendRow>(
            `INSERT INTO Friend (requesterId, addresseeId, status, createdAt)
             VALUES (@requesterId, @addresseeId, 'pending', NOW())`,
            { requesterId, addresseeId }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Accepts or declines a pending friend request.
     * Only the addressee can respond.
     */
    async respondToRequest(friendId: number, addresseeId: number, accept: boolean): Promise<boolean> {
        const request = await this.getById(friendId);
        if (!request || request.addresseeId !== addresseeId || request.status !== 'pending') {
            return false;
        }

        if (accept) {
            const stmt = this.unit.prepare(
                `UPDATE Friend SET status = 'accepted' WHERE friendId = @friendId`,
                { friendId }
            );
            const result = await stmt.run();
            return result.changes === 1;
        } else {
            const stmt = this.unit.prepare(
                `DELETE FROM Friend WHERE friendId = @friendId`,
                { friendId }
            );
            const result = await stmt.run();
            return result.changes === 1;
        }
    }

    /**
     * Removes a friend relationship or cancels a sent request.
     * Either party can remove an accepted friendship; only requester can cancel pending.
     */
    async removeFriend(friendId: number, playerId: number): Promise<boolean> {
        const request = await this.getById(friendId);
        if (!request) {
            return false;
        }

        const isInvolved = request.requesterId === playerId || request.addresseeId === playerId;
        if (!isInvolved) {
            return false;
        }

        // For pending requests, only the requester can cancel
        if (request.status === 'pending' && request.requesterId !== playerId) {
            return false;
        }

        const stmt = this.unit.prepare(
            `DELETE FROM Friend WHERE friendId = @friendId`,
            { friendId }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Blocks a player. Creates or updates relationship to 'blocked'.
     */
    async blockPlayer(requesterId: number, addresseeId: number): Promise<[boolean, number]> {
        if (requesterId === addresseeId) {
            return [false, 0];
        }

        // Delete any pending request from the other direction first
        const otherPending = await this.unit.prepare<FriendRow>(
            `SELECT * FROM Friend WHERE requesterId = @addresseeId AND addresseeId = @requesterId AND status = 'pending'`,
            { requesterId, addresseeId }
        ).get();

        if (otherPending) {
            await this.unit.prepare(
                `DELETE FROM Friend WHERE friendId = @friendId`,
                { friendId: otherPending.friendId }
            ).run();
        }

        // Upsert block row
        const existing = await this.findRelationship(requesterId, addresseeId);
        if (existing) {
            if (existing.status === 'blocked') {
                return [true, existing.friendId];
            }
            const stmt = this.unit.prepare(
                `UPDATE Friend SET status = 'blocked' WHERE friendId = @friendId`,
                { friendId: existing.friendId }
            );
            const result = await stmt.run();
            return [result.changes === 1, existing.friendId];
        }

        const stmt = this.unit.prepare<FriendRow>(
            `INSERT INTO Friend (requesterId, addresseeId, status, createdAt)
             VALUES (@requesterId, @addresseeId, 'blocked', NOW())`,
            { requesterId, addresseeId }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Gets all accepted friends for a player, with usernames.
     */
    async getFriends(playerId: number): Promise<FriendWithUser[]> {
        const stmt = this.unit.prepare<FriendWithUser>(
            `SELECT f.*, p.username
             FROM Friend f
             JOIN Player p ON (
                 CASE
                     WHEN f.requesterId = @playerId THEN f.addresseeId
                     ELSE f.requesterId
                 END
             ) = p.playerId
             WHERE (f.requesterId = @playerId OR f.addresseeId = @playerId)
               AND f.status = 'accepted'`,
            { playerId }
        );
        return await stmt.all();
    }

    /**
     * Gets pending friend requests sent TO this player.
     */
    async getPendingRequests(playerId: number): Promise<FriendWithUser[]> {
        const stmt = this.unit.prepare<FriendWithUser>(
            `SELECT f.*, p.username
             FROM Friend f
             JOIN Player p ON f.requesterId = p.playerId
             WHERE f.addresseeId = @playerId AND f.status = 'pending'`,
            { playerId }
        );
        return await stmt.all();
    }

    /**
     * Gets pending friend requests sent BY this player.
     */
    async getSentRequests(playerId: number): Promise<FriendWithUser[]> {
        const stmt = this.unit.prepare<FriendWithUser>(
            `SELECT f.*, p.username
             FROM Friend f
             JOIN Player p ON f.addresseeId = p.playerId
             WHERE f.requesterId = @playerId AND f.status = 'pending'`,
            { playerId }
        );
        return await stmt.all();
    }

    /**
     * Checks if either player has blocked the other.
     */
    async isBlocked(player1Id: number, player2Id: number): Promise<boolean> {
        const stmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Friend
             WHERE (
                 (requesterId = @p1 AND addresseeId = @p2 AND status = 'blocked')
                 OR (requesterId = @p2 AND addresseeId = @p1 AND status = 'blocked')
             )`,
            { p1: player1Id, p2: player2Id }
        );
        const result = await stmt.get();
        return (result?.count ?? 0) > 0;
    }

    /**
     * Checks if two players are accepted friends.
     */
    async areFriends(player1Id: number, player2Id: number): Promise<boolean> {
        const stmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Friend
             WHERE status = 'accepted' AND (
                 (requesterId = @p1 AND addresseeId = @p2)
                 OR (requesterId = @p2 AND addresseeId = @p1)
             )`,
            { p1: player1Id, p2: player2Id }
        );
        const result = await stmt.get();
        return (result?.count ?? 0) > 0;
    }

    private async getById(friendId: number): Promise<FriendRow | null> {
        const stmt = this.unit.prepare<FriendRow>(
            `SELECT * FROM Friend WHERE friendId = @friendId`,
            { friendId }
        );
        return (await stmt.get()) ?? null;
    }

    private async findRelationship(player1Id: number, player2Id: number): Promise<FriendRow | null> {
        const stmt = this.unit.prepare<FriendRow>(
            `SELECT * FROM Friend
             WHERE (requesterId = @p1 AND addresseeId = @p2)
                OR (requesterId = @p2 AND addresseeId = @p1)`,
            { p1: player1Id, p2: player2Id }
        );
        return (await stmt.get()) ?? null;
    }
}
