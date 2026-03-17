import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Player fetcher
import {
  getAllPlayers, getPlayerById, createPlayer, updatePlayerCoins,
  updatePlayerLootboxCount, deletePlayer, Player
} from '../../fetchers/player.fetcher';

// Lootbox fetcher
import {
  getAllLootboxes, getLootboxById, getLootboxesByPlayerId, createLootbox,
  deleteLootbox, getAllLootboxTypes, getAvailableLootboxTypes, getLootboxTypeById,
  getDropsByLootboxId, createLootboxDrop, Lootbox
} from '../../fetchers/lootbox.fetcher';

// Stove Type fetcher
import {
  getAllStoveTypes, getStoveTypeById, getStoveTypesByRarity, createStoveType,
  updateStoveTypeWeight, updateStoveTypeImage, deleteStoveType, getTotalLootboxWeight,
  Rarity
} from '../../fetchers/stove-type.fetcher';

// Stove fetcher
import {
  getAllStoves, getStoveById, getStovesByPlayerId, getStovesByTypeId, createStove,
  transferStoveOwnership, deleteStove, countStovesByPlayer, countStovesByType, Stove
} from '../../fetchers/stove.fetcher';

// Ownership fetcher
import {
  getAllOwnerships, getOwnershipById, getOwnershipHistoryByStoveId, getOwnershipsByPlayerId,
  createOwnership, getCurrentOwner, deleteOwnership, countOwnershipChanges,
  countStovesAcquiredByPlayer, Ownership
} from '../../fetchers/ownership.fetcher';

// Price History fetcher
import {
  getAllPriceHistory, getPriceHistoryById, getPriceHistoryByTypeId, recordSale,
  getPriceStats, getRecentPrices, deletePriceHistory
} from '../../fetchers/price-history.fetcher';

// Listing fetcher
import {
  getAllListings, getActiveListings, getListingById, getListingsBySellerId,
  getActiveListingsBySellerId, getActiveListingByStoveId, createListing,
  updateListingPrice, cancelListing, deleteListing, countActiveListingsBySeller, Listing
} from '../../fetchers/listing.fetcher';

// Trade fetcher
import {
  getAllTrades, getTradeById, getTradeByListingId, getTradesByBuyerId, executeTrade,
  getRecentTrades, deleteTrade, countTrades, countTradesByBuyer, Trade
} from '../../fetchers/trade.fetcher';

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
  method: () => Promise<unknown>;
  label: string;
  description?: string;
}

