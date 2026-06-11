import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { ListingService } from '@core/services/listing.service';
import { LootboxService } from '@core/services/lootbox.service';
import { PriceHistoryService } from '@core/services/price-history.service';
import { StoveService } from '@core/services/stove.service';
import { TradeService } from '@core/services/trade.service';

import { MarketplaceComponent } from './marketplace.component';

describe('MarketplaceComponent', () => {
  let component: MarketplaceComponent;
  let fixture: ComponentFixture<MarketplaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: vi.fn().mockReturnValue({ playerId: 1, coins: 1000 }),
            refreshUser: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ListingService,
          useValue: {
            getActiveListings: vi.fn().mockReturnValue(of([])),
            getListingsBySellerId: vi.fn().mockReturnValue(of([])),
            cancelListing: vi.fn().mockReturnValue(of(undefined)),
          },
        },
        {
          provide: StoveService,
          useValue: {
            getAllStoveTypes: vi.fn().mockReturnValue(of([])),
            getAllStoves: vi.fn().mockReturnValue(of([])),
          },
        },
        {
          provide: LootboxService,
          useValue: {
            getAllLootboxTypes: vi.fn().mockReturnValue(of([])),
          },
        },
        {
          provide: TradeService,
          useValue: {
            executeTrade: vi.fn().mockReturnValue(of(undefined)),
          },
        },
        {
          provide: PriceHistoryService,
          useValue: {
            getPriceHistoryByTypeId: vi.fn().mockReturnValue(of([])),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarketplaceComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
