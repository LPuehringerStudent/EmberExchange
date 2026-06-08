import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
      remove: (widgetId: string) => void;
      ready?: (callback: () => void) => void;
    };
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

@Injectable({ providedIn: 'root' })
export class TurnstileService {
  private scriptLoaded = false;
  private siteKey: string | null = null;

  constructor(private api: ApiService) {}

  /**
   * Loads the Turnstile script and fetches the site key from the backend.
   */
  async initialize(): Promise<void> {
    if (!this.siteKey) {
      try {
        const config = await firstValueFrom(this.api.get<{ siteKey: string }>('/turnstile/sitekey'));
        this.siteKey = config.siteKey;
      } catch {
        console.error('Failed to load Turnstile site key');
        return;
      }
    }

    if (this.scriptLoaded || document.getElementById('turnstile-script')) {
      this.scriptLoaded = true;
      return;
    }

    await this.loadScript();
  }

  /**
   * Renders a Turnstile widget into the given container.
   * Returns the widget ID.
   */
  render(container: HTMLElement, onVerify?: (token: string) => void): string | null {
    if (!this.siteKey || !window.turnstile) {
      console.error('Turnstile not initialized');
      return null;
    }

    const widgetId = window.turnstile.render(container, {
      sitekey: this.siteKey,
      theme: 'dark',
      size: 'normal',
      callback: (token: string) => {
        onVerify?.(token);
      },
      'error-callback': () => {
        console.warn('Turnstile error callback fired');
      },
      'expired-callback': () => {
        console.warn('Turnstile token expired');
      },
    });

    return widgetId;
  }

  /**
   * Gets the current token for a widget.
   */
  getToken(widgetId: string): string | null {
    if (!window.turnstile) return null;
    return window.turnstile.getResponse(widgetId) ?? null;
  }

  /**
   * Checks if the user has completed the widget (token is available).
   */
  isReady(widgetId: string): boolean {
    return this.getToken(widgetId) !== null;
  }

  /**
   * Resets the widget (e.g., after form submission).
   */
  reset(widgetId: string): void {
    if (!window.turnstile) return;
    window.turnstile.reset(widgetId);
  }

  /**
   * Removes the widget from the DOM.
   */
  remove(widgetId: string): void {
    if (!window.turnstile) return;
    window.turnstile.remove(widgetId);
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Turnstile script'));
      document.head.appendChild(script);
    });
  }
}