@Component({
  selector: 'app-test-page',
  standalone: true,
  imports: [FormsModule, JsonPipe],
  template: `
    <div class="test-page">
      <header class="page-header">
        <div class="header-content">
          <h1>API Test Console</h1>
          <p class="subtitle">Test all backend endpoints with live feedback</p>
        </div>
      </header>

      <div class="main-layout">
        <aside class="sidebar">
          <div class="search-box">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search endpoints..."
              class="search-input">
          </div>

          <div class="category-list">
            @for (category of filteredCategories; track category.name) {
              <div class="category-item" [class.expanded]="category.expanded">
                <button class="category-header" (click)="toggleCategory(category)">
                  <span class="category-icon">{{ category.icon }}</span>
                  <span class="category-name">{{ category.name }}</span>
                  <span class="toggle-icon">
                    @if (!category.expanded) {
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    }
                    @if (category.expanded) {
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    }
                  </span>
                </button>

                @if (category.expanded) {
                  <div class="endpoint-list">
                    @for (endpoint of category.endpoints; track endpoint.label) {
                      <button
                        class="endpoint-btn"
                        [class.running]="runningEndpoint === endpoint.label"
                        (click)="runTest(endpoint)"
                        [title]="endpoint.description">
                        <span class="btn-text">{{ endpoint.name }}</span>
                        @if (runningEndpoint === endpoint.label) {
                          <span class="spinner">
                            <svg width="14" height="14" viewBox="0 0 14 14">
                              <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="20" stroke-dashoffset="10">
                                <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="1s" repeatCount="indefinite"/>
                              </circle>
                            </svg>
                          </span>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </aside>

        <main class="results-panel">
          <div class="panel-header">
            <h2>Response</h2>
            <div class="actions">
              <button class="action-btn secondary" (click)="clearResults()" [disabled]="results.length === 0">
                Clear All
              </button>
              <button class="action-btn primary" (click)="copyLastResult()" [disabled]="!lastResult">
                Copy Last
              </button>
            </div>
          </div>

          @if (results.length > 0) {
            <div class="results-list">
              @for (result of results; track result.timestamp + result.endpoint; let i = $index) {
                <div class="result-card" [class.success]="result.success" [class.error]="!result.success">
                  <div class="result-header">
                    <span class="badge" [class.success]="result.success" [class.error]="!result.success">
                      @if (result.success) {
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      }
                      @if (!result.success) {
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                      }
                    </span>
                    <span class="endpoint-name">{{ result.endpoint }}</span>
                    <span class="timestamp">{{ result.timestamp }}</span>
                    <span class="duration" [class.fast]="result.duration < 100" [class.slow]="result.duration > 500">
                      {{ result.duration }}ms
                    </span>
                    <button class="delete-btn" (click)="removeResult(i)" title="Remove">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>
                  <div class="result-body">
                    @if (result.success) {
                      <pre>{{ result.data | json }}</pre>
                    }
                    @if (!result.success) {
                      <pre class="error-text">{{ result.error }}</pre>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (results.length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" stroke-width="2"/>
                  <path d="M8 24L32 38L56 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <p>Click any endpoint button to see results here</p>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .test-page {
      min-height: 100vh;
      background: #e8e4dc;
      color: #333;
      font-family: "Segoe UI", Roboto, Arial, sans-serif;
    }

    .page-header {
      background: #e85d04;
      padding: 32px 32px;
      box-shadow: 0 10px 30px rgba(232, 93, 4, 0.2);
    }

    .header-content {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header h1 {
      margin: 0 0 4px 0;
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .subtitle {
      margin: 0;
      color: rgba(255,255,255,0.9);
      font-size: 14px;
    }

    .main-layout {
      display: flex;
      height: calc(100vh - 110px);
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      gap: 24px;
    }

    .sidebar {
      width: 300px;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
    }

    .search-box {
      margin-bottom: 16px;
    }

    .search-input {
      width: 100%;
      padding: 12px 16px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 14px;
      color: #333;
      transition: all 0.2s;
      box-sizing: border-box;
    }

    .search-input::placeholder {
      color: #999;
    }

    .search-input:focus {
      outline: none;
      border-color: #e85d04;
      box-shadow: 0 0 0 3px rgba(232, 93, 4, 0.1);
    }

    .category-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .category-item {
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      background: #fff;
      transition: all 0.2s;
    }

    .category-item:hover {
      border-color: #e0e0e0;
    }

    .category-item.expanded {
      border-color: #e85d04;
      box-shadow: 0 2px 8px rgba(232, 93, 4, 0.08);
    }

    .category-header {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: #475569;
      transition: all 0.2s;
    }

    .category-header:hover {
      color: #e85d04;
    }

    .category-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f5f9;
      border-radius: 10px;
      font-size: 11px;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .category-item.expanded .category-icon {
      background: #e85d04;
      color: #fff;
    }

    .category-name {
      flex: 1;
      text-align: left;
    }

    .toggle-icon {
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .endpoint-list {
      padding: 8px;
      background: #fafafa;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-top: 1px solid #f0f0f0;
    }

    .endpoint-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #fff;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      color: #64748b;
      transition: all 0.15s;
      text-align: left;
    }

    .endpoint-btn:hover {
      background: #fff;
      border-color: #e85d04;
      color: #e85d04;
      box-shadow: 0 2px 6px rgba(232, 93, 4, 0.1);
    }

    .endpoint-btn.running {
      background: #fff8f5;
      border-color: #e85d04;
      color: #e85d04;
    }

    .btn-text {
      flex: 1;
    }

    .spinner {
      display: flex;
      align-items: center;
      color: #e85d04;
    }

    .results-panel {
      flex: 1;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      padding: 28px;
      overflow-y: auto;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f0f0f0;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .action-btn.secondary {
      background: transparent;
      border-color: #e0e0e0;
      color: #666;
    }

    .action-btn.secondary:hover:not(:disabled) {
      background: #f8f9fc;
      border-color: #ccc;
      color: #333;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #e85d04 0%, #f48c06 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(232, 93, 4, 0.2);
    }

    .action-btn.primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(232, 93, 4, 0.4);
    }

    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .result-card {
      background: #fff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      transition: all 0.2s;
    }

    .result-card:hover {
      border-color: #e0e0e0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }

    .result-card.success {
      border-left: 3px solid #27ae60;
    }

    .result-card.error {
      border-left: 3px solid #e74c3c;
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
    }

    .badge {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      flex-shrink: 0;
    }

    .badge.success {
      background: #d4edda;
      color: #155724;
    }

    .badge.error {
      background: #f8d7da;
      color: #721c24;
    }

    .endpoint-name {
      flex: 1;
      font-weight: 500;
      color: #333;
      font-size: 13px;
      font-family: 'SF Mono', Monaco, monospace;
    }

    .timestamp {
      font-size: 12px;
      color: #999;
      font-family: 'SF Mono', Monaco, monospace;
    }

    .duration {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, monospace;
      background: #f0f0f0;
      color: #666;
    }

    .duration.fast {
      background: #d4edda;
      color: #155724;
    }

    .duration.slow {
      background: #fff3cd;
      color: #856404;
    }

    .delete-btn {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #ccc;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .delete-btn:hover {
      background: #fee;
      color: #e74c3c;
    }

    .result-body {
      padding: 16px;
    }

    .result-body pre {
      margin: 0;
      padding: 16px;
      background: #f1f5f9;
      border-radius: 12px;
      font-size: 13px;
      overflow-x: auto;
      max-height: 500px;
      overflow-y: auto;
      color: #334155;
      font-family: 'SF Mono', Monaco, monospace;
      line-height: 1.6;
      border: 1px solid #e2e8f0;
    }

    .error-text {
      color: #e74c3c !important;
      background: #fdf2f2 !important;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: #64748b;
      text-align: center;
    }

    .empty-icon {
      width: 100px;
      height: 100px;
      border-radius: 24px;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 24px;
      color: #e85d04;
      box-shadow: 0 8px 24px rgba(0,0,0,0.05);
    }

    .empty-state p {
      font-size: 16px;
      font-weight: 600;
      color: #475569;
      margin: 0;
    }
  `]
})
export class TestPageComponent {
  searchQuery = '';
  runningEndpoint: string | null = null;
  results: TestResult[] = [];
  lastResult: TestResult | null = null;
  private cdr = inject(ChangeDetectorRef);

