import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
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
export class AppearanceComponent {
  private _themeService = inject(ThemeService);

  selectedTheme = signal<Theme>(this._themeService.getCurrentTheme());

  readonly themes: ThemeOption[] = [
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'system', label: 'System', icon: '🖥️' }
  ];

  selectTheme(id: Theme): void {
    this.selectedTheme.set(id);
    this._themeService.setTheme(id);
  }
}
