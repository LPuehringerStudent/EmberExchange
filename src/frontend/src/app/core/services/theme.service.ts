import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'ember-theme';

export type Theme = 'light' | 'dark' | 'purple' | 'green';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = signal<Theme>('dark');
  
  // Expose readonly signal
  public readonly theme = this.currentTheme.asReadonly();

  constructor() {
    this.loadTheme();
  }

  /**
   * Get the current theme
   */
  getCurrentTheme(): Theme {
    return this.currentTheme();
  }

  /**
   * Set and persist a new theme
   */
  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  /**
   * Load theme from localStorage and apply it
   */
  private loadTheme(): void {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (savedTheme && this.isValidTheme(savedTheme)) {
      this.currentTheme.set(savedTheme);
      this.applyTheme(savedTheme);
    } else {
      // Default to dark theme
      this.applyTheme('dark');
    }
  }

  /**
   * Apply theme class to document body
   */
  private applyTheme(theme: Theme): void {
    // Remove all theme classes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-purple', 'theme-green');
    // Add current theme class
    document.body.classList.add(`theme-${theme}`);
    
    // Optionally set data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Check if a theme value is valid
   */
  private isValidTheme(theme: string): theme is Theme {
    return ['light', 'dark', 'purple', 'green'].includes(theme);
  }
}
