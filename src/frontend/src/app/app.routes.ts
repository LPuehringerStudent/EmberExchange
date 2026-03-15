import { Routes } from '@angular/router';
import {LootboxComponent} from './typescript/lootbox.component';
import { TestPageComponent } from './test-page/test-page';
import {MainMenuComponent} from './typescript/main-menu-component';
import {SettingsComponent} from './typescript/settings-component';
import {InventoryComponent} from './typescript/inventory_component';
import {UpdateLogComponent} from './typescript/update_log_component';
import {Marketplace} from './components/marketplace/marketplace';
import {GamesComponent} from './typescript/games.component';
import {NotFoundComponent} from './typescript/not-found.component';
import {StatisticsComponent} from './typescript/statistics.component';
import {Appearance} from './components/appearance/appearance';
import {Account} from './components/account/account';

export const routes: Routes = [
  { path: '', component: MainMenuComponent },
  { path: 'account', component: Account },
  { path: 'lootboxes', component: LootboxComponent },
  { path: 'marketplace', component: Marketplace},
  {path: 'appearance', component: Appearance},
  { path: 'games', component: GamesComponent },
  { path: 'inventory', component: InventoryComponent },
  {
    path: 'settings',
    component: SettingsComponent,
    children: [
      { path: '', redirectTo: 'account', pathMatch: 'full' },
      { path: 'account', component: Account },
      { path: 'security', component: NotFoundComponent },
      { path: 'appearance', component: Appearance },
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
