import { Component, ChangeDetectorRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, isObservable, Observable } from 'rxjs';

import { PlayerService, CreatePlayerResponse, SuccessMessage } from '@core/services/player.service';
import { LootboxService, CreateLootboxResponse, CreateLootboxDropResponse } from '@core/services/lootbox.service';
import { StoveService, CreateStoveResponse, CountResponse, TotalWeightResponse, CreateStoveTypeResponse, Rarity } from '@core/services/stove.service';
import { OwnershipService } from '@core/services/ownership.service';
import { PriceHistoryService, RecordSaleResponse } from '@core/services/price-history.service';
import { ListingService } from '@core/services/listing.service';
import { TradeService, ExecuteTradeResponse } from '@core/services/trade.service';

interface TestResult {
  timestamp: string;
  endpoint: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

interface ApiCategory {
  name: string;
  icon: string;
  expanded: boolean;
  endpoints: ApiEndpoint[];
}

interface ApiEndpoint {
  name: string;
  method: () => Promise<unknown> | import('rxjs').Observable<unknown>;
  label: string;
  description?: string;
}

@Component({
  selector: 'app-test-page',
  imports: [FormsModule, JsonPipe],
  templateUrl: './test-page.component.html',
  styleUrls: ['./test-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestPageComponent {
  searchQuery = '';
  runningEndpoint: string | null = null;
  results: TestResult[] = [];
  lastResult: TestResult | null = null;
  private cdr = inject(ChangeDetectorRef);
  private playerService = inject(PlayerService);
  private lootboxService = inject(LootboxService);
  private stoveService = inject(StoveService);
  private ownershipService = inject(OwnershipService);
  private priceHistoryService = inject(PriceHistoryService);
  private listingService = inject(ListingService);
  private tradeService = inject(TradeService);

  categories: ApiCategory[] = [
    {
      name: 'Player',
      icon: 'PL',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => this.playerService.getAllPlayers(), label: 'this.playerService.getAllPlayers()', description: 'Fetch all players' },
        { name: 'Get by ID', method: () => this.playerService.getPlayerById(1), label: 'this.playerService.getPlayerById(1)', description: 'Fetch player #1' },
        { name: 'Create', method: () => this.playerService.createPlayer('test_' + Date.now(), 'pass123', 'test@example.com'), label: 'this.playerService.createPlayer()', description: 'Create new test player' },
        { name: 'Update Coins', method: () => this.playerService.updatePlayerCoins(1, 999), label: 'this.playerService.updatePlayerCoins(1, 999)', description: 'Set player coins to 999' },
        { name: 'Update Lootboxes', method: () => this.playerService.updatePlayerLootboxCount(1, 5), label: 'this.playerService.updatePlayerLootboxCount(1, 5)', description: 'Set lootbox count' },
        { name: 'Delete', method: () => this.playerService.deletePlayer(1), label: 'this.playerService.deletePlayer(1)', description: 'Delete player #1' }
      ]
    },
    {
      name: 'Lootbox',
      icon: 'LB',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => this.lootboxService.getAllLootboxes(), label: 'this.lootboxService.getAllLootboxes()', description: 'Fetch all lootboxes' },
        { name: 'Get by ID', method: () => this.lootboxService.getLootboxById(1), label: 'this.lootboxService.getLootboxById(1)', description: 'Fetch lootbox #1' },
        { name: 'Get by Player', method: () => this.lootboxService.getLootboxesByPlayerId(1), label: 'this.lootboxService.getLootboxesByPlayerId(1)', description: 'Fetch player #1 lootboxes' },
        { name: 'Create', method: () => this.lootboxService.createLootbox(1, 1, 'free'), label: 'this.lootboxService.createLootbox(1, 1, free)', description: 'Create free lootbox' },
        { name: 'Delete', method: () => this.lootboxService.deleteLootbox(1), label: 'this.lootboxService.deleteLootbox(1)', description: 'Delete lootbox #1' }
      ]
    },
    {
      name: 'Lootbox Type',
      icon: 'LT',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => this.lootboxService.getAllLootboxTypes(), label: 'this.lootboxService.getAllLootboxTypes()', description: 'Fetch all lootbox types' },
        { name: 'Get Available', method: () => this.lootboxService.getAvailableLootboxTypes(), label: 'this.lootboxService.getAvailableLootboxTypes()', description: 'Fetch available types' },
        { name: 'Get by ID', method: () => this.lootboxService.getLootboxTypeById(1), label: 'this.lootboxService.getLootboxTypeById(1)', description: 'Fetch type #1' }
      ]
    },
    {
      name: 'Lootbox Drop',
      icon: 'LD',
      expanded: false,
      endpoints: [
        { name: 'Get by Lootbox', method: () => this.lootboxService.getDropsByLootboxId(1), label: 'this.lootboxService.getDropsByLootboxId(1)', description: 'Fetch drops for lootbox #1' },
        { name: 'Create', method: () => this.lootboxService.createLootboxDrop(1, 1), label: 'this.lootboxService.createLootboxDrop(1, 1)', description: 'Create drop linking lootbox to stove' }
      ]
    },
    {
      name: 'Stove Type',
      icon: 'ST',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => this.stoveService.getAllStoveTypes(), label: 'this.stoveService.getAllStoveTypes()', description: 'Fetch all stove types' },
        { name: 'Get by ID', method: () => this.stoveService.getStoveTypeById(1), label: 'this.stoveService.getStoveTypeById(1)', description: 'Fetch stove type #1' },
        { name: 'Get by Rarity', method: () => this.stoveService.getStoveTypesByRarity(Rarity.COMMON), label: 'this.stoveService.getStoveTypesByRarity(common)', description: 'Fetch common stoves' },
        { name: 'Create', method: () => this.stoveService.createStoveType('Test_' + Date.now(), '/img.png', Rarity.COMMON, 10), label: 'this.stoveService.createStoveType()', description: 'Create new stove type' },
        { name: 'Update Weight', method: () => this.stoveService.updateStoveTypeWeight(1, 20), label: 'this.stoveService.updateStoveTypeWeight(1, 20)', description: 'Update drop weight' },
        { name: 'Update Image', method: () => this.stoveService.updateStoveTypeImage(1, '/new.png'), label: 'this.stoveService.updateStoveTypeImage(1, /new.png)', description: 'Update image URL' },
        { name: 'Delete', method: () => this.stoveService.deleteStoveType(1), label: 'this.stoveService.deleteStoveType(1)', description: 'Delete stove type #1' },
        { name: 'Total Weight', method: () => this.stoveService.getTotalLootboxWeight(), label: 'this.stoveService.getTotalLootboxWeight()', description: 'Get total drop weight' }
      ]
    },
    {
      name: 'Stove',
      icon: 'SV',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => this.stoveService.getAllStoves(), label: 'this.stoveService.getAllStoves()', description: 'Fetch all stoves' },
        { name: 'Get by ID', method: () => this.stoveService.getStoveById(1), label: 'this.stoveService.getStoveById(1)', description: 'Fetch stove #1' },
        { name: 'Get by Player', method: () => this.stoveService.getStovesByPlayerId(1), label: 'this.stoveService.getStovesByPlayerId(1)', description: 'Fetch player #1 stoves' },
        { name: 'Get by Type', method: () => this.stoveService.getStovesByTypeId(1), label: 'this.stoveService.getStovesByTypeId(1)', description: 'Fetch stoves of type #1' },
        { name: 'Create', method: () => this.stoveService.createStove(1, 1), label: 'this.stoveService.createStove(1, 1)', description: 'Create new stove' },
        { name: 'Transfer', method: () => this.stoveService.transferStoveOwnership(1, 2), label: 'this.stoveService.transferStoveOwnership(1, 2)', description: 'Transfer stove #1 to player #2' },
        { name: 'Delete', method: () => this.stoveService.deleteStove(1), label: 'this.stoveService.deleteStove(1)', description: 'Delete stove #1' },
        { name: 'Count by Player', method: () => this.stoveService.countStovesByPlayer(1), label: 'this.stoveService.countStovesByPlayer(1)', description: 'Count player #1 stoves' },
        { name: 'Count by Type', method: () => this.stoveService.countStovesByType(1), label: 'this.stoveService.countStovesByType(1)', description: 'Count stoves of type #1' }
      ]
    },
    {
      name: 'Ownership',
      icon: 'OW',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => this.ownershipService.getAllOwnerships(), label: 'this.ownershipService.getAllOwnerships()', description: 'Fetch all ownership records' },
        { name: 'Get by ID', method: () => this.ownershipService.getOwnershipById(1), label: 'this.ownershipService.getOwnershipById(1)', description: 'Fetch ownership #1' },
        { name: 'Get by Stove', method: () => this.ownershipService.getOwnershipHistoryByStoveId(1), label: 'this.ownershipService.getOwnershipHistoryByStoveId(1)', description: 'Fetch stove #1 history' },
        { name: 'Get by Player', method: () => this.ownershipService.getOwnershipsByPlayerId(1), label: 'this.ownershipService.getOwnershipsByPlayerId(1)', description: 'Fetch player #1 ownerships' },
        { name: 'Create', method: () => this.ownershipService.createOwnership(1, 1, 'lootbox'), label: 'this.ownershipService.createOwnership(1, 1, lootbox)', description: 'Create ownership record' },
        { name: 'Get Current', method: () => this.ownershipService.getCurrentOwner(1), label: 'this.ownershipService.getCurrentOwner(1)', description: 'Get current owner of stove #1' },
        { name: 'Delete', method: () => this.ownershipService.deleteOwnership(1), label: 'this.ownershipService.deleteOwnership(1)', description: 'Delete ownership #1' },
        { name: 'Count Changes', method: () => this.ownershipService.countOwnershipChanges(1), label: 'this.ownershipService.countOwnershipChanges(1)', description: 'Count ownership changes for stove' },
        { name: 'Count Acquired', method: () => this.ownershipService.countStovesAcquiredByPlayer(1), label: 'this.ownershipService.countStovesAcquiredByPlayer(1)', description: 'Count stoves acquired by player' }
      ]
    },
    {
      name: 'Price History',
      icon: 'PH',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => this.priceHistoryService.getAllPriceHistory(), label: 'this.priceHistoryService.getAllPriceHistory()', description: 'Fetch all price history' },
        { name: 'Get by ID', method: () => this.priceHistoryService.getPriceHistoryById(1), label: 'this.priceHistoryService.getPriceHistoryById(1)', description: 'Fetch price history #1' },
        { name: 'Get by Type', method: () => this.priceHistoryService.getPriceHistoryByTypeId(1), label: 'this.priceHistoryService.getPriceHistoryByTypeId(1)', description: 'Fetch price history for type #1' },
        { name: 'Record Sale', method: () => this.priceHistoryService.recordSale(1, 5000), label: 'this.priceHistoryService.recordSale(1, 5000)', description: 'Record sale of 5000 coins' },
        { name: 'Get Stats', method: () => this.priceHistoryService.getPriceStats(1), label: 'this.priceHistoryService.getPriceStats(1)', description: 'Get price statistics' },
        { name: 'Get Recent', method: () => this.priceHistoryService.getRecentPrices(1, 5), label: 'this.priceHistoryService.getRecentPrices(1, 5)', description: 'Get 5 recent prices' },
        { name: 'Delete', method: () => this.priceHistoryService.deletePriceHistory(1), label: 'this.priceHistoryService.deletePriceHistory(1)', description: 'Delete price history #1' }
      ]
    },
    {
      name: 'Listing',
      icon: 'LS',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => this.listingService.getAllListings(), label: 'this.listingService.getAllListings()', description: 'Fetch all listings' },
        { name: 'Get Active', method: () => this.listingService.getActiveListings(), label: 'this.listingService.getActiveListings()', description: 'Fetch active listings' },
        { name: 'Get by ID', method: () => this.listingService.getListingById(1), label: 'this.listingService.getListingById(1)', description: 'Fetch listing #1' },
        { name: 'Get by Seller', method: () => this.listingService.getListingsBySellerId(1), label: 'this.listingService.getListingsBySellerId(1)', description: 'Fetch listings by seller #1' },
        { name: 'Get Active by Seller', method: () => this.listingService.getActiveListingsBySellerId(1), label: 'this.listingService.getActiveListingsBySellerId(1)', description: 'Fetch active listings by seller' },
        { name: 'Get by Stove', method: () => this.listingService.getActiveListingByStoveId(1), label: 'this.listingService.getActiveListingByStoveId(1)', description: 'Fetch listing for stove #1' },
        { name: 'Create', method: () => this.listingService.createListing(1, 1, 1000), label: 'this.listingService.createListing(1, 1, 1000)', description: 'Create listing for 1000 coins' },
        { name: 'Update Price', method: () => this.listingService.updateListingPrice(1, 2000), label: 'this.listingService.updateListingPrice(1, 2000)', description: 'Update price to 2000' },
        { name: 'Cancel', method: () => this.listingService.cancelListing(1), label: 'this.listingService.cancelListing(1)', description: 'Cancel listing #1' },
        { name: 'Delete', method: () => this.listingService.deleteListing(1), label: 'this.listingService.deleteListing(1)', description: 'Delete listing #1' },
        { name: 'Count', method: () => this.listingService.countActiveListingsBySeller(1), label: 'this.listingService.countActiveListingsBySeller(1)', description: 'Count active listings' }
      ]
    },
    {
      name: 'Trade',
      icon: 'TR',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => this.tradeService.getAllTrades(), label: 'this.tradeService.getAllTrades()', description: 'Fetch all trades' },
        { name: 'Get by ID', method: () => this.tradeService.getTradeById(1), label: 'this.tradeService.getTradeById(1)', description: 'Fetch trade #1' },
        { name: 'Get by Listing', method: () => this.tradeService.getTradeByListingId(1), label: 'this.tradeService.getTradeByListingId(1)', description: 'Fetch trade for listing #1' },
        { name: 'Get by Buyer', method: () => this.tradeService.getTradesByBuyerId(1), label: 'this.tradeService.getTradesByBuyerId(1)', description: 'Fetch trades by buyer #1' },
        { name: 'Execute', method: () => this.tradeService.executeTrade(1, 2), label: 'this.tradeService.executeTrade(1, 2)', description: 'Execute trade (listing #1, buyer #2)' },
        { name: 'Get Recent', method: () => this.tradeService.getRecentTrades(5), label: 'this.tradeService.getRecentTrades(5)', description: 'Get 5 recent trades' },
        { name: 'Delete', method: () => this.tradeService.deleteTrade(1), label: 'this.tradeService.deleteTrade(1)', description: 'Delete trade #1' },
        { name: 'Count All', method: () => this.tradeService.countTrades(), label: 'this.tradeService.countTrades()', description: 'Count all trades' },
        { name: 'Count by Buyer', method: () => this.tradeService.countTradesByBuyer(1), label: 'this.tradeService.countTradesByBuyer(1)', description: 'Count trades by buyer' }
      ]
    }
  ];

  get filteredCategories(): ApiCategory[] {
    if (!this.searchQuery.trim()) {
      return this.categories;
    }
    const query = this.searchQuery.toLowerCase();
    return this.categories.map(cat => ({
      ...cat,
      endpoints: cat.endpoints.filter(ep =>
        ep.name.toLowerCase().includes(query) ||
        ep.label.toLowerCase().includes(query) ||
        ep.description?.toLowerCase().includes(query)
      )
    })).filter(cat => cat.endpoints.length > 0);
  }

  toggleCategory(category: ApiCategory): void {
    category.expanded = !category.expanded;
  }

  async runTest(endpoint: ApiEndpoint): Promise<void> {
    if (this.runningEndpoint) return;

    this.runningEndpoint = endpoint.label;
    const startTime = performance.now();

    try {
      const raw = endpoint.method();
      const result = isObservable(raw) ? await firstValueFrom(raw) : await raw;
      const duration = Math.round(performance.now() - startTime);

      const testResult: TestResult = {
        timestamp: new Date().toLocaleTimeString(),
        endpoint: endpoint.label,
        success: true,
        data: result,
        duration
      };

      this.results.unshift(testResult);
      this.lastResult = testResult;

    } catch (err) {
      const duration = Math.round(performance.now() - startTime);

      const testResult: TestResult = {
        timestamp: new Date().toLocaleTimeString(),
        endpoint: endpoint.label,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration
      };

      this.results.unshift(testResult);
      this.lastResult = testResult;

    } finally {
      this.runningEndpoint = null;
      this.cdr.detectChanges();
    }
  }

  clearResults(): void {
    this.results = [];
    this.lastResult = null;
  }

  removeResult(index: number): void {
    this.results.splice(index, 1);
    if (this.results.length === 0) {
      this.lastResult = null;
    }
  }

  async copyLastResult(): Promise<void> {
    if (this.lastResult) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(this.lastResult, null, 2));
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  }
}
