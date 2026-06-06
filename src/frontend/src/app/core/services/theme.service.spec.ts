import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let mediaQueryListeners: Array<(event: MediaQueryListEvent) => void>;
  let prefersDark = false;

  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove('theme-light', 'theme-dark');
    document.documentElement.removeAttribute('data-theme');
    mediaQueryListeners = [];
    prefersDark = false;

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
      matches: prefersDark,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_type, listener) => {
        mediaQueryListeners.push(listener as (event: MediaQueryListEvent) => void);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList)),
    });

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('defaults to dark theme and stores it when no saved theme exists', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.getCurrentTheme()).toBe('dark');
    expect(localStorage.getItem('ember-theme')).toBe('dark');
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('applies and persists a selected light theme', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('light');

    expect(service.getCurrentTheme()).toBe('light');
    expect(localStorage.getItem('ember-theme')).toBe('light');
    expect(document.body.classList.contains('theme-light')).toBe(true);
    expect(document.body.classList.contains('theme-dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('resolves system theme from matchMedia and responds to system changes', () => {
    const service = TestBed.inject(ThemeService);
    prefersDark = false;

    service.setTheme('system');

    expect(document.body.classList.contains('theme-light')).toBe(true);
    prefersDark = true;
    mediaQueryListeners.forEach(listener => listener({ matches: true } as MediaQueryListEvent));

    expect(service.getCurrentTheme()).toBe('system');
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
