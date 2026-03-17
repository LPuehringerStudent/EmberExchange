import { Routes } from '@angular/router';
import {LootboxComponent} from './typescript/lootbox.component';
import { TestPageComponent } from './test-page/test-page';
import {MainMenuComponent} from './typescript/main-menu-component';
import {SettingsComponent} from './typescript/settings-component';
import {InventoryComponent} from './typescript/inventory_component';
import {UpdateLogComponent} from './typescript/update_log_component';
import {MarketplaceComponent} from './typescript/marketplace.component';
import {GamesComponent} from './typescript/games.component';
import {StatisticsComponent} from './typescript/statistics.component';
import {NotFoundComponent} from './typescript/not-found.component';
import {NotFoundComponent as AccountComponent} from './typescript/not-found.component';

export const routes: Routes = [
  { path: '', component: MainMenuComponent },
  { path: 'account', component: AccountComponent },
  { path: 'lootboxes', component: LootboxComponent },
  { path: 'marketplace', component: MarketplaceComponent},
  {path: 'appearance', component: NotFoundComponent},
  { path: 'games', component: GamesComponent },
  { path: 'inventory', component: InventoryComponent },
  {
    path: 'settings',
    component: SettingsComponent,
    children: [
      { path: '', redirectTo: 'account', pathMatch: 'full' },
      { path: 'account', component: AccountComponent },
      { path: 'security', component: NotFoundComponent },
      { path: 'appearance', component: NotFoundComponent },
      { path: 'language', component: NotFoundComponent },
      { path: 'socials', component: NotFoundComponent }
    ]
  },
  { path: 'test', component: TestPageComponent },
  { path: 'update-log', component: UpdateLogComponent },
  { path: 'statistics', component: StatisticsComponent },
  { path: 'support', component: NotFoundComponent },
  { path: 'login', component: NotFoundComponent },
  { path: 'signup', component: NotFoundComponent },
  { path: '**', component: NotFoundComponent }
];
