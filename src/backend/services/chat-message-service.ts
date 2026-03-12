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
    getAll(): ChatMessageRow[] {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage ORDER BY sentAt DESC"
        );
        return stmt.all();
    }

    /**
     * Retrieves a message by ID.
     * @param id - The message ID.
     * @returns ChatMessageRow or null if not found.
     */
    getById(id: number): ChatMessageRow | null {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE messageId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves messages sent by a player.
     * @param senderId - The sender's player ID.
     * @returns Array of ChatMessageRow objects.
     */
    getBySender(senderId: number): ChatMessageRow[] {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE senderId = @senderId ORDER BY sentAt DESC",
            { senderId }
        );
        return stmt.all();
    }

    /**
     * Retrieves messages received by a player.
     * @param receiverId - The receiver's player ID.
     * @returns Array of ChatMessageRow objects.
     */
    getByReceiver(receiverId: number): ChatMessageRow[] {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE receiverId = @receiverId ORDER BY sentAt DESC",
            { receiverId }
        );
        return stmt.all();
    }

    /**
     * Retrieves conversation between two players.
     * @param player1Id - First player ID.
     * @param player2Id - Second player ID.
     * @returns Array of ChatMessageRow objects.
     */
    getConversation(player1Id: number, player2Id: number): ChatMessageRow[] {
        const stmt = this.unit.prepare<ChatMessageRow>(
            `SELECT * FROM ChatMessage 
             WHERE (senderId = @player1Id AND receiverId = @player2Id) 
                OR (senderId = @player2Id AND receiverId = @player1Id)
             ORDER BY sentAt ASC`,
            { player1Id, player2Id }
        );
        return stmt.all();
    }

    /**
     * Retrieves global messages (receiverId is null).
     * @returns Array of ChatMessageRow objects.
     */
    getGlobalMessages(): ChatMessageRow[] {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE receiverId IS NULL ORDER BY sentAt DESC"
        );
        return stmt.all();
    }

    /**
     * Retrieves unread messages for a player.
     * @param receiverId - The receiver's player ID.
     * @returns Array of ChatMessageRow objects.
     */
    getUnreadByReceiver(receiverId: number): ChatMessageRow[] {
        const stmt = this.unit.prepare<ChatMessageRow>(
            "SELECT * FROM ChatMessage WHERE receiverId = @receiverId AND isRead = 0 ORDER BY sentAt DESC",
            { receiverId }
        );
        return stmt.all();
    }

    /**
     * Creates a new chat message.
     * @param senderId - The sender's player ID.
     * @param receiverId - The receiver's player ID (null for global).
     * @param content - The message content.
     * @returns Tuple [success, id].
     */
    create(senderId: number, receiverId: number | null, content: string): [boolean, number] {
        const stmt = this.unit.prepare<ChatMessageRow>(
            `INSERT INTO ChatMessage (senderId, receiverId, content, sentAt, isRead) 
             VALUES (@senderId, @receiverId, @content, datetime('now'), 0)`,
            { senderId, receiverId, content }
        );
        return this.executeStmt(stmt);
    }

    /**
     * Marks a message as read.
     * @param id - Message ID.
     * @returns True if updated.
     */
    markAsRead(id: number): boolean {
        const stmt = this.unit.prepare(
            "UPDATE ChatMessage SET isRead = 1 WHERE messageId = @id",
            { id }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Marks all messages from a sender to a receiver as read.
     * @param senderId - Sender ID.
     * @param receiverId - Receiver ID.
     * @returns Number of messages updated.
     */
    markConversationAsRead(senderId: number, receiverId: number): number {
        const stmt = this.unit.prepare(
            "UPDATE ChatMessage SET isRead = 1 WHERE senderId = @senderId AND receiverId = @receiverId AND isRead = 0",
            { senderId, receiverId }
        );
        const result = stmt.run();
        return result.changes;
    }

    /**
     * Deletes a message.
     * @param id - Message ID.
     * @returns True if deleted.
     */
    delete(id: number): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM ChatMessage WHERE messageId = @id",
            { id }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts total messages.
     * @returns Count.
     */
    count(): number {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM ChatMessage"
        );
        const result = stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts unread messages for a player.
     * @param receiverId - The receiver's player ID.
     * @returns Count.
     */
    countUnread(receiverId: number): number {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM ChatMessage WHERE receiverId = @receiverId AND isRead = 0",
            { receiverId }
        );
        const result = stmt.get();
        return result?.count ?? 0;
    }
}
