import { Routes } from '@angular/router';
import {LootboxComponent} from './typescript/lootbox.component';
import { TestPageComponent } from './test-page/test-page';
import {MainMenuComponent} from './typescript/main-menu-component';
import {SettingsComponent} from './typescript/settings-component';
import {InventoryComponent} from './typescript/inventory_component';
import {UpdateLogComponent} from './typescript/update_log_component';
import {MarketplaceComponent} from './typescript/marketplace.component';
import {GamesComponent} from './typescript/games.component';
import {NotFoundComponent} from './typescript/not-found.component';
import {StatisticsComponent} from './typescript/statistics.component';

export const routes: Routes = [
  { path: '', component: MainMenuComponent },
  { path: 'lootboxes', component: LootboxComponent },
  { path: 'marketplace', component: MarketplaceComponent },
  { path: 'games', component: GamesComponent },
  { path: 'inventory', component: InventoryComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'test', component: TestPageComponent },
  { path: 'update-log', component: UpdateLogComponent },
  { path: 'statistics', component: StatisticsComponent },
  { path: 'support', component: NotFoundComponent },
  { path: 'login', component: NotFoundComponent },
  { path: 'signup', component: NotFoundComponent },
  { path: '**', component: NotFoundComponent }
];
