import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PageBackgroundTheme =
  | 'ember'
  | 'gold'
  | 'forge'
  | 'market'
  | 'casino'
  | 'shop'
  | 'parchment'
  | 'social'
  | 'arcade'
  | 'profile';

@Component({
  selector: 'app-page-background',
  standalone: true,
  imports: [],
  templateUrl: './page-background.component.html',
  styleUrls: ['./page-background.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageBackgroundComponent {
  readonly theme = input<PageBackgroundTheme>('ember');
}
