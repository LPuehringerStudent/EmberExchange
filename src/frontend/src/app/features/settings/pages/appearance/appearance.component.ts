// appearance.component.ts
import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThemeService, Theme } from '@core/services/theme.service';

interface ThemeOption {
  id: Theme;
  label: string;
  bg: string;
  border: string;
}

@Component({
  selector: 'app-appearance',
  imports: [],
  templateUrl: './appearance.component.html',
  styleUrls: ['../../settings.component.css', './appearance.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppearanceComponent implements OnInit {
  private _themeService = inject(ThemeService);

  selectedTheme: Theme = 'dark';

  readonly themes: ThemeOption[] = [
    { id: 'light', label: 'Light', bg: '#ffffff', border: '#e0e3ff' },
    { id: 'dark', label: 'Dark', bg: '#1a1a2e', border: '#16213e' },
    { id: 'purple', label: 'Purple', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '#764ba2' },
    { id: 'green', label: 'Forest', bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', border: '#11998e' }
  ];

  ngOnInit(): void {
    this.selectedTheme = this._themeService.getCurrentTheme();
  }

  selectTheme(id: Theme) {
    this.selectedTheme = id;
    this._themeService.setTheme(id);
  }
}
