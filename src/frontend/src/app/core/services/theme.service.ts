import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'ember-theme';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = signal<Theme>('dark');
  
  public readonly theme = this.currentTheme.asReadonly();

  constructor() {
    this.loadTheme();
  }

  getCurrentTheme(): Theme {
    return this.currentTheme();
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (savedTheme && this.isValidTheme(savedTheme)) {
      this.currentTheme.set(savedTheme);
      this.applyTheme(savedTheme);
    } else {
      this.applyTheme('dark');
    }
  }

  private applyTheme(theme: Theme): void {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${resolved}`);
    document.documentElement.setAttribute('data-theme', resolved);
  }

  private isValidTheme(theme: string): theme is Theme {
    return ['light', 'dark', 'system'].includes(theme);
  }
}
