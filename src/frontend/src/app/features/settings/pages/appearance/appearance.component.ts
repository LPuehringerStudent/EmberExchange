import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThemeService, Theme } from '@core/services/theme.service';

interface ThemeOption {
  id: Theme;
  label: string;
  icon: string;
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
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'system', label: 'System', icon: '🖥️' }
  ];

  ngOnInit(): void {
    this.selectedTheme = this._themeService.getCurrentTheme();
  }

  selectTheme(id: Theme) {
    this.selectedTheme = id;
    this._themeService.setTheme(id);
  }
}