  categories: ApiCategory[] = [
    {
      name: 'Player',
      icon: 'PL',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => getAllPlayers(), label: 'getAllPlayers()', description: 'Fetch all players' },
        { name: 'Get by ID', method: () => getPlayerById(1), label: 'getPlayerById(1)', description: 'Fetch player #1' },
        { name: 'Create', method: () => createPlayer('test_' + Date.now(), 'pass123', 'test@example.com'), label: 'createPlayer()', description: 'Create new test player' },
        { name: 'Update Coins', method: () => updatePlayerCoins(1, 999), label: 'updatePlayerCoins(1, 999)', description: 'Set player coins to 999' },
        { name: 'Update Lootboxes', method: () => updatePlayerLootboxCount(1, 5), label: 'updatePlayerLootboxCount(1, 5)', description: 'Set lootbox count' },
        { name: 'Delete', method: () => deletePlayer(1), label: 'deletePlayer(1)', description: 'Delete player #1' }
      ]
    },
    {
      name: 'Lootbox',
      icon: 'LB',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => getAllLootboxes(), label: 'getAllLootboxes()', description: 'Fetch all lootboxes' },
        { name: 'Get by ID', method: () => getLootboxById(1), label: 'getLootboxById(1)', description: 'Fetch lootbox #1' },
        { name: 'Get by Player', method: () => getLootboxesByPlayerId(1), label: 'getLootboxesByPlayerId(1)', description: 'Fetch player #1 lootboxes' },
        { name: 'Create', method: () => createLootbox(1, 1, 'free'), label: 'createLootbox(1, 1, free)', description: 'Create free lootbox' },
        { name: 'Delete', method: () => deleteLootbox(1), label: 'deleteLootbox(1)', description: 'Delete lootbox #1' }
      ]
    },
    {
      name: 'Lootbox Type',
      icon: 'LT',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => getAllLootboxTypes(), label: 'getAllLootboxTypes()', description: 'Fetch all lootbox types' },
        { name: 'Get Available', method: () => getAvailableLootboxTypes(), label: 'getAvailableLootboxTypes()', description: 'Fetch available types' },
        { name: 'Get by ID', method: () => getLootboxTypeById(1), label: 'getLootboxTypeById(1)', description: 'Fetch type #1' }
      ]
    },
    {
      name: 'Lootbox Drop',
      icon: 'LD',
      expanded: false,
      endpoints: [
        { name: 'Get by Lootbox', method: () => getDropsByLootboxId(1), label: 'getDropsByLootboxId(1)', description: 'Fetch drops for lootbox #1' },
        { name: 'Create', method: () => createLootboxDrop(1, 1), label: 'createLootboxDrop(1, 1)', description: 'Create drop linking lootbox to stove' }
      ]
    },
    {
      name: 'Stove Type',
      icon: 'ST',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => getAllStoveTypes(), label: 'getAllStoveTypes()', description: 'Fetch all stove types' },
        { name: 'Get by ID', method: () => getStoveTypeById(1), label: 'getStoveTypeById(1)', description: 'Fetch stove type #1' },
        { name: 'Get by Rarity', method: () => getStoveTypesByRarity(Rarity.COMMON), label: 'getStoveTypesByRarity(common)', description: 'Fetch common stoves' },
        { name: 'Create', method: () => createStoveType('Test_' + Date.now(), '/img.png', Rarity.COMMON, 10), label: 'createStoveType()', description: 'Create new stove type' },
        { name: 'Update Weight', method: () => updateStoveTypeWeight(1, 20), label: 'updateStoveTypeWeight(1, 20)', description: 'Update drop weight' },
        { name: 'Update Image', method: () => updateStoveTypeImage(1, '/new.png'), label: 'updateStoveTypeImage(1, /new.png)', description: 'Update image URL' },
        { name: 'Delete', method: () => deleteStoveType(1), label: 'deleteStoveType(1)', description: 'Delete stove type #1' },
        { name: 'Total Weight', method: () => getTotalLootboxWeight(), label: 'getTotalLootboxWeight()', description: 'Get total drop weight' }
      ]
    },
    {
      name: 'Stove',
      icon: 'SV',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => getAllStoves(), label: 'getAllStoves()', description: 'Fetch all stoves' },
        { name: 'Get by ID', method: () => getStoveById(1), label: 'getStoveById(1)', description: 'Fetch stove #1' },
        { name: 'Get by Player', method: () => getStovesByPlayerId(1), label: 'getStovesByPlayerId(1)', description: 'Fetch player #1 stoves' },
        { name: 'Get by Type', method: () => getStovesByTypeId(1), label: 'getStovesByTypeId(1)', description: 'Fetch stoves of type #1' },
        { name: 'Create', method: () => createStove(1, 1), label: 'createStove(1, 1)', description: 'Create new stove' },
        { name: 'Transfer', method: () => transferStoveOwnership(1, 2), label: 'transferStoveOwnership(1, 2)', description: 'Transfer stove #1 to player #2' },
        { name: 'Delete', method: () => deleteStove(1), label: 'deleteStove(1)', description: 'Delete stove #1' },
        { name: 'Count by Player', method: () => countStovesByPlayer(1), label: 'countStovesByPlayer(1)', description: 'Count player #1 stoves' },
        { name: 'Count by Type', method: () => countStovesByType(1), label: 'countStovesByType(1)', description: 'Count stoves of type #1' }
      ]
    },
    {
      name: 'Ownership',
      icon: 'OW',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => getAllOwnerships(), label: 'getAllOwnerships()', description: 'Fetch all ownership records' },
        { name: 'Get by ID', method: () => getOwnershipById(1), label: 'getOwnershipById(1)', description: 'Fetch ownership #1' },
        { name: 'Get by Stove', method: () => getOwnershipHistoryByStoveId(1), label: 'getOwnershipHistoryByStoveId(1)', description: 'Fetch stove #1 history' },
        { name: 'Get by Player', method: () => getOwnershipsByPlayerId(1), label: 'getOwnershipsByPlayerId(1)', description: 'Fetch player #1 ownerships' },
        { name: 'Create', method: () => createOwnership(1, 1, 'lootbox'), label: 'createOwnership(1, 1, lootbox)', description: 'Create ownership record' },
        { name: 'Get Current', method: () => getCurrentOwner(1), label: 'getCurrentOwner(1)', description: 'Get current owner of stove #1' },
        { name: 'Delete', method: () => deleteOwnership(1), label: 'deleteOwnership(1)', description: 'Delete ownership #1' },
        { name: 'Count Changes', method: () => countOwnershipChanges(1), label: 'countOwnershipChanges(1)', description: 'Count ownership changes for stove' },
        { name: 'Count Acquired', method: () => countStovesAcquiredByPlayer(1), label: 'countStovesAcquiredByPlayer(1)', description: 'Count stoves acquired by player' }
      ]
    },
    {
      name: 'Price History',
      icon: 'PH',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => getAllPriceHistory(), label: 'getAllPriceHistory()', description: 'Fetch all price history' },
        { name: 'Get by ID', method: () => getPriceHistoryById(1), label: 'getPriceHistoryById(1)', description: 'Fetch price history #1' },
        { name: 'Get by Type', method: () => getPriceHistoryByTypeId(1), label: 'getPriceHistoryByTypeId(1)', description: 'Fetch price history for type #1' },
        { name: 'Record Sale', method: () => recordSale(1, 5000), label: 'recordSale(1, 5000)', description: 'Record sale of 5000 coins' },
        { name: 'Get Stats', method: () => getPriceStats(1), label: 'getPriceStats(1)', description: 'Get price statistics' },
        { name: 'Get Recent', method: () => getRecentPrices(1, 5), label: 'getRecentPrices(1, 5)', description: 'Get 5 recent prices' },
        { name: 'Delete', method: () => deletePriceHistory(1), label: 'deletePriceHistory(1)', description: 'Delete price history #1' }
      ]
    },
    {
      name: 'Listing',
      icon: 'LS',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => getAllListings(), label: 'getAllListings()', description: 'Fetch all listings' },
        { name: 'Get Active', method: () => getActiveListings(), label: 'getActiveListings()', description: 'Fetch active listings' },
        { name: 'Get by ID', method: () => getListingById(1), label: 'getListingById(1)', description: 'Fetch listing #1' },
        { name: 'Get by Seller', method: () => getListingsBySellerId(1), label: 'getListingsBySellerId(1)', description: 'Fetch listings by seller #1' },
        { name: 'Get Active by Seller', method: () => getActiveListingsBySellerId(1), label: 'getActiveListingsBySellerId(1)', description: 'Fetch active listings by seller' },
        { name: 'Get by Stove', method: () => getActiveListingByStoveId(1), label: 'getActiveListingByStoveId(1)', description: 'Fetch listing for stove #1' },
        { name: 'Create', method: () => createListing(1, 1, 1000), label: 'createListing(1, 1, 1000)', description: 'Create listing for 1000 coins' },
        { name: 'Update Price', method: () => updateListingPrice(1, 2000), label: 'updateListingPrice(1, 2000)', description: 'Update price to 2000' },
        { name: 'Cancel', method: () => cancelListing(1), label: 'cancelListing(1)', description: 'Cancel listing #1' },
        { name: 'Delete', method: () => deleteListing(1), label: 'deleteListing(1)', description: 'Delete listing #1' },
        { name: 'Count', method: () => countActiveListingsBySeller(1), label: 'countActiveListingsBySeller(1)', description: 'Count active listings' }
      ]
    },
    {
      name: 'Trade',
      icon: 'TR',
      expanded: false,
      endpoints: [
        { name: 'Get All', method: () => getAllTrades(), label: 'getAllTrades()', description: 'Fetch all trades' },
        { name: 'Get by ID', method: () => getTradeById(1), label: 'getTradeById(1)', description: 'Fetch trade #1' },
        { name: 'Get by Listing', method: () => getTradeByListingId(1), label: 'getTradeByListingId(1)', description: 'Fetch trade for listing #1' },
        { name: 'Get by Buyer', method: () => getTradesByBuyerId(1), label: 'getTradesByBuyerId(1)', description: 'Fetch trades by buyer #1' },
        { name: 'Execute', method: () => executeTrade(1, 2), label: 'executeTrade(1, 2)', description: 'Execute trade (listing #1, buyer #2)' },
        { name: 'Get Recent', method: () => getRecentTrades(5), label: 'getRecentTrades(5)', description: 'Get 5 recent trades' },
        { name: 'Delete', method: () => deleteTrade(1), label: 'deleteTrade(1)', description: 'Delete trade #1' },
        { name: 'Count All', method: () => countTrades(), label: 'countTrades()', description: 'Count all trades' },
        { name: 'Count by Buyer', method: () => countTradesByBuyer(1), label: 'countTradesByBuyer(1)', description: 'Count trades by buyer' }
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

      const result = await endpoint.method();
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
