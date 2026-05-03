import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { ChatMessageRow } from "../../shared/model";

export class ChatMessageService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all chat messages.
     * @returns Array of all ChatMessageRow objects.
     */
    async getAll(): Promise<ChatMessageRow[]> {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage ORDER BY sentAt DESC"
        );
        return await stmt.all();
    }

    /**
     * Retrieves a message by ID.
     * @param id - The message ID.
     * @returns ChatMessageRow or null if not found.
     */
    async getById(id: number): Promise<ChatMessageRow | null> {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE messageId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves messages sent by a player.
     * @param senderId - The sender's player ID.
     * @returns Array of ChatMessageRow objects.
     */
    async getBySender(senderId: number): Promise<ChatMessageRow[]> {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE senderId = @senderId ORDER BY sentAt DESC",
            { senderId }
        );
        return await stmt.all();
    }

    /**
     * Retrieves messages received by a player.
     * @param receiverId - The receiver's player ID.
     * @returns Array of ChatMessageRow objects.
     */
    async getByReceiver(receiverId: number): Promise<ChatMessageRow[]> {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE receiverId = @receiverId ORDER BY sentAt DESC",
            { receiverId }
        );
        return await stmt.all();
    }

    /**
     * Retrieves conversation between two players.
     * @param player1Id - First player ID.
     * @param player2Id - Second player ID.
     * @returns Array of ChatMessageRow objects.
     */
    async getConversation(player1Id: number, player2Id: number): Promise<ChatMessageRow[]> {
        const stmt = this.unit.prepare<ChatMessageRow>(
            `SELECT * FROM ChatMessage 
             WHERE (senderId = @player1Id AND receiverId = @player2Id) 
                OR (senderId = @player2Id AND receiverId = @player1Id)
             ORDER BY sentAt ASC`,
            { player1Id, player2Id }
        );
        return await stmt.all();
    }

    /**
     * Retrieves global messages (receiverId is null).
     * @returns Array of ChatMessageRow objects.
     */
    async getGlobalMessages(): Promise<ChatMessageRow[]> {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE receiverId IS NULL ORDER BY sentAt DESC"
        );
        return await stmt.all();
    }

    /**
     * Retrieves unread messages for a player.
     * @param receiverId - The receiver's player ID.
     * @returns Array of ChatMessageRow objects.
     */
    async getUnreadByReceiver(receiverId: number): Promise<ChatMessageRow[]> {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE receiverId = @receiverId AND isRead = 0 ORDER BY sentAt DESC",
            { receiverId }
        );
        return await stmt.all();
    }

    /**
     * Creates a new chat message.
     * @param senderId - The sender's player ID.
     * @param receiverId - The receiver's player ID (null for global).
     * @param content - The message content.
     * @returns Tuple [success, id].
     */
    async create(senderId: number, receiverId: number | null, content: string): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<ChatMessageRow>(
            `INSERT INTO ChatMessage (senderId, receiverId, content, sentAt, isRead) 
             VALUES (@senderId, @receiverId, @content, NOW(), 0)`,
            { senderId, receiverId, content }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Marks a message as read.
     * @param id - Message ID.
     * @returns True if updated.
     */
    async markAsRead(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE ChatMessage SET isRead = 1 WHERE messageId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Marks all messages from a sender to a receiver as read.
     * @param senderId - Sender ID.
     * @param receiverId - Receiver ID.
     * @returns Number of messages updated.
     */
    async markConversationAsRead(senderId: number, receiverId: number): Promise<number> {
        const stmt = this.unit.prepare(
            "UPDATE ChatMessage SET isRead = 1 WHERE senderId = @senderId AND receiverId = @receiverId AND isRead = 0",
            { senderId, receiverId }
        );
        const result = await stmt.run();
        return result.changes;
    }

    /**
     * Deletes a message.
     * @param id - Message ID.
     * @returns True if deleted.
     */
    async delete(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM ChatMessage WHERE messageId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts total messages.
     * @returns Count.
     */
    async count(): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM ChatMessage"
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts unread messages for a player.
     * @param receiverId - The receiver's player ID.
     * @returns Count.
     */
    async countUnread(receiverId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM ChatMessage WHERE receiverId = @receiverId AND isRead = 0",
            { receiverId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }
}
