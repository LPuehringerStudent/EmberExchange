import { Injectable } from '@angular/core';

export interface BehaviorSnapshot {
  /** Number of mouse move events */
  mm: number;
  /** Approximate total mouse distance in pixels (squared, integer) */
  md: number;
  /** Keystroke count per field name */
  ks: Record<string, number>;
  /** Focus event count */
  fc: number;
  /** Blur event count */
  bl: number;
  /** Total interaction time in ms (first focus to last interaction) */
  it: number;
  /** Sequence of field names that received focus */
  fs: string[];
  /** Timestamp when tracking started (first focus) */
  ts: number;
}

/**
 * Lightweight behavioral tracker for auth forms.
 * Records interaction patterns (mouse, keystrokes, focus) and produces
 * a compact token for backend validation.
 *
 * No PII is captured — only counts, distances, and field names.
 */
@Injectable({ providedIn: 'root' })
export class BehaviorTrackerService {
  private snapshot: BehaviorSnapshot | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private hasMouseMoved = false;

  startTracking(formElement: HTMLElement): void {
    this.snapshot = {
      mm: 0,
      md: 0,
      ks: {},
      fc: 0,
      bl: 0,
      it: 0,
      fs: [],
      ts: 0,
    };
    this.hasMouseMoved = false;

    const handler = (e: MouseEvent) => this.onMouseMove(e);
    const keyHandler = (e: KeyboardEvent) => this.onKeyDown(e);
    const focusHandler = (e: FocusEvent) => this.onFocus(e);
    const blurHandler = (e: FocusEvent) => this.onBlur(e);

    formElement.addEventListener('mousemove', handler, { passive: true });
    formElement.addEventListener('keydown', keyHandler, { passive: true });
    formElement.addEventListener('focusin', focusHandler, { passive: true });
    formElement.addEventListener('focusout', blurHandler, { passive: true });

    // Store cleanup function on the element for later
    (formElement as any).__behaviorCleanup = () => {
      formElement.removeEventListener('mousemove', handler);
      formElement.removeEventListener('keydown', keyHandler);
      formElement.removeEventListener('focusin', focusHandler);
      formElement.removeEventListener('focusout', blurHandler);
    };
  }

  stopTracking(formElement: HTMLElement): void {
    const cleanup = (formElement as any).__behaviorCleanup;
    if (cleanup) {
      cleanup();
      delete (formElement as any).__behaviorCleanup;
    }
    if (this.snapshot && this.snapshot.ts > 0) {
      this.snapshot.it = Date.now() - this.snapshot.ts;
    }
  }

  getToken(): string | null {
    if (!this.snapshot) return null;
    // Finalize interaction time
    if (this.snapshot.ts > 0) {
      this.snapshot.it = Date.now() - this.snapshot.ts;
    }
    // Encode as compact base64 JSON
    const json = JSON.stringify(this.snapshot);
    return btoa(json);
  }

  reset(): void {
    this.snapshot = null;
    this.hasMouseMoved = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.snapshot) return;
    this.snapshot.mm++;
    if (this.hasMouseMoved) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      // Approximate distance squared (avoid sqrt for speed)
      this.snapshot.md += Math.round(dx * dx + dy * dy);
    }
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.hasMouseMoved = true;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.snapshot) return;
    const target = e.target as HTMLElement;
    const name = target.getAttribute('name') || target.getAttribute('id') || 'unknown';
    this.snapshot.ks[name] = (this.snapshot.ks[name] || 0) + 1;
  }

  private onFocus(e: FocusEvent): void {
    if (!this.snapshot) return;
    this.snapshot.fc++;
    const target = e.target as HTMLElement;
    const name = target.getAttribute('name') || target.getAttribute('id') || 'unknown';
    if (!this.snapshot.fs.includes(name)) {
      this.snapshot.fs.push(name);
    }
    if (this.snapshot.ts === 0) {
      this.snapshot.ts = Date.now();
    }
  }

  private onBlur(e: FocusEvent): void {
    if (!this.snapshot) return;
    this.snapshot.bl++;
  }
}
