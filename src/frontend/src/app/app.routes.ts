import { Routes } from '@angular/router';
import {LootboxComponent} from './components/lootbox/lootbox.component';
import { TestPageComponent } from './components/test_page/test-page';
import {MainMenuComponent} from './components/main-menu/main-menu-component';
import {SettingsComponent} from './components/settings/settings-component';
import {InventoryComponent} from './components/inventory/inventory_component';
import {UpdateLogComponent} from './components/update_log/update_log_component';
import {Marketplace} from './components/marketplace/marketplace';
import {GamesComponent} from './components/games/games.component';
import {StatisticsComponent} from './components/statistics/statistics.component';
import {NotFoundComponent} from './typescript/not-found.component';
import {Appearance} from './components/appearance/appearance';
import {Account} from './components/account/account';
import {Language} from './components/language/language';
import { Socials } from './components/socials/socials';
import {Security} from './components/security/security';

export const routes: Routes = [
  { path: '', component: MainMenuComponent },
  { path: 'lootboxes', component: LootboxComponent },
  { path: 'marketplace', component: Marketplace},
  { path: 'games', component: GamesComponent },
  { path: 'inventory', component: InventoryComponent },
  {
    path: 'settings',
    component: SettingsComponent,
    children: [
      { path: '', redirectTo: 'account', pathMatch: 'full' },
      { path: 'account', component: Account},
      { path: 'security', component: Security },
      { path: 'appearance', component: Appearance },
      { path: 'language', component: Language },
      { path: 'socials', component: Socials }
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
