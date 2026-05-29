import { Unit } from "../utils/unit";
import { PlayerService } from "./player-service";
import { CoinTransactionService } from "./coin-transaction-service";
import { ChatMessageService } from "./chat-message-service";

export interface TradeOfferResult {
    success: boolean;
    error?: string;
    senderId?: number;
}

export class TradeOfferService {
    constructor(private unit: Unit) {}

    async acceptTradeOffer(messageId: number, accepterId: number): Promise<TradeOfferResult> {
        const chatService = new ChatMessageService(this.unit);
        const playerService = new PlayerService(this.unit);
        const coinService = new CoinTransactionService(this.unit);

        const message = await chatService.getById(messageId);
        if (!message) {
            return { success: false, error: "Trade offer not found" };
        }

        if (message.messageType !== 'trade_offer') {
            return { success: false, error: "Not a trade offer" };
        }

        if (message.receiverId !== accepterId) {
            return { success: false, error: "You are not the recipient of this offer" };
        }

        const data = message.data;
        const itemType = data["itemType"] as 'stove' | 'lootbox' | undefined;
        const itemId = data["itemId"] as number | undefined;
        const price = data["price"] as number | undefined;
        const status = data["status"] as string | undefined;

        if (!itemType || typeof itemId !== 'number' || typeof price !== 'number') {
            return { success: false, error: "Invalid trade offer data" };
        }

        if (status !== 'pending') {
            return { success: false, error: "Trade offer has already been responded to" };
        }

        const senderId = message.senderId;

        // Verify sender still owns the item
        if (itemType === 'stove') {
            const ownershipStmt = this.unit.prepare<{ currentOwnerId: number }>(
                `SELECT currentOwnerId FROM Stove WHERE stoveId = @itemId`,
                { itemId }
            );
            const row = await ownershipStmt.get();
            if (!row || row.currentOwnerId !== senderId) {
                return { success: false, error: "Sender no longer owns this item" };
            }
        } else if (itemType === 'lootbox') {
            const ownershipStmt = this.unit.prepare<{ playerId: number }>(
                `SELECT playerId FROM Lootbox WHERE lootboxId = @itemId`,
                { itemId }
            );
            const row = await ownershipStmt.get();
            if (!row || row.playerId !== senderId) {
                return { success: false, error: "Sender no longer owns this item" };
            }
        } else {
            return { success: false, error: "Unsupported item type" };
        }

        // Verify accepter has enough coins
        const accepter = await playerService.getInfoByID(accepterId);
        if (!accepter) {
            return { success: false, error: "Player not found" };
        }
        if (accepter.coins < price) {
            return { success: false, error: "Insufficient coins" };
        }

        // Verify sender exists
        const sender = await playerService.getInfoByID(senderId);
        if (!sender) {
            return { success: false, error: "Sender not found" };
        }

        // Atomic transfer
        // 1. Deduct coins from accepter
        await playerService.updatePlayerCoins(accepterId, accepter.coins - price);

        // 2. Add coins to sender
        await playerService.updatePlayerCoins(senderId, sender.coins + price);

        // 3. Transfer ownership
        if (itemType === 'stove') {
            await this.unit.prepare(
                `UPDATE Stove SET currentOwnerId = @accepterId WHERE stoveId = @itemId`,
                { accepterId, itemId }
            ).run();

            await this.unit.prepare(
                `INSERT INTO Ownership (stoveId, playerId, acquiredAt, acquiredHow)
                 VALUES (@itemId, @accepterId, @acquiredAt, 'trade')`,
                { itemId, accepterId, acquiredAt: new Date().toISOString() }
            ).run();
        } else if (itemType === 'lootbox') {
            await this.unit.prepare(
                `UPDATE Lootbox SET playerId = @accepterId WHERE lootboxId = @itemId`,
                { accepterId, itemId }
            ).run();
        }

        // 4. Log coin transactions
        await coinService.create(
            accepterId,
            -price,
            'trade_out',
            `Bought ${itemType} from ${sender.username} via trade offer`
        );
        await coinService.create(
            senderId,
            price,
            'trade_in',
            `Sold ${itemType} to ${accepter.username} via trade offer`
        );

        // 5. Update message status
        await this.unit.prepare(
            `UPDATE ChatMessage SET data = jsonb_set(data, '{status}', '"accepted"') WHERE messageId = @messageId`,
            { messageId }
        ).run();

        return { success: true, senderId };
    }

    async declineTradeOffer(messageId: number, declinerId: number): Promise<TradeOfferResult> {
        const chatService = new ChatMessageService(this.unit);

        const message = await chatService.getById(messageId);
        if (!message) {
            return { success: false, error: "Trade offer not found" };
        }

        if (message.messageType !== 'trade_offer') {
            return { success: false, error: "Not a trade offer" };
        }

        if (message.receiverId !== declinerId) {
            return { success: false, error: "You are not the recipient of this offer" };
        }

        const status = message.data["status"] as string | undefined;
        if (status !== 'pending') {
            return { success: false, error: "Trade offer has already been responded to" };
        }

        await this.unit.prepare(
            `UPDATE ChatMessage SET data = jsonb_set(data, '{status}', '"declined"') WHERE messageId = @messageId`,
            { messageId }
        ).run();

        return { success: true, senderId: message.senderId };
    }
}
