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
     * @param title - Ticket title.
     * @param description - Ticket description.
     * @param type - Ticket type (bug, feature, support).
     * @param priority - Ticket priority (high, medium, low).
     * @returns Tuple [success, ticketId].
     */
    async create(
        reporterId: number,
        title: string,
        description: string,
        type: string,
        priority: string
    ): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<SupportTicketRow>(
            `INSERT INTO SupportTicket (reporterId, title, description, type, priority, createdAt)
             VALUES (@reporterId, @title, @description, @type, @priority, NOW())`,
            { reporterId, title, description, type, priority }
        );
        return await this.executeStmt(stmt);
    }
}
