import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { SupportTicketRow } from "../../shared/model";

export class SupportService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Creates a new support ticket.
     * @param reporterId - The player's ID.
     * @param ipAddress - The client's IP address.
     * @param title - Ticket title.
     * @param description - Ticket description.
     * @param type - Ticket type (bug, feature, support).
     * @param priority - Ticket priority (high, medium, low).
     * @returns Tuple [success, ticketId].
     */
    async create(
        reporterId: number,
        ipAddress: string,
        title: string,
        description: string,
        type: string,
        priority: string
    ): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<SupportTicketRow>(
            `INSERT INTO SupportTicket (reporterId, ipAddress, title, description, type, priority, status, createdAt)
             VALUES (@reporterId, @ipAddress, @title, @description, @type, @priority, 'open', NOW())`,
            { reporterId, ipAddress, title, description, type, priority }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Count how many open tickets a player has.
     */
    async countOpenTickets(playerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM SupportTicket WHERE reporterId = @playerId AND status = 'open'`,
            { playerId }
        );
        const row = await stmt.get();
        return row?.count ?? 0;
    }

    /**
     * Count how many tickets a player created in the last N hours.
     */
    async countTicketsInLastHours(playerId: number, hours: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM SupportTicket
             WHERE reporterId = @playerId AND createdAt >= NOW() - INTERVAL '${hours} hours'`,
            { playerId }
        );
        const row = await stmt.get();
        return row?.count ?? 0;
    }
}
